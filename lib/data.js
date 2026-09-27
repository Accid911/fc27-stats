import { getSupabase } from './supabase';
import { demoData } from './demo-data';

// Loads everything in one go — a career save is small, so this keeps pages simple.
export async function loadAll() {
  const sb = getSupabase();
  if (!sb) return { ...demoData, demo: true };

  const q = (t) => sb.from(t).select('*');
  const results = await Promise.all([
    sb.from('settings').select('*').eq('id', 1).maybeSingle(),
    q('seasons'),
    q('players'),
    q('player_season_stats'),
    q('matches'),
    q('trophies'),
  ]);
  const err = results.find((r) => r.error);
  if (err) throw new Error(err.error.message);
  const [settings, seasons, players, stats, matches, trophies] = results.map((r) => r.data);

  return {
    settings: settings || { club_name: 'My Club' },
    seasons: seasons || [],
    players: players || [],
    player_season_stats: stats || [],
    matches: matches || [],
    trophies: trophies || [],
    demo: false,
  };
}

export const STAT_KEYS = ['appearances', 'goals', 'assists', 'clean_sheets', 'yellow_cards', 'red_cards', 'motm'];

export function sortSeasons(seasons, dir = 'desc') {
  const s = [...seasons].sort((a, b) => a.start_year - b.start_year || a.name.localeCompare(b.name));
  return dir === 'desc' ? s.reverse() : s;
}

// Sum stats over several season rows. Avg rating is weighted by appearances.
export function sumStats(rows) {
  const t = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  let ratingWeighted = 0;
  let ratingApps = 0;
  for (const r of rows) {
    for (const k of STAT_KEYS) t[k] += Number(r[k] || 0);
    if (r.avg_rating != null && r.appearances) {
      ratingWeighted += Number(r.avg_rating) * r.appearances;
      ratingApps += r.appearances;
    }
  }
  t.avg_rating = ratingApps ? Math.round((ratingWeighted / ratingApps) * 10) / 10 : null;
  t.ga = t.goals + t.assists;
  t.seasons = rows.length;
  return t;
}

export function careerTotals(data) {
  return data.players.map((p) => ({
    ...p,
    ...sumStats(data.player_season_stats.filter((s) => s.player_id === p.id)),
  }));
}

export function matchResult(m) {
  if (m.goals_for > m.goals_against) return 'W';
  if (m.goals_for < m.goals_against) return 'L';
  return 'D';
}

export function record(matches) {
  const r = { P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0 };
  for (const m of matches) {
    r.P++;
    r[matchResult(m)]++;
    r.GF += m.goals_for;
    r.GA += m.goals_against;
  }
  r.GD = r.GF - r.GA;
  return r;
}

export function topBy(rows, key, n = 5) {
  return [...rows].filter((r) => r[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, n);
}

export function ordinal(n) {
  if (n == null) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
