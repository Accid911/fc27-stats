'use client';

import { useMemo, useState } from 'react';
import { buildModel, isClub, matchResult, seasonLabel, seasonTournaments, STATUS_LABEL } from '@/lib/data';
import { positionOrder } from '@/lib/constants';

export default function MatchEditor({ data, seasonId, api, onChanged }) {
  const model = useMemo(() => buildModel(data), [data]);
  const [editing, setEditing] = useState(null); // null = list, {} = new, match = edit
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  const matches = model.matches.filter((m) => m.season_id === seasonId).reverse();

  async function remove(m) {
    if (!window.confirm(`Delete ${m.goals_for}–${m.goals_against} vs ${m.opponent}? This can't be undone.`)) return;
    try {
      await api.remove('matches', m.id);
      await onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  if (editing) {
    return (
      <MatchForm
        key={editing.id || 'new'}
        model={model}
        initial={editing}
        seasonId={seasonId}
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

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn" onClick={() => { setFlash(''); setEditing({}); }}>＋ New match</button>
        {flash && <span style={{ color: 'var(--win)' }}>{flash}</span>}
      </div>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="card pad-0">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Tournament</th><th>Opponent</th><th>Score</th><th className="num">Players</th><th>POTM</th><th></th>
              </tr>
            </thead>
            <tbody>
              {matches.length === 0 && (
                <tr><td colSpan={7} className="muted">No matches in this season yet — click “New match”.</td></tr>
              )}
              {matches.map((m, i) => {
                const potm = m.lineup.find((r) => r.potm);
                return (
                  <tr key={m.id}>
                    <td className="muted">{matches.length - i}</td>
                    <td>{m.tournament || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{m.opponent}{m.venue ? <span className="muted"> ({m.venue})</span> : null}</td>
                    <td><b>{m.goals_for} – {m.goals_against}</b> <span className={`result ${m.result}`}>{m.result}</span></td>
                    <td className="num">{m.lineup.length}</td>
                    <td>{potm ? model.playerById[potm.player_id]?.name : '—'}</td>
                    <td className="num">
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <button className="btn secondary small" onClick={() => { setFlash(''); setEditing(m); }}>Edit</button>
                        <button className="btn danger small" onClick={() => remove(m)}>Delete</button>
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

function MatchForm({ model, initial, seasonId, api, onCancel, onSaved }) {
  const isNew = !initial.id;
  const season0 = initial.season_id || seasonId;
  const [m, setM] = useState({
    season_id: season0,
    tournament: initial.tournament ?? model.seasonById[season0]?.tournament ?? 'Premier League',
    opponent: initial.opponent ?? '',
    goals_for: initial.goals_for ?? 0,
    goals_against: initial.goals_against ?? 0,
    venue: initial.venue ?? '',
    played_on: initial.played_on ?? '',
    video_url: initial.video_url ?? '',
    notes: initial.notes ?? '',
  });
  const [rows, setRows] = useState(() =>
    sortRows(
      (initial.lineup || []).map((r) => ({
        player_id: r.player_id,
        rating: r.rating ?? '',
        goals: r.goals,
        assists: r.assists,
      })),
      model
    )
  );
  const [potm, setPotm] = useState(initial.lineup?.find((r) => r.potm)?.player_id || '');
  const [showLeft, setShowLeft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setM((s) => ({ ...s, [k]: v }));
  function changeSeason(id) {
    const list = seasonTournaments(model.seasonById[id]);
    setM((s) => ({ ...s, season_id: id, tournament: list.includes(s.tournament) ? s.tournament : list[0] || '' }));
  }

  const opponents = useMemo(() => {
    const fromTable = model.data.standings
      .filter((s) => s.season_id === m.season_id && !isClub(s.team, model.clubName))
      .map((s) => s.team);
    const past = model.matches.map((x) => x.opponent);
    return [...new Set([...fromTable, ...past])].sort();
  }, [model, m.season_id]);

  // Only the league + cups of the chosen season (plus the saved value when editing an older match)
  const tournaments = useMemo(() => {
    const list = seasonTournaments(model.seasonById[m.season_id]);
    return initial.tournament && !list.includes(initial.tournament) ? [...list, initial.tournament] : list;
  }, [model, m.season_id, initial.tournament]);

  const picked = new Set(rows.map((r) => r.player_id));
  const inSquad = (p) => model.statusById[p.id]?.status === 'squad';
  const available = model.data.players
    .filter((p) => !picked.has(p.id) && (showLeft || inSquad(p)))
    .sort((a, b) => Number(inSquad(b)) - Number(inSquad(a)) || positionOrder(a.position) - positionOrder(b.position) || a.name.localeCompare(b.name));
  const hiddenLeft = model.data.players.filter((p) => !picked.has(p.id) && !inSquad(p)).length;

  // Previous match (for "same players as last match")
  const previous = useMemo(() => {
    const list = model.matches.filter((x) => x.id !== initial.id && x.lineup.length);
    return list[list.length - 1] || null;
  }, [model, initial.id]);

  function addPlayer(id) {
    setRows((r) => sortRows([...r, { player_id: id, rating: '', goals: 0, assists: 0 }], model));
  }
  function copyPrevious() {
    const ids = previous.lineup.map((r) => r.player_id).filter((id) => !picked.has(id));
    setRows((r) => sortRows([...r, ...ids.map((id) => ({ player_id: id, rating: '', goals: 0, assists: 0 }))], model));
  }
  function update(id, key, value) {
    setRows((r) => r.map((row) => (row.player_id === id ? { ...row, [key]: value } : row)));
  }
  function removeRow(id) {
    setRows((r) => r.filter((row) => row.player_id !== id));
    if (potm === id) setPotm('');
  }

  const gf = Number(m.goals_for) || 0;
  const totalGoals = rows.reduce((a, r) => a + (Number(r.goals) || 0), 0);
  const totalAssists = rows.reduce((a, r) => a + (Number(r.assists) || 0), 0);
  const problems = [];
  if (totalGoals > gf) problems.push(`Players have ${totalGoals} goals, but the score says ${gf}.`);
  if (totalAssists > gf) problems.push(`Players have ${totalAssists} assists, but only ${gf} goals were scored.`);
  if (rows.some((r) => r.rating !== '' && (Number(r.rating) < 0 || Number(r.rating) > 10))) problems.push('Ratings must be between 0 and 10.');
  const ownGoals = gf - totalGoals;

  async function save(e) {
    e.preventDefault();
    if (problems.length) return setError(problems.join(' '));
    if (!m.opponent.trim()) return setError('Enter the opponent.');
    setBusy(true);
    setError('');
    try {
      await api.saveMatch(
        {
          id: initial.id || null,
          ...m,
          opponent: m.opponent.trim(),
          goals_for: gf,
          goals_against: Number(m.goals_against) || 0,
        },
        rows.map((r) => ({
          player_id: r.player_id,
          rating: r.rating === '' ? null : Number(r.rating),
          goals: Number(r.goals) || 0,
          assists: Number(r.assists) || 0,
          potm: r.player_id === potm,
        }))
      );
      const res = matchResult({ goals_for: gf, goals_against: Number(m.goals_against) || 0 });
      await onSaved(`Saved ✓ ${res} ${gf}–${m.goals_against} vs ${m.opponent.trim()}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save}>
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{isNew ? 'New match' : 'Edit match'}</h2>
        <span className="spacer" />
        <button type="button" className="btn secondary small" onClick={onCancel}>Cancel</button>
      </div>

      <div className="card">
        <div className="form-grid">
          <label>
            Season *
            <select value={m.season_id} onChange={(e) => changeSeason(e.target.value)} required>
              {[...model.seasons].reverse().map((s) => <option key={s.id} value={s.id}>{seasonLabel(s)}</option>)}
            </select>
          </label>
          <label>
            Tournament *
            <select value={m.tournament} onChange={(e) => set('tournament', e.target.value)} required>
              {tournaments.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            Opponent *
            <input list="dl-opponents" value={m.opponent} onChange={(e) => set('opponent', e.target.value)} required autoComplete="off" autoFocus={isNew} />
            <datalist id="dl-opponents">{opponents.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          <label>
            Home / Away
            <select value={m.venue} onChange={(e) => set('venue', e.target.value)}>
              <option value="">—</option>
              <option value="H">Home</option>
              <option value="A">Away</option>
              <option value="N">Neutral</option>
            </select>
          </label>
        </div>

        <div className="scoreline">
          <span className="team">{model.clubName}</span>
          <input type="number" min="0" value={m.goals_for} onChange={(e) => set('goals_for', e.target.value)} aria-label="Goals for" />
          <span className="dash">–</span>
          <input type="number" min="0" value={m.goals_against} onChange={(e) => set('goals_against', e.target.value)} aria-label="Goals against" />
          <span className="team">{m.opponent || 'Opponent'}</span>
        </div>

        <details style={{ marginTop: 8 }}>
          <summary className="muted" style={{ cursor: 'pointer' }}>More (date, video link, notes)</summary>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <label>Date<input type="date" value={m.played_on || ''} onChange={(e) => set('played_on', e.target.value)} /></label>
            <label className="wide">YouTube link<input type="url" value={m.video_url || ''} onChange={(e) => set('video_url', e.target.value)} /></label>
            <label className="wide">Notes<textarea rows={2} value={m.notes || ''} onChange={(e) => set('notes', e.target.value)} /></label>
          </div>
        </details>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ marginBottom: 10 }}>
          <h3>Players ({rows.length})</h3>
          <span className="spacer" />
          {previous && (
            <button type="button" className="btn secondary small" onClick={copyPrevious}>
              Same players as last match
            </button>
          )}
          {rows.length > 0 && (
            <button type="button" className="btn secondary small" onClick={() => { setRows([]); setPotm(''); }}>Clear</button>
          )}
        </div>
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 13 }}>Click a player to add them to this match.</p>
        <div className="chips">
          {available.map((p) => (
            <button type="button" key={p.id} className="chip" onClick={() => addPlayer(p.id)}>
              <span className="chip-pos">{p.position || '?'}</span> {p.name}
              {!inSquad(p) && <span className="muted"> · {STATUS_LABEL[model.statusById[p.id]?.status]}</span>}
            </button>
          ))}
          {available.length === 0 && <span className="muted">Everyone’s in.</span>}
          {hiddenLeft > 0 && !showLeft && (
            <button type="button" className="chip ghost" onClick={() => setShowLeft(true)}>+ {hiddenLeft} on loan / sold / released</button>
          )}
        </div>

        {rows.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="lineup">
              <thead>
                <tr>
                  <th>Player</th>
                  <th className="num">Rating</th>
                  <th className="center">Goals</th>
                  <th className="center">Assists</th>
                  <th className="center">POTM</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = model.playerById[r.player_id];
                  return (
                    <tr key={r.player_id} className={potm === r.player_id ? 'is-potm' : ''}>
                      <td style={{ fontWeight: 600 }}>
                        <span className="muted" style={{ fontWeight: 500, display: 'inline-block', width: 40 }}>{p?.position}</span>
                        {p?.name}
                      </td>
                      <td className="num">
                        <input
                          className="stat-input"
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          placeholder="—"
                          value={r.rating}
                          onChange={(e) => update(r.player_id, 'rating', e.target.value)}
                        />
                      </td>
                      <td className="center"><Stepper value={r.goals} onChange={(v) => update(r.player_id, 'goals', v)} label="goals" /></td>
                      <td className="center"><Stepper value={r.assists} onChange={(v) => update(r.player_id, 'assists', v)} label="assists" /></td>
                      <td className="center">
                        <button
                          type="button"
                          className={`star ${potm === r.player_id ? 'on' : ''}`}
                          onClick={() => setPotm(potm === r.player_id ? '' : r.player_id)}
                          title="Player of the Match"
                          aria-pressed={potm === r.player_id}
                        >
                          ★
                        </button>
                      </td>
                      <td className="num">
                        <button type="button" className="btn danger small" onClick={() => removeRow(r.player_id)} aria-label="Remove">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <p className="muted" style={{ fontSize: 13, margin: '12px 0 0' }}>
            Goals by players: <b>{totalGoals}</b> / {gf}
            {ownGoals > 0 && totalGoals > 0 ? ` (${ownGoals} own goal${ownGoals > 1 ? 's' : ''} / unassigned)` : ''}
            {' · '}Assists: <b>{totalAssists}</b>
            {' · '}POTM: <b>{potm ? model.playerById[potm]?.name : 'none'}</b>
          </p>
        )}
      </div>

      {(error || problems.length > 0) && <div className="error" style={{ marginTop: 16 }}>{error || problems.join(' ')}</div>}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" disabled={busy || problems.length > 0}>{busy ? 'Saving…' : isNew ? 'Save match' : 'Save changes'}</button>
        <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function Stepper({ value, onChange, label }) {
  const v = Number(value) || 0;
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(Math.max(0, v - 1))} disabled={v === 0} aria-label={`Fewer ${label}`}>−</button>
      <span className={v ? 'val on' : 'val'}>{v}</span>
      <button type="button" onClick={() => onChange(v + 1)} aria-label={`More ${label}`}>+</button>
    </span>
  );
}

function sortRows(rows, model) {
  return [...rows].sort((a, b) => {
    const pa = model.playerById[a.player_id];
    const pb = model.playerById[b.player_id];
    return positionOrder(pa?.position) - positionOrder(pb?.position) || String(pa?.name).localeCompare(String(pb?.name));
  });
}
