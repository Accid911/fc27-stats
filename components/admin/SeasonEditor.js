'use client';

import { useMemo, useState } from 'react';
import { buildModel, isClub, leagueTable, ordinal, seasonLabel } from '@/lib/data';
import { CUPS, LEAGUES } from '@/lib/constants';

export default function SeasonEditor({ data, api, onChanged }) {
  const model = useMemo(() => buildModel(data), [data]);
  const [editing, setEditing] = useState(null);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  async function remove(s) {
    const n = model.matches.filter((m) => m.season_id === s.id).length;
    if (!window.confirm(`Delete ${seasonLabel(s)}${n ? ` and its ${n} match${n > 1 ? 'es' : ''}` : ''}? This can't be undone.`)) return;
    try {
      await api.remove('seasons', s.id);
      await onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  if (editing) {
    return (
      <SeasonForm
        key={editing.id || 'new'}
        model={model}
        initial={editing}
        api={api}
        onCancel={() => setEditing(null)}
        onSaved={async (msg) => {
          await onChanged();
          setEditing(null);
          setFlash(msg);
        }}
      />
    );
  }

  const list = [...model.seasons].reverse();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn" onClick={() => { setFlash(''); setEditing({}); }}>＋ New season</button>
        {flash && <span style={{ color: 'var(--win)' }}>{flash}</span>}
      </div>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="card pad-0">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Season</th><th>League</th><th>Cups</th><th className="num">Teams</th><th>{model.clubName}</th><th className="num">Matches</th><th></th></tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="muted">No seasons yet — click “New season”.</td></tr>}
              {list.map((s) => {
                const t = leagueTable(model, s.id);
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{seasonLabel(s)}</td>
                    <td>{s.tournament}</td>
                    <td className="muted" style={{ whiteSpace: 'normal' }}>{(s.cups || []).join(', ') || '—'}</td>
                    <td className="num">{t.rows.length}</td>
                    <td>{t.club ? `${ordinal(t.club.pos)} · ${t.club.points} pts` : '—'}</td>
                    <td className="num">{model.matches.filter((m) => m.season_id === s.id).length}</td>
                    <td className="num">
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <button className="btn secondary small" onClick={() => { setFlash(''); setEditing(s); }}>Edit</button>
                        <button className="btn danger small" onClick={() => remove(s)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

let rowKey = 0;
const newRow = (team = '', points = '') => ({ k: ++rowKey, team, points });

function SeasonForm({ model, initial, api, onCancel, onSaved }) {
  const isNew = !initial.id;
  const last = model.seasons[model.seasons.length - 1];

  const [number, setNumber] = useState(initial.number ?? (last ? last.number + 1 : 1));
  const [tournament, setTournament] = useState(initial.tournament ?? last?.tournament ?? 'Premier League');
  const [cups, setCups] = useState(() => initial.cups ?? last?.cups ?? ['FA Cup', 'EFL Cup']);
  const [otherCup, setOtherCup] = useState('');
  const leagueOptions = LEAGUES.includes(tournament) ? LEAGUES : [...LEAGUES, tournament];
  const cupOptions = [...CUPS, ...cups.filter((c) => !CUPS.includes(c))];
  const toggleCup = (c) => setCups((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  function addOtherCup() {
    const c = otherCup.trim();
    if (c && !cups.includes(c)) setCups((cs) => [...cs, c]);
    setOtherCup('');
  }
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [rows, setRows] = useState(() => {
    if (!isNew) return leagueTable(model, initial.id).rows.map((r) => newRow(r.team, r.points));
    // New season: start from last season's teams (points empty), or just the club.
    const prev = last ? leagueTable(model, last.id).rows.map((r) => newRow(r.team, '')) : [];
    return prev.length ? prev : [newRow(model.clubName, '')];
  });
  const [paste, setPaste] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (k, key, v) => setRows((rs) => rs.map((r) => (r.k === k ? { ...r, [key]: v } : r)));

  // Live positions by points
  const positions = useMemo(() => {
    const filled = rows.filter((r) => r.team.trim() && r.points !== '');
    const sorted = [...filled].sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0) || a.team.localeCompare(b.team));
    return Object.fromEntries(sorted.map((r, i) => [r.k, i + 1]));
  }, [rows]);

  function applyPaste() {
    const parsed = paste
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // "1. Arsenal 45", "Arsenal, 45", "Arsenal\t45" → team + last number
        const cleaned = line.replace(/^\d+[.)]?\s+/, '');
        const m = cleaned.match(/^(.*?)[\s,;:\t-]+(-?\d+)\s*(pts?)?$/i);
        return m ? newRow(m[1].trim(), m[2]) : newRow(cleaned, '');
      });
    if (!parsed.length) return setPaste(null);
    const hasClub = parsed.some((r) => isClub(r.team, model.clubName));
    setRows(hasClub ? parsed : [...parsed, newRow(model.clubName, '')]);
    setPaste(null);
  }

  const teamNames = rows.map((r) => r.team.trim().toLowerCase()).filter(Boolean);
  const dupes = teamNames.filter((t, i) => teamNames.indexOf(t) !== i);

  async function save(e) {
    e.preventDefault();
    const n = parseInt(number, 10);
    if (!n || n < 1) return setError('Season number must be 1 or higher.');
    if (dupes.length) return setError(`“${dupes[0]}” is in the table twice.`);
    setBusy(true);
    setError('');
    try {
      await api.saveSeason(
        { id: initial.id || null, number: n, tournament: tournament.trim() || 'Premier League', cups, notes: notes || null },
        rows.filter((r) => r.team.trim()).map((r) => ({ team: r.team.trim(), points: Number(r.points) || 0 }))
      );
      await onSaved(`Saved ✓ Season ${n}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save}>
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{isNew ? 'New season' : `Edit Season ${initial.number}`}</h2>
        <span className="spacer" />
        <button type="button" className="btn secondary small" onClick={onCancel}>Cancel</button>
      </div>

      <div className="card">
        <div className="form-grid">
          <label>Season number *<input type="number" min="1" value={number} onChange={(e) => setNumber(e.target.value)} required /></label>
          <label>
            League *
            <select value={tournament} onChange={(e) => setTournament(e.target.value)} required>
              {leagueOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Cups this season — click to add or remove</div>
          <div className="chips">
            {cupOptions.map((c) => (
              <button type="button" key={c} className={`chip ${cups.includes(c) ? 'on' : ''}`} onClick={() => toggleCup(c)} aria-pressed={cups.includes(c)}>
                {cups.includes(c) ? '✓ ' : '+ '}{c}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <input
              value={otherCup}
              onChange={(e) => setOtherCup(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOtherCup(); } }}
              placeholder="Other cup…"
              style={{ maxWidth: 240 }}
            />
            <button type="button" className="btn secondary small" onClick={addOtherCup} disabled={!otherCup.trim()}>Add</button>
          </div>
        </div>

        <div className="form-grid" style={{ marginTop: 16 }}>
          <label className="wide">Notes<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <h3>League table ({rows.filter((r) => r.team.trim()).length} teams)</h3>
          <span className="spacer" />
          <button type="button" className="btn secondary small" onClick={() => setPaste(paste == null ? '' : null)}>
            {paste == null ? 'Paste a list' : 'Close paste'}
          </button>
        </div>

        {paste != null && (
          <div style={{ marginBottom: 16 }}>
            <p className="muted" style={{ fontSize: 13, margin: '0 0 6px' }}>
              One team per line, points at the end — e.g. <code>Arsenal 84</code> or <code>Arsenal, 84</code>. This replaces the table below.
            </p>
            <textarea rows={8} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Arsenal 84\nLiverpool 80\nLeicester City 71\n…'} />
            <button type="button" className="btn small" style={{ marginTop: 8 }} onClick={applyPaste}>Use this list</button>
          </div>
        )}

        <div className="table-wrap">
          <table className="lineup">
            <thead><tr><th className="num">Pos</th><th>Team</th><th className="num">Points</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.k} className={isClub(r.team, model.clubName) ? 'is-club' : ''}>
                  <td className="num muted">{positions[r.k] ?? ''}</td>
                  <td><input value={r.team} onChange={(e) => update(r.k, 'team', e.target.value)} placeholder="Team name" /></td>
                  <td className="num">
                    <input className="stat-input" type="number" value={r.points} placeholder="0" onChange={(e) => update(r.k, 'points', e.target.value)} />
                  </td>
                  <td className="num">
                    <button type="button" className="btn danger small" onClick={() => setRows((rs) => rs.filter((x) => x.k !== r.k))} aria-label="Remove team">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn secondary small" style={{ marginTop: 12 }} onClick={() => setRows((rs) => [...rs, newRow()])}>
          ＋ Add team
        </button>
      </div>

      {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Save season' : 'Save changes'}</button>
        <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
