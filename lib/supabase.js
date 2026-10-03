import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

// Demo data is only for trying the site on your own computer. On Vercel (live or preview)
// a missing database connection shows an error instead of fake stats.
export const demoAllowed = !(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);

let client = null;
export function getSupabase() {
  if (!isConfigured) return null;
  if (!client) client = createClient(url, key);
  return client;
}
