import { createClient } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isConfigured = Boolean(url && key);
export const configError = isConfigured
  ? ''
  : `Missing ${[!url && 'NEXT_PUBLIC_SUPABASE_URL', !key && 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'].filter(Boolean).join(' and ')} in .env.local`;
export const supabase = isConfigured
  ? createSupabaseBrowserClient()
  : createClient('https://placeholder.supabase.co', 'placeholder-key');
