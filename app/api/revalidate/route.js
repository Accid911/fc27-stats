import { revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { CACHE_TAG } from '@/lib/server-data';

// Called by the admin panel after every save so the public pages show the change straight away.
// Only signed-in admins can trigger it.
export async function POST(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!url || !key || !token) return Response.json({ ok: false }, { status: 401 });

  const sb = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.rpc('is_admin');
  if (error || data !== true) return Response.json({ ok: false }, { status: 403 });

  revalidateTag(CACHE_TAG, { expire: 0 });
  return Response.json({ ok: true });
}
