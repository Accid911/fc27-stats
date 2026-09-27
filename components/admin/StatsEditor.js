'use client';

import { useEffect, useMemo, useState } from 'react';

const COLS = [
  ['appearances', 'Apps'],
  ['goals', 'Goals'],
  ['assists', 'Ast'],
  ['clean_sheets', 'CS'],
  ['motm', 'MOTM'],
  ['yellow_cards', 'YC'],
  ['red_cards', 'RC'],
  ['avg_rating', 'Rating'],
];

// Spreadsheet-style editor: one row per player for the chosen season.
export default function StatsEditor({ data, seasonId, api, onChanged }) {
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [addId, setAddId] = useState('');

  const playerById = useMemo(() => Object.fromEntries(data.players.map((p) => [p.id, p])), [data.players]);

  useEffect(() => {
    setRows(
      data.player_season_stats
        .filter((s) => s.season_id === seasonId)
        .map((s) => ({ ...s }))
        .sort((a, b) => (playerById[a.player_id]?.name || '').localeCompare(playerById[b.player_id]?.name || ''))
    );
    setDirty(false);
    setMsg('');
    setError('');
  }, [data, seasonId, playerById]);

  const missing = data.players
    .filter((p) => !rows.some((r) => r.player_id === p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const blankRow = (playerId) => ({
    player_id: playerId,
    season_id: seasonId,
    appearances: 0, goals: 0, assists: 0, clean_sheets: 0, motm: 0, yellow_cards: 0, red_cards: 0, avg_rating: null,
  });

  function addPlayer(id) {
    if (!id) return;
    setRows((r) => [...r, blankRow(id)]);
    setAddId('');
    setDirty(true);
  }

  function addAllActive() {
    const add = missing.filter((p) => p.is_active).map((p) => blankRow(p.id));
    if (!add.length) return;
    setRows((r) => [...r, ...add]);
    setDirty(true);
  }

  function update(i, key, value) {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [key]: value } : row)));
    setDirty(true);
    setMsg('');
  }

  async function removeRow(i) {
    const row = rows[i];
    if (row.id) {
      if (!window.confirm(`Remove ${playerById[row.player_id]?.name} from this season?`)) return;
      try {
        await api.remove('player_season_stats', row.id);
      } catch (err) {
        setError(err.message);
        return;
      }
      await onChanged();
    } else {
      setRows((r) => r.filter((_, j) => j !== i));
    }
  }

  async function saveAll() {
    setBusy(true);
    setError('');
    try {
      const payload = rows.map((r) => {
        const out = { id: r.id, player_id: r.player_id, season_id: seasonId };
        for (const [k] of COLS) {
          const v = r[k];
          if (k === 'avg_rating') out[k] = v === '' || v == null ? null : Number(v);
          else out[k] = v === '' || v == null ? 0 : Math.max(0, Math.round(Number(v)));
        }
        return out;
      });
      await api.saveStats(payload);
      await onChanged();
      setMsg('Saved ✓');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card pad-0">
      <div className="row" style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
        <select value={addId} onChange={(e) => addPlayer(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="">+ Add player to season…</option>
          {missing.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_active ? '' : ' (left)'}</option>)}
        </select>
        <button className="btn secondary small" onClick={addAllActive} disabled={!missing.some((p) => p.is_active)}>
          Add all squad players
        </button>
        <span className="spacer" />
        {msg && <span style={{ color: 'var(--accent)' }}>{msg}</span>}
        {dirty && !msg && <span className="muted">Unsaved changes</span>}
        <button className="btn" onClick={saveAll} disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save all'}</button>
      </div>
      {error && <div className="error" style={{ margin: 16 }}>{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              {COLS.map(([k, l]) => <th key={k} className="num">{l}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={COLS.length + 2} className="muted">No players in this season yet — add them above.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.player_id}>
                <td style={{ fontWeight: 600 }}>
                  {playerById[r.player_id]?.name || '?'}{' '}
                  <span className="muted" style={{ fontWeight: 400 }}>{playerById[r.player_id]?.position}</span>
                </td>
                {COLS.map(([k]) => (
                  <td key={k} className="num">
                    <input
                      className="stat-input"
                      type="number"
                      min="0"
                      step={k === 'avg_rating' ? '0.1' : '1'}
                      max={k === 'avg_rating' ? '10' : undefined}
                      value={r[k] ?? ''}
                      onChange={(e) => update(i, k, e.target.value)}
                    />
                  </td>
                ))}
                <td className="num">
                  <button className="btn danger small" onClick={() => removeRow(i)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
