
/* ───────────────────────── helpers ───────────────────────── */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Is this league-table team "our" club? Tolerant of FC/AFC and short names ("Leicester" ↔ "Leicester City FC").
export function isClub(team, clubName = 'Leicester City') {
  const strip = (s) => norm(String(s || '').replace(/\b(a?fc|cf)\b/gi, ''));
  const t = strip(team);
  const c = strip(clubName);
  if (!t || !c) return false;
  return t === c || (t.length >= 5 && c.length >= 5 && (t.includes(c) || c.includes(t)));
}

export function ordinal(n) {
  if (n == null) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const seasonLabel = (s) => (s ? `Season ${s.number}` : '—');

// A penalty shoot-out decides a drawn cup match: counts as a W or L.
export function isShootout(m) {
  return m.pens_for != null && m.pens_against != null && Number(m.goals_for) === Number(m.goals_against);
}

export function matchResult(m) {
  const gf = Number(m.goals_for);
  const ga = Number(m.goals_against);
  if (gf > ga) return 'W';
  if (gf < ga) return 'L';
  if (isShootout(m)) return Number(m.pens_for) > Number(m.pens_against) ? 'W' : 'L';
  return 'D';
}

// Home team first: "Luton 1 – 2 Leicester" when Leicester play away.
export function fixture(m, clubName = 'Leicester City') {
  const away = m.venue === 'A';
  const club = { name: clubName, goals: m.goals_for, pens: m.pens_for, club: true };
  const opp = { name: m.opponent, goals: m.goals_against, pens: m.pens_against, club: false };
  const [home, visitor] = away ? [opp, club] : [club, opp];
  return { home, away: visitor, pens: isShootout(m) };
}

export function scoreText(m) {
  const f = fixture(m);
  return `${f.home.goals}–${f.away.goals}${f.pens ? ` (${f.home.pens}–${f.away.pens} pens)` : ''}`;
}

// "Luton 1–2 Leicester City (pens 4–3)" as plain text
export function fixtureText(m, clubName) {
  const f = fixture(m, clubName);
  return `${f.home.name} ${f.home.goals}–${f.away.goals} ${f.away.name}${f.pens ? ` (${f.home.pens}–${f.away.pens} pens)` : ''}`;
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

  // Season a player joined: set in admin, otherwise the season of his first appearance.
  const joinedById = {};
  for (const p of data.players) {
    const set = seasonById[p.joined_season_id];
    if (set) joinedById[p.id] = { season: set, guessed: false };
  }
  for (const m of matches) {
    for (const r of m.lineup) if (!joinedById[r.player_id]) joinedById[r.player_id] = { season: m.season, guessed: true };
  }

  return { data, clubName, currency: data.settings?.currency || '£', seasons, seasonById, playerById, matches, moves, statusById, joinedById };
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
  const num = (v) => (v == null || v === '' ? null : Number(v));
  const rows = model.data.standings
    .filter((s) => s.season_id === seasonId)
    .map((s) => {
      const w = num(s.won), d = num(s.drawn), l = num(s.lost), gf = num(s.gf), ga = num(s.ga);
      return {
        ...s,
        played: w != null || d != null || l != null ? (w || 0) + (d || 0) + (l || 0) : null,
        gd: gf != null && ga != null ? gf - ga : null,
      };
    })
    .sort((a, b) => b.points - a.points || (b.gd ?? 0) - (a.gd ?? 0) || (b.gf ?? 0) - (a.gf ?? 0) || a.team.localeCompare(b.team))
    .map((s, i) => ({ ...s, pos: i + 1, club: isClub(s.team, model.clubName) }));
  const club = rows.find((r) => r.club) || null;
  return { rows, club };
}

/* ───────────────────────── honours ───────────────────────── */

// How far Leicester got in a cup (set per season in the admin)
export const CUP_RESULTS = ['Winner', 'Final', 'Semi-final', 'Quarter-final', 'Round of 16', 'Earlier round', 'Group stage'];

// Trophies won in a season: league title (top of the entered table), cups marked "Winner",
// plus any extra trophies entered in the admin.
export function seasonHonours(model, season) {
  const out = [];
  const t = leagueTable(model, season.id);
  if (t.club && t.club.pos === 1 && t.rows.length > 1) {
    out.push({ id: `league-${season.id}`, name: `${season.tournament} title`, kind: 'league', season });
  }
  for (const cup of season.cups || []) {
    if (season.cup_results?.[cup] === 'Winner') out.push({ id: `cup-${season.id}-${cup}`, name: cup, kind: 'cup', season });
  }
  for (const tr of model.data.trophies.filter((x) => x.season_id === season.id)) {
    out.push({ id: tr.id, name: tr.name, kind: 'other', season });
  }
  return out;
}

export function allHonours(model) {
  return model.seasons.flatMap((s) => seasonHonours(model, s));
}

/* ───────────────────────── player stats ───────────────────────── */

export function playerStats(model, matches = model.matches) {
  const acc = {};
  const get = (id) =>
    (acc[id] ||= { apps: 0, goals: 0, assists: 0, potm: 0, ratingSum: 0, rated: 0, best: null, hatTricks: 0, wins: 0, cleanSheets: 0 });
  for (const m of matches) {
    for (const r of m.lineup) {
      const a = get(r.player_id);
      a.apps++;
      a.goals += r.goals;
      a.assists += r.assists;
      if (r.potm) a.potm++;
      if (r.goals >= 3) a.hatTricks++;
      if (m.result === 'W') a.wins++;
      if (Number(m.goals_against) === 0) a.cleanSheets++;
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
      // Clean sheets only count for goalkeepers and defenders
      cs: hasCleanSheets(p.position) ? a.cleanSheets : null,
      joined: model.joinedById?.[p.id] || null,
    };
  });
}

export const hasCleanSheets = (pos) => ['GK', 'DEF'].includes(positionGroup(pos));

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

/* ───────────────────────── fun facts ───────────────────────── */

export function funFacts(model) {
  const ms = model.matches;
  const P = model.playerById;
  const facts = {};

  // Home / away / neutral split
  facts.home = teamRecord(ms.filter((m) => m.venue !== 'A' && m.venue !== 'N'));
  facts.away = teamRecord(ms.filter((m) => m.venue === 'A'));

  // Penalty shoot-outs
  const shootouts = ms.filter(isShootout);
  facts.shootouts = { played: shootouts.length, won: shootouts.filter((m) => m.result === 'W').length };

  // Most common scoreline (from Leicester's side, e.g. 2–1)
  const lines = {};
  for (const m of ms) {
    const k = `${m.goals_for}–${m.goals_against}`;
    lines[k] = (lines[k] || 0) + 1;
  }
  const commonLine = Object.entries(lines).sort((a, b) => b[1] - a[1])[0];
  facts.scoreline = commonLine ? { score: commonLine[0], times: commonLine[1] } : null;

  // Favourite opponent / bogey team
  const opp = {};
  for (const m of ms) {
    const o = (opp[m.opponent] ||= { team: m.opponent, P: 0, W: 0, D: 0, L: 0 });
    o.P++;
    o[m.result]++;
  }
  const opps = Object.values(opp);
  facts.favourite = opps.filter((o) => o.W > 0).sort((a, b) => b.W - a.W || a.L - b.L || b.P - a.P)[0] || null;
  facts.bogey = opps.filter((o) => o.L > 0).sort((a, b) => b.L - a.L || a.W - b.W || b.P - a.P)[0] || null;
  facts.opponentsFaced = opps.length;

  // Team clean-sheet streak and scoring run
  let cs = 0, bestCs = 0, sc = 0, bestSc = 0;
  for (const m of ms) {
    cs = m.goals_against === 0 ? cs + 1 : 0;
    sc = m.goals_for > 0 ? sc + 1 : 0;
    bestCs = Math.max(bestCs, cs);
    bestSc = Math.max(bestSc, sc);
  }
  facts.cleanSheetRun = bestCs;
  facts.scoringRun = bestSc;

  // Player scoring streak: goals in consecutive appearances
  const run = {};
  let streak = null;
  for (const m of ms) {
    for (const r of m.lineup) {
      const cur = (run[r.player_id] = r.goals > 0 ? (run[r.player_id] || 0) + 1 : 0);
      if (cur > 0 && (!streak || cur > streak.value)) streak = { value: cur, player: P[r.player_id] };
    }
  }
  facts.scoringStreak = streak;

  // Best single season for a player (goals, POTM)
  let seasonGoals = null, seasonPotm = null;
  for (const s of model.seasons) {
    const st = playerStats(model, ms.filter((m) => m.season_id === s.id));
    for (const p of st) {
      if (p.goals > 0 && (!seasonGoals || p.goals > seasonGoals.value)) seasonGoals = { value: p.goals, player: p, season: s };
      if (p.potm > 0 && (!seasonPotm || p.potm > seasonPotm.value)) seasonPotm = { value: p.potm, player: p, season: s };
    }
  }
  facts.seasonGoals = seasonGoals;
  facts.seasonPotm = seasonPotm;

  // Different goalscorers
  const scorers = new Set();
  for (const m of ms) for (const r of m.lineup) if (r.goals > 0) scorers.add(r.player_id);
  facts.differentScorers = scorers.size;

  // Best team performance by average rating
  let bestTeam = null;
  for (const m of ms) {
    const rated = m.lineup.filter((r) => r.rating != null);
    if (rated.length < 5) continue;
    const avg = rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length;
    if (!bestTeam || avg > bestTeam.value) bestTeam = { value: round1(avg), match: m };
  }
  facts.bestTeamRating = bestTeam;

  // Goals by position group
  const byGroup = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  for (const m of ms) {
    for (const r of m.lineup) {
      const g = positionGroup(P[r.player_id]?.position);
      if (g) byGroup[g] += r.goals;
    }
  }
  facts.goalsByGroup = Object.entries(byGroup).map(([g, value]) => ({ label: POSITION_GROUPS[g], value }));

  // Academy intake per season
  facts.intake = model.seasons.map((s) => ({
    label: `S${s.number}`,
    value: Object.values(model.joinedById).filter((j) => j.season.id === s.id).length,
    season: s,
  }));

  return facts;
}
