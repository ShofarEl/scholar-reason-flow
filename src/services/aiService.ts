import { supabase } from '@/lib/supabase';
import { AIModel, FileAttachment, Message } from '@/types/chat';
import { FileTextExtractor } from '@/utils/fileTextExtractor';

export interface AIResponse {
  content: string;
  responseTime: number;
  tokensUsed: number;
  model: AIModel;
}

export class AIService {
  static async sendMessage(
    message: string, 
    files: FileAttachment[], 
    model: AIModel,
    conversationHistory: Message[] = [],
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    console.log('Sending message to AI service:', { message, model, filesCount: files.length });
    
    try {
      // Choose the appropriate edge function based on model
      const functionName = model === 'reason-core' ? 'chat-deepseek' : 'chat-gemini';
      
      console.log(`Calling Supabase function: ${functionName}`);
      
      // Get the Supabase URL and key
      const supabaseUrl = 'https://unhulaavbftqpvflarqi.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaHVsYWF2YmZ0cXB2ZmxhcnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MTczMDgsImV4cCI6MjA2OTM5MzMwOH0.OYM1Hh8_FuhtKcMyfjPCllxodKQr7ysHwKrrxH6wwL8';
      
      // Make the request with fetch for streaming support
      const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          message,
          conversationHistory: conversationHistory.slice(-10), // Send last 10 messages for context
          files: await Promise.all(files.map(async f => {
            let content = '';
            try {
              // Check if we can extract text from this file type
              if (FileTextExtractor.isTextExtractable(f.type, f.name)) {
                // Get the actual File object from the URL
                const fileResponse = await fetch(f.url);
                const blob = await fileResponse.blob();
                const actualFile = new File([blob], f.name, { type: f.type });
                
                // Extract text content
                content = await FileTextExtractor.extractText(actualFile);
                
                // If content is empty or just metadata, provide file info
                if (!content || content.trim().length < 10 || content.startsWith('[') && content.endsWith(']')) {
                  content = `File: ${f.name} (${FileTextExtractor.getFileTypeDescription(actualFile)}) - Content available for analysis`;
                }
              }
            } catch (error) {
              console.error(`Error extracting content from ${f.name}:`, error);
              content = `File: ${f.name} (${FileTextExtractor.getFileTypeDescription({ name: f.name, type: f.type } as File)}) - Content available for analysis`;
            }
            
            return {
              name: f.name,
              type: f.type,
              size: f.size,
              preview: f.preview,
              content,
              fileTypeDescription: FileTextExtractor.getFileTypeDescription({ name: f.name, type: f.type } as File)
            };
          }))
        })
      });

      // Handle streaming response
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        return this.handleStreamingResponse(response, startTime, model, onChunk);
      }

      // Handle regular JSON response (fallback)
      const data = await response.json();

      console.log('Function response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Function error:', errorText);
        
        // Brand error messages to hide underlying service providers
        let errorMessage = errorText;
        if (errorMessage.toLowerCase().includes('gemini')) {
          errorMessage = errorMessage.replace(/gemini/gi, 'ScribeAI');
        }
        if (errorMessage.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to ScribeAI services. Please check your connection.';
        }
        if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('usage limit')) {
          errorMessage = 'ScribeAI usage limit has been reached for today. Please try again later.';
        }
        if (errorMessage.toLowerCase().includes('overload') || errorMessage.toLowerCase().includes('capacity')) {
          errorMessage = 'ScribeAI is experiencing high demand. Please try again in a moment.';
        }
        
        throw new Error(`ScribeAI service error: ${errorMessage}`);
      }

      if (data?.error) {
        console.error('API error:', data.error);
        
        // Brand error messages to hide underlying service providers
        let errorMessage = data.error;
        if (errorMessage.toLowerCase().includes('gemini')) {
          errorMessage = errorMessage.replace(/gemini/gi, 'ScribeAI');
        }
        if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('usage limit') || errorMessage.toLowerCase().includes('rate limit')) {
          errorMessage = 'ScribeAI usage limit has been reached for today. Please try again later.';
        }
        if (errorMessage.toLowerCase().includes('overload') || errorMessage.toLowerCase().includes('capacity')) {
          errorMessage = 'ScribeAI is experiencing high demand. Please try again in a moment.';
        }
        
        return {
          content: `I encountered an error: ${errorMessage}. Please try again or switch to a different model.`,
          responseTime: Date.now() - startTime,
          tokensUsed: 0,
          model
        };
      }

      return {
        content: data?.content || 'No response received from AI service.',
        responseTime: data?.responseTime || Date.now() - startTime,
        tokensUsed: data?.tokensUsed || 0,
        model: data?.model || model
      };

    } catch (error) {
      console.error('AI Service error:', error);
      
      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Brand error messages to hide underlying service providers
      if (errorMessage.toLowerCase().includes('gemini')) {
        errorMessage = errorMessage.replace(/gemini/gi, 'ScribeAI');
      }
      if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('usage limit')) {
        errorMessage = 'ScribeAI usage limit has been reached for today. Please try again later.';
      }
      if (errorMessage.toLowerCase().includes('overload') || errorMessage.toLowerCase().includes('capacity')) {
        errorMessage = 'ScribeAI is experiencing high demand. Please try again in a moment.';
      }
      
      return {
        content: `ScribeAI service unavailable: ${errorMessage}. Please check your connection and try again.`,
        responseTime: Date.now() - startTime,
        tokensUsed: 0,
        model
      };
    }
  }

  private static async handleStreamingResponse(
    response: Response,
    startTime: number,
    model: AIModel,
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let responseTime = 0;
    let tokensUsed = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.isComplete) {
              responseTime = data.responseTime || Date.now() - startTime;
              tokensUsed = data.tokensUsed || 0;
            } else if (data.content) {
              fullContent += data.content;
              onChunk?.(data.content);
            }
          } catch (parseError) {
            console.warn('Failed to parse streaming chunk:', parseError);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      responseTime: responseTime || Date.now() - startTime,
      tokensUsed,
      model,
    };
  }

  static async checkApiStatus(): Promise<{ [key in AIModel]?: 'online' | 'offline' | 'slow' }> {
    try {
      console.log('Checking API status...');
      
      // Quick health check calls to both APIs
      const [geminiCheck, deepseekCheck] = await Promise.allSettled([
        supabase.functions.invoke('chat-gemini', {
          body: { message: 'ping', files: [] }
        }),
        supabase.functions.invoke('chat-deepseek', {
          body: { message: 'ping', files: [] }
        })
      ]);

      const status: { [key in AIModel]?: 'online' | 'offline' | 'slow' } = {
        'scholar-mind': geminiCheck.status === 'fulfilled' && !geminiCheck.value.error ? 'online' as const : 'offline' as const,
        'reason-core': deepseekCheck.status === 'fulfilled' && !deepseekCheck.value.error ? 'online' as const : 'offline' as const
      };
      
      console.log('API status check result:', status);
      return status;
      
    } catch (error) {
      console.error('API status check failed:', error);
      return {
        'scholar-mind': 'offline',
        'reason-core': 'offline'
      };
    }
  }
}