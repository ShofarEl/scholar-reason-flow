// Environment-based Supabase configuration
// These values should be set via environment variables

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Preferred Claude primary model for ScribeAI edge function
// Set VITE_SCRIBE_CLAUDE_PRIMARY=haiku to prefer Haiku; defaults to Sonnet
export const CLAUDE_PRIMARY_MODEL: 'sonnet' | 'haiku' =
  (import.meta as any)?.env?.VITE_SCRIBE_CLAUDE_PRIMARY === 'haiku' ? 'haiku' : 'sonnet';

