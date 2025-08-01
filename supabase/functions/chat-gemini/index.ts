
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
          content: 'ScribeMaster is online and ready for academic writing and scholarly analysis',
          responseTime: 50,
          tokensUsed: 0,
          model: 'scribe-master',
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
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          error: 'ScribeAI API key not configured',
          content: 'ScribeAI is currently unavailable. Please contact support to configure the API access.',
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

    // Prepare request for Gemini API with academic tone
    let requestBody: any = {
      contents: [{
        parts: [{
          text: `You are ScribeMaster, a distinguished academic writing assistant specializing in scholarly discourse. Provide responses with:

• Rigorous analytical thinking and evidence-based reasoning
• Formal academic language with precise terminology
• Clear thesis development and logical argumentation
• Critical evaluation of sources and methodologies
• Synthesis of ideas within broader intellectual frameworks

Deliver comprehensive academic analysis while maintaining clarity and engagement.

${conversationContext}User Query: ${message}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.9,
        maxOutputTokens: 7000,
      }
    }

    // Handle file attachments with academic analysis
    if (files && files.length > 0) {
      let fileAnalysisText = `ScribeMaster: Conduct scholarly analysis of the provided documents. Examine argumentative structure, evaluate evidence quality, assess theoretical frameworks, and provide academic critique with constructive insights.

User Query: ${message}

Attached Files:\n`
      
      const parts = []
      
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const base64Data = file.preview?.split(',')[1] || ''
          parts.push({
            inline_data: {
              mime_type: file.type,
              data: base64Data
            }
          })
          fileAnalysisText += `- Image: ${file.name} (${file.type})\n`
        } else if (file.content) {
          fileAnalysisText += `\n--- File: ${file.name} (${file.type}) ---\n${file.content}\n--- End of ${file.name} ---\n\n`
        } else {
          fileAnalysisText += `- File: ${file.name} (${file.type}, ${file.size} bytes) - Content could not be read\n`
        }
      }
      
      parts.unshift({
        text: fileAnalysisText
      })
      
      requestBody.contents[0].parts = parts
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ScribeAI API error:', response.status, errorText)
      
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
        errorMessage = `ScribeAI service error (${response.status}): Service temporarily unavailable`;
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
          let buffer = ''
          
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) break
            
            buffer += new TextDecoder().decode(value, { stream: true })
            
            // Look for complete JSON objects in the buffer
            let bracketCount = 0
            let jsonStart = -1
            let inString = false
            let escapeNext = false
            
            for (let i = 0; i < buffer.length; i++) {
              const char = buffer[i]
              
              if (escapeNext) {
                escapeNext = false
                continue
              }
              
              if (char === '\\') {
                escapeNext = true
                continue
              }
              
              if (char === '"') {
                inString = !inString
                continue
              }
              
              if (inString) continue
              
              if (char === '{') {
                if (bracketCount === 0) {
                  jsonStart = i
                }
                bracketCount++
              } else if (char === '}') {
                bracketCount--
                
                if (bracketCount === 0 && jsonStart !== -1) {
                  // Found complete JSON object
                  const jsonStr = buffer.substring(jsonStart, i + 1)
                  
                  try {
                    const data = JSON.parse(jsonStr)
                    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                      const text = data.candidates[0].content.parts[0].text
                      fullContent += text
                      
                      // Send chunk to client with slight delay for natural feel
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        content: text,
                        isComplete: false
                      })}\n\n`))
                      
                      // Small delay to make streaming feel more natural
                      await new Promise(resolve => setTimeout(resolve, 25))
                    }
                  } catch (parseError) {
                    console.log('JSON parse error:', parseError)
                  }
                  
                  // Remove processed JSON from buffer
                  buffer = buffer.substring(i + 1)
                  i = -1 // Reset loop
                  jsonStart = -1
                }
              }
            }
          }
          
          // Send completion signal
          const responseTime = Date.now() - startTime
          const tokensUsed = Math.ceil((JSON.stringify(requestBody).length + fullContent.length) / 4)
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            content: '',
            isComplete: true,
            responseTime,
            tokensUsed,
            model: 'scribe-master'
          })}\n\n`))
          
          controller.close()
        } catch (error) {
          console.error('Stream processing error:', error)
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
    console.error('Error in chat-gemini function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        content: 'I apologize, but ScribeMaster encountered a technical issue. Please try again or switch to Lightning Thinq.',
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
