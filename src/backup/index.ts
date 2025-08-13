// Fixed backend function with correct Anthropic batch response parsing
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// Content sanitization function to remove meta-text and cleanup content
const sanitizeContent = (content: string): string => {
  console.log(`🧹 Sanitizing content:`, {
    originalLength: content?.length || 0,
    originalContent: content?.substring(0, 200),
    isString: typeof content === 'string',
    isTruthy: !!content
  });
  
  if (!content || typeof content !== 'string') {
    return 'Content generation failed - no valid text content received';
  }

  // Remove common meta-text patterns
  let cleaned = content
    // Remove continuation prompts
    .replace(/\b(Would you like me to continue|Should I continue|Do you want me to proceed|Let me know if you'd like me to continue)\??/gi, '')
    // Remove bracketed notes
    .replace(/\[Note:.*?\]/g, '')
    .replace(/\[This section represents.*?\]/g, '')
    .replace(/\[Would you like me to continue.*?\]/g, '')
    // Remove disclaimers
    .replace(/\b(Note:|Disclaimer:|Please note:).*?(?=\n|$)/gi, '')
    // Remove system instructions
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
    return `Error: Generated content too short (${cleaned.length} characters). Original content: ${content.substring(0, 200)}...`;
  }

  // Ensure proper markdown structure
  if (!cleaned.startsWith('#') && !cleaned.includes('#')) {
    cleaned = `# Section Content\n\n${cleaned}`;
  }

  return cleaned;
};

// Enhanced system prompt generator for batch processing with high word count targets
const generateBatchSystemPrompt = (requestType: string, projectTitle: string, citationStyle: string, chapterContext: string | null = null) => {
  const basePrompt = `You are ScribeAI, an advanced academic writing AI specializing in comprehensive scholarly projects. You are working on a large-scale academic project titled "${projectTitle}" using ${citationStyle} citation style.

CRITICAL OUTPUT REQUIREMENTS:
- MINIMUM LENGTH: Generate at least 2,500-3,000 words per section/chapter to ensure comprehensive coverage
- Write in continuous academic prose with rich, detailed paragraphs
- Use clear markdown headings and subheadings (#, ##, ###) but present all substantive content as flowing paragraphs
- Avoid bullet points, numbered lists, or outline-style enumeration in the main body
- Maintain scholarly tone, coherence, and narrative flow throughout
- Include detailed examples, case studies, and thorough analysis
- Expand on concepts with multiple perspectives and comprehensive explanations

DEPTH AND COMPREHENSIVENESS:
- Provide exhaustive coverage of the topic with multiple layers of analysis
- Include relevant theoretical frameworks, methodological considerations, and practical applications
- Synthesize multiple sources and perspectives into original insights
- Use extensive examples and detailed explanations to reach the target word count
- Ensure each paragraph contains 150-200 words minimum with substantial content

STRICT OUTPUT HYGIENE (MANDATORY):
- Do NOT include meta commentary, system notes, or apologies
- Do NOT ask questions like "Would you like me to continue?" or request confirmation
- Do NOT include bracketed notes like [Note: ...] or any production annotations
- Do NOT include disclaimers or continuation prompts
- Do NOT include phrases like "This section represents approximately X of the requested length"
- Do NOT include any text about word count targets or continuation requests
- Output ONLY the final content in clean, properly structured Markdown
- Avoid prepend/append boilerplate; no closing statements like "In conclusion" unless conceptually required by the section
- Deliver content that is immediately usable without any cleanup required
- Focus on delivering complete, comprehensive content without any meta-discussion`;
  
  return `${basePrompt}

TASK: Generate comprehensive academic content (minimum 2,500 words) with extensive detail and scholarly depth.

DETAILED APPROACH:
- Develop sophisticated arguments with multiple layers going beyond surface analysis
- Synthesize numerous sources and perspectives into comprehensive original insights
- Write with authority expected in doctoral-level academic work
- Integrate extensive citations seamlessly into comprehensive analytical prose
- Build ideas progressively with comprehensive intellectual momentum
- Demonstrate comprehensive mastery while remaining accessible
- Include extensive examples and detailed explanations
- Provide multiple perspectives and comprehensive comparative analysis

${chapterContext ? `CONTENT FOCUS: ${chapterContext}` : ''}

Generate comprehensive content worthy of publication in top-tier academic venues.`;
};

// Batch status tracker (in production, use Redis or database)
const batchTracker = new Map();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;
  const segments = pathname.split('/').filter(Boolean);

  // Helpers for robust routing regardless of deployment path prefix
  const isPostBatch = req.method === 'POST' && segments[segments.length - 1] === 'batch';
  const isGetBatchStatus = req.method === 'GET' && segments[segments.length - 2] === 'batch' && segments.length >= 2;
  const isDebugBatch = req.method === 'GET' && segments[segments.length - 1] === 'debug' && segments[segments.length - 2] === 'batch';
  const getBatchIdFromPath = () => segments[segments.length - 1];

  try {
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    
    if (!CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY environment variable not set');
      return new Response(JSON.stringify({
        error: 'ScribeAI batch processing is not configured. Please set CLAUDE_API_KEY environment variable.',
        success: false,
        service: 'ScribeAI Batch Processing',
        code: 'MISSING_API_KEY'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate API key format
    if (!CLAUDE_API_KEY.startsWith('sk-ant-')) {
      console.error('Invalid CLAUDE_API_KEY format');
      return new Response(JSON.stringify({
        error: 'ScribeAI batch processing configuration error. Please provide a valid Anthropic API key starting with "sk-ant-".',
        success: false,
        service: 'ScribeAI Batch Processing',
        code: 'INVALID_API_KEY'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle batch submission
    if (isPostBatch) {
      const { requests, projectTitle, citationStyle = 'APA', projectType = 'academic' } = await req.json();
      
      console.log(`Creating enhanced batch job for project: ${projectTitle}`);
      console.log(`Number of requests: ${requests.length}`);
      console.log(`Target: 12,500+ words total across ${requests.length} sections`);

      // Enhanced request processing with high word count targets
      const MAX_OUTPUT_TOKENS = 8192; // Maximum allowed by Claude API
      
      const enhancedRequests = requests.map((req: any) => {
        // Extract request type from custom_id
        const customIdLower = req.custom_id.toLowerCase();
        const requestType = customIdLower.includes('intro') ? 'introduction' :
                           customIdLower.includes('literature') ? 'literature_review' :
                           customIdLower.includes('method') ? 'methodology' :
                           customIdLower.includes('analysis') ? 'analysis' :
                           customIdLower.includes('conclusion') ? 'conclusion' :
                           customIdLower.includes('chapter') ? 'chapter' : 'default';

        // Extract context from the original request
        const originalMessage = req.body.messages?.[0]?.content || '';
        const chapterContext = originalMessage.length > 100 ? 
                              originalMessage.substring(0, 300) + '...' : 
                              originalMessage;

        // Generate enhanced system prompt targeting high word counts
        const enhancedSystemPrompt = generateBatchSystemPrompt(
          requestType, 
          projectTitle, 
          citationStyle, 
          chapterContext
        );

        // Enforce a final assistant clean-up instruction to strip any stray meta text
        const cleanupInstruction = {
          role: 'user',
          content: 'FINAL INSTRUCTION: Deliver ONLY the complete academic content in clean Markdown format. Remove any meta-text, continuation prompts, word count discussions, or bracketed notes. The content should be immediately usable without any cleanup. Do not ask questions or include any text about continuing or word count targets.'
        };

        return {
          custom_id: req.custom_id,
          params: {
            model: req.body.model || 'claude-3-5-sonnet-20241022',
            max_tokens: MAX_OUTPUT_TOKENS, // Use maximum tokens for comprehensive output
            temperature: 0.7, // Balanced creativity for academic writing
            messages: Array.isArray(req.body.messages) ? [...req.body.messages, cleanupInstruction] : [cleanupInstruction],
            system: enhancedSystemPrompt
          }
        };
      });

      console.log('Submitting to Anthropic Batch API with enhanced prompts for high word count...');

      // Create batch job with Claude API
      const batchResponse = await fetch('https://api.anthropic.com/v1/messages/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'message-batches-2024-09-24'
        },
        body: JSON.stringify({
          requests: enhancedRequests
        })
      });

      console.log(`Anthropic Batch API Response Status: ${batchResponse.status}`);
      
      if (!batchResponse.ok) {
        const errorData = await batchResponse.text();
        console.error('Anthropic Batch API Error:', {
          status: batchResponse.status,
          statusText: batchResponse.statusText,
          body: errorData
        });

        let clientError = '';
        switch (batchResponse.status) {
          case 401:
            clientError = 'Authentication failed. Please verify your Anthropic API key.';
            break;
          case 429:
            clientError = 'Rate limit exceeded. Please try again later.';
            break;
          case 400:
            clientError = 'Invalid request format. Please check your project configuration.';
            break;
          default:
            clientError = `Batch API request failed with status ${batchResponse.status}`;
        }

        return new Response(JSON.stringify({
          error: `ScribeAI batch processing error: ${clientError}`,
          success: false,
          service: 'ScribeAI Batch Processing',
          details: {
            status: batchResponse.status,
            apiError: errorData
          }
        }), {
          status: batchResponse.status === 401 ? 500 : batchResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const batchData = await batchResponse.json();
      console.log('Batch created successfully:', batchData.id);

      // Store batch info for tracking
      batchTracker.set(batchData.id, {
        projectTitle,
        citationStyle,
        projectType,
        requestCount: enhancedRequests.length,
        createdAt: new Date().toISOString(),
        targetWordCount: enhancedRequests.length * 2500 // Estimate 2,500 words per section
      });

      return new Response(JSON.stringify({
        batchId: batchData.id,
        status: 'submitted',
        projectTitle,
        citationStyle,
        projectType,
        requestCount: enhancedRequests.length,
        targetWordCount: enhancedRequests.length * 2500,
        estimatedCompletion: new Date(Date.now() + (enhancedRequests.length * 60000)), // 1 min per section estimate
        message: `ScribeAI is processing your academic project targeting ${enhancedRequests.length * 2500}+ words with comprehensive scholarly intelligence`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (isGetBatchStatus) {
      const batchId = getBatchIdFromPath();
      console.log(`Checking batch status: ${batchId}`);

      const statusResponse = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}`, {
        method: 'GET',
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'message-batches-2024-09-24'
        }
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.text();
        console.error('Batch status check error:', statusResponse.status, errorData);
        
        return new Response(JSON.stringify({
          error: `Batch status check failed (${statusResponse.status})`,
          success: false,
          service: 'ScribeAI Batch Processing'
        }), {
          status: statusResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const statusData = await statusResponse.json();
      const batchInfo = batchTracker.get(batchId) || {};

      // Map batch status to user-friendly messages (Anthropic: in_progress | canceling | ended)
      let mappedStatus: string, statusMessage: string;
      const processingStatus = statusData.processing_status;
      switch (processingStatus) {
        case 'in_progress':
          mappedStatus = 'processing';
          statusMessage = `ScribeAI is generating your ${batchInfo.targetWordCount || 'comprehensive'} word academic project...`;
          break;
        case 'ended':
          mappedStatus = 'completed';
          statusMessage = 'Your comprehensive academic project is ready for review';
          break;
        case 'canceling':
          mappedStatus = 'processing';
          statusMessage = 'Batch is canceling. Some requests may still complete while cancellation finalizes.';
          break;
        default:
          mappedStatus = 'pending';
          statusMessage = 'Your project is queued for processing';
      }

      let processedResults = null;

      // Fetch and process results if completed (ended)
      if (processingStatus === 'ended' && statusData.results_url) {
        try {
          console.log(`📦 Fetching results from: ${statusData.results_url}`);
          
          const resultsResponse = await fetch(statusData.results_url, {
            headers: {
              'x-api-key': CLAUDE_API_KEY,
              'anthropic-version': '2023-06-01',
              'anthropic-beta': 'message-batches-2024-09-24'
            }
          });

          if (resultsResponse.ok) {
            const resultsText = await resultsResponse.text();
            console.log(`📦 Raw results length: ${resultsText.length} characters`);
            
            const trimmed = resultsText.trim();
            if (!trimmed) {
              console.warn('⚠️ Empty results received from Anthropic');
              processedResults = [];
            } else {
              try {
                // Parse JSONL format (one JSON object per line)
                const results = trimmed.split('\n')
                  .filter(line => line.trim())
                  .map((line, index) => {
                    try {
                      return JSON.parse(line);
                    } catch (parseError) {
                      console.error(`❌ Error parsing result line ${index + 1}:`, parseError, 'Line:', line.substring(0, 200));
                      return null;
                    }
                  })
                  .filter(result => result !== null);
                
                console.log(`📊 Successfully parsed ${results.length} results`);
                
                // Process results with correct parsing
                processedResults = results.map((result, index) => {
                  console.log(`🔄 Processing result ${index + 1} of ${results.length}...`);
                  console.log(`🔍 Raw result structure:`, {
                    custom_id: result.custom_id || result.id,
                    result_type: result.result?.type,
                    hasMessage: !!result.result?.message,
                    hasError: !!result.result?.error,
                    keys: Object.keys(result)
                  });
                  
                  const parsed = parseAnthropicBatchResult(result as AnthropicBatchResult);
                  console.log(`📝 Parsed result for ${(result as any).custom_id || (result as any).id}:`, {
                    status: parsed.status,
                    contentLength: parsed.content?.length || 0,
                    tokens: parsed.tokens,
                    error: parsed.error
                  });
                  
                  const sanitizedContent = parsed.status === 'success' ? 
                    sanitizeContent(parsed.content) : parsed.content;
                  
                  // Check if sanitization returned an error message
                  const finalStatus = sanitizedContent.startsWith('Error:') ? 'error' : parsed.status;
                  let finalError = sanitizedContent.startsWith('Error:') ? sanitizedContent : parsed.error;
                  
                  // Ensure we have a meaningful error message
                  if (finalStatus === 'error' && !finalError) {
                    finalError = 'Unknown error occurred during processing';
                  }
                  
                  const wordCount = sanitizedContent.split(/\s+/).filter(Boolean).length;

                  console.log(`✅ Processed ${(result as any).custom_id || (result as any).id}: ${finalStatus}, ${wordCount} words`);
                  
                  return {
                    id: (result as any).custom_id || (result as any).id || `item_${index + 1}`,
                    content: sanitizedContent,
                    status: finalStatus,
                    tokens: parsed.tokens,
                    wordCount,
                    error: finalError
                  };
                });

                // Calculate total word count
                const totalWords = processedResults
                  .filter(r => r.status === 'success')
                  .reduce((sum, result) => sum + (result.wordCount || 0), 0);
                
                console.log(`📊 Batch completed with ${totalWords} total words across ${processedResults.length} sections`);
                console.log(`📊 Success rate: ${processedResults.filter(r => r.status === 'success').length}/${processedResults.length}`);
                
              } catch (jsonError) {
                console.error('❌ Error parsing results JSON:', jsonError);
                processedResults = [{
                  id: 'parse_error',
                  content: `Error parsing results: ${jsonError instanceof Error ? jsonError.message : 'Unknown JSON error'}`,
                  status: 'error',
                  tokens: 0,
                  wordCount: 0,
                  error: 'Results parsing failed'
                }];
              }
            }
          } else {
            console.error(`❌ Failed to fetch results: ${resultsResponse.status} ${resultsResponse.statusText}`);
            const errorText = await resultsResponse.text();
            console.error('❌ Results fetch error body:', errorText);
          }
        } catch (resultsError) {
          console.error('❌ Error processing results:', resultsError);
          processedResults = [{
            id: 'results_error',
            content: `Error fetching results: ${resultsError instanceof Error ? resultsError.message : 'Unknown error'}`,
            status: 'error',
            tokens: 0,
            wordCount: 0,
            error: 'Results fetch failed'
          }];
        }
      }

      // Compute robust request counts
      const counts = statusData.request_counts || {};
      const requestCountTotal =
        (counts.processing || 0) +
        (counts.succeeded || 0) +
        (counts.errored || 0) +
        (counts.canceled || 0) +
        (counts.expired || 0);

      const response = {
        id: batchId,
        status: mappedStatus,
        message: statusMessage,
        results: processedResults,
        error: statusData.processing_status === 'failed' ? 
               'ScribeAI batch processing failed. Please try again with adjusted parameters.' : undefined,
        createdAt: statusData.created_at ? new Date(statusData.created_at).toISOString() : batchInfo.createdAt,
        completedAt: statusData.ended_at ? new Date(statusData.ended_at).toISOString() : undefined,
        requestCount: requestCountTotal || batchInfo.requestCount || 0,
        completedCount: (counts.succeeded || 0) + (counts.errored || 0) + (counts.canceled || 0) + (counts.expired || 0),
        failedCount: (counts.errored || 0) + (counts.canceled || 0) + (counts.expired || 0),
        targetWordCount: batchInfo.targetWordCount,
        actualWordCount: processedResults ? 
          processedResults
            .filter(r => r.status === 'success')
            .reduce((sum, result) => sum + (result.wordCount || 0), 0) : null
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (isDebugBatch) {
      const batchId = getBatchIdFromPath();
      console.log(`🔍 Debug request for batch: ${batchId}`);

      try {
        const statusResponse = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}`, {
          method: 'GET',
          headers: {
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'message-batches-2024-09-24'
          }
        });

        if (!statusResponse.ok) {
          return new Response(JSON.stringify({
            error: `Debug failed: ${statusResponse.status} ${statusResponse.statusText}`,
            success: false,
            service: 'ScribeAI Batch Processing'
          }), {
            status: statusResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const statusData = await statusResponse.json();
        let debugResults = null;

        if (statusData.results_url) {
          try {
            const resultsResponse = await fetch(statusData.results_url, {
              headers: {
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'message-batches-2024-09-24'
              }
            });

            if (resultsResponse.ok) {
              const resultsText = await resultsResponse.text();
              
              // Parse a sample result for debugging
              const lines = resultsText.split('\n').filter(line => line.trim());
              let sampleParsed = null;
              
              if (lines.length > 0) {
                try {
                  const sampleResult = JSON.parse(lines[0]) as AnthropicBatchResult;
                  sampleParsed = {
                    custom_id: sampleResult.custom_id,
                    result_type: sampleResult.result?.type,
                    has_message: !!sampleResult.result?.message,
                    has_error: !!sampleResult.result?.error,
                    content_preview: sampleResult.result?.message?.content?.[0]?.text?.substring(0, 200) || 'No content',
                    usage_tokens: sampleResult.result?.message?.usage?.output_tokens || 0
                  };
                } catch (sampleError) {
                  sampleParsed = { error: sampleError instanceof Error ? sampleError.message : 'Unknown error' };
                }
              }
              
              debugResults = {
                rawTextLength: resultsText.length,
                totalLines: lines.length,
                firstLine: lines[0]?.substring(0, 500) || 'No content',
                sampleParsed
              };
            }
          } catch (error) {
            debugResults = { error: error instanceof Error ? error.message : 'Unknown error' };
          }
        }

        return new Response(JSON.stringify({
          batchId,
          status: statusData,
          debugResults,
          success: true,
          service: 'ScribeAI Batch Processing'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          error: `Debug error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          success: false,
          service: 'ScribeAI Batch Processing'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      return new Response(JSON.stringify({
        error: 'ScribeAI batch endpoint not found',
        availableEndpoints: [
          'POST /batch - Submit batch processing job for 12,500+ word projects',
          'GET /batch/{id} - Check batch status and retrieve comprehensive results',
          'GET /batch/{id}/debug - Debug batch processing issues'
        ],
        service: 'ScribeAI Batch Processing'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('ScribeAI Batch service error:', error);
    
    const errorMessage = error instanceof Error ? 
      `ScribeAI batch service error: ${error.message}` :
      'ScribeAI batch service temporarily unavailable';

    return new Response(JSON.stringify({
      error: errorMessage,
      success: false,
      service: 'ScribeAI Batch Processing',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Correct Anthropic batch result structure based on official documentation
interface AnthropicBatchResult {
  custom_id: string;
  result: {
    type: 'succeeded' | 'errored' | 'canceled' | 'expired';
    message?: {
      id: string;
      type: 'message';
      role: 'assistant';
      content: Array<{ type: 'text'; text: string }>;
      model: string;
      stop_reason: string;
      stop_sequence: string | null;
      usage: {
        input_tokens: number;
        output_tokens: number;
      };
    };
    error?: {
      type: string;
      message: string;
    };
  };
}

// Correct parsing function based on actual Anthropic batch response format, with guards for alternate shapes
const parseAnthropicBatchResult = (result: any): { 
  content: string; 
  status: 'success' | 'error'; 
  tokens: number; 
  error?: string 
} => {
  console.log(`🔍 Parsing result for ${result?.custom_id}:`, JSON.stringify(result, null, 2));

  try {
    // Newer official shape: root.type indicates status, root.result holds the Message on success
    if (result?.type === 'succeeded' && result?.result) {
      const node = result.result;
      const textContent = Array.isArray(node?.content)
        ? node.content
            .filter((item: any) => item && item.type === 'text' && typeof item.text === 'string')
            .map((item: any) => item.text)
            .join('\n')
            .trim()
        : '';

      if (textContent) {
        return {
          content: textContent,
          status: 'success',
          tokens: node?.usage?.output_tokens || 0
        };
      }
    }

    if ((result?.type === 'error' || result?.type === 'errored') && result?.error) {
      const errorMessage = result?.error?.message || 'Unspecified error from Anthropic';
      return {
        content: `Error: ${errorMessage}`,
        status: 'error',
        tokens: 0,
        error: errorMessage
      };
    }

    const res = result?.result;

    // Primary path (documented batch shape)
    if (res) {
      if (res.type === 'succeeded' && res.message) {
        const message = res.message;
        const textContent = Array.isArray(message?.content)
          ? message.content
              .filter((item: any) => item && item.type === 'text' && typeof item.text === 'string')
              .map((item: any) => item.text)
              .join('\n')
              .trim()
          : '';

        if (!textContent) {
          console.warn(`⚠️ No text content found for successful result ${result.custom_id}`);
          return {
            content: 'Error: No text content found in successful response',
            status: 'error',
            tokens: 0,
            error: 'No text content found in successful response'
          };
        }

        console.log(`✅ Successfully parsed ${result.custom_id}: ${textContent.length} characters`);
        return {
          content: textContent,
          status: 'success',
          tokens: message?.usage?.output_tokens || 0
        };
      }

      if ((res.type === 'errored' || res.type === 'error') && res.error) {
        const errorMessage = res.error?.message || 'Unspecified error from Anthropic';
        console.log(`❌ Error result for ${result.custom_id}: ${errorMessage}`);
        return {
          content: `Error: ${errorMessage}`,
          status: 'error',
          tokens: 0,
          error: errorMessage
        };
      }

      if (res.type === 'canceled' || res.type === 'cancelled') {
        console.log(`🚫 Canceled result for ${result.custom_id}`);
        return {
          content: 'Error: Request was canceled',
          status: 'error',
          tokens: 0,
          error: 'Request was canceled'
        };
      }

      if (res.type === 'expired') {
        console.log(`⏰ Expired result for ${result.custom_id}`);
        return {
          content: 'Error: Request expired before processing',
          status: 'error',
          tokens: 0,
          error: 'Request expired'
        };
      }

      // Unknown documented result type
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

    // Alternate shapes (older or different API surfaces)
    if (result?.type === 'succeeded' && result?.message) {
      const message = result.message;
      const textContent = Array.isArray(message?.content)
        ? message.content
            .filter((item: any) => item && item.type === 'text' && typeof item.text === 'string')
            .map((item: any) => item.text)
            .join('\n')
            .trim()
        : '';
      if (textContent) {
        return {
          content: textContent,
          status: 'success',
          tokens: message?.usage?.output_tokens || 0
        };
      }
    }

    if ((result?.type === 'errored' || result?.type === 'error') && result?.error) {
      const errorMessage = result?.error?.message || 'Unspecified error from Anthropic';
      return {
        content: `Error: ${errorMessage}`,
        status: 'error',
        tokens: 0,
        error: errorMessage
      };
    }

    if (result?.error) {
      const errorMessage = result?.error?.message || 'Unspecified error from Anthropic';
      return {
        content: `Error: ${errorMessage}`,
        status: 'error',
        tokens: 0,
        error: errorMessage
      };
    }

    // If we get here, structure is unrecognized
    console.warn(`⚠️ Unrecognized batch result structure for ${result?.custom_id}:`, JSON.stringify(result, null, 2));
    return {
      content: 'Error: Unrecognized batch result structure from Anthropic',
      status: 'error',
      tokens: 0,
      error: 'Unrecognized batch result structure'
    };

  } catch (parseError) {
    console.error(`❌ Parse error for ${result?.custom_id}:`, parseError);
    return {
      content: `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
      status: 'error',
      tokens: 0,
      error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
    };
  }
};