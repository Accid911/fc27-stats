import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// When Supabase isn't configured yet, the site runs on built-in demo data.
export const isConfigured = Boolean(url && key);

let client = null;
export function getSupabase() {
  if (!isConfigured) return null;
  if (!client) client = createClient(url, key);
  return client;
}
