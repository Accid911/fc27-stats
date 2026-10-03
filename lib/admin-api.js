'use client';

import { demoData, demoEditions, demoEditionData } from './demo-data';
import { TABLES_WITH_EDITION } from './editions';
import { fetchEverything } from './fetch-all';

// Same interface for Supabase and for demo mode (in-memory, nothing saved).
export function makeApi(sb) {
  if (!sb) return makeDemoApi();

  const check = ({ data, error }) => {
    if (error) throw new Error(friendly(error.message));
    return data;
  };

  // Tell the site to refresh its cache so visitors see the change immediately.
  async function refreshSite() {
    try {
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      if (token) await fetch('/api/revalidate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {}
  }
  const thenRefresh = (fn) => async (...args) => {
    const out = await fn(...args);
    refreshSite();
    return out;
  };

  const api = {
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
    // Put a backup back: rows are inserted or overwritten by id; nothing is deleted.
    async restore(backup) {
      const d = backup.data;
      if (d.settings) check(await sb.from('settings').upsert({ ...d.settings, id: 1 }));
      for (const t of RESTORE_ORDER) {
        const rows = Array.isArray(d[t]) ? d[t] : [];
        for (let i = 0; i < rows.length; i += 500) check(await sb.from(t).upsert(rows.slice(i, i + 500)));
      }
    },
  };
  for (const k of ['saveSettings', 'save', 'saveMatch', 'saveSeason', 'remove', 'restore']) if (api[k]) api[k] = thenRefresh(api[k]);
  return api;
}

export const RESTORE_ORDER = ['editions', 'seasons', 'players', 'standings', 'matches', 'match_players', 'player_moves', 'trophies'];

function friendly(msg) {
  if (/seasons_(edition_)?number_key/.test(msg)) return 'A season with that number already exists in this edition.';
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

// Demo store: Leicester (edition 13) + the demo Newport career (edition 1), tagged like the real database.
function demoStore() {
  const ed1 = demoEditions[0];
  const ed13 = demoEditions.find((e) => e.is_current);
  const a = structuredClone(demoData);
  const b = demoEditionData(ed1);
  const store = { settings: a.settings, editions: structuredClone(demoEditions) };
  for (const t of TABLES_WITH_EDITION)
    store[t] = [...(a[t] || []).map((r) => ({ ...r, edition_id: ed13.id })), ...(b[t] || []).map((r) => ({ ...r, edition_id: ed1.id }))];
  return store;
}

function makeDemoApi() {
  const store = demoStore();
  // What the database triggers do: child rows take the edition of their season / match / player.
  const edOf = (table, id) => store[table].find((x) => x.id === id)?.edition_id;
  const withEdition = (table, row) => {
    if (row.edition_id || !TABLES_WITH_EDITION.includes(table)) return row;
    const e = row.season_id ? edOf('seasons', row.season_id) : row.match_id ? edOf('matches', row.match_id) : row.player_id ? edOf('players', row.player_id) : null;
    return { ...row, edition_id: e || store.editions.find((x) => x.is_current)?.id };
  };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  return {
    demo: true,
    async loadAll() {
      return structuredClone(store);
    },
    async restore(backup) {
      const d = structuredClone(backup.data);
      for (const k of Object.keys(store)) if (d[k] !== undefined) store[k] = d[k];
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
      const created = withEdition(table, { ...row, id: uid(), created_at: new Date().toISOString() });
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
        store.matches.push(withEdition('matches', { ...match, id, created_at: new Date().toISOString() }));
      }
      for (const r of lineup) store.match_players.push(withEdition('match_players', { ...r, id: uid(), match_id: id }));
      return id;
    },
    async saveSeason(season, teams) {
      season = withEdition('seasons', season);
      if (store.seasons.some((s) => s.number === season.number && s.id !== season.id && s.edition_id === season.edition_id))
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
      for (const t of teams) store.standings.push({ ...t, id: uid(), season_id: id, edition_id: season.edition_id });
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
