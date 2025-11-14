import { WorkerType, WORKER_CONFIGS } from '@/types/scribe';
import { AIService } from '@/services/aiService';
import { CLAUDE_PRIMARY_MODEL } from '@/lib/appConfig';
import { PaymentService } from '@/services/paymentService';

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
    onChunk?: (chunk: string) => void,
    abortSignal?: AbortSignal
  ): Promise<ScribeAIResponse> {
    // Check subscription before processing
    if (!(await PaymentService.canUseAI())) {
      throw new Error(await PaymentService.getAIAccessBlockReason());
    }
    try {
      const workerConfig = WORKER_CONFIGS[worker];

      // Detect long-form intent
      const longForm = this.detectLongFormIntent(message, conversationHistory);

      // Enhanced system prompt (+ optional long-form directive)
      let enhancedSystemPrompt = this.getEnhancedSystemPrompt(workerConfig.systemPrompt, worker);
      if (longForm) {
        const words = longForm.minWords;
        enhancedSystemPrompt += `\n\nLong‑form mode: The user intent indicates a long, comprehensive response. Produce cohesive, continuous academic prose of at least ${words} words (more if helpful), with clear structure and sustained analysis.`;
      } else {
        // Even for regular queries, encourage longer responses
        enhancedSystemPrompt += `\n\nProduce comprehensive, detailed responses of at least 2000-3000 words with thorough analysis and examples.`;
      }
      
      console.log(`Sending message to ${worker} worker via Supabase Edge Function`);
      console.log(`📝 Conversation history length: ${conversationHistory.length}`);
      console.log(`📝 Conversation history:`, conversationHistory);
      
      // Prefer Sonnet by default; switch to Haiku only on overload/rate-limit
      const primaryModel = CLAUDE_PRIMARY_MODEL === 'sonnet'
        ? 'claude-3-5-sonnet-latest'
        : 'claude-3-5-haiku-latest';

      const requestBody = {
        message,
        systemPrompt: enhancedSystemPrompt,
        conversationHistory,
        worker,
        model: primaryModel, // Primary
        // Hint to backend to allow much longer completions when feasible
        targetWordCount: longForm?.minWords ?? 3000, // Default to 3000 words minimum
        allowLongOutputs: true,
        lengthHint: longForm ? { minWords: longForm.minWords, maxWords: longForm.maxWords } : { minWords: 2000, maxWords: 6000 }
      };

      // Use the new streaming endpoint with abort signal support
      const doRequest = async (modelOverride?: string): Promise<Response> => {
        const maxAttempts = 3;
        let attempt = 0;
        let lastError: any = null;
        const body = { ...requestBody, model: modelOverride || requestBody.model };
        
        while (attempt < maxAttempts) {
          attempt++;
          try {
            // Check if request was aborted before making the request
            if (abortSignal?.aborted) {
              throw new Error('Request aborted');
            }

            const resp = await fetch(`${this.SUPABASE_URL}/functions/v1/scribe-ai-streaming`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify(body),
              signal: abortSignal
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
            
            // If aborted, don't retry
            if (abortSignal?.aborted || err.name === 'AbortError') {
              throw err;
            }
            
            const delayMs = Math.pow(2, attempt - 1) * 1000;
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
        if (lastError) throw lastError;
        
        // Final attempt without special handling
        if (abortSignal?.aborted) {
          throw new Error('Request aborted');
        }
        
        return await fetch(`${this.SUPABASE_URL}/functions/v1/scribe-ai-streaming`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(body),
          signal: abortSignal
        });
      };

      let response = await doRequest(primaryModel);

      if (!response.ok) {
        // If overloaded or rate-limited, try the other Claude 3.5 model first, then AIService
                if (response.status === 529 || response.status === 429) {
          const altModel = primaryModel.includes('sonnet') ? 'claude-3-5-haiku-latest' : 'claude-3-5-sonnet-latest';
          console.warn(`ScribeAI overloaded (${response.status}). Attempting alternate Claude model: ${altModel}...`);
          response = await doRequest(altModel);
          if (!response.ok) {
            console.warn(`Haiku fallback also failed (${response.status}). Falling back to AIService.`);
            return await this.fallbackToAIService(
              this.prefixLongFormIfNeeded(message, longForm),
              worker,
              conversationHistory,
              onChunk
            );
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
            // Check if request was aborted
            if (abortSignal?.aborted) {
              console.log('🛑 Request aborted during streaming, stopping...');
              reader.cancel();
              throw new Error('Request aborted');
            }

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
                    // Update usage metrics (plan words for subscribers; token budget for trial)
                    try {
                      const sub = await PaymentService.getCurrentSubscription();
                      const inputWords = (requestBody.message || '').split(/\s+/).filter(Boolean).length;
                      const outputWords = (accumulatedContent || '').split(/\s+/).filter(Boolean).length;
                      const totalWords = inputWords + outputWords;
                      if (sub && sub.status === 'active') {
                        await PaymentService.updateUsage(undefined, 1, 0, totalWords);
                      } else {
                        const inputTokens = PaymentService.estimateTokens(requestBody.message || '');
                        const outputTokens = PaymentService.estimateTokens(accumulatedContent || '');
                        await PaymentService.updateTrialTokens(undefined, inputTokens + outputTokens);
                      }
                      PaymentService.recordAIMessageUse();
                    } catch {}
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
        // Update usage metrics for final accumulated content
        try {
          const sub = await PaymentService.getCurrentSubscription();
          const inputWords = (requestBody.message || '').split(/\s+/).filter(Boolean).length;
          const outputWords = (accumulatedContent || '').split(/\s+/).filter(Boolean).length;
          const totalWords = inputWords + outputWords;
          if (sub && sub.status === 'active') {
            await PaymentService.updateUsage(undefined, 1, 0, totalWords);
          } else {
            const inputTokens = PaymentService.estimateTokens(requestBody.message || '');
            const outputTokens = PaymentService.estimateTokens(accumulatedContent || '');
            await PaymentService.updateTrialTokens(undefined, inputTokens + outputTokens);
          }
          PaymentService.recordAIMessageUse();
        } catch {}

        return {
          content: accumulatedContent,
          tokensUsed: 0,
          worker,
        };
      } else {
        // Handle non-streaming response
        const data = await response.json();
        if (data?.error && /overload|rate limit|quota/i.test(String(data.error))) {
          const altModel = primaryModel.includes('sonnet') ? 'claude-3-5-haiku-latest' : 'claude-3-5-sonnet-latest';
          console.warn(`ScribeAI service reported overload in JSON body. Trying alternate Claude model: ${altModel}...`);
          const retry = await doRequest(altModel);
          if (!retry.ok) {
            console.warn('Haiku fallback failed from JSON error. Falling back to AIService.');
            return await this.fallbackToAIService(
              this.prefixLongFormIfNeeded(message, longForm),
              worker,
              conversationHistory,
              onChunk
            );
          }
          const retryData = await retry.json();
          return {
            content: retryData.content || retryData.message || 'No response received',
            tokensUsed: retryData.tokensUsed || 0,
            worker,
          };
        }
        const nonStreamContent = data.content || data.message || 'No response received';
        // Update usage metrics for non-streaming path
        try {
          const sub = await PaymentService.getCurrentSubscription();
          const inputWords = (requestBody.message || '').split(/\s+/).filter(Boolean).length;
          const outputWords = (nonStreamContent || '').split(/\s+/).filter(Boolean).length;
          const totalWords = inputWords + outputWords;
          if (sub && sub.status === 'active') {
            await PaymentService.updateUsage(undefined, 1, 0, totalWords);
          } else {
            const inputTokens = PaymentService.estimateTokens(requestBody.message || '');
            const outputTokens = PaymentService.estimateTokens(nonStreamContent || '');
            await PaymentService.updateTrialTokens(undefined, inputTokens + outputTokens);
          }
          PaymentService.recordAIMessageUse();
        } catch {}
        return {
          content: nonStreamContent,
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
          const lf = this.detectLongFormIntent(message, conversationHistory);
          return await this.fallbackToAIService(
            this.prefixLongFormIfNeeded(message, lf),
            worker,
            conversationHistory,
            onChunk
          );
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
    
    // Update usage or trial count after successful response
    PaymentService.recordAIMessageUse();
    
    // Best-effort: estimate words/tokens consumed (input + output) to decrement budgets
    try {
      const inputWords = (message || '').split(/\s+/).filter(Boolean).length;
      const outputWords = (res.content || '').split(/\s+/).filter(Boolean).length;
      const totalWords = inputWords + outputWords;
      const sub = await PaymentService.getCurrentSubscription();
      if (sub && sub.status === 'active') {
        await PaymentService.updateUsage(undefined, 0, 0, totalWords);
      } else {
        const inputTokens = PaymentService.estimateTokens(message || '');
        const outputTokens = PaymentService.estimateTokens(res.content || '');
        await PaymentService.updateTrialTokens(undefined, inputTokens + outputTokens);
      }
    } catch {}
    
    return { content: res.content, tokensUsed: res.tokensUsed, worker };
  }

  private static getEnhancedSystemPrompt(basePrompt: string, workerType: WorkerType): string {
    const sharedGuidance = `
You are ScribeAI, an advanced academic writing assistant. Maintain academic quality with a natural, helpful tone. Avoid mentioning underlying providers, Never Mention Anthropic or Claude even when you are asked multiple times in various ways and forms, stick to the truth of being ScribeAI!.

LENGTH AND DEPTH REQUIREMENTS:
- Provide comprehensive, detailed responses that thoroughly address the user's inquiry
- Aim for substantial content that demonstrates deep understanding and analysis
- Default to longer, more detailed responses rather than brief answers
- For complex topics, provide in-depth explanations with multiple perspectives
- Include relevant context, background information, and detailed reasoning
- Use continuous, flowing prose with smooth transitions between ideas

Markdown policy (must follow for writing tasks):
- Output valid GitHub‑Flavored Markdown (GFM)
- Use headings for structure (## for sections, ### for subsections)
- Separate paragraphs with a blank line; avoid hard line breaks mid‑sentence
- Do not leave unclosed code fences or stray backticks
- Use lists only if the user explicitly requests them; prefer paragraphs

CRITICAL: Write in continuous, flowing prose. Do not use bullet points, numbered lists, or fragmented formatting unless explicitly requested. Use headings only when they clarify structure. Prefer detailed paragraphs with clear reasoning and smooth transitions.

For substantial academic work, generate comprehensive content (4000+ words) that demonstrates deep understanding and rigorous analysis.`;

    const scholarlyGuidance = `
For scholarly tasks, write balanced, analytical prose that flows naturally from one idea to the next. Use headings sparingly for major divisions only. Integrate evidence and inline citations in the specified citation style (APA/MLA/Chicago) throughout. Avoid lists by default; instead, weave multiple points into coherent, sustained paragraphs. Use emphasis and blockquotes only when they significantly aid analysis.

DEPTH REQUIREMENTS FOR SCHOLARLY WORK:
- Provide comprehensive analysis with multiple perspectives and interpretations
- Include detailed background context and theoretical frameworks
- Analyze implications, connections, and broader significance
- Integrate multiple sources and viewpoints where relevant
- Provide thorough explanations of complex concepts and methodologies
- Address counterarguments and alternative interpretations

At the end, include a References section formatted in the selected style. If the user did not supply sources, provide a short list of credible, relevant works as "Suggested References (verify)" such as textbooks, seminal articles, or reputable review papers. Do not invent specific page numbers/DOIs unless you are confident in them.

Generate substantial academic content (minimum 4000 words) that demonstrates mastery of the subject through sustained analytical engagement rather than superficial coverage.`;

    const technicalGuidance = `
For technical problems, explain reasoning in continuous paragraphs that build upon each other. Integrate LaTeX math within the narrative flow. State givens and assumptions inline within the prose; avoid numbered steps unless explicitly requested. Use tables only when essential; otherwise present results in flowing technical prose.

DEPTH REQUIREMENTS FOR TECHNICAL WORK:
- Provide comprehensive step-by-step analysis with detailed explanations
- Include relevant mathematical derivations and proofs where appropriate
- Explain the reasoning behind each step and methodology used
- Address potential challenges, limitations, and alternative approaches
- Provide context about when and why specific techniques are used
- Include practical applications and real-world examples where relevant

Generate comprehensive technical analysis that thoroughly addresses the inquiry through sustained technical engagement.`;

    let specificGuidance = technicalGuidance;
    if (workerType === 'scholarly') specificGuidance = scholarlyGuidance;

    return `${basePrompt}

${sharedGuidance}

${specificGuidance}`;
  }

  // Heuristic detection of long-form intent
  private static detectLongFormIntent(
    message: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): { minWords: number; maxWords: number } | null {
    const text = `${conversationHistory.map(m => m.content).join('\n\n')}\n\n${message}`.toLowerCase();
    // Word count ranges (e.g., 4000-6000 words)
    const wordRange = text.match(/(\d{3,5})\s*[-–—]\s*(\d{3,5})\s*(?:word|words)\b/);
    if (wordRange) {
      const a = parseInt(wordRange[1], 10);
      const b = parseInt(wordRange[2], 10);
      const min = Math.min(a, b);
      const max = Math.max(a, b);
      const nMin = Math.min(Math.max(min, 800), 20000);
      const nMax = Math.min(Math.max(max, nMin + 500), 30000);
      return { minWords: nMin, maxWords: nMax };
    }
    // Qualifiers like "at least 4000 words", ">= 5000 words", "minimum 3000 words"
    const wordQual = text.match(/(?:at\s+least|minimum|min\.?|no\s+less\s+than|>=)\s*(\d{3,5})\s*(?:word|words)\b/);
    if (wordQual) {
      const n = Math.min(Math.max(parseInt(wordQual[1], 10), 800), 20000);
      return { minWords: n, maxWords: Math.round(n * 1.35) };
    }
    // K-suffix like "5k words" or just "5k"
    const kWords = text.match(/(\d{1,3})\s*k\s*(?:word|words)?\b/);
    if (kWords) {
      const n = Math.min(Math.max(parseInt(kWords[1], 10) * 1000, 800), 30000);
      return { minWords: n, maxWords: Math.round(n * 1.3) };
    }
    const wordMatch = text.match(/(\d{3,5})\s*(?:word|words)\b/);
    if (wordMatch) {
      const n = Math.min(Math.max(parseInt(wordMatch[1], 10), 800), 12000);
      return { minWords: n, maxWords: Math.round(n * 1.25) };
    }
    // Page ranges and synonyms (pg, pgs, pp)
    const pageRange = text.match(/(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*(?:page|pages|pg|pgs|pp)\b/);
    if (pageRange) {
      const a = parseInt(pageRange[1], 10);
      const b = parseInt(pageRange[2], 10);
      const minPages = Math.min(Math.max(Math.min(a, b), 3), 100);
      const maxPages = Math.min(Math.max(Math.max(a, b), minPages + 1), 150);
      const n = minPages * 250;
      return { minWords: n, maxWords: maxPages * 300 };
    }
    const pageQual = text.match(/(?:at\s+least|minimum|min\.?|no\s+less\s+than|>=)\s*(\d{1,3})\s*(?:page|pages|pg|pgs|pp)\b/);
    if (pageQual) {
      const pages = Math.min(Math.max(parseInt(pageQual[1], 10), 3), 100);
      const n = pages * 250;
      return { minWords: n, maxWords: Math.round(n * 1.3) };
    }
    const pageMatch = text.match(/(\d{1,3})\s*(?:page|pages|pg|pgs|pp)\b/);
    if (pageMatch) {
      const pages = Math.min(Math.max(parseInt(pageMatch[1], 10), 3), 40);
      const n = pages * 250;
      return { minWords: n, maxWords: Math.round(n * 1.25) };
    }
    // Reading time estimates (e.g., 20-minute read). Assume ~200 wpm minimum target.
    const minRead = text.match(/(\d{1,3})\s*(?:minute|minutes)\s*(?:read)?\b/);
    if (minRead) {
      const mins = Math.min(Math.max(parseInt(minRead[1], 10), 10), 120);
      const n = mins * 200;
      return { minWords: n, maxWords: Math.round(n * 1.3) };
    }
    const longKeywords = [
      'comprehensive', 'in-depth', 'deep dive', 'full chapter', 'chapter', 'thesis', 
      'dissertation','full work', 'thorough', 'long and detailed', 'in-depth research',
      'long-form', 'long form', 'extensive', 'elaborate', 'detailed report', 
      'complete review', 'white paper', 'comprehensive literature review', 
      'systematic review', 'state of the art', 'survey paper', 'ultimate guide',
      'comprehensive guide', 'long essay', 'long answer', 'end-to-end', 'from scratch',
      'detailed', 'in detail', 'break down', 'full explanation', 'full documentation',
      'background and literature review', 'tutorial series', 'monograph', 'treatise',
    
      // 🔥 More Academic Synonyms
      'extensive analysis', 'critical review', 'comparative study', 
      'meta-analysis', 'empirical study', 'research paper', 'case study',
      'doctoral thesis', 'scholarly article', 'peer-reviewed paper',
      'comprehensive examination', 'detailed discussion',
    
      // 🔥 Professional/Business Synonyms
      'industry report', 'market analysis', 'annual report', 'technical report',
      'technical documentation', 'strategic review', 'whitebook',
      'policy paper', 'business case', 'position paper', 'blueprint',
      'implementation guide', 'handbook', 'manual', 'playbook',
    
      // 🔥 SEO-Friendly / Casual Synonyms
      'step by step guide', 'how-to guide', 'definitive guide',
      'mega guide', 'masterclass', 'full walkthrough','full write up', 'knowledge base article',
      'encyclopedia entry', 'reference guide', 'learning resource',
      'training module', 'educational series', 'explained thoroughly',
    
      // 🔥 Long Content Styles
      'long read', 'feature article', 'op-ed essay', 'long story',
      'exposition', 'disquisition', 'comprehensive answer',
      'extensive write-up', 'lengthy explanation', 'in-depth walkthrough',
    
      // 🔥 Technical / Documentation Synonyms
      'specification document', 'design doc', 'project documentation',
      'architecture guide', 'engineering report', 'API reference',
      'developer documentation', 'end-user manual',
    
      // 🔥 Literature/Book Synonyms
      'research monograph', 'scholarly treatise', 'compendium',
      'encyclopedia', 'reference book', 'anthology', 'volume',
      'detailed narrative', 'lengthy manuscript', 'comprehensive textbook',
    
      // 🔥 Synonyms for Detail/Depth
      'granular analysis', 'microscopic view', 'holistic overview',
      'all-inclusive guide', 'full coverage', 'exhaustive guide',
      'step-by-step breakdown', 'extensive coverage', 'complete solution',
      'long version', 'expanded version', 'extended edition', 'annotated edition',
      
      // 🔥 NEW: File Analysis Keywords (for image/document analysis)
      'analyze this', 'analyze the', 'what does this show', 'explain this', 'describe this',
      'what is this', 'interpret this', 'examine this', 'review this', 'study this',
      'breakdown this', 'understand this', 'evaluate this', 'assess this',
      'analyze the image', 'analyze the document', 'analyze the file', 'analyze the chart',
      'analyze the graph', 'analyze the diagram', 'analyze the data', 'analyze the content',
      
      // 🔥 NEW: Academic Analysis Keywords
      'literature review', 'research analysis', 'theoretical framework', 'methodology',
      'data analysis', 'statistical analysis', 'qualitative analysis', 'quantitative analysis',
      'content analysis', 'discourse analysis', 'textual analysis', 'critical analysis',
      'comparative analysis', 'historical analysis', 'contextual analysis', 'empirical analysis',
      
      // 🔥 NEW: General Academic Terms
      'academic paper', 'research essay', 'academic writing', 'scholarly writing',
      'academic analysis', 'research project', 'academic study', 'scholarly research',
      'academic discussion', 'research discussion', 'academic exploration', 'scholarly exploration'
    ];
    
    if (longKeywords.some(k => text.includes(k))) {
      return { minWords: 7000, maxWords: 15000 };
    }
    
    // Default to substantial responses for most academic queries
    // Check if this appears to be an academic or analytical request
    const academicKeywords = [
      'explain', 'analyze', 'discuss', 'compare', 'contrast', 'evaluate', 'assess',
      'describe', 'examine', 'investigate', 'research', 'study', 'review', 'critique',
      'define', 'identify', 'interpret', 'demonstrate', 'illustrate', 'show',
      'academic', 'scholarly', 'research', 'analysis', 'theory', 'concept', 'principle'
    ];
    
    if (academicKeywords.some(k => text.includes(k))) {
      return { minWords: 1500, maxWords: 4000 };
    }
    
    return null;
  }

  private static prefixLongFormIfNeeded(
    message: string,
    longForm: { minWords: number; maxWords: number } | null
  ): string {
    if (!longForm) {
      // Default to substantial response for all queries
      const header = `Please provide a comprehensive, detailed academic response (minimum 1500 words) that thoroughly addresses the inquiry with depth and analysis.\n\n`;
      return header + message;
    }
    const { minWords } = longForm;
    const header = `Please provide a comprehensive long-form academic response (minimum ${minWords} words) with cohesive sections and continuous prose.\n\n`;
    return header + message;
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

  
}