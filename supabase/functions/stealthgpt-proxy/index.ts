// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const STEALTH_GPT_API_KEY = Deno.env.get('STEALTH_GPT_API_KEY');
    if (!STEALTH_GPT_API_KEY) {
      console.error('Missing STEALTH_GPT_API_KEY');
      return new Response(JSON.stringify({
        error: 'StealthGPT API key not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const requestBody = await req.json();
    console.log('StealthGPT proxy request:', {
      promptLength: requestBody.prompt?.length || 0,
      tone: requestBody.tone,
      mode: requestBody.mode,
      rephrase: requestBody.rephrase,
      business: requestBody.business
    });
    // Forward request to StealthGPT API
    const response = await fetch('https://stealthgpt.ai/api/stealthify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-token': STEALTH_GPT_API_KEY
      },
      body: JSON.stringify(requestBody)
    });
    const responseData = await response.json();
    console.log('StealthGPT response status:', response.status);
    console.log('StealthGPT response data:', {
      success: responseData.success,
      hasResult: !!responseData.result,
      message: responseData.message,
      error: responseData.error,
      keys: Object.keys(responseData || {}),
      fullResponse: responseData
    });
    // Handle specific error cases
    if (response.status === 402) {
      console.error('Payment required - insufficient credits');
      return new Response(JSON.stringify({
        error: 'Payment required',
        message: 'Your StealthGPT account has insufficient credits. Please add more credits to your account.',
        details: '402 Payment Required'
      }), {
        status: 402,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (response.status === 401 || response.status === 403) {
      console.error('Authentication failed');
      return new Response(JSON.stringify({
        error: 'Authentication failed',
        message: 'Invalid or expired API key. Please check your StealthGPT API key.',
        details: '401/403 Unauthorized'
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Pass through the exact response from StealthGPT
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('StealthGPT proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
