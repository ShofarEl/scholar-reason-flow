/*import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Enhanced system prompt generator for batch processing
const generateBatchSystemPrompt = (requestType, projectTitle, citationStyle, chapterContext = null) => {
  const basePrompt = `You are ThinqScribe, an advanced academic writing AI specializing in comprehensive scholarly projects. You are working on a large-scale academic project titled "${projectTitle}" using ${citationStyle} citation style.

GLOBAL OUTPUT STYLE AND LENGTH REQUIREMENTS:
- Write in continuous academic prose with rich paragraphs. Avoid bullet points, numbered lists, checklists, or outline-style enumeration in the main body. Use lists only if absolutely necessary (e.g., references) and keep them minimal.
- Use clear markdown headings and subheadings (#, ##, ###) but present substantive content as paragraphs rather than lists.
- Minimum length: produce no less than 7,000 words for each chapter/section unless the user explicitly specifies a different length.
- Maintain scholarly tone, coherence, and narrative flow throughout.`;
  
  const contextualPrompts = {
    'introduction': `${basePrompt}

TASK: Generate a sophisticated academic introduction that establishes the intellectual foundation for the entire project.

APPROACH:
- Develop a compelling opening that contextualizes the research problem within broader academic discourse
- Present a nuanced thesis that demonstrates original thinking and scholarly contribution
- Synthesize relevant literature to establish gaps and justify the research approach
- Create smooth transitions between concepts that build toward your central argument
- Write with the authority of a subject matter expert contributing new knowledge
- Integrate ${citationStyle} citations naturally within flowing prose, not as afterthoughts

${chapterContext ? `CHAPTER CONTEXT: ${chapterContext}` : ''}

Generate content that reads like it was written by a leading scholar in the field, demonstrating both breadth of knowledge and depth of analysis.`,

    'literature_review': `${basePrompt}

TASK: Conduct a comprehensive literature review that synthesizes existing scholarship and identifies meaningful research gaps.

APPROACH:
- Organize scholarship thematically around key concepts rather than chronologically
- Critically analyze methodologies, findings, and theoretical frameworks across studies
- Identify patterns, contradictions, and evolving perspectives in the field
- Synthesize multiple sources to build complex arguments about the state of knowledge
- Demonstrate sophisticated understanding of theoretical debates and their implications
- Create intellectual bridges between different schools of thought
- Use ${citationStyle} format to seamlessly integrate sources into analytical prose

${chapterContext ? `FOCUS AREA: ${chapterContext}` : ''}

Write as a scholar who has mastered the field and can contribute original insights through synthesis and critical analysis.`,

    'methodology': `${basePrompt}

TASK: Develop a rigorous methodology section that justifies your research approach and demonstrates methodological sophistication.

APPROACH:
- Begin with clear epistemological positioning that connects to your research questions
- Justify methodological choices through theoretical and practical considerations
- Anticipate limitations and explain how they will be addressed
- Detail procedures with sufficient precision for replication while maintaining readability
- Connect methods to broader theoretical frameworks and scholarly traditions
- Address ethical considerations and validity concerns proactively
- Integrate relevant methodological literature using ${citationStyle} format

${chapterContext ? `METHODOLOGICAL FOCUS: ${chapterContext}` : ''}

Demonstrate the expertise of a seasoned researcher who understands both the art and science of academic inquiry.`,

    'analysis': `${basePrompt}

TASK: Present sophisticated analysis that generates new insights and advances scholarly understanding.

APPROACH:
- Begin with clear analytical frameworks that guide your interpretation
- Move beyond description to develop original arguments supported by evidence
- Connect findings to broader theoretical implications and practical applications
- Address complexities, contradictions, and nuances in your data
- Build arguments progressively, allowing insights to emerge naturally
- Integrate multiple perspectives and consider alternative interpretations
- Support claims with appropriate evidence and ${citationStyle} citations

${chapterContext ? `ANALYTICAL FOCUS: ${chapterContext}` : ''}

Write with the confidence of a scholar making original contributions to academic knowledge.`,

    'conclusion': `${basePrompt}

TASK: Craft a compelling conclusion that synthesizes key insights and articulates the broader significance of your work.

APPROACH:
- Synthesize major findings into coherent arguments about their collective meaning
- Connect your research to broader theoretical, practical, and policy implications
- Address how your work advances the field and opens new avenues for inquiry
- Acknowledge limitations while emphasizing contributions and significance
- Create a sense of intellectual completion while pointing toward future possibilities
- Maintain scholarly authority while remaining accessible to educated readers
- Ensure ${citationStyle} references support your concluding arguments

${chapterContext ? `CONCLUDING FOCUS: ${chapterContext}` : ''}

Demonstrate the intellectual maturity of a scholar who can see the bigger picture and articulate lasting contributions.`,

    'chapter': `${basePrompt}

TASK: Develop a comprehensive chapter that contributes meaningfully to the overall project while standing as a complete scholarly work.

APPROACH:
- Open with clear chapter objectives that connect to the broader project thesis
- Develop complex arguments through sustained analysis and evidence
- Create internal coherence while maintaining connection to other chapters
- Build toward significant conclusions that advance the overall project
- Integrate research, theory, and analysis into flowing academic prose
- Use transitions that guide readers through sophisticated intellectual terrain
- Support all claims with appropriate ${citationStyle} citations and evidence

${chapterContext ? `CHAPTER SCOPE: ${chapterContext}` : ''}

Write as a scholar developing a major academic work, ensuring each chapter contributes substantively to the whole.`,

    'default': `${basePrompt}

TASK: Generate high-quality academic content that demonstrates scholarly expertise and contributes to the overall project coherence.

APPROACH:
- Develop sophisticated arguments that go beyond surface-level analysis
- Synthesize multiple sources and perspectives into original insights
- Write with the authority and precision expected in graduate-level or professional academic work
- Integrate ${citationStyle} citations seamlessly into analytical prose
- Build ideas progressively, creating intellectual momentum throughout the piece
- Demonstrate mastery of subject matter while remaining accessible to scholarly audiences

${chapterContext ? `CONTENT FOCUS: ${chapterContext}` : ''}

Generate content worthy of publication in academic venues, demonstrating both rigor and intellectual creativity.`
  };

  return contextualPrompts[requestType] || contextualPrompts['default'];
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');

  try {
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    
    // Better error handling for missing API key
    if (!CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY environment variable not set');
      return new Response(JSON.stringify({
        error: 'ThinqScribe batch processing is not configured. Please contact support.',
        success: false,
        service: 'ThinqScribe Batch Processing',
        code: 'MISSING_API_KEY'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate API key format (basic check)
    if (!CLAUDE_API_KEY.startsWith('sk-ant-')) {
      console.error('Invalid CLAUDE_API_KEY format');
      return new Response(JSON.stringify({
        error: 'ThinqScribe batch processing configuration error. Please contact support.',
        success: false,
        service: 'ThinqScribe Batch Processing',
        code: 'INVALID_API_KEY'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle batch submission
    if (req.method === 'POST' && pathSegments.length === 3) {
      const { requests, projectTitle, citationStyle = 'APA', projectType = 'academic' } = await req.json();
      
      console.log(`Creating enhanced batch job for project: ${projectTitle}`);
      console.log(`Number of requests: ${requests.length}`);
      console.log(`Using API key: sk-ant-***${CLAUDE_API_KEY.slice(-4)}`);

      // Enhanced request processing with intelligent prompt generation
      const enhancedRequests = requests.map((req) => {
        // Extract request type from custom_id or content analysis
        const requestType = req.custom_id.toLowerCase().includes('intro') ? 'introduction' :
                           req.custom_id.toLowerCase().includes('literature') ? 'literature_review' :
                           req.custom_id.toLowerCase().includes('method') ? 'methodology' :
                           req.custom_id.toLowerCase().includes('analysis') ? 'analysis' :
                           req.custom_id.toLowerCase().includes('conclusion') ? 'conclusion' :
                           req.custom_id.toLowerCase().includes('chapter') ? 'chapter' : 'default';

        // Extract context from the original request if available
        const originalMessage = req.body.messages?.[0]?.content || '';
        const chapterContext = originalMessage.length > 100 ? 
                              originalMessage.substring(0, 200) + '...' : 
                              originalMessage;

        // Generate enhanced system prompt
        const enhancedSystemPrompt = generateBatchSystemPrompt(
          requestType, 
          projectTitle, 
          citationStyle, 
          chapterContext
        );

        return {
          custom_id: req.custom_id,
          params: {
            model: req.body.model || 'claude-3-5-sonnet-20241022',
            max_tokens: req.body.max_tokens || 32000, // Increased for 12,000-35,000 words
            temperature: 0.8, // Higher creativity for academic writing
            messages: req.body.messages,
            system: enhancedSystemPrompt
          }
        };
      });

      console.log('Making request to Claude Batch API...');

      // Create batch job with Claude API
      const batchResponse = await fetch('https://api.anthropic.com/v1/messages/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CLAUDE_API_KEY}`,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'message-batches-2024-09-24'
        },
        body: JSON.stringify({
          requests: enhancedRequests
        })
      });

      console.log(`Claude API Response Status: ${batchResponse.status}`);
      
      if (!batchResponse.ok) {
        const errorData = await batchResponse.text();
        console.error('Claude Batch API detailed error:', {
          status: batchResponse.status,
          statusText: batchResponse.statusText,
          body: errorData,
          headers: Object.fromEntries(batchResponse.headers.entries())
        });

        // More specific error handling
        let clientError = '';
        if (batchResponse.status === 401) {
          clientError = 'Authentication failed. API key may be invalid or expired.';
        } else if (batchResponse.status === 429) {
          clientError = 'Rate limit exceeded. Please try again later.';
        } else if (batchResponse.status === 400) {
          clientError = 'Invalid request format. Please check your project configuration.';
        } else {
          clientError = `API request failed with status ${batchResponse.status}`;
        }

        return new Response(JSON.stringify({
          error: `ThinqScribe batch processing error: ${clientError}`,
          success: false,
          service: 'ThinqScribe Batch Processing',
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

      return new Response(JSON.stringify({
        batchId: batchData.id,
        status: 'submitted',
        projectTitle,
        citationStyle,
        projectType,
        requestCount: enhancedRequests.length,
        estimatedCompletion: new Date(Date.now() + (enhancedRequests.length * 30000)), // Rough estimate
        message: 'ThinqScribe is processing your academic project with enhanced scholarly intelligence'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (req.method === 'GET' && pathSegments.length === 4) {
      const batchId = pathSegments[3];
      console.log(`Checking ThinqScribe batch status: ${batchId}`);

      const statusResponse = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLAUDE_API_KEY}`,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'message-batches-2024-09-24'
        }
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.text();
        console.error('ThinqScribe Batch status error:', statusResponse.status, errorData);
        
        return new Response(JSON.stringify({
          error: `ThinqScribe batch status check failed (${statusResponse.status})`,
          success: false,
          service: 'ThinqScribe Batch Processing'
        }), {
          status: statusResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const statusData = await statusResponse.json();

      // Enhanced status mapping with more descriptive messages
      let mappedStatus, statusMessage;
      switch(statusData.processing_status) {
        case 'in_progress':
          mappedStatus = 'processing';
          statusMessage = 'ThinqScribe is generating your scholarly content...';
          break;
        case 'completed':
          mappedStatus = 'completed';
          statusMessage = 'Your academic project is ready for review';
          break;
        case 'failed':
        case 'expired':
          mappedStatus = 'failed';
          statusMessage = 'Processing encountered an issue. Please try resubmitting.';
          break;
        default:
          mappedStatus = 'pending';
          statusMessage = 'Your project is queued for processing';
      }

      let results = null;
      let processedResults = null;

      if (statusData.processing_status === 'completed' && statusData.results_url) {
        try {
          const resultsResponse = await fetch(statusData.results_url, {
            headers: {
              'Authorization': `Bearer ${CLAUDE_API_KEY}`,
              'anthropic-version': '2023-06-01',
              'anthropic-beta': 'message-batches-2024-09-24'
            }
          });

          if (resultsResponse.ok) {
            const resultsText = await resultsResponse.text();
            results = resultsText.trim().split('\n').map(line => JSON.parse(line));
            
            // Process results for better client consumption
            processedResults = results.map(result => ({
              id: result.custom_id,
              content: result.result?.type === 'message' ? 
                      result.result.content?.[0]?.text || 'Content generation failed' :
                      'Processing error occurred',
              status: result.result?.type === 'message' ? 'success' : 'error',
              tokens: result.result?.usage?.output_tokens || 0,
              error: result.result?.type === 'error' ? result.result.error?.message : null
            }));
          }
        } catch (resultsError) {
          console.error('Error processing results:', resultsError);
        }
      }

      const response = {
        id: batchId,
        status: mappedStatus,
        message: statusMessage,
        results: processedResults,
        error: statusData.processing_status === 'failed' ? 
               'ThinqScribe batch processing failed. Please try again.' : undefined,
        createdAt: new Date(statusData.created_at),
        completedAt: statusData.ended_at ? new Date(statusData.ended_at) : undefined,
        requestCount: statusData.request_counts?.total || 0,
        completedCount: statusData.request_counts?.succeeded || 0,
        failedCount: statusData.request_counts?.errored || 0
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({
        error: 'ThinqScribe batch endpoint not found',
        availableEndpoints: [
          'POST /batch - Submit batch processing job',
          'GET /batch/{id} - Check batch status and retrieve results'
        ]
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('ThinqScribe Batch service error:', error);
    
    const errorMessage = error instanceof Error ? 
      error.message.replace(/claude|anthropic/gi, 'ThinqScribe') :
      'ThinqScribe batch service temporarily unavailable';

    return new Response(JSON.stringify({
      error: errorMessage,
      success: false,
      service: 'ThinqScribe Batch Processing',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});*/
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Enhanced system prompt generator for sequential processing
type ResultEntry = {
  custom_id: string;
  result:
    | { type: 'message'; content: any; usage: any }
    | { type: 'error'; error: { type: string; message: string } };
};

// Conservative cap for Anthropic output tokens to avoid 400 invalid_request errors
const MAX_OUTPUT_TOKENS = 8192;
const generateSystemPrompt = (requestType, projectTitle, citationStyle, chapterContext = null) => {
  const basePrompt = `You are ThinqScribe, an advanced academic writing AI specializing in comprehensive scholarly projects. You are working on a large-scale academic project titled "${projectTitle}" using ${citationStyle} citation style.

GLOBAL OUTPUT STYLE AND LENGTH REQUIREMENTS:
- Write in continuous academic prose with rich paragraphs. Avoid bullet points, numbered lists, checklists, or outline-style enumeration in the main body. Use lists only if absolutely necessary (e.g., references) and keep them minimal.
- Use clear markdown headings and subheadings (#, ##, ###) but present substantive content as paragraphs rather than lists.
- Minimum length: produce no less than 7,000 words for each chapter/section unless the user explicitly specifies a different length.
- Maintain scholarly tone, coherence, and narrative flow throughout.`;
  
  const contextualPrompts = {
    'introduction': `${basePrompt}

TASK: Generate a sophisticated academic introduction that establishes the intellectual foundation for the entire project.

APPROACH:
- Develop a compelling opening that contextualizes the research problem within broader academic discourse
- Present a nuanced thesis that demonstrates original thinking and scholarly contribution
- Synthesize relevant literature to establish gaps and justify the research approach
- Create smooth transitions between concepts that build toward your central argument
- Write with the authority of a subject matter expert contributing new knowledge
- Integrate ${citationStyle} citations naturally within flowing prose, not as afterthoughts

${chapterContext ? `CHAPTER CONTEXT: ${chapterContext}` : ''}

Generate content that reads like it was written by a leading scholar in the field, demonstrating both breadth of knowledge and depth of analysis.`,

    'chapter': `${basePrompt}

TASK: Develop a comprehensive chapter that contributes meaningfully to the overall project while standing as a complete scholarly work.

APPROACH:
- Open with clear chapter objectives that connect to the broader project thesis
- Develop complex arguments through sustained analysis and evidence
- Create internal coherence while maintaining connection to other chapters
- Build toward significant conclusions that advance the overall project
- Integrate research, theory, and analysis into flowing academic prose
- Use transitions that guide readers through sophisticated intellectual terrain
- Support all claims with appropriate ${citationStyle} citations and evidence

${chapterContext ? `CHAPTER SCOPE: ${chapterContext}` : ''}

Write as a scholar developing a major academic work, ensuring each chapter contributes substantively to the whole.`,

    'default': `${basePrompt}

TASK: Generate high-quality academic content that demonstrates scholarly expertise and contributes to the overall project coherence.

APPROACH:
- Develop sophisticated arguments that go beyond surface-level analysis
- Synthesize multiple sources and perspectives into original insights
- Write with the authority and precision expected in graduate-level or professional academic work
- Integrate ${citationStyle} citations seamlessly into analytical prose
- Build ideas progressively, creating intellectual momentum throughout the piece
- Demonstrate mastery of subject matter while remaining accessible to scholarly audiences

${chapterContext ? `CONTENT FOCUS: ${chapterContext}` : ''}

Generate content worthy of publication in academic venues, demonstrating both rigor and intellectual creativity.`
  };

  return contextualPrompts[requestType] || contextualPrompts['default'];
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');

  try {
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    
    if (!CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY environment variable not set');
      return new Response(JSON.stringify({
        error: 'ThinqScribe processing is not configured. Please contact support.',
        success: false,
        service: 'ThinqScribe Processing',
        code: 'MISSING_API_KEY'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Basic validation for Anthropic keys
    if (!CLAUDE_API_KEY.startsWith('sk-ant-')) {
      console.error('Invalid CLAUDE_API_KEY format');
      return new Response(JSON.stringify({
        error: 'ThinqScribe processing configuration error. Please set a valid Anthropic API key.',
        success: false,
        service: 'ThinqScribe Processing',
        code: 'INVALID_API_KEY'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle sequential batch submission (fallback approach)
    if (req.method === 'POST' && pathSegments.length === 3) {
      const { requests, projectTitle, citationStyle = 'APA', projectType = 'academic' } = await req.json();
      
      console.log(`Processing sequential batch for project: ${projectTitle}`);
      console.log(`Number of requests: ${requests.length}`);

      // Create a unique batch ID for tracking
      const batchId = `seq_batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Process requests sequentially to avoid batch API issues
      const results: ResultEntry[] = [];
      let completedCount = 0;
      let failedCount = 0;

      for (const [index, request] of requests.entries()) {
        try {
          console.log(`Processing request ${index + 1}/${requests.length}: ${request.custom_id}`);
          
          // Extract request type from custom_id
          const requestType = request.custom_id.toLowerCase().includes('intro') ? 'introduction' :
                             request.custom_id.toLowerCase().includes('literature') ? 'literature_review' :
                             request.custom_id.toLowerCase().includes('method') ? 'methodology' :
                             request.custom_id.toLowerCase().includes('analysis') ? 'analysis' :
                             request.custom_id.toLowerCase().includes('conclusion') ? 'conclusion' :
                             request.custom_id.toLowerCase().includes('chapter') ? 'chapter' : 'default';

          // Extract context from the original request
          const originalMessage = request.body.messages?.[0]?.content || '';
          const chapterContext = originalMessage.length > 100 ? 
                                originalMessage.substring(0, 200) + '...' : 
                                originalMessage;

          // Generate enhanced system prompt
          const systemPrompt = generateSystemPrompt(
            requestType, 
            projectTitle, 
            citationStyle, 
            chapterContext
          );

          // Make individual Messages API call
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': `${CLAUDE_API_KEY}`,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: request.body.model || 'claude-3-5-sonnet-20241022',
              max_tokens: Math.min(Number(request.body.max_tokens) || 4096, MAX_OUTPUT_TOKENS),
              temperature: 0.8,
              system: systemPrompt,
              messages: request.body.messages
            })
          });

          if (response.ok) {
            const data = await response.json();
            results.push({
              custom_id: request.custom_id,
              result: {
                type: 'message',
                content: data.content,
                usage: data.usage
              }
            });
            completedCount++;
          } else {
            const contentType = response.headers.get('content-type') || '';
            const errorText = await response.text();
            let errorMessage = errorText;
            try {
              if (contentType.includes('application/json')) {
                const parsed = JSON.parse(errorText);
                errorMessage = parsed?.error?.message || parsed?.message || errorText;
              }
            } catch (_) {
              // ignore JSON parse error, keep raw text
            }
            console.error(`Request ${request.custom_id} failed:`, response.status, errorMessage);

            // If unauthorized, return immediately with a clear configuration error
            if (response.status === 401) {
              return new Response(JSON.stringify({
                error: 'Anthropic API unauthorized. Please verify CLAUDE_API_KEY.',
                success: false,
                service: 'ThinqScribe Processing',
                code: 'ANTHROPIC_UNAUTHORIZED'
              }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
            if (response.status === 400) {
              return new Response(JSON.stringify({
                error: `Anthropic API bad request: ${errorMessage}`,
                success: false,
                service: 'ThinqScribe Processing',
                code: 'ANTHROPIC_BAD_REQUEST'
              }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            results.push({
              custom_id: request.custom_id,
              result: {
                type: 'error',
                error: {
                  type: 'api_error',
                  message: `API request failed: ${response.status}`
                }
              }
            });
            failedCount++;
          }

          // Add small delay between requests to avoid rate limiting
          if (index < requests.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          console.error(`Error processing request ${request.custom_id}:`, error);
          results.push({
            custom_id: request.custom_id,
            result: {
              type: 'error',
              error: {
                type: 'processing_error',
                message: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          });
          failedCount++;
        }
      }

      // Store results in a simple in-memory cache (you might want to use a database for production)
      const batchData = {
        id: batchId,
        processing_status: 'completed',
        created_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        request_counts: {
          total: requests.length,
          succeeded: completedCount,
          errored: failedCount,
          canceled: 0,
          expired: 0
        },
        results: results
      };

      // Store in global cache (in a real app, use Redis or database)
      globalThis.batchCache = globalThis.batchCache || {};
      globalThis.batchCache[batchId] = batchData;

      // Prepare processed results for client consumption (same shape as GET handler)
      const processedResults = results.map(result => ({
        id: result.custom_id,
        content: result.result?.type === 'message' ? 
                result.result.content?.[0]?.text || 'Content generation failed' :
                'Processing error occurred',
        status: result.result?.type === 'message' ? 'success' : 'error',
        tokens: result.result?.usage?.output_tokens || 0,
        error: result.result?.type === 'error' ? result.result.error?.message : null
      }));

      return new Response(JSON.stringify({
        batchId: batchId,
        status: 'completed', // Sequential processing completes immediately
        projectTitle,
        citationStyle,
        projectType,
        requestCount: requests.length,
        completedCount: completedCount,
        failedCount: failedCount,
        createdAt: batchData.created_at,
        completedAt: batchData.ended_at,
        results: processedResults,
        estimatedCompletion: new Date().toISOString(),
        message: 'ThinqScribe has completed processing your academic project using sequential processing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (req.method === 'GET' && pathSegments.length === 4) {
      const batchId = pathSegments[3];
      console.log(`Retrieving results for batch: ${batchId}`);

      // Retrieve from cache
      const batchData = globalThis.batchCache?.[batchId];
      
      if (!batchData) {
        return new Response(JSON.stringify({
          error: 'Batch not found or expired',
          success: false,
          service: 'ThinqScribe Processing'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Process results for client consumption
      const processedResults = batchData.results.map(result => ({
        id: result.custom_id,
        content: result.result?.type === 'message' ? 
                result.result.content?.[0]?.text || 'Content generation failed' :
                'Processing error occurred',
        status: result.result?.type === 'message' ? 'success' : 'error',
        tokens: result.result?.usage?.output_tokens || 0,
        error: result.result?.type === 'error' ? result.result.error?.message : null
      }));

      const response = {
        id: batchId,
        status: 'completed',
        message: 'Your academic project is ready for review',
        results: processedResults,
        createdAt: batchData.created_at,
        completedAt: batchData.ended_at,
        requestCount: batchData.request_counts.total,
        completedCount: batchData.request_counts.succeeded,
        failedCount: batchData.request_counts.errored
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({
        error: 'ThinqScribe endpoint not found',
        availableEndpoints: [
          'POST /batch - Submit sequential processing job',
          'GET /batch/{id} - Check status and retrieve results'
        ]
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('ThinqScribe service error:', error);
    
    const errorMessage = error instanceof Error ? 
      error.message.replace(/claude|anthropic/gi, 'ThinqScribe') :
      'ThinqScribe service temporarily unavailable';

    return new Response(JSON.stringify({
      error: errorMessage,
      success: false,
      service: 'ThinqScribe Sequential Processing',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});