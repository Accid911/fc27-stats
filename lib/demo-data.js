// Fictional sample data shown until Supabase is connected.

let seed = 27;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (a, b) => Math.floor(a + rand() * (b - a + 1));

export const settings = {
  id: 1,
  club_name: 'Riverside Athletic',
  creator_name: 'Demo Creator',
  tagline: 'From League Two to the Champions League — every stat of the journey.',
  youtube_url: 'https://www.youtube.com/',
};

export const seasons = [
  { id: 's1', name: '2026/27', start_year: 2026, club: 'Riverside Athletic', league: 'League Two', league_position: 2, notes: 'Promoted on the final day.' },
  { id: 's2', name: '2027/28', start_year: 2027, club: 'Riverside Athletic', league: 'League One', league_position: 1, notes: 'Title winners.' },
  { id: 's3', name: '2028/29', start_year: 2028, club: 'Riverside Athletic', league: 'Championship', league_position: 5, notes: 'Play-off heartbreak.' },
];

const roster = [
  ['Tomás Reyes', 'GK', 'Spain', 1, 0, 0],
  ['Callum Hart', 'CB', 'England', 5, 0.05, 0.03],
  ['Jonas Vermeulen', 'CB', 'Belgium', 4, 0.07, 0.03],
  ['Mateo Silva', 'LB', 'Portugal', 3, 0.04, 0.2],
  ['Kofi Mensah', 'RB', 'Ghana', 2, 0.03, 0.18],
  ['Liam O’Connor', 'CDM', 'Ireland', 6, 0.06, 0.1],
  ['Noah Becker', 'CM', 'Germany', 8, 0.18, 0.3],
  ['Arthur Dubois', 'CAM', 'France', 10, 0.35, 0.45],
  ['Yuki Tanaka', 'LW', 'Japan', 11, 0.4, 0.35],
  ['Rafael Costa', 'RW', 'Brazil', 7, 0.42, 0.3],
  ['Viktor Novak', 'ST', 'Croatia', 9, 0.75, 0.15],
  ['Sam Wilder', 'ST', 'Wales', 19, 0.55, 0.12],
];

export const players = roster.map(([name, position, nationality, shirt_number], i) => ({
  id: `p${i + 1}`,
  name,
  position,
  nationality,
  shirt_number,
  overall: between(64, 78),
  potential: between(76, 88),
  is_active: i !== 11,
  notes: null,
}));

export const player_season_stats = [];
seasons.forEach((s, si) => {
  roster.forEach(([, pos, , , g, a], pi) => {
    if (pi === 11 && si === 2) return; // sold before season 3
    const apps = between(22, 46);
    player_season_stats.push({
      id: `st-${si}-${pi}`,
      player_id: `p${pi + 1}`,
      season_id: s.id,
      appearances: apps,
      goals: Math.round(apps * g * (0.7 + rand() * 0.6)),
      assists: Math.round(apps * a * (0.7 + rand() * 0.6)),
      clean_sheets: pos === 'GK' ? between(10, 20) : 0,
      yellow_cards: between(0, 8),
      red_cards: rand() > 0.85 ? 1 : 0,
      motm: between(0, 6),
      avg_rating: Math.round((6.4 + rand() * 1.4) * 10) / 10,
    });
  });
});

const opponents = ['Harbour City', 'Northgate United', 'Kingsbridge', 'Ashford Town', 'Millbrook Rovers', 'Castleton', 'Eastfield', 'Westmoor Albion'];
export const matches = [];
seasons.forEach((s) => {
  for (let i = 0; i < 8; i++) {
    const gf = between(0, 4);
    const ga = between(0, 2);
    matches.push({
      id: `m-${s.id}-${i}`,
      season_id: s.id,
      played_on: `${s.start_year}-${String(8 + Math.floor(i / 2)).padStart(2, '0')}-${String(3 + (i % 2) * 14).padStart(2, '0')}`,
      competition: i === 5 ? 'FA Cup' : 'League',
      opponent: opponents[i],
      venue: i % 2 ? 'A' : 'H',
      goals_for: gf,
      goals_against: ga,
      video_url: null,
      notes: null,
    });
  }
});

export const trophies = [
  { id: 't1', season_id: 's2', name: 'League One Title' },
  { id: 't2', season_id: 's2', name: 'EFL Trophy' },
];

export const demoData = { settings, seasons, players, player_season_stats, matches, trophies };
