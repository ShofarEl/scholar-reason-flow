// Environment-based Supabase configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://unhulaavbftqpvflarqi.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaHVsYWF2YmZ0cXB2ZmxhcnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MTczMDgsImV4cCI6MjA2OTM5MzMwOH0.OYM1Hh8_FuhtKcMyfjPCllxodKQr7ysHwKrrxH6wwL8';

// Preferred Claude primary model for ScribeAI edge function
// Set VITE_SCRIBE_CLAUDE_PRIMARY=haiku to prefer Haiku; defaults to Sonnet
export const CLAUDE_PRIMARY_MODEL: 'sonnet' | 'haiku' =
  (import.meta as any)?.env?.VITE_SCRIBE_CLAUDE_PRIMARY === 'haiku' ? 'haiku' : 'sonnet';

// StealthGPT API configuration
export const STEALTH_GPT_API_KEY = import.meta.env.VITE_STEALTH_GPT_API_KEY;

// Debug environment variable access
console.log('🔧 Environment Debug:', {
  hasStealthGPTKey: !!STEALTH_GPT_API_KEY,
  keyLength: STEALTH_GPT_API_KEY ? STEALTH_GPT_API_KEY.length : 0,
  importMetaEnv: !!import.meta.env.VITE_STEALTH_GPT_API_KEY,
  allEnvVars: Object.keys(import.meta.env).filter(key => key.includes('STEALTH'))
});

// Environment variable validation
export const validateEnvironment = () => {
  const issues: string[] = [];
  
  if (!STEALTH_GPT_API_KEY) {
    issues.push('VITE_STEALTH_GPT_API_KEY is not set');
  } else if (String(STEALTH_GPT_API_KEY).includes('your_stealth_gpt_api_key_here')) {
    issues.push('VITE_STEALTH_GPT_API_KEY is set to template value');
  }
  
  // For production, we need the API key
  if (typeof window !== 'undefined' && window.location.hostname === 'ai.thinqscribe.com' && !STEALTH_GPT_API_KEY) {
    issues.push('StealthGPT API key is required for production deployment');
  }
  
  return issues;
};

