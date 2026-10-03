// Supabase returns max 1000 rows per request — page through bigger tables.
export async function fetchAll(sb, table) {
  const out = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await sb.from(table).select('*').order('id').range(from, from + size - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < size) break;
  }
  return out;
}

export const OPTIONAL = new Set(['player_moves']);

export const TABLES = ['seasons', 'standings', 'players', 'player_moves', 'matches', 'match_players', 'trophies'];

export async function fetchEverything(sb) {
  const settingsRes = await sb.from('settings').select('*').eq('id', 1).maybeSingle();
  if (settingsRes.error) throw new Error(settingsRes.error.message);
  const out = { settings: settingsRes.data || { id: 1, club_name: 'Leicester City' } };
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
