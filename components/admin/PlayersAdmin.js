'use client';

import { useMemo, useRef, useState } from 'react';
import {
  buildModel, formatMoney, parseMoney, seasonLabel, statusText,
  MOVE_LABEL, STATUS_BADGE, STATUS_LABEL,
} from '@/lib/data';
import { COUNTRIES, POSITIONS, capitalizeName, positionOrder } from '@/lib/constants';

const STATUS_ORDER = { squad: 0, loan: 1, sold: 2, released: 3 };

export default function PlayersAdmin({ data, api, onChanged, edition = null }) {
  const model = useMemo(() => buildModel(data), [data]);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');

  const editing = editingId && model.playerById[editingId];
  if (editing) {
    return <PlayerPanel key={editingId} model={model} player={editing} api={api} onChanged={onChanged} onClose={() => setEditingId(null)} />;
  }

  const rows = data.players
    .filter((p) => filter === 'all' || model.statusById[p.id].status === filter)
    .sort(
      (a, b) =>
        STATUS_ORDER[model.statusById[a.id].status] - STATUS_ORDER[model.statusById[b.id].status] ||
        positionOrder(a.position) - positionOrder(b.position) ||
        a.name.localeCompare(b.name)
    );
  const count = (s) => data.players.filter((p) => model.statusById[p.id].status === s).length;

  return (
    <>
      <QuickAdd api={api} onChanged={onChanged} seasons={model.seasons} edition={edition} />

      <div className="row" style={{ margin: '20px 0 12px' }}>
        <div className="chips">
          {['all', 'squad', 'loan', 'sold', 'released'].map((f) => (
            <button key={f} type="button" className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? `All (${data.players.length})` : `${STATUS_LABEL[f]} (${count(f)})`}
            </button>
          ))}
        </div>
      </div>

      <div className="card pad-0">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Pos</th><th>Country</th><th>Joined</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="muted">No players here.</td></tr>}
              {rows.map((p) => {
                const st = model.statusById[p.id];
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.position || '—'}</td>
                    <td>{p.country || '—'}</td>
                    <td className="muted">
                      {model.seasonById[p.joined_season_id] ? seasonLabel(model.seasonById[p.joined_season_id]) : '—'}
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[st.status]}`}>{statusText(st)}</span></td>
                    <td className="num">
                      <button className="btn secondary small" onClick={() => setEditingId(p.id)}>Edit / transfer</button>
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

function QuickAdd({ api, onChanged, seasons, edition }) {
  const latest = seasons[seasons.length - 1];
  const blank = { name: '', position: 'ST', country: '', joined_season_id: latest?.id || '' };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const nameRef = useRef(null);

  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.save('players', {
        name: capitalizeName(f.name.trim()),
        position: f.position || null,
        country: capitalizeName(f.country.trim()) || null,
        joined_season_id: f.joined_season_id || null,
        ...(edition ? { edition_id: edition.id } : {}),
      });
      await onChanged();
      setMsg(`Added ${capitalizeName(f.name.trim())} ✓`);
      setF((x) => ({ ...blank, position: x.position, joined_season_id: x.joined_season_id }));
      nameRef.current?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="row" style={{ marginBottom: 12 }}>
        <h3>Add player</h3>
        {msg && <span style={{ color: 'var(--win)', fontSize: 14 }}>{msg}</span>}
      </div>
      <div className="form-grid">
        <label>Name *<input ref={nameRef} value={f.name} onChange={(e) => { setMsg(''); setF({ ...f, name: capitalizeName(e.target.value) }); }} required /></label>
        <label>
          Position *
          <select value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} required>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label>
          Country
          <input list="dl-countries" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} autoComplete="off" />
          <datalist id="dl-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <JoinedSelect seasons={seasons} value={f.joined_season_id} onChange={(v) => setF({ ...f, joined_season_id: v })} />
        <label style={{ alignSelf: 'end' }}>
          <button className="btn" disabled={busy}>{busy ? 'Adding…' : 'Add player'}</button>
        </label>
      </div>
      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
    </form>
  );
}

function PlayerPanel({ model, player, api, onChanged, onClose }) {
  const st = model.statusById[player.id];
  const moves = model.moves.filter((mv) => mv.player_id === player.id);
  const [f, setF] = useState({
    name: player.name,
    position: player.position || '',
    country: player.country || '',
    joined_season_id: player.joined_season_id || '',
  });
  const [action, setAction] = useState(null); // 'sold' | 'loan' | 'loan_return' | 'released'
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function saveDetails(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.save('players', {
        id: player.id,
        name: capitalizeName(f.name.trim()),
        position: f.position || null,
        country: capitalizeName(f.country.trim()) || null,
        joined_season_id: f.joined_season_id || null,
      });
      await onChanged();
      setMsg('Details saved ✓');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeMove(mv) {
    if (!window.confirm(`Remove “${MOVE_LABEL[mv.type]}${mv.club ? ` – ${mv.club}` : ''}” from the history?`)) return;
    try {
      await api.remove('player_moves', mv.id);
      await onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deletePlayer() {
    if (!window.confirm(`Delete ${player.name} completely? All their match stats and transfer history will be deleted too. To keep the stats, use Sell or Release instead.`)) return;
    try {
      await api.remove('players', player.id);
      await onChanged();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  const actions =
    st.status === 'squad'
      ? [['sold', 'Sell'], ['loan', 'Loan out'], ['released', 'Release']]
      : st.status === 'loan'
        ? [['loan_return', 'Back from loan'], ['sold', 'Sell (permanent)'], ['released', 'Release']]
        : [];

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn secondary small" onClick={onClose}>← All players</button>
        <span className="spacer" />
        <span className={`badge ${STATUS_BADGE[st.status]}`}>{statusText(st)}</span>
      </div>
      <h2>{player.name}</h2>

      <form className="card" onSubmit={saveDetails}>
        <h3 style={{ marginBottom: 12 }}>Details</h3>
        <div className="form-grid">
          <label>Name *<input value={f.name} onChange={(e) => setF({ ...f, name: capitalizeName(e.target.value) })} required /></label>
          <label>
            Position
            <select value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })}>
              <option value="">—</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label>
            Country
            <input list="dl-countries2" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} autoComplete="off" />
            <datalist id="dl-countries2">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <JoinedSelect seasons={model.seasons} value={f.joined_season_id} onChange={(v) => setF({ ...f, joined_season_id: v })} />
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" disabled={busy}>Save details</button>
          {msg && <span style={{ color: 'var(--win)', fontSize: 14 }}>{msg}</span>}
        </div>
      </form>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Transfers &amp; loans</h3>
        {actions.length > 0 ? (
          <div className="row">
            {actions.map(([type, label]) => (
              <button key={type} type="button" className={`btn ${action === type ? '' : 'secondary'} small`} onClick={() => setAction(action === type ? null : type)}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            {player.name} has {st.status === 'sold' ? 'been sold' : 'been released'}. To undo, remove that entry from the history below.
          </p>
        )}

        {action && (
          <MoveForm
            key={action}
            type={action}
            model={model}
            player={player}
            lastLoanClub={st.status === 'loan' ? st.move?.club : ''}
            api={api}
            onDone={async (text) => {
              await onChanged();
              setAction(null);
              setMsg(text);
            }}
            onCancel={() => setAction(null)}
          />
        )}

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead><tr><th>Season</th><th>Date</th><th>What</th><th>Club</th><th className="num">Fee</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              {moves.length === 0 && <tr><td colSpan={7} className="muted">No transfers or loans yet — academy player since day one.</td></tr>}
              {[...moves].reverse().map((mv) => (
                <tr key={mv.id}>
                  <td>{mv.season ? seasonLabel(mv.season) : '—'}</td>
                  <td className="muted">{mv.moved_on || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{MOVE_LABEL[mv.type]}</td>
                  <td>{mv.club || '—'}</td>
                  <td className="num">{mv.fee != null ? formatMoney(mv.fee, model.currency) : '—'}</td>
                  <td className="muted" style={{ whiteSpace: 'normal' }}>{mv.notes || ''}</td>
                  <td className="num"><button className="btn danger small" onClick={() => removeMove(mv)} aria-label="Remove">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}

      <div style={{ marginTop: 24 }}>
        <button className="btn danger small" onClick={deletePlayer}>Delete player completely</button>
      </div>
    </>
  );
}

const MOVE_COPY = {
  sold: { title: 'Sell player', club: 'Sold to *', fee: 'Transfer fee', button: 'Confirm sale' },
  loan: { title: 'Loan out', club: 'Loaned to *', fee: 'Loan fee (optional)', button: 'Confirm loan' },
  loan_return: { title: 'Back from loan', club: 'Returning from', fee: null, button: 'Confirm return' },
  released: { title: 'Release player', club: 'Joined (optional)', fee: null, button: 'Confirm release' },
};

function MoveForm({ type, model, player, lastLoanClub, api, onDone, onCancel }) {
  const copy = MOVE_COPY[type];
  const latest = model.seasons[model.seasons.length - 1];
  const [f, setF] = useState({
    season_id: latest?.id || '',
    moved_on: '',
    club: type === 'loan_return' ? lastLoanClub || '' : '',
    fee: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fee = copy.fee ? parseMoney(f.fee) : null;
  const feeInvalid = copy.fee && Number.isNaN(fee);

  async function submit(e) {
    e.preventDefault();
    if ((type === 'sold' || type === 'loan') && !f.club.trim()) return setError('Enter the club.');
    if (feeInvalid) return setError('Fee not understood — try e.g. 12.5m, 850k or 1200000.');
    setBusy(true);
    setError('');
    try {
      await api.save('player_moves', {
        player_id: player.id,
        type,
        club: f.club.trim() || null,
        fee: fee ?? null,
        season_id: f.season_id || null,
        moved_on: f.moved_on || null,
        notes: f.notes.trim() || null,
      });
      await onDone(`${copy.title}: saved ✓`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="move-form">
      <h3 style={{ marginBottom: 12 }}>{copy.title}: {player.name}</h3>
      <div className="form-grid">
        <label>
          Season
          <select value={f.season_id} onChange={(e) => setF({ ...f, season_id: e.target.value })}>
            <option value="">—</option>
            {[...model.seasons].reverse().map((s) => <option key={s.id} value={s.id}>{seasonLabel(s)}</option>)}
          </select>
        </label>
        <label>Date (optional)<input type="date" value={f.moved_on} onChange={(e) => setF({ ...f, moved_on: e.target.value })} /></label>
        <label>{copy.club}<input value={f.club} onChange={(e) => setF({ ...f, club: e.target.value })} autoFocus /></label>
        {copy.fee && (
          <label>
            {copy.fee}
            <input value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} placeholder="e.g. 12.5m or 850k" inputMode="decimal" />
            <span style={{ fontSize: 12, color: feeInvalid ? 'var(--loss)' : 'var(--muted)' }}>
              {f.fee ? (feeInvalid ? 'Not understood' : `= ${formatMoney(fee, model.currency)}`) : ' '}
            </span>
          </label>
        )}
        <label className="wide">Notes<input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="e.g. release clause, loan until end of season…" /></label>
      </div>
      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : copy.button}</button>
        <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function JoinedSelect({ seasons, value, onChange }) {
  return (
    <label>
      Joined the first team
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {[...seasons].reverse().map((s) => <option key={s.id} value={s.id}>{seasonLabel(s)}</option>)}
      </select>
    </label>
  );
}
