'use client';

import { useEffect, useRef, useState } from 'react';
import {
  buildModel, playerStats, leagueTable, fixture, matchResult, seasonLabel, statusText, formatMoney, MOVE_LABEL,
} from '@/lib/data';

const LAST_KEY = 'fc27-last-backup';

export function readLastBackup() {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}
function markBackup() {
  try {
    localStorage.setItem(LAST_KEY, new Date().toISOString());
  } catch {}
}

const today = () => new Date().toISOString().slice(0, 10);

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function daysAgo(date) {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

export default function BackupPanel({ api, onChanged }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [last, setLast] = useState(null);
  const [pending, setPending] = useState(null); // parsed backup waiting for confirmation
  const fileRef = useRef(null);

  useEffect(() => setLast(readLastBackup()), []);

  async function run(label, fn) {
    setBusy(label);
    setError('');
    setMsg('');
    try {
      await fn();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy('');
    }
  }

  const downloadJson = () =>
    run('json', async () => {
      const data = await api.loadAll();
      delete data.missing;
      const backup = { app: 'fc27-youth-edition', version: 1, exported_at: new Date().toISOString(), data };
      download(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `youth-edition-backup-${today()}.json`);
      markBackup();
      setLast(new Date());
      setMsg('Backup downloaded ✓ Keep it somewhere safe (e.g. Google Drive or iCloud).');
    });

  const downloadExcel = () =>
    run('xlsx', async () => {
      const data = await api.loadAll();
      const ExcelJS = (await import('exceljs')).default;
      const wb = buildWorkbook(ExcelJS, data);
      const buf = await wb.xlsx.writeBuffer();
      download(
        new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `youth-edition-stats-${today()}.xlsx`
      );
      setMsg('Spreadsheet downloaded ✓');
    });

  async function pickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setMsg('');
    try {
      const backup = JSON.parse(await file.text());
      if (backup?.app !== 'fc27-youth-edition' || !backup.data) throw new Error('This file is not a Youth Edition backup.');
      setPending({ name: file.name, backup });
    } catch (err) {
      setError(err instanceof SyntaxError ? 'This file is not a valid backup (JSON).' : err.message);
    }
  }

  const restore = () =>
    run('restore', async () => {
      await api.restore(pending.backup);
      setPending(null);
      await onChanged();
      setMsg('Backup restored ✓');
    });

  const d = pending?.backup.data;
  const ago = daysAgo(last);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Download a backup</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Everything — players, seasons, tables, matches, line-ups, transfers and settings — in one file. Download one
          after every few episodes and keep it somewhere safe.
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 14 }}>
          Last backup on this computer:{' '}
          <b style={{ color: ago == null || ago > 14 ? 'var(--gold)' : 'var(--win)' }}>
            {ago == null ? 'never' : ago === 0 ? 'today' : `${ago} day${ago === 1 ? '' : 's'} ago`}
          </b>
        </p>
        <div className="row">
          <button className="btn" onClick={downloadJson} disabled={!!busy}>{busy === 'json' ? 'Preparing…' : '⬇ Download backup (.json)'}</button>
          <button className="btn secondary" onClick={downloadExcel} disabled={!!busy}>
            {busy === 'xlsx' ? 'Preparing…' : '⬇ Download as spreadsheet (.xlsx)'}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>
          The <b>.json</b> file is the real backup (it can be restored below). The spreadsheet is for reading the stats in Excel or Google Sheets.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Restore from a backup</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Puts everything from a backup file back. Anything that was deleted comes back and changed items go back to how they
          were in the backup. Things added <i>after</i> the backup are kept.
        </p>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={pickFile} style={{ display: 'none' }} />
        <button className="btn secondary" onClick={() => fileRef.current?.click()} disabled={!!busy}>Choose backup file…</button>

        {pending && (
          <div className="move-form">
            <b>{pending.name}</b>
            <div className="muted" style={{ fontSize: 14, margin: '4px 0 10px' }}>
              Made {new Date(pending.backup.exported_at).toLocaleString()} · {d.seasons?.length || 0} seasons ·{' '}
              {d.players?.length || 0} players · {d.matches?.length || 0} matches
            </div>
            <div className="row">
              <button className="btn" onClick={restore} disabled={!!busy}>{busy === 'restore' ? 'Restoring…' : 'Restore this backup'}</button>
              <button className="btn secondary" onClick={() => setPending(null)} disabled={!!busy}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {msg && <div className="notice" style={{ color: 'var(--win)', borderColor: '#1d4a31', background: '#0e2016', margin: 0 }}>{msg}</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}

// Readable spreadsheet: one sheet per topic.
function buildWorkbook(ExcelJS, data) {
  const model = buildModel(data);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Youth Edition stats';

  const sheet = (name, columns, rows) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = columns.map(([header, key, width]) => ({ header, key, width: width || 14 }));
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    return ws;
  };
  const club = model.clubName;

  sheet(
    'Players',
    [['Name', 'name', 24], ['Pos', 'position', 7], ['Country', 'country', 14], ['Joined', 'joined', 10], ['Status', 'status', 26],
      ['Apps', 'apps', 7], ['Goals', 'goals', 7], ['Assists', 'assists', 8], ['POTM', 'potm', 7], ['Clean sheets', 'cs', 12], ['Avg rating', 'avg', 10]],
    playerStats(model).map((p) => ({
      name: p.name, position: p.position, country: p.country,
      joined: p.joined ? seasonLabel(p.joined.season) : '', status: statusText(model.statusById[p.id]),
      apps: p.apps, goals: p.goals, assists: p.assists, potm: p.potm, cs: p.cs ?? '', avg: p.avg_rating ?? '',
    }))
  );

  sheet(
    'Matches',
    [['Season', 'season', 10], ['Tournament', 'tournament', 18], ['Home', 'home', 22], ['Score', 'score', 8], ['Away', 'away', 22],
      ['Penalties', 'pens', 10], ['Result', 'result', 8], ['Date', 'date', 12], ['Scorers', 'scorers', 40], ['POTM', 'potm', 22]],
    model.matches.map((m) => {
      const f = fixture(m, club);
      const potm = m.lineup.find((r) => r.potm);
      return {
        season: seasonLabel(m.season), tournament: m.tournament, home: f.home.name, score: `${f.home.goals}-${f.away.goals}`,
        away: f.away.name, pens: f.pens ? `${f.home.pens}-${f.away.pens}` : '', result: matchResult(m), date: m.played_on || '',
        scorers: m.lineup.filter((r) => r.goals > 0).map((r) => `${model.playerById[r.player_id]?.name}${r.goals > 1 ? ` x${r.goals}` : ''}`).join(', '),
        potm: potm ? model.playerById[potm.player_id]?.name : '',
      };
    })
  );

  sheet(
    'Line-ups',
    [['Season', 'season', 10], ['Match', 'match', 40], ['Player', 'player', 24], ['Rating', 'rating', 8], ['Goals', 'goals', 7], ['Assists', 'assists', 8], ['POTM', 'potm', 7]],
    model.matches.flatMap((m) => {
      const f = fixture(m, club);
      const label = `${f.home.name} ${f.home.goals}-${f.away.goals} ${f.away.name}`;
      return m.lineup.map((r) => ({
        season: seasonLabel(m.season), match: label, player: model.playerById[r.player_id]?.name,
        rating: r.rating == null ? '' : Number(r.rating), goals: r.goals, assists: r.assists, potm: r.potm ? 'yes' : '',
      }));
    })
  );

  sheet(
    'League tables',
    [['Season', 'season', 10], ['League', 'league', 18], ['Pos', 'pos', 6], ['Team', 'team', 24], ['P', 'p', 5], ['W', 'w', 5], ['D', 'd', 5],
      ['L', 'l', 5], ['GF', 'gf', 5], ['GA', 'ga', 5], ['GD', 'gd', 5], ['Pts', 'pts', 6]],
    model.seasons.flatMap((s) =>
      leagueTable(model, s.id).rows.map((t) => ({
        season: seasonLabel(s), league: s.tournament, pos: t.pos, team: t.team, p: t.played ?? '', w: t.won ?? '', d: t.drawn ?? '',
        l: t.lost ?? '', gf: t.gf ?? '', ga: t.ga ?? '', gd: t.gd ?? '', pts: t.points,
      }))
    )
  );

  sheet(
    'Transfers',
    [['Season', 'season', 10], ['Date', 'date', 12], ['Player', 'player', 24], ['What', 'what', 16], ['Club', 'club', 22], ['Fee', 'fee', 12], ['Notes', 'notes', 30]],
    model.moves.map((mv) => ({
      season: mv.season ? seasonLabel(mv.season) : '', date: mv.moved_on || '', player: mv.player.name, what: MOVE_LABEL[mv.type],
      club: mv.club || '', fee: mv.fee != null ? formatMoney(mv.fee, model.currency) : '', notes: mv.notes || '',
    }))
  );

  sheet(
    'Seasons',
    [['Season', 'season', 10], ['League', 'league', 18], ['Cups', 'cups', 50], ['Notes', 'notes', 40]],
    model.seasons.map((s) => ({
      season: seasonLabel(s), league: s.tournament,
      cups: (s.cups || []).map((c) => `${c}${s.cup_results?.[c] ? ` (${s.cup_results[c]})` : ''}`).join(', '),
      notes: s.notes || '',
    }))
  );

  return wb;
}
