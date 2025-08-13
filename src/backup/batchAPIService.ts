// Fixed BatchAPIService with correct Anthropic response parsing
import { WorkerType } from '@/types/scribe';

export interface BatchRequest {
  custom_id: string;
  body: {
    model: string;
    max_tokens: number;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
}

export interface BatchSubmissionResponse {
  batchId: string;
  status: 'submitted' | 'completed';
  projectTitle: string;
  citationStyle: string;
  projectType: string;
  requestCount: number;
  estimatedCompletion: string;
  message: string;
  createdAt?: string;
  completedAt?: string;
  completedCount?: number;
  failedCount?: number;
  results?: Array<{
    id: string;
    content: string;
    status: 'success' | 'error';
    tokens: number;
    error?: string | null;
  }>;
}

export interface BatchStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  results?: Array<{
    id: string;
    content: string;
    status: 'success' | 'error';
    tokens: number;
    error?: string;
    wordCount?: number;
  }>;
  error?: string;
  createdAt: string;
  completedAt?: string;
  requestCount: number;
  completedCount: number;
  failedCount: number;
  targetWordCount?: number;
  actualWordCount?: number;
}

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/appConfig';

// Correct Anthropic batch result structure based on official docs
interface AnthropicBatchResult {
  custom_id: string;
  result?: {
    type?: 'succeeded' | 'errored' | 'canceled' | 'expired' | string;
    message?: {
      id?: string;
      type?: 'message';
      role?: 'assistant';
      content?: Array<{ type: 'text'; text: string }>;
      model?: string;
      stop_reason?: string;
      stop_sequence?: string | null;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
      };
    };
    error?: {
      type?: string;
      message?: string;
    };
  };
  // Alternate (older) shapes
  type?: 'succeeded' | 'error' | string;
  message?: {
    type?: 'message';
    content?: Array<{ type: 'text'; text: string }> | string;
    usage?: { output_tokens?: number };
  };
  error?: { type?: string; message?: string };
}

export class BatchAPIService {
  private static readonly SUPABASE_URL = SUPABASE_URL;
  private static readonly SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

  // Correct parsing with guards for alternate shapes
  private static parseAnthropicResult(result: AnthropicBatchResult): {
    content: string;
    status: 'success' | 'error';
    tokens: number;
    error?: string;
  } {
    console.log(`🔍 Parsing result for ${result.custom_id}:`, JSON.stringify(result, null, 2));

    try {
      const res = result.result;

      // Primary path: documented shape
      if (res) {
        if (res.type === 'succeeded' && res.message) {
          const msg = res.message;
          const textContent = Array.isArray(msg?.content)
            ? msg.content
                .filter((item: any) => item && item.type === 'text' && typeof item.text === 'string')
                .map((item: any) => item.text)
                .join('\n')
                .trim()
            : '';

          if (!textContent) {
            return {
              content: 'Error: No text content found in successful response',
              status: 'error',
              tokens: 0,
              error: 'No text content found'
            };
          }

          return {
            content: textContent,
            status: 'success',
            tokens: msg?.usage?.output_tokens || 0
          };
        }

        if ((res.type === 'errored' || res.type === 'error') && res.error) {
          const message = res.error?.message || 'Unspecified error from Anthropic';
          return {
            content: `Error: ${message}`,
            status: 'error',
            tokens: 0,
            error: message
          };
        }

        if (res.type === 'canceled' || res.type === 'cancelled') {
          return {
            content: 'Error: Request was canceled',
            status: 'error',
            tokens: 0,
            error: 'Request was canceled'
          };
        }

        if (res.type === 'expired') {
          return {
            content: 'Error: Request expired before processing',
            status: 'error',
            tokens: 0,
            error: 'Request expired'
          };
        }

        if (typeof res.type === 'string') {
          console.warn(`⚠️ Unknown result type for ${result.custom_id}:`, res.type);
          return {
            content: `Error: Unknown result type: ${res.type}`,
            status: 'error',
            tokens: 0,
            error: `Unknown result type: ${res.type}`
          };
        }
      }

      // Alternate shapes
      if (result.type === 'succeeded' && result.message) {
        const msg = result.message as any;
        const textContent = Array.isArray(msg?.content)
          ? msg.content
              .filter((item: any) => item && item.type === 'text' && typeof item.text === 'string')
              .map((item: any) => item.text)
              .join('\n')
              .trim()
          : '';
        if (textContent) {
          return {
            content: textContent,
            status: 'success',
            tokens: msg?.usage?.output_tokens || 0
          };
        }
      }

      if ((result.type === 'errored' || result.type === 'error') && (result as any).error) {
        const message = (result as any).error?.message || 'Unspecified error from Anthropic';
        return {
          content: `Error: ${message}`,
          status: 'error',
          tokens: 0,
          error: message
        };
      }

      if ((result as any).error) {
        const message = (result as any).error?.message || 'Unspecified error from Anthropic';
        return {
          content: `Error: ${message}`,
          status: 'error',
          tokens: 0,
          error: message
        };
      }

      // Unrecognized structure
      console.warn(`⚠️ Unrecognized batch result structure for ${result.custom_id}:`, result);
      return {
        content: 'Error: Unrecognized batch result structure from Anthropic',
        status: 'error',
        tokens: 0,
        error: 'Unrecognized batch result structure'
      };

    } catch (parseError) {
      console.error(`❌ Error parsing result for ${result.custom_id}:`, parseError);
      return {
        content: `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
        status: 'error',
        tokens: 0,
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      };
    }
  }

  // Enhanced content sanitization
  private static sanitizeContent(content: string): string {
    console.log(`🧹 Sanitizing content:`, {
      originalLength: content?.length || 0,
      originalContent: content?.substring(0, 200),
      isString: typeof content === 'string',
      isTruthy: !!content
    });
    
    if (!content || typeof content !== 'string') {
      return 'Content generation failed - no valid text content received';
    }

    let cleaned = content
      // Remove meta-text patterns
      .replace(/\b(Would you like me to continue|Should I continue|Do you want me to proceed|Let me know if you'd like me to continue)\??/gi, '')
      .replace(/\[Note:.*?\]/g, '')
      .replace(/\[This section represents.*?\]/g, '')
      .replace(/\[Would you like me to continue.*?\]/g, '')
      // Remove system instructions and disclaimers
      .replace(/\b(Note:|Disclaimer:|Please note:).*?(?=\n|$)/gi, '')
      .replace(/\b(CRITICAL:|IMPORTANT:|Remember:|Keep in mind:).*?(?=\n|$)/gi, '')
      // Remove word count discussions
      .replace(/\b(This section represents approximately \d+%? of the requested length)\b/gi, '')
      .replace(/\b(Would you like me to continue with additional sections\?)\b/gi, '')
      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    // Ensure minimum content length
    if (cleaned.length < 100) {
      console.log(`⚠️ Content too short after sanitization:`, {
        cleanedLength: cleaned.length,
        cleanedContent: cleaned,
        originalLength: content.length
      });
      return `Error: Generated content too short (${cleaned.length} characters). Content: ${cleaned}`;
    }

    // Ensure proper markdown structure
    if (!cleaned.startsWith('#') && !cleaned.includes('#')) {
      cleaned = `# Section Content\n\n${cleaned}`;
    }

    return cleaned;
  }

  static async submitBatchJob(
    outline: string[],
    projectTitle: string,
    citationStyle: string = 'APA',
    projectType: string = 'academic',
    options?: {
      includeFigures?: boolean;
      includeTables?: boolean;
      targetWordsPerSection?: number;
    }
  ): Promise<BatchSubmissionResponse> {
    try {
      console.log(`🚀 Submitting batch job for project: ${projectTitle}`);
      console.log(`📝 Outline sections: ${outline.length}`);

      const requests: BatchRequest[] = outline.map((section, index) => {
        const targetWords = options?.targetWordsPerSection ?? 2500;
        const sectionPrompt = `
Write a comprehensive academic section for the project titled "${projectTitle}".

Section: ${section}
Citation Style: ${citationStyle}
Section Number: ${index + 1} of ${outline.length}

CRITICAL REQUIREMENTS:
- Minimum length: at least ${targetWords} words for this section
- This is part of a major academic project requiring substantial depth and detail
- Include thorough analysis, multiple perspectives, and extensive evidence
- Include relevant citations in ${citationStyle} format throughout
- ${options?.includeFigures === false ? 'Do NOT include figure placeholders.' : `Add figure placeholders where appropriate: [FIGURE ${index + 1}: Description]`}
- ${options?.includeTables === false ? 'Do NOT include table placeholders.' : 'Include table placeholders when summarizing data: [TABLE: Description]'}
- Ensure the section flows well with the overall project structure
- Maintain consistent academic tone throughout
- Provide comprehensive coverage of all aspects of the topic

STYLE REQUIREMENTS:
- Write in continuous academic prose with rich paragraphs
- Use markdown headings (## for main sections, ### for subsections)
- Present content as flowing paragraphs, not lists or bullet points
- Only use lists if absolutely necessary for references or brief enumerations

CONTENT STRUCTURE:
- Begin with a detailed introduction to the section topic
- Develop multiple subsections with clear headings
- Provide extensive analysis and critical discussion
- Include relevant examples and case studies
- Discuss theoretical frameworks and methodological considerations
- Address contemporary perspectives and debates
- Include practical applications where appropriate
- Conclude with synthesis connecting to the broader project

Write the complete section now as comprehensive academic content:`;

        return {
          custom_id: `section_${index + 1}_${section.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}`,
          body: {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 8192, // Use maximum allowed tokens
            messages: [
              {
                role: 'user',
                content: sectionPrompt
              }
            ]
          }
        };
      });

      const response = await fetch(`${this.SUPABASE_URL}/functions/v1/claude-batch-service/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          requests,
          projectTitle,
          citationStyle,
          projectType
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Batch submission error:', response.status, errorText);
        throw new Error(`ScribeAI batch submission failed: ${response.status} ${response.statusText}`);
      }

      const data: BatchSubmissionResponse = await response.json();
      console.log(`✅ Batch job submitted successfully: ${data.batchId}`);
      return data;

    } catch (error) {
      console.error('Batch API service error:', error);
      throw new Error(error instanceof Error ? error.message : 'ScribeAI batch service unavailable');
    }
  }

  static async checkBatchStatus(batchId: string): Promise<BatchStatusResponse> {
    try {
      console.log(`🔍 Checking batch status: ${batchId}`);

      const response = await fetch(`${this.SUPABASE_URL}/functions/v1/claude-batch-service/batch/${batchId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Batch status check error:', response.status, errorText);
        throw new Error(`ScribeAI batch status check failed: ${response.status} ${response.statusText}`);
      }

      const data: BatchStatusResponse = await response.json();
      
      // Process results if available
      if (data.results && data.results.length > 0) {
        console.log(`📊 Processing ${data.results.length} batch results...`);
        
        data.results = data.results.map((result: any, index: number) => {
          try {
            // If backend already normalized the result (has content/status), trust it
            if (typeof result?.content === 'string' && typeof result?.status === 'string') {
              const sanitizedContent = result.status === 'success' ? this.sanitizeContent(result.content) : result.content;
              const finalStatus = sanitizedContent.startsWith('Error:') ? 'error' : (result.status as 'success' | 'error');
            const wordCount = sanitizedContent.split(/\s+/).filter(Boolean).length;
            return {
              ...result,
                content: sanitizedContent,
                status: finalStatus,
                wordCount,
                tokens: typeof result.tokens === 'number' ? result.tokens : 0,
                error: result.error
              };
            }

            // Otherwise, parse Anthropic raw structure as fallback
            const parsed = this.parseAnthropicResult(result as any);
            const sanitizedContent = parsed.status === 'success' ? this.sanitizeContent(parsed.content) : parsed.content;
            const finalStatus = sanitizedContent.startsWith('Error:') ? 'error' : parsed.status;
            const wordCount = sanitizedContent.split(/\s+/).filter(Boolean).length;
            return {
              id: (result as any).custom_id || (result as any).id || `item_${index + 1}`,
              content: sanitizedContent,
              status: finalStatus,
              tokens: parsed.tokens,
              wordCount,
              error: parsed.error
            };
          } catch (parseError) {
            console.error(`❌ Error processing result ${index + 1}:`, parseError);
            return {
              id: (result as any)?.custom_id || (result as any)?.id || `item_${index + 1}`,
              content: `Error processing result: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
              status: 'error' as const,
              tokens: 0,
              wordCount: 0,
              error: parseError instanceof Error ? parseError.message : 'Unknown error'
            };
          }
        });

        // Update actual word count
        data.actualWordCount = data.results
          .filter(r => r.status === 'success')
          .reduce((sum, r) => sum + (r.wordCount || 0), 0);
      }
      
      const safeRequestCount = Math.max(data.requestCount || 0, 1);
      const safeCompletedCount = data.completedCount || 0;
      
      console.log(`📊 Batch status: ${data.status} - ${safeCompletedCount}/${safeRequestCount} completed`);
      
      return {
        ...data,
        requestCount: safeRequestCount,
        completedCount: safeCompletedCount
      };

    } catch (error) {
      console.error('Batch status check error:', error);
      throw new Error(error instanceof Error ? error.message : 'ScribeAI batch status unavailable');
    }
  }

  // Rest of the methods remain the same...
  static async pollBatchCompletion(
    batchId: string,
    onProgress?: (status: BatchStatusResponse) => void,
    pollInterval: number = 10000,
    maxPollTime: number = 30 * 60 * 1000
  ): Promise<BatchStatusResponse> {
    console.log(`🔄 Starting batch completion polling: ${batchId}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let pollCount = 0;
      let consecutiveErrors = 0;
      const maxConsecutiveErrors = 3;

      const poll = async () => {
        try {
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > maxPollTime) {
            console.error(`⏰ Batch polling timeout after ${Math.round(elapsedTime / 1000)} seconds: ${batchId}`);
            reject(new Error(`Batch processing timeout after ${Math.round(maxPollTime / 1000)} seconds. The batch may still be processing on Anthropic's servers.`));
            return;
          }

          pollCount++;
          console.log(`📊 Poll attempt ${pollCount} for batch: ${batchId} (${Math.round(elapsedTime / 1000)}s elapsed)`);

          const status = await this.checkBatchStatus(batchId);
          consecutiveErrors = 0;
          
          if (onProgress) {
            onProgress(status);
          }

          if (status.status === 'completed') {
            console.log(`✅ Batch completed successfully: ${batchId} after ${pollCount} polls`);
            
            if (!status.results || status.results.length === 0) {
              console.warn(`⚠️ Batch completed but no results found: ${batchId}`);
              // Wait a bit and try once more
              setTimeout(async () => {
                try {
                  const finalStatus = await this.checkBatchStatus(batchId);
                  if (finalStatus.results && finalStatus.results.length > 0) {
                    resolve(finalStatus);
                  } else {
                    reject(new Error('Batch completed but no results were retrieved. Please try checking the batch status manually.'));
                  }
                } catch (error) {
                  reject(new Error('Batch completed but failed to retrieve results.'));
                }
              }, 3000);
            } else {
              resolve(status);
            }
          } else if (status.status === 'failed') {
            console.error(`❌ Batch failed: ${batchId}`);
            reject(new Error(status.error || 'Batch processing failed'));
          } else if (status.status === 'processing') {
            console.log(`🔄 Batch is processing: ${batchId} - ${status.completedCount}/${status.requestCount} completed`);
            setTimeout(poll, pollInterval);
          } else {
            console.log(`⏳ Batch status: ${status.status} - continuing to poll...`);
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          consecutiveErrors++;
          console.error(`❌ Polling error (${consecutiveErrors}/${maxConsecutiveErrors}):`, error);
          
          if (consecutiveErrors >= maxConsecutiveErrors) {
            reject(new Error(`Failed to check batch status after ${maxConsecutiveErrors} consecutive attempts. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`));
          } else {
            // Exponential backoff on errors
            setTimeout(poll, pollInterval * Math.pow(2, consecutiveErrors - 1));
          }
        }
      };

      poll();
    });
  }

  static async processBatchProject(
    outline: string[],
    projectTitle: string,
    citationStyle: string = 'APA',
    onBatchId?: (batchId: string) => void,
    onProgress?: (status: BatchStatusResponse) => void,
    onSectionComplete?: (sectionIndex: number, content: string) => void,
    options?: {
      includeFigures?: boolean;
      includeTables?: boolean;
      targetWordsPerSection?: number;
    }
  ): Promise<string[]> {
    try {
      console.log(`🚀 Starting batch project processing: ${projectTitle}`);

      const submission = await this.submitBatchJob(outline, projectTitle, citationStyle, 'academic', options);
      console.log(`📝 Batch job submitted: ${submission.batchId}`);
      
      if (onBatchId) {
        onBatchId(submission.batchId);
      }

      // Check if results are immediately available
      if (submission.status === 'completed' && submission.results && submission.results.length > 0) {
        console.log(`⚡ Immediate completion received for batch: ${submission.batchId}`);
        const sections: string[] = [];
        
        submission.results.forEach((result, index) => {
          if (result.status === 'success') {
            const sanitizedContent = this.sanitizeContent(result.content);
            sections.push(sanitizedContent);
            
            if (onSectionComplete) {
              onSectionComplete(index, sanitizedContent);
            }
          } else {
            console.error(`❌ Section ${index + 1} failed:`, result.error);
            sections.push(`[Error processing section ${index + 1}: ${result.error}]`);
          }
        });
        
        console.log(`✅ Batch project completed (immediate): ${sections.length} sections processed`);
        return sections;
      }

      // Poll for completion
      const finalStatus = await this.pollBatchCompletion(
        submission.batchId,
        (status) => {
          const progressPercent = status.requestCount > 0 ? 
            (status.completedCount / status.requestCount) * 100 : 0;
          console.log(`📊 Progress: ${status.completedCount}/${status.requestCount} completed (${progressPercent.toFixed(1)}%)`);
          
          if (onProgress) {
            onProgress(status);
          }
        }
      );

      if (!finalStatus.results || finalStatus.results.length === 0) {
        throw new Error('No results received from batch processing. The batch may have completed but results are not available.');
      }

      // Process final results
      const sections: string[] = [];
      const successfulSections: number[] = [];
      const failedSections: { index: number; error: string }[] = [];

      finalStatus.results.forEach((result, index) => {
        console.log(`Processing final result ${index + 1}:`, {
          id: result.id,
          status: result.status,
          contentLength: result.content?.length || 0,
          wordCount: result.wordCount || 0,
          error: result.error
        });
        
        if (result.status === 'success' && result.content && result.content.trim()) {
          const sanitizedContent = this.sanitizeContent(result.content);
          sections.push(sanitizedContent);
          successfulSections.push(index + 1);
          
          if (onSectionComplete) {
            onSectionComplete(index, sanitizedContent);
          }
        } else {
          // Ensure we have a meaningful error message
          let errorMsg = result.error || 'Unknown error occurred during processing';
          
          console.error(`❌ Section ${index + 1} failed:`, errorMsg);
          failedSections.push({ index: index + 1, error: errorMsg });
          
          sections.push(`# Section ${index + 1}: Error\n\n[Error processing section: ${errorMsg}]`);
        }
      });

      // Log final statistics
      const totalWords = sections.reduce((sum, section) => {
        return sum + section.split(/\s+/).filter(Boolean).length;
      }, 0);

      console.log(`✅ Batch project completed:`);
      console.log(`   📊 Total sections: ${sections.length}`);
      console.log(`   ✅ Successful: ${successfulSections.length}`);
      console.log(`   ❌ Failed: ${failedSections.length}`);
      console.log(`   📝 Total words: ${totalWords.toLocaleString()}`);
      
      if (failedSections.length > 0) {
        console.warn(`⚠️ Failed sections:`, failedSections);
      }

      return sections;

    } catch (error) {
      console.error('Batch project processing error:', error);
      throw new Error(error instanceof Error ? error.message : 'Batch project processing failed');
    }
  }

  static getBatchStats(results: Array<{
    id: string;
    content: string;
    status: 'success' | 'error';
    tokens: number;
    wordCount?: number;
  }>) {
    const successfulResults = results.filter(r => r.status === 'success');
    const totalWords = successfulResults.reduce((sum, result) => {
      const wordCount = result.wordCount || result.content.split(/\s+/).filter(Boolean).length;
      return sum + wordCount;
    }, 0);
    
    const totalTokens = successfulResults.reduce((sum, result) => sum + result.tokens, 0);
    const avgWordsPerSection = successfulResults.length > 0 ? totalWords / successfulResults.length : 0;
    const successRate = results.length > 0 ? (successfulResults.length / results.length) * 100 : 0;

    return {
      totalWords,
      avgWordsPerSection,
      successRate,
      totalTokens,
      completedSections: successfulResults.length,
      totalSections: results.length
    };
  }

  static async checkBatchAvailability(): Promise<{ available: boolean; message: string }> {
    try {
      const response = await fetch(`${this.SUPABASE_URL}/functions/v1/claude-batch-service/batch`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
        },
      });

      return {
        available: response.ok,
        message: response.ok ? 'Batch processing is available' : 'Batch processing is currently unavailable'
      };
    } catch (error) {
      return {
        available: false,
        message: 'Unable to check batch processing availability'
      };
    }
  }

  static estimateProcessingTime(sectionCount: number): {
    minMinutes: number;
    maxMinutes: number;
    targetWords: number;
  } {
    const targetWords = sectionCount * 2500;
    const minMinutes = Math.max(5, Math.ceil(sectionCount * 0.5));
    const maxMinutes = Math.ceil(sectionCount * 2);
    
    return {
      minMinutes,
      maxMinutes,
      targetWords
    };
  }

  static async debugBatchConfiguration(): Promise<{
    supabaseUrl: string;
    hasApiKey: boolean;
    endpointAccessible: boolean;
    message: string;
  }> {
    try {
      const hasApiKey = !!this.SUPABASE_ANON_KEY;
      const endpointAccessible = await this.checkBatchAvailability();
      
      return {
        supabaseUrl: this.SUPABASE_URL,
        hasApiKey,
        endpointAccessible: endpointAccessible.available,
        message: endpointAccessible.message
      };
    } catch (error) {
      return {
        supabaseUrl: this.SUPABASE_URL,
        hasApiKey: !!this.SUPABASE_ANON_KEY,
        endpointAccessible: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async debugBatchResults(batchId: string): Promise<{
    batchId: string;
    status: any;
    debugResults: any;
    success: boolean;
  }> {
    try {
      const response = await fetch(`${this.SUPABASE_URL}/functions/v1/claude-batch-service/batch/${batchId}/debug`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Debug request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Debug batch results error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to debug batch results');
    }
  }
}