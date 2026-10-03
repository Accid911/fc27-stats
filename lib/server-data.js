// Server-side data loading with caching. Pages read from Next's cache; the admin panel
// refreshes it right after every save (see app/api/revalidate/route.js).
import { unstable_cache } from 'next/cache';
import { getSupabase, demoAllowed } from './supabase';
import { demoData } from './demo-data';
import { fetchAll, OPTIONAL, TABLES } from './fetch-all';

export const CACHE_TAG = 'career';
const REVALIDATE_SECONDS = 300; // safety net: refresh at least every 5 minutes

const cached = (key, fn) => unstable_cache(fn, ['career-v1', key], { tags: [CACHE_TAG], revalidate: REVALIDATE_SECONDS });

const NOT_CONNECTED = 'The stats database is not connected (check the Supabase settings on Vercel).';

const getSettings = cached('settings', async () => {
  const { data, error } = await getSupabase().from('settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw new Error(`settings: ${error.message}`);
  return data || { id: 1, club_name: 'Leicester City' };
});

// One cache entry per table keeps each entry small as the career grows.
const getTable = Object.fromEntries(
  TABLES.map((t) => [
    t,
    cached(`table:${t}`, async () => {
      try {
        return { rows: await fetchAll(getSupabase(), t) };
      } catch (err) {
        // A table from a migration that hasn't been run yet shouldn't break the whole site.
        if (OPTIONAL.has(t)) return { rows: [], missing: true };
        throw err;
      }
    }),
  ])
);

export async function loadAll() {
  if (!getSupabase()) {
    if (demoAllowed) return { ...demoData, demo: true };
    throw new Error(NOT_CONNECTED);
  }
  const [settings, ...tables] = await Promise.all([getSettings(), ...TABLES.map((t) => getTable[t]())]);
  const out = { settings, demo: false };
  TABLES.forEach((t, i) => {
    out[t] = tables[i].rows;
    if (tables[i].missing) out.missing = [...(out.missing || []), t];
  });
  return out;
}

export async function loadSettings() {
  if (!getSupabase()) {
    if (demoAllowed) return demoData.settings;
    throw new Error(NOT_CONNECTED);
  }
  return getSettings();
}
