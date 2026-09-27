// Fictional sample data shown until Supabase is connected.

let seed = 27;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const between = (a, b) => Math.floor(a + rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

export const settings = {
  id: 1,
  club_name: 'Leicester City',
  creator_name: 'Demo Creator',
  tagline: 'Academy only. No transfers. Can a squad of teenagers conquer England and Europe?',
  youtube_url: 'https://www.youtube.com/',
};

const squad = [
  ['Oliver Grant', 'GK', 17, 'England', 0, 0],
  ['Mateus Andrade', 'GK', 16, 'Portugal', 0, 0],
  ['Kian Doyle', 'CB', 18, 'Ireland', 0.04, 0.02],
  ['Jonas Peeters', 'CB', 17, 'Belgium', 0.05, 0.02],
  ['Isaac Mensah', 'RB', 17, 'Ghana', 0.03, 0.12],
  ['Leo Hartmann', 'LB', 18, 'Germany', 0.03, 0.14],
  ['Rhys Morgan', 'CDM', 18, 'Wales', 0.05, 0.08],
  ['Tom Whitaker', 'CM', 17, 'England', 0.12, 0.2],
  ['Nico Álvarez', 'CAM', 16, 'Spain', 0.22, 0.3],
  ['Yuto Sakamoto', 'LW', 17, 'Japan', 0.28, 0.22],
  ['Samuel Okafor', 'RW', 18, 'Nigeria', 0.3, 0.2],
  ['Harvey Cole', 'ST', 17, 'England', 0.55, 0.1],
  ['Luca Romano', 'ST', 16, 'Italy', 0.4, 0.08],
  ['Ethan Brooks', 'CM', 16, 'Scotland', 0.08, 0.12],
  ['Aaron Fielding', 'CB', 16, 'England', 0.03, 0.02],
  ['Mikkel Holm', 'CM', 17, 'Denmark', 0.1, 0.18],
  ['Karim Benali', 'RW', 16, 'Morocco', 0.25, 0.2],
  ['Jayden Price', 'ST', 15, 'England', 0.35, 0.08],
];

export const players = squad.map(([name, position, , country], i) => ({
  id: `p${i + 1}`,
  name,
  position,
  country,
}));

const PL = [
  'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham',
  'Leeds United', 'Liverpool', 'Manchester City', 'Manchester United', 'Newcastle United', 'Nottingham Forest',
  'Sunderland', 'Tottenham Hotspur', 'West Ham United', 'Wolves',
];

export const seasons = [
  { id: 's1', number: 1, tournament: 'Championship', cups: ['FA Cup', 'EFL Cup'], notes: 'Year one: promotion with a squad of 17-year-olds.' },
  { id: 's2', number: 2, tournament: 'Premier League', cups: ['FA Cup', 'EFL Cup'], notes: 'The kids grow up — European football secured.' },
  { id: 's3', number: 3, tournament: 'Premier League', cups: ['FA Cup', 'EFL Cup', 'Europa League'], notes: 'Title challenge in progress.' },
];

const clubPoints = [92, 66, 58];
export const standings = [];
seasons.forEach((s, si) => {
  const pts = PL.map(() => between(28, 88));
  PL.forEach((team, i) => standings.push({ id: `st-${si}-${i}`, season_id: s.id, team, points: pts[i] }));
  standings.push({ id: `st-${si}-lei`, season_id: s.id, team: 'Leicester City', points: clubPoints[si] });
});

export const matches = [];
export const match_players = [];
let t = Date.UTC(2025, 0, 1);
seasons.forEach((s, si) => {
  const n = si === 2 ? 9 : 14;
  for (let i = 0; i < n; i++) {
    const id = `m-${si}-${i}`;
    const cup = i % 5 === 4;
    const gf = Math.max(0, between(0, 3) + (si > 0 ? between(0, 1) : 0));
    const ga = between(0, 2);
    matches.push({
      id,
      season_id: s.id,
      tournament: cup ? pick(s.cups) : s.tournament,
      opponent: pick(PL),
      goals_for: gf,
      goals_against: ga,
      venue: i % 2 ? 'A' : 'H',
      played_on: null,
      video_url: null,
      notes: null,
      created_at: new Date((t += 7 * 864e5)).toISOString(),
    });

    // Line-up: GK + 10 outfield + 2 subs
    const gk = rand() > 0.25 ? 0 : 1;
    const outfield = squad.map((_, k) => k).filter((k) => k > 1).sort(() => rand() - 0.5).slice(0, 12);
    const lineup = [gk, ...outfield].map((k) => ({
      id: `${id}-${k}`,
      match_id: id,
      player_id: `p${k + 1}`,
      rating: Math.round((5.8 + rand() * 2.6 + (gf - ga) * 0.25) * 10) / 10,
      goals: 0,
      assists: 0,
      potm: false,
      _w: squad[k],
    }));
    for (let g = 0; g < gf; g++) {
      const scorer = weighted(lineup, (r) => r._w[4] + 0.01);
      scorer.goals++;
      scorer.rating = Math.min(10, Math.round((scorer.rating + 0.6) * 10) / 10);
      if (rand() > 0.3) {
        const assister = weighted(lineup.filter((r) => r !== scorer), (r) => r._w[5] + 0.01);
        assister.assists++;
        assister.rating = Math.min(10, Math.round((assister.rating + 0.3) * 10) / 10);
      }
    }
    if (ga === 0) lineup[0].rating = Math.min(10, Math.round((lineup[0].rating + 0.5) * 10) / 10);
    lineup.forEach((r) => (r.rating = Math.max(4, r.rating)));
    const best = [...lineup].sort((a, b) => b.rating - a.rating)[0];
    if (rand() > 0.1) best.potm = true;
    lineup.forEach(({ _w, ...r }) => match_players.push(r));
  }
});

function weighted(rows, w) {
  const total = rows.reduce((a, r) => a + w(r), 0);
  let x = rand() * total;
  for (const r of rows) if ((x -= w(r)) <= 0) return r;
  return rows[rows.length - 1];
}

export const trophies = [
  { id: 't0', season_id: 's1', name: 'Championship' },
  { id: 't1', season_id: 's2', name: 'FA Cup' },
];

export const player_moves = [
  { id: 'mv1', player_id: 'p2', type: 'loan', club: 'Plymouth Argyle', fee: 250000, season_id: 's2', moved_on: null, notes: 'Needs first-team minutes.', created_at: '2025-06-01T00:00:00Z' },
  { id: 'mv2', player_id: 'p2', type: 'loan_return', club: 'Plymouth Argyle', fee: null, season_id: 's3', moved_on: null, notes: null, created_at: '2025-07-01T00:00:00Z' },
  { id: 'mv3', player_id: 'p13', type: 'sold', club: 'Juventus', fee: 38500000, season_id: 's3', moved_on: null, notes: 'Wanted to go home.', created_at: '2025-08-01T00:00:00Z' },
  { id: 'mv4', player_id: 'p15', type: 'loan', club: 'Hull City', fee: null, season_id: 's3', moved_on: null, notes: null, created_at: '2025-08-02T00:00:00Z' },
  { id: 'mv5', player_id: 'p7', type: 'sold', club: 'Brentford', fee: 12000000, season_id: 's3', moved_on: null, notes: null, created_at: '2025-08-03T00:00:00Z' },
];

export const demoData = { settings: { ...settings, currency: '£' }, seasons, standings, players, player_moves, matches, match_players, trophies };
