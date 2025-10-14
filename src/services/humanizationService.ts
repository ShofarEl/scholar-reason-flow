import { HumanizationRequest, HumanizationResponse } from '@/types/scribe';
import { validateEnvironment, SUPABASE_ANON_KEY } from '@/lib/appConfig';
import { PaymentService } from '@/services/paymentService';

export class HumanizationService {
  // Use your Supabase Edge Function as proxy instead of direct API call
  private static readonly PROXY_URL = 'https://unhulaavbftqpvflarqi.supabase.co/functions/v1/stealthgpt-proxy';
  
  static async humanizeText(request: HumanizationRequest): Promise<HumanizationResponse> {
    // Check subscription before processing
    const wordCount = request.prompt.split(/\s+/).length;
    if (!(await PaymentService.canUseHumanizer(undefined, wordCount))) {
      throw new Error('Humanizer access denied. Please upgrade to Premium plan to use the humanizer feature.');
    }
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}: Sending humanization request via proxy...`);
        
        // Validate environment configuration
        const envIssues = validateEnvironment();
        if (envIssues.length > 0) {
          console.error('🔑 Environment configuration issues:', envIssues);
          throw new Error(`Configuration error: ${envIssues.join(', ')}. Please check your environment setup.`);
        }

        console.log('🌐 Using Supabase proxy to avoid CORS issues');
        console.log('📤 Request payload:', {
          prompt: request.prompt?.substring(0, 100) + '...',
          rephrase: request.rephrase,
          tone: request.tone,
          mode: request.mode,
          business: request.business
        });
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
        // Call your Supabase Edge Function proxy instead of direct API
        const response = await fetch(this.PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            prompt: request.prompt,
            rephrase: request.rephrase,
            tone: request.tone,
            mode: request.mode,
            business: request.business,
            isMultilingual: true,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        console.log('📡 Proxy response status:', response.status);
        console.log('📡 Proxy response ok:', response.ok);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle specific error cases from your proxy
          if (response.status === 402) {
            throw new Error(errorData.message || 'Payment required: Your StealthGPT account has insufficient credits. Please add more credits to your account.');
          }
          
          if (response.status === 401 || response.status === 403) {
            throw new Error(errorData.message || 'Unauthorized: Invalid or expired StealthGPT API key. Please check your API key in the StealthGPT dashboard.');
          }
          
          if (response.status === 400) {
            throw new Error(errorData.message || 'Invalid request: Missing required parameters or invalid request format.');
          }
          
          throw new Error(errorData.message || `Proxy error: ${response.status} ${response.statusText}`);
        }

        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('❌ Failed to parse response JSON:', parseError);
          const rawText = await response.text();
          console.error('Raw response:', rawText);
          throw new Error(`Invalid JSON response: ${rawText.substring(0, 200)}`);
        }
        
        console.log('📥 StealthGPT API response:', {
          success: data.success,
          hasResult: !!data.result,
          message: data.message,
          error: data.error,
          keys: Object.keys(data || {}),
          fullResponse: data
        });
        
        // Try different possible response formats from StealthGPT
        let humanizedText = null;
        let isSuccess = false;
        
        if (data.result && typeof data.result === 'string' && data.result.trim()) {
          // StealthGPT returns: { result: "text", howLikelyToBeDetected: 83, ... }
          humanizedText = data.result;
          isSuccess = true;
        } else if (data.success && data.result) {
          // Format 1: { success: true, result: "text" }
          humanizedText = data.result;
          isSuccess = true;
        } else if (data.data) {
          // Format 2: { data: "text" }
          humanizedText = data.data;
          isSuccess = true;
        } else if (data.output) {
          // Format 3: { output: "text" }
          humanizedText = data.output;
          isSuccess = true;
        } else if (data.text) {
          // Format 4: { text: "text" }
          humanizedText = data.text;
          isSuccess = true;
        } else if (data.humanized) {
          // Format 5: { humanized: "text" }
          humanizedText = data.humanized;
          isSuccess = true;
        } else if (typeof data === 'string') {
          // Format 6: Direct string response
          humanizedText = data;
          isSuccess = true;
        }
        
        if (isSuccess && humanizedText) {
          console.log(`✅ Humanization successful on attempt ${attempt}`);
          console.log(`📝 Result preview: ${humanizedText.substring(0, 100)}...`);
          
          // Update usage after successful humanization
          const inputWords = request.prompt.split(/\s+/).filter(Boolean).length;
          const outputWords = String(humanizedText || '').split(/\s+/).filter(Boolean).length;
          // Charge plan budget for both input and output words; track humanizer input words against 10k cap
          await PaymentService.updateUsage(undefined, 0, inputWords, inputWords + outputWords);
          
          return {
            result: humanizedText,
            success: true,
          };
        } else {
          const errorMessage = data.message || data.error || `Humanization failed - unexpected response format. Available keys: ${Object.keys(data || {}).join(', ')}`;
          console.error('❌ StealthGPT API failed:', errorMessage);
          console.error('❌ Full response for debugging:', data);
          throw new Error(errorMessage);
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt} failed:`, error);
        
        // Handle specific timeout error
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`⏰ Attempt ${attempt} timed out`);
          if (attempt === maxRetries) {
            return {
              result: request.prompt,
              success: false,
              message: 'Request timed out after multiple attempts. Please try again later or check your internet connection.',
            };
          }
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        
        // Handle network errors
        if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
          console.log(`🌐 Attempt ${attempt} network error:`, error.message);
          if (attempt === maxRetries) {
            return {
              result: request.prompt,
              success: false,
              message: `Network error: ${error.message}. Please check your connection and try again.`,
            };
          }
          await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
          continue;
        }
        
        // For other errors, don't retry
        console.error('Humanization service error:', error);
        return {
          result: request.prompt,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    }
    
    // If we get here, all retries failed
    console.error('All retry attempts failed');
    return {
      result: request.prompt,
      success: false,
      message: lastError ? lastError.message : 'All retry attempts failed',
    };
  }

  // Humanize full texts reliably by chunking long inputs and stitching results
  static async humanizeTextFull(
    request: HumanizationRequest & { maxChunkChars?: number }
  ): Promise<HumanizationResponse> {
    const text = request.prompt || '';
    const maxChunk = Math.max(1500, Math.min(request.maxChunkChars || 3500, 8000));

    const chunks = HumanizationService.splitIntoChunks(text, maxChunk);
    const outputs: string[] = [];
    let allSucceeded = true;

    for (const chunk of chunks) {
      const resp = await HumanizationService.humanizeText({
        prompt: chunk,
        rephrase: request.rephrase,
        tone: request.tone,
        mode: request.mode,
        business: request.business
      });
      if (resp.success && resp.result) {
        outputs.push(resp.result.trim());
      } else {
        // Guarantee coverage by including the original chunk when a sub-call fails
        allSucceeded = false;
        outputs.push(chunk);
      }
    }

    const combined = outputs.join('\n\n');
    return {
      result: combined,
      success: allSucceeded
    };
  }

  private static splitIntoChunks(text: string, maxLen: number): string[] {
    if (text.length <= maxLen) return [text];
    const paragraphs = text.split(/\n{2,}/);
    const chunks: string[] = [];
    let current = '';
    for (const para of paragraphs) {
      const candidate = current ? current + '\n\n' + para : para;
      if (candidate.length <= maxLen) {
        current = candidate;
      } else {
        if (current) chunks.push(current);
        if (para.length <= maxLen) {
          current = para;
        } else {
          // Split paragraph by sentences
          const sentences = para.split(/(?<=[\.!?])\s+/);
          let buf = '';
          for (const s of sentences) {
            const cand = buf ? buf + ' ' + s : s;
            if (cand.length <= maxLen) {
              buf = cand;
            } else {
              if (buf) chunks.push(buf);
              if (s.length > maxLen) {
                // Hard split long sentence
                for (let i = 0; i < s.length; i += maxLen) {
                  chunks.push(s.slice(i, i + maxLen));
                }
                buf = '';
              } else {
                buf = s;
              }
            }
          }
          if (buf) {
            current = buf;
          } else {
            current = '';
          }
        }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  static async analyzeText(text: string): Promise<{ aiDetected: boolean; confidence: number; suggestions: string[] }> {
    // This is a simplified analysis - in a real implementation, you might use additional APIs
    // or implement your own detection algorithms
    
    const aiIndicators = [
      /\b(furthermore|moreover|additionally|consequently|therefore)\b/gi,
      /\b(it is important to note|it should be noted|it is worth mentioning)\b/gi,
      /\b(in conclusion|to summarize|in summary)\b/gi,
      /\b(various|numerous|several|multiple)\b/gi,
    ];

    let indicatorCount = 0;
    const suggestions: string[] = [];

    aiIndicators.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        indicatorCount += matches.length;
        
        switch (index) {
          case 0:
            suggestions.push('Consider varying transition words for more natural flow');
            break;
          case 1:
            suggestions.push('Try using more conversational phrases instead of formal connectors');
            break;
          case 2:
            suggestions.push('Use more varied conclusion starters');
            break;
          case 3:
            suggestions.push('Replace vague quantifiers with specific numbers or examples');
            break;
        }
      }
    });

    // Simple confidence calculation based on indicators found
    const confidence = Math.min(indicatorCount / 10, 1) * 100;
    const aiDetected = confidence > 30;

    return {
      aiDetected,
      confidence,
      suggestions: [...new Set(suggestions)], // Remove duplicates
    };
  }
}