// Supabase returns max 1000 rows per request — page through bigger tables.
// The first page also asks for the total, so the other pages can be loaded all at once
// (instead of one after the other — that got slow as the career grew).
// Pass an editionId to only load one Youth Edition.
const PAGE = 1000;
export async function fetchAll(sb, table, editionId = null) {
  const query = (from, withCount = false) => {
    let q = sb.from(table).select('*', withCount ? { count: 'exact' } : undefined);
    if (editionId) q = q.eq('edition_id', editionId);
    return q.order('id').range(from, from + PAGE - 1);
  };
  const first = await query(0, true);
  if (first.error) throw new Error(`${table}: ${first.error.message}`);
  const out = [...first.data];
  if (first.data.length < PAGE) return out;

  if (typeof first.count === 'number') {
    const pages = [];
    for (let from = PAGE; from < first.count; from += PAGE) pages.push(query(from));
    for (const res of await Promise.all(pages)) {
      if (res.error) throw new Error(`${table}: ${res.error.message}`);
      out.push(...res.data);
    }
    return out;
  }
  // no total available: one page after the other
  for (let from = PAGE; ; from += PAGE) {
    const { data, error } = await query(from);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

// One block of up to CHUNK rows, starting at row `from` (its 1000-row pages load at the same time).
// The first block also returns the total number of rows.
export const CHUNK = 4000;
export async function fetchChunk(sb, table, editionId, from) {
  const pages = [];
  for (let i = 0; i < CHUNK / PAGE; i++) {
    let q = sb.from(table).select('*', i === 0 && from === 0 ? { count: 'exact' } : undefined);
    if (editionId) q = q.eq('edition_id', editionId);
    pages.push(q.order('id').range(from + i * PAGE, from + (i + 1) * PAGE - 1));
  }
  const results = await Promise.all(pages);
  const rows = [];
  for (const res of results) {
    if (res.error) throw new Error(`${table}: ${res.error.message}`);
    rows.push(...res.data);
  }
  return { rows, count: from === 0 ? results[0].count ?? null : null };
}

// Tables added by later migrations: the site keeps working (empty) until the migration is run.
export const OPTIONAL = new Set(['player_moves', 'scouting', 'player_overalls']);

export const TABLES = ['seasons', 'standings', 'players', 'player_moves', 'matches', 'match_players', 'trophies', 'scouting', 'player_overalls'];

// All editions the current user may see, or null when the editions table doesn't exist yet (migration 007 not run).
export async function fetchEditions(sb) {
  const { data, error } = await sb.from('editions').select('*').order('number');
  if (error) {
    if (/does not exist|schema cache|Could not find/i.test(error.message)) return null;
    throw new Error(`editions: ${error.message}`);
  }
  return data;
}

export async function fetchEverything(sb) {
  const settingsRes = await sb.from('settings').select('*').eq('id', 1).maybeSingle();
  if (settingsRes.error) throw new Error(settingsRes.error.message);
  const out = { settings: settingsRes.data || { id: 1, club_name: 'Leicester City' }, editions: await fetchEditions(sb) };
  await Promise.all(
    TABLES.map(async (t) => {
      try {
        out[t] = await fetchAll(sb, t);
      } catch (err) {
        // Newer tables may not exist yet if a migration hasn't been run — don't break the whole site.
        if (OPTIONAL.has(t)) {
          out[t] = [];
          out.missing = [...(out.missing || []), t];
        } else throw err;
      }
    })
  );
  return out;
}
