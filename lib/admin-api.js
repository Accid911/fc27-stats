'use client';

import { demoData } from './demo-data';
import { fetchEverything } from './fetch-all';

// Same interface for Supabase and for demo mode (in-memory, nothing saved).
export function makeApi(sb) {
  if (!sb) return makeDemoApi();

  const check = ({ data, error }) => {
    if (error) throw new Error(friendly(error.message));
    return data;
  };

  return {
    demo: false,
    loadAll: () => fetchEverything(sb),
    async saveSettings(row) {
      return check(await sb.from('settings').upsert({ ...row, id: 1 }).select().single());
    },
    async save(table, row) {
      const { id, ...rest } = row;
      if (id) return check(await sb.from(table).update(rest).eq('id', id).select().single());
      return check(await sb.from(table).insert(rest).select().single());
    },
    async saveMatch(match, lineup) {
      return check(await sb.rpc('save_match', { p_match: match, p_players: lineup }));
    },
    async saveSeason(season, teams) {
      return check(await sb.rpc('save_season', { p_season: season, p_teams: teams }));
    },
    async remove(table, id) {
      check(await sb.from(table).delete().eq('id', id));
    },
  };
}

function friendly(msg) {
  if (/seasons_number_key/.test(msg)) return 'A season with that number already exists.';
  if (/one_potm_per_match/.test(msg)) return 'Only one Player of the Match per match.';
  if (/standings_season_id_team_key/.test(msg)) return 'The same team is in the table twice.';
  if (/save_match|save_season/.test(msg) && /does not exist|Could not find/.test(msg))
    return 'The database is missing the new save functions — run supabase/migrations/002-leicester-youth.sql in Supabase.';
  if (/joined_season_id/.test(msg))
    return 'The database needs an upgrade — run supabase/migrations/005-joined-season.sql in Supabase.';
  if (/player_moves|cups|currency/.test(msg) && /does not exist|Could not find|schema cache/.test(msg))
    return 'The database needs an upgrade — run supabase/migrations/003-transfers-cups.sql in Supabase.';
  return msg;
}

function makeDemoApi() {
  const store = structuredClone(demoData);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  return {
    demo: true,
    async loadAll() {
      return structuredClone(store);
    },
    async saveSettings(row) {
      store.settings = { ...row, id: 1 };
      return store.settings;
    },
    async save(table, row) {
      const list = store[table];
      if (row.id) {
        const i = list.findIndex((x) => x.id === row.id);
        list[i] = { ...list[i], ...row };
        return list[i];
      }
      const created = { ...row, id: uid(), created_at: new Date().toISOString() };
      list.push(created);
      return created;
    },
    async saveMatch(match, lineup) {
      let id = match.id;
      if (id) {
        const i = store.matches.findIndex((m) => m.id === id);
        store.matches[i] = { ...store.matches[i], ...match };
        store.match_players = store.match_players.filter((r) => r.match_id !== id);
      } else {
        id = uid();
        store.matches.push({ ...match, id, created_at: new Date().toISOString() });
      }
      for (const r of lineup) store.match_players.push({ ...r, id: uid(), match_id: id });
      return id;
    },
    async saveSeason(season, teams) {
      if (store.seasons.some((s) => s.number === season.number && s.id !== season.id))
        throw new Error('A season with that number already exists.');
      let id = season.id;
      if (id) {
        const i = store.seasons.findIndex((s) => s.id === id);
        store.seasons[i] = { ...store.seasons[i], ...season };
        store.standings = store.standings.filter((r) => r.season_id !== id);
      } else {
        id = uid();
        store.seasons.push({ ...season, id });
      }
      for (const t of teams) store.standings.push({ ...t, id: uid(), season_id: id });
      return id;
    },
    async remove(table, id) {
      store[table] = store[table].filter((x) => x.id !== id);
      if (table === 'seasons') {
        const gone = new Set(store.matches.filter((m) => m.season_id === id).map((m) => m.id));
        store.match_players = store.match_players.filter((r) => !gone.has(r.match_id));
        for (const t of ['matches', 'trophies', 'standings']) store[t] = store[t].filter((x) => x.season_id !== id);
      }
      if (table === 'matches') store.match_players = store.match_players.filter((r) => r.match_id !== id);
      if (table === 'players') {
        store.match_players = store.match_players.filter((r) => r.player_id !== id);
        store.player_moves = store.player_moves.filter((r) => r.player_id !== id);
      }
    },
  };
}
