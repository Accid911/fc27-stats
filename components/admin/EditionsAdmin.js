'use client';

import { useState } from 'react';
import ClubBadge from '@/components/ClubBadge';
import { editionLabel, crestUrl } from '@/lib/editions';

// All Youth Editions: details (crest, video link, intro text) and whether the public can see them.
export default function EditionsAdmin({ editions, allData, api, onChanged, onPick }) {
  const [open, setOpen] = useState(null);
  const count = (t, id) => (allData?.[t] || []).filter((r) => r.edition_id === id).length;
  const list = [...editions].sort((a, b) => b.number - a.number);
  const publicCount = editions.filter((e) => e.is_public && !e.is_current).length;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="notice" style={{ margin: 0 }}>
        The main site always shows the <b>current</b> edition (Leicester City). The older editions live in the archive
        (<a href="/editions" target="_blank" rel="noreferrer">/editions</a>) and stay <b>hidden 🔒</b> until you make them
        public — until then only signed-in admins can open those pages. {publicCount === 0 ? 'Right now no older edition is public.' : `${publicCount} older edition${publicCount === 1 ? ' is' : 's are'} public.`}
      </div>

      {list.map((ed) => {
        const seasons = count('seasons', ed.id);
        const matches = count('matches', ed.id);
        const players = count('players', ed.id);
        return (
          <div key={ed.id} className="card">
            <div className="row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <ClubBadge edition={ed} size={40} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <b>{editionLabel(ed)}</b>
                <div className="muted" style={{ fontSize: 13 }}>
                  {seasons} season{seasons === 1 ? '' : 's'} · {players} player{players === 1 ? '' : 's'} · {matches} match{matches === 1 ? '' : 'es'}
                </div>
              </div>
              {ed.is_current ? (
                <span className="badge blue">Current · main site</span>
              ) : ed.is_public ? (
                <span className="badge green">Public</span>
              ) : (
                <span className="badge">Hidden 🔒</span>
              )}
              <button className="btn small" onClick={() => onPick(ed.id)}>Edit this edition’s data</button>
              <a className="btn secondary small" href={ed.is_current ? '/' : `/editions/${ed.number}`} target="_blank" rel="noreferrer">View pages ↗</a>
              <button className="btn secondary small" onClick={() => setOpen(open === ed.id ? null : ed.id)}>
                {open === ed.id ? 'Close' : 'Details'}
              </button>
            </div>
            {open === ed.id && (
              <EditionForm
                key={ed.id}
                edition={ed}
                api={api}
                hasData={seasons + matches + players > 0}
                onSaved={async () => {
                  await onChanged();
                  setOpen(null);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function EditionForm({ edition, api, hasData, onSaved }) {
  const [f, setF] = useState({
    game: edition.game || '',
    club: edition.club || '',
    crest_url: edition.crest_url || '',
    youtube_url: edition.youtube_url || '',
    description: edition.description || '',
    is_public: !!edition.is_public,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!f.game.trim() || !f.club.trim()) return setError('Game and club are required.');
    if (f.is_public && !edition.is_public && !hasData && !confirm('This edition has no data yet. Make it public anyway?')) return;
    setBusy(true);
    setError('');
    try {
      await api.save('editions', {
        id: edition.id,
        game: f.game.trim(),
        club: f.club.trim(),
        crest_url: f.crest_url.trim() || null,
        youtube_url: f.youtube_url.trim() || null,
        description: f.description.trim() || null,
        // The current edition is the main site — it's always public.
        is_public: edition.is_current ? true : f.is_public,
      });
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 14 }}>
      <div className="form-grid">
        <label>Game *<input value={f.game} onChange={set('game')} placeholder="FIFA 15" required /></label>
        <label>Club *<input value={f.club} onChange={set('club')} placeholder="Newport County" required /></label>
        <label>
          Crest image URL
          <input value={f.crest_url} onChange={set('crest_url')} placeholder={crestUrl({ club: f.club }) || 'https://…/crest.png'} inputMode="url" />
        </label>
        <label>
          YouTube playlist / first video
          <input value={f.youtube_url} onChange={set('youtube_url')} placeholder="https://www.youtube.com/playlist?list=…" inputMode="url" />
        </label>
      </div>
      <label style={{ marginTop: 12 }}>
        Short intro (shown on the edition’s overview page)
        <textarea rows={3} value={f.description} onChange={set('description')} placeholder="SparringDK’s first Youth Edition: Newport County in League Two, academy players only." />
      </label>
      {!edition.is_current && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: 'var(--text)', fontSize: 14 }}>
          <input type="checkbox" checked={f.is_public} onChange={set('is_public')} style={{ width: 'auto' }} />
          Public — everyone can see this edition in the archive
        </label>
      )}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save edition'}</button>
      </div>
      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
    </form>
  );
}
