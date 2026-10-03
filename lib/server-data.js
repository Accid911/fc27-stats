// Server-side data loading with caching. Pages read from Next's cache; the admin panel
// refreshes it right after every save (see app/api/revalidate/route.js).
//
// - loadAll()          → the current edition (Leicester City) for the main site.
// - loadEdition(n)     → one edition of the archive. Hidden editions only load for a signed-in admin.
// - listEditions()     → the editions this visitor may see.
import { unstable_cache } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getSupabase, demoAllowed } from './supabase';
import { demoData, demoEditions, demoEditionData } from './demo-data';
import { fetchAll, fetchEditions, OPTIONAL, TABLES } from './fetch-all';
import { ADMIN_COOKIE, editionSettings } from './editions';

export const CACHE_TAG = 'career';
const REVALIDATE_SECONDS = 300; // safety net: refresh at least every 5 minutes

const cached = (key, fn) => unstable_cache(fn, ['career-v1', key], { tags: [CACHE_TAG], revalidate: REVALIDATE_SECONDS });

const NOT_CONNECTED = 'The stats database is not connected (check the Supabase settings on Vercel).';

const getSettings = cached('settings', async () => {
  const { data, error } = await getSupabase().from('settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw new Error(`settings: ${error.message}`);
  return data || { id: 1, club_name: 'Leicester City' };
});

// Public editions (anonymous view). null = editions table not there yet.
const getPublicEditions = cached('editions', async () => fetchEditions(getSupabase()));

async function readTable(sb, t, editionId) {
  try {
    return { rows: await fetchAll(sb, t, editionId) };
  } catch (err) {
    // A table from a migration that hasn't been run yet shouldn't break the whole site.
    if (OPTIONAL.has(t)) return { rows: [], missing: true };
    throw err;
  }
}

// One cache entry per table per edition keeps each entry small as the archive grows.
const cachedTables = new Map();
function getTable(t, editionId) {
  const key = `table:${t}:${editionId || 'all'}`;
  if (!cachedTables.has(key)) cachedTables.set(key, cached(key, () => readTable(getSupabase(), t, editionId)));
  return cachedTables.get(key)();
}

function assemble(settings, results, extra) {
  const out = { settings, demo: false, ...extra };
  TABLES.forEach((t, i) => {
    out[t] = results[i].rows;
    if (results[i].missing) out.missing = [...(out.missing || []), t];
  });
  return out;
}

/* ───────────────────────── main site: current edition ───────────────────────── */

export async function loadAll() {
  if (!getSupabase()) {
    if (demoAllowed) return { ...demoData, demo: true };
    throw new Error(NOT_CONNECTED);
  }
  const editions = await getPublicEditions();
  const current = editions?.find((e) => e.is_current) || null;
  // Before migration 007 there are no editions: load everything, exactly like before.
  const editionId = current?.id || null;
  const [settings, ...tables] = await Promise.all([getSettings(), ...TABLES.map((t) => getTable(t, editionId))]);
  return assemble(settings, tables, current ? { edition: current } : {});
}

export async function loadSettings() {
  if (!getSupabase()) {
    if (demoAllowed) return demoData.settings;
    throw new Error(NOT_CONNECTED);
  }
  return getSettings();
}

/* ───────────────────────── archive: admin access ───────────────────────── */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The admin panel stores the signed-in admin's token in a cookie so archive pages can load hidden editions.
async function adminClient() {
  if (!url || !key) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const sb = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.rpc('is_admin');
  return !error && data === true ? sb : null;
}

// Editions this visitor may see (+ whether they're an admin).
export async function listEditions() {
  if (!getSupabase()) {
    if (demoAllowed) return { editions: demoEditions, isAdmin: true, demo: true };
    throw new Error(NOT_CONNECTED);
  }
  const admin = await adminClient();
  if (admin) return { editions: (await fetchEditions(admin)) || [], isAdmin: true };
  return { editions: (await getPublicEditions()) || [], isAdmin: false };
}

// One edition's data, or null when it doesn't exist / isn't visible to this visitor.
export async function loadEdition(number) {
  const n = Number(number);
  if (!getSupabase()) {
    if (!demoAllowed) throw new Error(NOT_CONNECTED);
    const ed = demoEditions.find((e) => e.number === n);
    return ed ? { ...demoEditionData(ed), edition: ed, demo: true } : null;
  }

  // Public edition → the normal cached path
  const pub = (await getPublicEditions())?.find((e) => e.number === n);
  if (pub) {
    const [settings, ...tables] = await Promise.all([getSettings(), ...TABLES.map((t) => getTable(t, pub.id))]);
    return assemble(editionSettings(settings, pub), tables, { edition: pub });
  }

  // Hidden edition → only for a signed-in admin, never cached
  const admin = await adminClient();
  if (!admin) return null;
  const ed = ((await fetchEditions(admin)) || []).find((e) => e.number === n);
  if (!ed) return null;
  const [settings, ...tables] = await Promise.all([getSettings(), ...TABLES.map((t) => readTable(admin, t, ed.id))]);
  return assemble(editionSettings(settings, ed), tables, { edition: ed });
}

// Every visible edition with its data (for the all-time page).
export async function loadArchive() {
  const { editions, isAdmin, demo } = await listEditions();
  const list = await Promise.all(editions.map(async (ed) => ({ edition: ed, data: await loadEdition(ed.number) })));
  return { editions: list.filter((x) => x.data), isAdmin, demo: !!demo };
}
