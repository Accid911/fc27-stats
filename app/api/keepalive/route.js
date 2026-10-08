import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Called once a day by Vercel (see vercel.json) so the free Supabase database never pauses
// for inactivity. It only reads one tiny row and returns nothing private.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return Response.json({ ok: false, reason: 'not connected' }, { status: 503 });
  const { error } = await sb.from('settings').select('id').limit(1);
  return Response.json({ ok: !error, at: new Date().toISOString() }, { status: error ? 503 : 200 });
}
