// Supabase returns max 1000 rows per request — page through bigger tables.
// Pass an editionId to only load one Youth Edition.
export async function fetchAll(sb, table, editionId = null) {
  const out = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    let q = sb.from(table).select('*');
    if (editionId) q = q.eq('edition_id', editionId);
    const { data, error } = await q.order('id').range(from, from + size - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < size) break;
  }
  return out;
}

export const OPTIONAL = new Set(['player_moves']);

export const TABLES = ['seasons', 'standings', 'players', 'player_moves', 'matches', 'match_players', 'trophies'];

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
