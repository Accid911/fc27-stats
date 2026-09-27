import { getSupabase } from './supabase';
import { demoData } from './demo-data';
import { fetchEverything } from './fetch-all';

// Loads everything in one go — a career save is small, so this keeps pages simple.
export async function loadAll() {
  const sb = getSupabase();
  if (!sb) return { ...demoData, demo: true };
  return { ...(await fetchEverything(sb)), demo: false };
}

export async function loadSettings() {
  const sb = getSupabase();
  if (!sb) return demoData.settings;
  const { data } = await sb.from('settings').select('*').eq('id', 1).maybeSingle();
  return data || { club_name: 'Leicester City' };
}

/* ───────────────────────── helpers ───────────────────────── */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function isClub(team, clubName = 'Leicester City') {
  const t = norm(team);
  return t === norm(clubName) || t.includes('leicester');
}

export function ordinal(n) {
  if (n == null) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const seasonLabel = (s) => (s ? `Season ${s.number}` : '—');

export function matchResult(m) {
  if (m.goals_for > m.goals_against) return 'W';
  if (m.goals_for < m.goals_against) return 'L';
  return 'D';
}

const round1 = (x) => Math.round(x * 10) / 10;

export const POSITION_GROUPS = {
  GK: 'Goalkeepers',
  DEF: 'Defenders',
  MID: 'Midfielders',
  ATT: 'Attackers',
};
export function positionGroup(pos) {
  const p = String(pos || '').toUpperCase();
  if (p === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(p)) return 'MID';
  if (['LW', 'RW', 'CF', 'ST'].includes(p)) return 'ATT';
  return null;
}

/* ───────────────────────── model ───────────────────────── */

// Joins everything once and derives what the pages need.
export function buildModel(data) {
  const clubName = data.settings?.club_name || 'Leicester City';
  const seasons = [...data.seasons].sort((a, b) => a.number - b.number);
  const seasonById = Object.fromEntries(seasons.map((s) => [s.id, s]));
  const playerById = Object.fromEntries(data.players.map((p) => [p.id, p]));

  const lineups = {};
  for (const r of data.match_players) (lineups[r.match_id] ||= []).push(r);

  // Chronological: by season number, then by date (if given), then by entry order.
  const matches = data.matches
    .filter((m) => seasonById[m.season_id])
    .map((m) => ({
      ...m,
      season: seasonById[m.season_id],
      result: matchResult(m),
      lineup: (lineups[m.id] || []).filter((r) => playerById[r.player_id]),
    }))
    .sort(
      (a, b) =>
        a.season.number - b.season.number ||
        String(a.played_on || '').localeCompare(String(b.played_on || '')) ||
        String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
        String(a.id).localeCompare(String(b.id))
    );

  // Transfers & loans, chronological. A player's status = their latest move.
  const moves = (data.player_moves || [])
    .filter((mv) => playerById[mv.player_id])
    .map((mv) => ({ ...mv, season: seasonById[mv.season_id] || null, player: playerById[mv.player_id] }))
    .sort(
      (a, b) =>
        (a.season?.number ?? 0) - (b.season?.number ?? 0) ||
        String(a.moved_on || '').localeCompare(String(b.moved_on || '')) ||
        String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
        String(a.id).localeCompare(String(b.id))
    );
  const statusById = {};
  for (const p of data.players) statusById[p.id] = { status: 'squad', move: null };
  for (const mv of moves) statusById[mv.player_id] = { status: MOVE_STATUS[mv.type], move: mv };

  return { data, clubName, currency: data.settings?.currency || '£', seasons, seasonById, playerById, matches, moves, statusById };
}

/* ───────────────────────── squad status & money ───────────────────────── */

const MOVE_STATUS = { sold: 'sold', loan: 'loan', loan_return: 'squad', released: 'released' };

export const STATUS_LABEL = { squad: 'In squad', loan: 'On loan', sold: 'Sold', released: 'Released' };
export const STATUS_BADGE = { squad: 'green', loan: 'blue', sold: 'gold', released: '' };
export const MOVE_LABEL = { sold: 'Sold', loan: 'Loaned out', loan_return: 'Back from loan', released: 'Released' };

// "In squad", "On loan at Hull City", "Sold to Chelsea"…
export function statusText(st) {
  if (!st) return STATUS_LABEL.squad;
  const club = st.move?.club;
  if (st.status === 'loan') return club ? `On loan at ${club}` : 'On loan';
  if (st.status === 'sold') return club ? `Sold to ${club}` : 'Sold';
  return STATUS_LABEL[st.status];
}

export function formatMoney(amount, currency = '£') {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  if (n >= 1e6) return `${currency}${(Math.round(n / 1e5) / 10).toLocaleString('en-GB')}M`;
  if (n >= 1e3) return `${currency}${Math.round(n / 1e3).toLocaleString('en-GB')}K`;
  return `${currency}${n.toLocaleString('en-GB')}`;
}

// "12.5m", "850k", "1,200,000", "£3M" → number
export function parseMoney(text) {
  if (text == null) return null;
  const t = String(text).trim().toLowerCase().replace(/[£€$\s,]/g, '');
  if (!t) return null;
  const m = t.match(/^(\d+(?:\.\d+)?)(k|m|mil|million|bn|b)?$/);
  if (!m) return NaN;
  const mult = { k: 1e3, m: 1e6, mil: 1e6, million: 1e6, b: 1e9, bn: 1e9 }[m[2]] || 1;
  return Math.round(Number(m[1]) * mult);
}

export function seasonTournaments(season) {
  if (!season) return [];
  return [season.tournament, ...(season.cups || [])].filter(Boolean);
}

/* ───────────────────────── team stats ───────────────────────── */

export function teamRecord(matches) {
  const r = { P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, CS: 0 };
  for (const m of matches) {
    r.P++;
    r[m.result]++;
    r.GF += m.goals_for;
    r.GA += m.goals_against;
    if (m.goals_against === 0) r.CS++;
  }
  r.GD = r.GF - r.GA;
  r.winPct = r.P ? Math.round((r.W / r.P) * 100) : 0;
  r.gpg = r.P ? round1(r.GF / r.P) : 0;
  return r;
}

// Longest runs over chronological matches.
export function streaks(matches) {
  let win = 0, unbeaten = 0, bestWin = 0, bestUnbeaten = 0;
  for (const m of matches) {
    win = m.result === 'W' ? win + 1 : 0;
    unbeaten = m.result !== 'L' ? unbeaten + 1 : 0;
    bestWin = Math.max(bestWin, win);
    bestUnbeaten = Math.max(bestUnbeaten, unbeaten);
  }
  // current run
  let current = null;
  for (let i = matches.length - 1; i >= 0; i--) {
    const r = matches[i].result;
    if (!current) current = { type: r, count: 1 };
    else if (r === current.type) current.count++;
    else break;
  }
  return { bestWin, bestUnbeaten, current };
}

export function leagueTable(model, seasonId) {
  const rows = model.data.standings
    .filter((s) => s.season_id === seasonId)
    .sort((a, b) => b.points - a.points || a.team.localeCompare(b.team))
    .map((s, i) => ({ ...s, pos: i + 1, club: isClub(s.team, model.clubName) }));
  const club = rows.find((r) => r.club) || null;
  return { rows, club };
}

/* ───────────────────────── player stats ───────────────────────── */

export function playerStats(model, matches = model.matches) {
  const acc = {};
  const get = (id) =>
    (acc[id] ||= { apps: 0, goals: 0, assists: 0, potm: 0, ratingSum: 0, rated: 0, best: null, hatTricks: 0, wins: 0 });
  for (const m of matches) {
    for (const r of m.lineup) {
      const a = get(r.player_id);
      a.apps++;
      a.goals += r.goals;
      a.assists += r.assists;
      if (r.potm) a.potm++;
      if (r.goals >= 3) a.hatTricks++;
      if (m.result === 'W') a.wins++;
      if (r.rating != null) {
        const v = Number(r.rating);
        a.ratingSum += v;
        a.rated++;
        a.best = a.best == null ? v : Math.max(a.best, v);
      }
    }
  }
  return model.data.players.map((p) => {
    const a = acc[p.id] || get(p.id);
    return {
      ...p,
      apps: a.apps,
      goals: a.goals,
      assists: a.assists,
      ga: a.goals + a.assists,
      potm: a.potm,
      hatTricks: a.hatTricks,
      avg_rating: a.rated ? round1(a.ratingSum / a.rated) : null,
      best_rating: a.best,
      rated: a.rated,
      winPct: a.apps ? Math.round((a.wins / a.apps) * 100) : null,
    };
  });
}

export function topBy(rows, key, n = 5, filter = () => true) {
  return rows
    .filter((r) => r[key] != null && r[key] > 0 && filter(r))
    .sort((a, b) => b[key] - a[key] || (b.apps || 0) - (a.apps || 0))
    .slice(0, n);
}

/* ───────────────────────── record book ───────────────────────── */

export function recordBook(model) {
  const ms = model.matches;
  const by = (fn) => (ms.length ? [...ms].sort(fn)[0] : null);
  const biggestWin = by((a, b) => b.goals_for - b.goals_against - (a.goals_for - a.goals_against) || b.goals_for - a.goals_for);
  const worstLoss = by((a, b) => a.goals_for - a.goals_against - (b.goals_for - b.goals_against) || b.goals_against - a.goals_against);
  const mostGoals = by((a, b) => b.goals_for + b.goals_against - (a.goals_for + a.goals_against));

  let bestRating = null;
  let mostInGame = null;
  const hatTricks = [];
  for (const m of ms) {
    for (const r of m.lineup) {
      const p = model.playerById[r.player_id];
      if (r.rating != null && (!bestRating || Number(r.rating) > bestRating.value))
        bestRating = { value: Number(r.rating), player: p, match: m };
      if (r.goals > 0 && (!mostInGame || r.goals > mostInGame.value)) mostInGame = { value: r.goals, player: p, match: m };
      if (r.goals >= 3) hatTricks.push({ player: p, match: m, goals: r.goals });
    }
  }

  return {
    biggestWin: biggestWin && biggestWin.result === 'W' ? biggestWin : null,
    worstLoss: worstLoss && worstLoss.result === 'L' ? worstLoss : null,
    mostGoals: mostGoals && mostGoals.goals_for + mostGoals.goals_against > 0 ? mostGoals : null,
    bestRating,
    mostInGame,
    hatTricks,
  };
}

export function countBy(rows, keyFn) {
  const out = {};
  for (const r of rows) {
    const k = keyFn(r);
    if (k) out[k] = (out[k] || 0) + 1;
  }
  return Object.entries(out)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}
