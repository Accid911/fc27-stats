// Server-side data loading with caching. Pages read from Next's cache; the admin panel
// refreshes it right after every save (see app/api/revalidate/route.js).
//
// - loadAll()          → the current edition (Leicester City) for the main site.
// - loadEdition(n)     → one edition of the archive. Hidden editions only load for a signed-in admin.
// - listEditions()     → the editions this visitor may see.
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getSupabase, demoAllowed } from './supabase';
import { demoData, demoEditions, demoEditionData } from './demo-data';
import { fetchChunk, fetchEditions, CHUNK, OPTIONAL, TABLES } from './fetch-all';
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

// Tables are cached in blocks of 4000 rows: one cache entry has a size limit (2 MB on Vercel),
// and a big table in a single entry would silently stop being cached as the career grows.
async function readChunk(sb, t, editionId, i) {
  try {
    return await fetchChunk(sb, t, editionId, i * CHUNK);
  } catch (err) {
    if (OPTIONAL.has(t)) return { rows: [], count: 0, missing: true };
    throw err;
  }
}
async function chunked(t, editionId, getChunk) {
  const first = await getChunk(t, editionId, 0);
  if (first.missing) return { rows: [], missing: true };
  if (first.rows.length < CHUNK) return { rows: first.rows };
  if (first.count == null) return { rows: first.rows.concat(...(await moreChunksUntilEmpty(t, editionId, getChunk))) };
  const n = Math.ceil(first.count / CHUNK);
  const rest = await Promise.all(Array.from({ length: n - 1 }, (_, k) => getChunk(t, editionId, k + 1)));
  return { rows: first.rows.concat(...rest.map((r) => r.rows)) };
}
async function moreChunksUntilEmpty(t, editionId, getChunk) {
  const out = [];
  for (let i = 1; ; i++) {
    const c = await getChunk(t, editionId, i);
    out.push(c.rows);
    if (c.rows.length < CHUNK) return out;
  }
}

const publicChunk = unstable_cache(async (t, editionId, i) => readChunk(getSupabase(), t, editionId, i), ['career-v2', 'chunk'], {
  tags: [CACHE_TAG],
  revalidate: REVALIDATE_SECONDS,
});
const getTable = (t, editionId) => chunked(t, editionId || null, publicChunk);

function assemble(settings, results, extra) {
  const out = { settings, demo: false, ...extra };
  TABLES.forEach((t, i) => {
    out[t] = results[i].rows;
    if (results[i].missing) out.missing = [...(out.missing || []), t];
  });
  return out;
}

/* ───────────────────────── main site: current edition ───────────────────────── */

export const loadAll = cache(async () => {
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
});

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
const clientFor = (token) =>
  createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

// "Is this token an admin?" — remembered for 5 minutes per token, so not every page view asks the database.
const isAdminToken = unstable_cache(
  async (token) => {
    const { data, error } = await clientFor(token).rpc('is_admin');
    return !error && data === true;
  },
  ['career-v1', 'is-admin'],
  { revalidate: 300 }
);

// Hidden editions + their tables for a signed-in admin: cached like the public pages (per admin session),
// and cleared after every save. Before, every page view loaded everything again from the database.
const adminEditions = unstable_cache(async (token) => fetchEditions(clientFor(token)), ['career-v1', 'admin-editions'], {
  tags: [CACHE_TAG],
  revalidate: REVALIDATE_SECONDS,
});
const adminChunk = unstable_cache(
  async (t, editionId, i, token) => readChunk(clientFor(token), t, editionId, i),
  ['career-v2', 'admin-chunk'],
  { tags: [CACHE_TAG], revalidate: REVALIDATE_SECONDS }
);
const adminTable = (t, editionId, token) => chunked(t, editionId, (tt, ed, i) => adminChunk(tt, ed, i, token));

// Once per page request (the layout, the page and its title all ask).
const adminToken = cache(async () => {
  if (!url || !key) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || token.length > 4096) return null;
  return (await isAdminToken(token)) ? token : null;
});

// Editions this visitor may see (+ whether they're an admin).
export const listEditions = cache(async () => {
  if (!getSupabase()) {
    if (demoAllowed) return { editions: demoEditions, isAdmin: true, demo: true };
    throw new Error(NOT_CONNECTED);
  }
  const token = await adminToken();
  if (token) return { editions: (await adminEditions(token)) || [], isAdmin: true };
  return { editions: (await getPublicEditions()) || [], isAdmin: false };
});

// One edition's data, or null when it doesn't exist / isn't visible to this visitor.
export const loadEdition = cache(async (number) => {
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

  // Hidden edition → only for a signed-in admin
  const token = await adminToken();
  if (!token) return null;
  const ed = ((await adminEditions(token)) || []).find((e) => e.number === n);
  if (!ed) return null;
  const [settings, ...tables] = await Promise.all([getSettings(), ...TABLES.map((t) => adminTable(t, ed.id, token))]);
  return assemble(editionSettings(settings, ed), tables, { edition: ed });
});

// Every visible edition with its data (for the all-time page).
export async function loadArchive() {
  const { editions, isAdmin, demo } = await listEditions();
  const list = await Promise.all(editions.map(async (ed) => ({ edition: ed, data: await loadEdition(ed.number) })));
  return { editions: list.filter((x) => x.data), isAdmin, demo: !!demo };
}
