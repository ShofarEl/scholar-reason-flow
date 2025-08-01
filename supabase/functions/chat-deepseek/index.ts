
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { message, files, conversationHistory = [] } = await req.json()
    
    // Handle health check/ping requests
    if (message === 'ping' || message === 'health check') {
      return new Response(
        JSON.stringify({ 
          content: 'Lightning Thinq is online and ready for mathematical and computational analysis',
          responseTime: 75,
          tokensUsed: 0,
          model: 'lightning-thinq',
          status: 'healthy'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
    
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    
    if (!deepseekApiKey) {
      console.error('DEEPSEEK_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          error: 'DEEPSEEK_API_KEY not configured in Supabase secrets',
          content: 'Lightning Thinq is currently unavailable. Please configure the DEEPSEEK_API_KEY in your Supabase project secrets.',
          responseTime: 0,
          tokensUsed: 0
        }),
        { 
          status: 200,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    const startTime = Date.now()

    // Build conversation context from history
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation context:\n';
      conversationHistory.forEach((msg: any) => {
        const role = msg.sender === 'user' ? 'User' : 'Assistant';
        conversationContext += `${role}: ${msg.content}\n`;
        if (msg.attachments && msg.attachments.length > 0) {
          conversationContext += `[Had ${msg.attachments.length} file(s) attached]\n`;
        }
      });
      conversationContext += '\nCurrent message:\n';
    }

    let systemPrompt = `Lightning Thinq: Expert in math, code, physics. Provide precise solutions with clear logic.`
    
    let userMessage = conversationContext + message
    
    if (files && files.length > 0) {
      systemPrompt += ` Analyze files for technical content and provide clear evaluation.`
      
      userMessage += "\n\nAttached Files:\n"
      for (const file of files) {
        if (file.content) {
          userMessage += `\n--- File: ${file.name} (${file.type}) ---\n${file.content}\n--- End of ${file.name} ---\n\n`
        } else {
          userMessage += `- File: ${file.name} (${file.type}, ${file.size} bytes) - Content could not be read\n`
        }
      }
    }

    console.log('Calling DeepSeek API with streaming...')

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.2,
        max_tokens: 8000,
        stream: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', response.status, errorText)
      
      // Handle specific error cases with branded messages
      let errorMessage = errorText;
      if (response.status === 429) {
        errorMessage = 'ScribeAI usage limit has been reached for today. Please try again later.';
      } else if (response.status === 503 || response.status === 502) {
        errorMessage = 'ScribeAI is experiencing high demand. Please try again in a moment.';
      } else if (errorText.toLowerCase().includes('quota') || errorText.toLowerCase().includes('usage limit')) {
        errorMessage = 'ScribeAI usage limit has been reached for today. Please try again later.';
      } else if (errorText.toLowerCase().includes('overload') || errorText.toLowerCase().includes('capacity')) {
        errorMessage = 'ScribeAI is experiencing high demand. Please try again in a moment.';
      } else {
        errorMessage = `ScribeAI reasoning service error (${response.status}): Service temporarily unavailable`;
      }
      
      throw new Error(errorMessage)
    }

    // Set up streaming response
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body!.getReader()
          let fullContent = ''
          
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) break
            
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n')
            
            for (const line of lines) {
              if (line.trim() === '' || !line.startsWith('data: ')) continue
              
              const data = line.slice(6) // Remove 'data: ' prefix
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                if (parsed.choices?.[0]?.delta?.content) {
                  const text = parsed.choices[0].delta.content
                  fullContent += text
                  
                  // Send chunk to client with slight delay for natural feel
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    content: text,
                    isComplete: false
                  })}\n\n`))
                  
                  // Small delay to make streaming feel more natural
                  await new Promise(resolve => setTimeout(resolve, 20))
                }
              } catch (parseError) {
                // Ignore parse errors for malformed chunks
              }
            }
          }
          
          // Send completion signal
          const responseTime = Date.now() - startTime
          const tokensUsed = Math.ceil((systemPrompt.length + userMessage.length + fullContent.length) / 4)
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            content: '',
            isComplete: true,
            responseTime,
            tokensUsed,
            model: 'lightning-thinq'
          })}\n\n`))
          
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Error in chat-deepseek function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        content: 'I apologize, but Lightning Thinq encountered a technical issue. Please try again or switch to ScribeMaster.',
        responseTime: 0,
        tokensUsed: 0
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
