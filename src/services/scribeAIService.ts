import { WorkerType, WORKER_CONFIGS } from '@/types/scribe';
import { AIService } from '@/services/aiService';
import { CLAUDE_PRIMARY_MODEL } from '@/lib/appConfig';

export interface ScribeAIResponse {
  content: string;
  tokensUsed: number;
  worker: WorkerType;
}

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/appConfig';

export class ScribeAIService {
  private static readonly SUPABASE_URL = SUPABASE_URL;
  private static readonly SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

  static async sendMessage(
    message: string,
    worker: WorkerType,
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [],
    onChunk?: (chunk: string) => void
  ): Promise<ScribeAIResponse> {
    try {
      const workerConfig = WORKER_CONFIGS[worker];
      
      // Enhanced system prompt with ScribeAI branding
      const enhancedSystemPrompt = this.getEnhancedSystemPrompt(workerConfig.systemPrompt, worker);
      
      console.log(`Sending message to ${worker} worker via Supabase Edge Function`);
      console.log(`📝 Conversation history length: ${conversationHistory.length}`);
      console.log(`📝 Conversation history:`, conversationHistory);
      
      // Prefer Sonnet by default; switch to Haiku only on overload/rate-limit
      const primaryModel = CLAUDE_PRIMARY_MODEL === 'sonnet'
        ? 'claude-3-5-sonnet-20241022'
        : 'claude-3-5-haiku-20241022';

      const requestBody = {
        message,
        systemPrompt: enhancedSystemPrompt,
        conversationHistory,
        worker,
        model: primaryModel, // Primary
      };

      // Exponential backoff for transient overloads
      const doRequest = async (modelOverride?: string): Promise<Response> => {
        const maxAttempts = 3;
        let attempt = 0;
        let lastError: any = null;
        const body = { ...requestBody, model: modelOverride || requestBody.model } as any;
        while (attempt < maxAttempts) {
          attempt++;
          try {
            const resp = await fetch(`${this.SUPABASE_URL}/functions/v1/scribe-ai-service`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify(body),
            });
            if (resp.status === 529 || resp.status === 429) {
              const delayMs = Math.pow(2, attempt - 1) * 1000;
              console.warn(`ScribeAI service overloaded (status ${resp.status}). Retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})`);
              await new Promise(r => setTimeout(r, delayMs));
              continue;
            }
            return resp;
          } catch (err) {
            lastError = err;
            const delayMs = Math.pow(2, attempt - 1) * 1000;
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
        if (lastError) throw lastError;
        // Final attempt without special handling
        return await fetch(`${this.SUPABASE_URL}/functions/v1/scribe-ai-service`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(body),
        });
      };

      let response = await doRequest(primaryModel);

      if (!response.ok) {
        // If overloaded or rate-limited, try the other Claude 3.5 model first, then AIService
        if (response.status === 529 || response.status === 429) {
          const altModel = primaryModel.includes('sonnet') ? 'claude-3-5-haiku-20241022' : 'claude-3-5-sonnet-20241022';
          console.warn(`ScribeAI overloaded (${response.status}). Attempting alternate Claude model: ${altModel}...`);
          response = await doRequest(altModel);
          if (!response.ok) {
            console.warn(`Haiku fallback also failed (${response.status}). Falling back to AIService.`);
            return await this.fallbackToAIService(message, worker, conversationHistory, onChunk);
          }
        } else {
          throw new Error(`ScribeAI service error: ${response.status} ${response.statusText}`);
        }
      }

      // Handle streaming response
      if (response.body && onChunk) {
        const reader = response.body.getReader();
        let accumulatedContent = '';
        let buffer = '';
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            buffer += chunk;
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  // Handle error events from the stream
                  if (data.error) {
                    console.error('Streaming error received:', data.error);
                    throw new Error(`Anthropic streaming error: ${data.error}`);
                  }
                  
                  if (data.content) {
                    accumulatedContent += data.content;
                    onChunk(data.content);
                  }
                  if (data.done) {
                    // Validate we actually got content
                    if (!accumulatedContent.trim()) {
                      throw new Error('No content received from Anthropic API');
                    }
                    return {
                      content: accumulatedContent,
                      tokensUsed: data.tokensUsed || 0,
                      worker,
                    };
                  }
                } catch (e) {
                  console.warn('Failed to parse streaming data:', e);
                  // If it's an error we threw, re-throw it
                  if (e instanceof Error && e.message.includes('Anthropic streaming error')) {
                    throw e;
                  }
                }
              }
            }
          }
          
          // Process any remaining buffer content
          if (buffer.trim() && buffer.startsWith('data: ')) {
            try {
              const data = JSON.parse(buffer.slice(6));
              if (data.content) {
                accumulatedContent += data.content;
                onChunk(data.content);
              }
            } catch (e) {
              console.warn('Failed to parse final buffer:', e);
            }
          }
        } finally {
          reader.releaseLock();
        }
        
        // Validate we actually got content
        if (!accumulatedContent.trim()) {
          throw new Error('No content received from Anthropic API - stream completed without content');
        }
        
        return {
          content: accumulatedContent,
          tokensUsed: 0,
          worker,
        };
      } else {
        // Handle non-streaming response
        const data = await response.json();
        if (data?.error && /overload|rate limit|quota/i.test(String(data.error))) {
          const altModel = primaryModel.includes('sonnet') ? 'claude-3-5-haiku-20241022' : 'claude-3-5-sonnet-20241022';
          console.warn(`ScribeAI service reported overload in JSON body. Trying alternate Claude model: ${altModel}...`);
          const retry = await doRequest(altModel);
          if (!retry.ok) {
            console.warn('Haiku fallback failed from JSON error. Falling back to AIService.');
            return await this.fallbackToAIService(message, worker, conversationHistory, onChunk);
          }
          const retryData = await retry.json();
          return {
            content: retryData.content || retryData.message || 'No response received',
            tokensUsed: retryData.tokensUsed || 0,
            worker,
          };
        }
        return {
          content: data.content || data.message || 'No response received',
          tokensUsed: data.tokensUsed || 0,
          worker,
        };
      }
    } catch (error) {
      console.error('Scribe AI service error:', error);
      
      // Provide user-friendly error messages without exposing internal details
      const errorMessage = this.getErrorMessage(error);
      // If the error indicates overload or rate limits, fallback automatically
      if (/overload|rate limit|quota|capacity|429|529/i.test(errorMessage)) {
        try {
          console.warn('Falling back to AIService due to overload/limit.');
          return await this.fallbackToAIService(message, worker, conversationHistory, onChunk);
        } catch (fallbackError) {
          console.error('Fallback AIService error:', fallbackError);
        }
      }
      throw new Error(errorMessage);
    }
  }

  private static async fallbackToAIService(
    message: string,
    worker: WorkerType,
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [],
    onChunk?: (chunk: string) => void
  ): Promise<ScribeAIResponse> {
    const aiModel = worker === 'technical' ? 'reason-core' : 'scholar-mind';
    const mappedHistory = (conversationHistory || []).map((m) => ({
      id: crypto.randomUUID(),
      content: m.content,
      sender: m.role === 'user' ? 'user' : 'ai',
      timestamp: new Date()
    }));
    const res = await AIService.sendMessage(message, [], aiModel as any, mappedHistory as any, onChunk);
    return { content: res.content, tokensUsed: res.tokensUsed, worker };
  }

  private static getEnhancedSystemPrompt(basePrompt: string, workerType: WorkerType): string {
    const sharedGuidance = `
You are ScribeAI, never mention Claude, Anthropic, or Sonnet. Respond naturally and conversationally while maintaining academic quality. Use proper formatting but keep your tone approachable and helpful.

When writing, organize your thoughts clearly with headings when needed, but write in a natural flow that feels like a knowledgeable conversation rather than overly formal academic prose.`;

    const scholarlyGuidance = `
For scholarly work, write with intellectual depth but keep it accessible. Use headings (# ## ###) to organize longer responses. Avoid lists unless they genuinely serve the content - instead, weave information into coherent paragraphs that build understanding naturally. Use **bold** and *italics* sparingly for genuine emphasis. When you need to quote something important, use > blockquotes. Include [FIGURE X: Description] when visual elements would genuinely help understanding.`;

    const technicalGuidance = `
For technical problems, walk through your thinking step by step in a clear, logical way. Use headings to organize different parts of your solution. Show mathematical work using LaTeX formatting ($$...$$). When you need to present structured information like data or results, tables work well. Use > blockquotes for important principles or key insights. Code blocks can help when showing calculations or processes.`;

    const batchGuidance = `
For comprehensive projects, maintain consistent structure with clear headings (# ## ###) throughout. Write substantial sections that thoroughly explore each topic - aim for depth and comprehensive coverage. Use [FIGURE X: Description] placeholders when charts, diagrams, or visual elements would enhance understanding. Keep your writing engaging while maintaining scholarly rigor.`;

    let specificGuidance = technicalGuidance;
    if (workerType === 'scholarly') specificGuidance = scholarlyGuidance;
    if (workerType === 'batch') specificGuidance = batchGuidance;

    return `${basePrompt}

${sharedGuidance}

${specificGuidance}`;
  }

  private static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Replace any mentions of underlying services with ScribeAI branding
      if (message.includes('claude') || message.includes('anthropic')) {
        return 'ScribeAI service is temporarily unavailable. Please try again in a moment.';
      }
      
      if (message.includes('rate limit') || message.includes('quota')) {
        return 'ScribeAI is experiencing high demand. Please wait a moment before trying again.';
      }
      
      if (message.includes('network') || message.includes('connection')) {
        return 'Network connection issue. Please check your internet connection and try again.';
      }
      
      if (message.includes('unauthorized') || message.includes('auth')) {
        return 'Authentication error. Please refresh the page and try again.';
      }
      
      return 'ScribeAI encountered an error while processing your request. Please try again.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  // Helper method for batch processing
  static async processBatchProject(
    outline: string[],
    projectTitle: string,
    citationStyle: string,
    onSectionComplete?: (section: string, content: string) => void
  ): Promise<string[]> {
    const sections: string[] = [];
    
    for (let i = 0; i < outline.length; i++) {
      const section = outline[i];
      const sectionPrompt = `I need you to write a comprehensive section for an academic project titled "${projectTitle}". This is section ${i + 1} of ${outline.length}, focusing on: ${section}

Here's what I'm looking for:

**Length and Depth**: This needs to be substantial - around 7,000 words minimum. I need thorough coverage that really digs into the topic from multiple angles.

**Content Requirements**: 
- Start with a solid introduction to this section's focus
- Break it into logical subsections with clear headings
- Include extensive analysis and discussion, not just description
- Bring in relevant historical context and background where it makes sense
- Discuss different perspectives and current debates in the field
- Show how this connects to practical applications or real-world implications
- Wrap up with a strong synthesis that ties everything together

**Citations and Sources**: Use ${citationStyle} format throughout. Integrate citations naturally into your writing rather than just dropping them in.

**Style and Tone**: Write naturally but maintain academic quality. Use clear headings to organize your thoughts, but present the content in flowing paragraphs that build understanding progressively. Avoid list-heavy writing - I want coherent analysis that reads well.

**Visual Elements**: Include [FIGURE ${i + 1}: Description] placeholders where charts, diagrams, or other visuals would genuinely enhance understanding.

Please write this section now, making sure it flows well as part of the larger project while standing strong on its own.`;

      try {
        const response = await this.sendMessage(sectionPrompt, 'batch');
        sections.push(response.content);
        
        if (onSectionComplete) {
          onSectionComplete(section, response.content);
        }
      } catch (error) {
        console.error(`Error processing section ${i + 1}:`, error);
        sections.push(`[Error processing section: ${section}]`);
      }
    }
    
    return sections;
  }
}