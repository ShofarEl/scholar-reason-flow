// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Stream chat to Anthropic and forward SSE chunks to the client
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY || !CLAUDE_API_KEY.startsWith('sk-ant-')) {
      console.error('Missing or invalid CLAUDE_API_KEY');
      return new Response(JSON.stringify({ 
        error: 'ScribeAI is not configured. Missing or invalid Anthropic API key.' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { message, systemPrompt, conversationHistory = [], model = 'claude-3-5-sonnet-20241022', temperature = 0.7, max_tokens = 8192 } = await req.json();

    console.log('ScribeAI request:', {
      model,
      messageLength: message?.length || 0,
      conversationHistoryLength: conversationHistory.length,
      hasSystemPrompt: !!systemPrompt
    });

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid request: message is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Build Anthropic messages array from prior turns + current user message
    const messages = [
      ...conversationHistory.map((m: any) => ({ 
        role: m.role === 'assistant' ? 'assistant' : 'user', 
        content: String(m.content || '') 
      })),
      { role: 'user', content: String(message) }
    ];

    const body = {
      model,
      system: systemPrompt || undefined,
      messages,
      temperature,
      max_tokens,
      stream: true
    };

    console.log('Calling Anthropic API with model:', model);

    const anthResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    console.log('Anthropic response status:', anthResp.status, anthResp.statusText);

    if (!anthResp.ok) {
      const errText = await anthResp.text();
      console.error('Anthropic API error:', {
        status: anthResp.status,
        statusText: anthResp.statusText,
        error: errText
      });
      
      // Propagate overload/rate-limit so client can trigger Haiku fallback
      return new Response(JSON.stringify({ 
        error: errText || anthResp.statusText,
        status: anthResp.status
      }), {
        status: anthResp.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let outputTokens = 0;
    let hasReceivedContent = false;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = anthResp.body!.getReader();
          let buffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              
              const json = trimmed.slice(5).trim();
              if (json === '[DONE]') {
                continue;
              }
              
              try {
                const evt = JSON.parse(json);
                console.log('Anthropic event:', evt.type);
                
                // Handle Anthropic streaming event types
                switch (evt.type) {
                  case 'content_block_delta': {
                    const deltaText = evt.delta?.text || '';
                    if (deltaText) {
                      hasReceivedContent = true;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: deltaText })}\n\n`));
                    }
                    break;
                  }
                  case 'message_delta': {
                    const out = evt.usage?.output_tokens;
                    if (typeof out === 'number') outputTokens = out;
                    break;
                  }
                  case 'message_stop': {
                    console.log('Message completed, tokens used:', outputTokens);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, tokensUsed: outputTokens })}\n\n`));
                    break;
                  }
                  case 'error': {
                    console.error('Anthropic streaming error:', evt);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: evt.error?.message || 'Anthropic streaming error' })}\n\n`));
                    break;
                  }
                }
              } catch (e) {
                console.warn('Failed to parse streaming event:', e, 'Raw line:', line);
              }
            }
          }
          
          // If we never received any content, send an error
          if (!hasReceivedContent) {
            console.error('No content received from Anthropic');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No content received from Anthropic API' })}\n\n`));
          }
          
        } catch (e) {
          console.error('Streaming error:', e);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Streaming error: ' + (e.message || 'Unknown error') })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('ScribeAI service error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});