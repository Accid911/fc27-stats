'use client';

import { demoData } from './demo-data';

const TABLES = ['seasons', 'players', 'player_season_stats', 'matches', 'trophies'];

// Same interface for Supabase and for demo mode (in-memory, nothing saved).
export function makeApi(sb) {
  if (!sb) return makeDemoApi();

  const check = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };

  return {
    demo: false,
    async loadAll() {
      const settings = check(await sb.from('settings').select('*').eq('id', 1).maybeSingle());
      const out = { settings: settings || { id: 1, club_name: '' } };
      await Promise.all(
        TABLES.map(async (t) => {
          out[t] = check(await sb.from(t).select('*'));
        })
      );
      return out;
    },
    async saveSettings(row) {
      return check(await sb.from('settings').upsert({ ...row, id: 1 }).select().single());
    },
    async save(table, row) {
      const { id, ...rest } = row;
      if (id) return check(await sb.from(table).update(rest).eq('id', id).select().single());
      return check(await sb.from(table).insert(rest).select().single());
    },
    async saveStats(rows) {
      const clean = rows.map(({ id, ...r }) => r);
      return check(await sb.from('player_season_stats').upsert(clean, { onConflict: 'player_id,season_id' }).select());
    },
    async remove(table, id) {
      check(await sb.from(table).delete().eq('id', id));
    },
  };
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
      const created = { ...row, id: uid() };
      list.push(created);
      return created;
    },
    async saveStats(rows) {
      for (const r of rows) {
        const i = store.player_season_stats.findIndex((x) => x.player_id === r.player_id && x.season_id === r.season_id);
        if (i >= 0) store.player_season_stats[i] = { ...store.player_season_stats[i], ...r };
        else store.player_season_stats.push({ ...r, id: uid() });
      }
      return rows;
    },
    async remove(table, id) {
      store[table] = store[table].filter((x) => x.id !== id);
      if (table === 'seasons') {
        for (const t of ['player_season_stats', 'matches', 'trophies']) store[t] = store[t].filter((x) => x.season_id !== id);
      }
      if (table === 'players') store.player_season_stats = store.player_season_stats.filter((x) => x.player_id !== id);
    },
  };
}
