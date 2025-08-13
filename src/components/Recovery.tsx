// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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
- Ensure each paragraph contains 150-200 words minimum with substantial content`;
  
  const contextualPrompts = {
    'introduction': `${basePrompt}

TASK: Generate a comprehensive academic introduction (minimum 2,500 words) that establishes the intellectual foundation for the entire project.

DETAILED APPROACH:
- Begin with a compelling hook that contextualizes the research problem within current global challenges
- Provide extensive background information covering historical context, current state of the field, and emerging trends
- Present a nuanced thesis statement with multiple supporting arguments
- Conduct a preliminary literature synthesis showing gaps and opportunities
- Detail the research significance with theoretical, practical, and societal implications
- Outline the methodology approach and justify your research design choices
- Provide a comprehensive chapter overview with detailed descriptions of each section
- Include relevant statistics, current events, and real-world applications
- Discuss the interdisciplinary nature of your research and cross-field connections

${chapterContext ? `SPECIFIC CONTEXT: ${chapterContext}` : ''}

Generate content that demonstrates mastery of the subject matter with extensive detail and comprehensive coverage.`,

    'literature_review': `${basePrompt}

TASK: Conduct an exhaustive literature review (minimum 2,500 words) that synthesizes existing scholarship comprehensively.

DETAILED APPROACH:
- Organize scholarship into multiple thematic categories with detailed analysis of each
- Provide comprehensive coverage of foundational texts, seminal works, and recent developments
- Critically analyze methodologies, findings, and theoretical frameworks across dozens of studies
- Identify patterns, contradictions, and evolving perspectives with extensive examples
- Synthesize multiple sources to build complex arguments about knowledge gaps
- Include international perspectives and cross-cultural research where relevant
- Discuss methodological evolution in the field and emerging research paradigms
- Create detailed theoretical bridges between different schools of thought
- Analyze the progression of ideas over time with historical context
- Include meta-analyses and systematic reviews where applicable

${chapterContext ? `FOCUS AREA: ${chapterContext}` : ''}

Write as a comprehensive survey of the entire field with exhaustive coverage and detailed analysis.`,

    'methodology': `${basePrompt}

TASK: Develop a comprehensive methodology section (minimum 2,500 words) with extensive detail and justification.

DETAILED APPROACH:
- Begin with detailed epistemological and ontological positioning
- Provide comprehensive research design rationale with multiple design alternatives considered
- Detail data collection procedures with step-by-step protocols
- Extensively justify methodological choices through theoretical and practical considerations
- Include comprehensive sampling strategies with detailed inclusion/exclusion criteria
- Discuss validity and reliability measures in extensive detail
- Address ethical considerations comprehensively with IRB protocols
- Include detailed data analysis procedures with software specifications
- Discuss limitations extensively and mitigation strategies
- Provide detailed timelines and resource requirements
- Include pilot study results if applicable
- Discuss alternative methodologies considered and reasons for rejection

${chapterContext ? `METHODOLOGICAL FOCUS: ${chapterContext}` : ''}

Demonstrate expertise in research methodology with comprehensive coverage of all aspects.`,

    'analysis': `${basePrompt}

TASK: Present sophisticated analysis (minimum 2,500 words) with comprehensive findings and extensive discussion.

DETAILED APPROACH:
- Begin with detailed analytical frameworks and theoretical foundations
- Present findings with extensive statistical analysis and interpretation
- Move beyond description to develop multiple layers of original arguments
- Connect findings to broader theoretical implications with detailed explanations
- Address complexities, contradictions, and nuances with comprehensive coverage
- Build progressive arguments with extensive supporting evidence
- Integrate multiple analytical perspectives and alternative interpretations
- Include detailed case studies and examples to illustrate key points
- Discuss unexpected findings and their implications extensively
- Compare results with existing literature in comprehensive detail
- Include visual representations and detailed interpretations
- Provide extensive discussion of practical implications

${chapterContext ? `ANALYTICAL FOCUS: ${chapterContext}` : ''}

Generate comprehensive analysis that advances scholarly understanding with extensive detail.`,

    'conclusion': `${basePrompt}

TASK: Craft a comprehensive conclusion (minimum 2,500 words) that synthesizes insights and articulates broad significance.

DETAILED APPROACH:
- Provide comprehensive synthesis of all major findings with detailed integration
- Connect research to broader theoretical, practical, and policy implications extensively
- Address how your work advances multiple fields and opens numerous research avenues
- Include detailed discussion of limitations with extensive mitigation strategies
- Provide comprehensive recommendations for practice, policy, and future research
- Discuss the broader impact on society, industry, and academia in detail
- Include detailed implementation strategies for recommendations
- Address potential challenges and solutions comprehensively
- Provide extensive future research agenda with specific studies proposed
- Discuss the global implications and cross-cultural applications
- Include detailed reflections on the research process and lessons learned

${chapterContext ? `CONCLUDING FOCUS: ${chapterContext}` : ''}

Create a comprehensive conclusion that provides extensive closure while opening new possibilities.`,

    'chapter': `${basePrompt}

TASK: Develop a comprehensive chapter (minimum 2,500 words) that provides exhaustive coverage of the topic.

DETAILED APPROACH:
- Open with detailed chapter objectives connecting to broader project goals
- Provide comprehensive theoretical foundations with extensive literature integration
- Develop complex arguments through multiple layers of sustained analysis
- Include extensive examples, case studies, and real-world applications
- Create detailed internal coherence while maintaining project connections
- Build toward significant conclusions with comprehensive supporting evidence
- Integrate research, theory, and analysis into extensive flowing prose
- Use detailed transitions guiding readers through complex intellectual terrain
- Include comprehensive coverage of subtopics with extensive detail
- Provide multiple perspectives and extensive comparative analysis
- Include detailed practical applications and implications

${chapterContext ? `CHAPTER SCOPE: ${chapterContext}` : ''}

Generate a comprehensive chapter that provides exhaustive coverage worthy of graduate-level academic work.`,

    'default': `${basePrompt}

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

Generate comprehensive content worthy of publication in top-tier academic venues.`
  };

  return contextualPrompts[requestType] || contextualPrompts['default'];
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
  const getBatchIdFromPath = () => segments[segments.length - 1];

  try {
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    
    if (!CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY environment variable not set');
      return new Response(JSON.stringify({
        error: 'ThinqScribe batch processing is not configured. Please set CLAUDE_API_KEY environment variable.',
        success: false,
        service: 'ThinqScribe Batch Processing',
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
        error: 'ThinqScribe batch processing configuration error. Please provide a valid Anthropic API key starting with "sk-ant-".',
        success: false,
        service: 'ThinqScribe Batch Processing',
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

        return {
          custom_id: req.custom_id,
          params: {
            model: req.body.model || 'claude-3-5-sonnet-20241022',
            max_tokens: MAX_OUTPUT_TOKENS, // Use maximum tokens for comprehensive output
            temperature: 0.7, // Balanced creativity for academic writing
            messages: req.body.messages,
            system: enhancedSystemPrompt
          }
        };
      });

      console.log('Submitting to Claude Batch API with enhanced prompts for high word count...');

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

      console.log(`Claude Batch API Response Status: ${batchResponse.status}`);
      
      if (!batchResponse.ok) {
        const errorData = await batchResponse.text();
        console.error('Claude Batch API Error:', {
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
        message: `ThinqScribe is processing your academic project targeting ${enhancedRequests.length * 2500}+ words with comprehensive scholarly intelligence`
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
          service: 'ThinqScribe Batch Processing'
        }), {
          status: statusResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const statusData = await statusResponse.json();
      const batchInfo = batchTracker.get(batchId) || {};

      // Map batch status to user-friendly messages (handle both "completed" and newer "ended")
      let mappedStatus: string, statusMessage: string;
      const processingStatus = statusData.processing_status;
      switch(processingStatus) {
        case 'in_progress':
          mappedStatus = 'processing';
          statusMessage = `ThinqScribe is generating your ${batchInfo.targetWordCount || 'comprehensive'} word academic project...`;
          break;
        case 'ended':
        case 'completed':
          mappedStatus = 'completed';
          statusMessage = 'Your comprehensive academic project is ready for review';
          break;
        case 'failed':
        case 'expired':
        case 'cancelling':
        case 'cancelled':
          mappedStatus = 'failed';
          statusMessage = 'Processing encountered an issue. Please try resubmitting your project.';
          break;
        default:
          mappedStatus = 'pending';
          statusMessage = 'Your project is queued for processing';
      }

      let processedResults = null;

      // Fetch and process results if completed or ended
      if ((processingStatus === 'completed' || processingStatus === 'ended') && statusData.results_url) {
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
            const trimmed = resultsText.trim();
            const results = trimmed ? trimmed.split('\n').map(line => JSON.parse(line)) : [];
            
            // Process results with word count analysis and improved error handling
            processedResults = results.map(result => {
              console.log(`Processing result for ${result.custom_id}:`, JSON.stringify(result, null, 2));

              // Anthropic NDJSON can nest the message under result.result or result.response depending on version
              const messageNode = result?.result?.type === 'message' ? result.result
                                : result?.response?.type === 'message' ? result.response
                                : null;
              const errorNode = result?.result?.type === 'error' ? result.result.error
                                : result?.error ? result.error
                                : null;

              let content = 'Content generation failed';
              let status = 'error';
              let error: string | null = null;

              if (messageNode) {
                const parts = Array.isArray(messageNode.content) ? messageNode.content : [];
                const text = parts
                  .filter((p: any) => p && (p.type === 'text') && typeof p.text === 'string')
                  .map((p: any) => p.text)
                  .join('\n');
                content = text || messageNode?.content?.[0]?.text || 'Content generation failed';
                status = 'success';
              } else if (errorNode) {
                content = 'Processing error occurred';
                error = errorNode?.message || 'Unknown error';
                status = 'error';
              } else if (result?.result) {
                // Fallback to stringify unknown shapes to avoid dropping data
                content = JSON.stringify(result.result);
                status = 'success';
              }

              const wordCount = content.split(/\s+/).filter(Boolean).length;

              return {
                id: result.custom_id,
                content,
                status,
                tokens: result?.result?.usage?.output_tokens || result?.response?.usage?.output_tokens || 0,
                wordCount,
                error
              };
            });

            // Calculate total word count
            const totalWords = processedResults.reduce((sum, result) => sum + (result.wordCount || 0), 0);
            console.log(`Batch completed with ${totalWords} total words across ${processedResults.length} sections`);
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
               'ThinqScribe batch processing failed. Please try again with adjusted parameters.' : undefined,
        createdAt: statusData.created_at ? new Date(statusData.created_at).toISOString() : batchInfo.createdAt,
        completedAt: statusData.ended_at ? new Date(statusData.ended_at).toISOString() : undefined,
        requestCount: statusData.request_counts?.total || batchInfo.requestCount || 0,
        completedCount: statusData.request_counts?.succeeded || 0,
        failedCount: statusData.request_counts?.errored || 0,
        targetWordCount: batchInfo.targetWordCount,
        actualWordCount: processedResults ? processedResults.reduce((sum, result) => sum + (result.wordCount || 0), 0) : null
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({
        error: 'ThinqScribe batch endpoint not found',
        availableEndpoints: [
          'POST /batch - Submit batch processing job for 12,500+ word projects',
          'GET /batch/{id} - Check batch status and retrieve comprehensive results'
        ],
        service: 'ThinqScribe Batch Processing'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('ThinqScribe Batch service error:', error);
    
    const errorMessage = error instanceof Error ? 
      `ThinqScribe batch service error: ${error.message}` :
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
});