'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { makeApi } from '@/lib/admin-api';
import { seasonLabel } from '@/lib/data';
import { COUNTRIES, POSITIONS, TOURNAMENTS, positionOrder } from '@/lib/constants';
import CrudSection, { Field } from './CrudSection';
import MatchEditor from './MatchEditor';
import SeasonEditor from './SeasonEditor';

const TABS = ['Matches', 'Players', 'Seasons', 'Trophies', 'Site settings'];

export default function AdminApp() {
  const sb = getSupabase();
  const [session, setSession] = useState(undefined); // undefined = loading
  const [isAdmin, setIsAdmin] = useState(null);
  const api = useMemo(() => makeApi(sb), [sb]);

  useEffect(() => {
    if (!sb) return setSession(null);
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  useEffect(() => {
    if (!sb || !session) return setIsAdmin(null);
    sb.rpc('is_admin').then(({ data, error }) => setIsAdmin(!error && data === true));
  }, [sb, session]);

  if (!sb) return <Dashboard api={api} />;
  if (session === undefined) return <p className="muted">Loading…</p>;
  if (!session) return <Login sb={sb} />;
  if (isAdmin === null) return <p className="muted">Checking access…</p>;
  if (!isAdmin) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h2>No edit access</h2>
        <p className="muted">
          You’re signed in as <b>{session.user.email}</b>, but this email isn’t in the <code>admins</code> table.
        </p>
        <button className="btn secondary" onClick={() => sb.auth.signOut()}>Sign out</button>
      </div>
    );
  }
  return <Dashboard api={api} email={session.user.email} onSignOut={() => sb.auth.signOut()} />;
}

function Login({ sb }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <form className="card" style={{ maxWidth: 400, margin: '40px auto' }} onSubmit={submit}>
      <div className="eyebrow">Admin</div>
      <h2>Sign in</h2>
      <div className="grid" style={{ gap: 12 }}>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </div>
    </form>
  );
}

function Dashboard({ api, email, onSignOut }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(TABS[0]);
  const [seasonId, setSeasonId] = useState('');

  const reload = useCallback(async () => {
    try {
      const d = await api.loadAll();
      setData(d);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [api]);

  useEffect(() => {
    reload();
  }, [reload]);

  const seasons = useMemo(() => (data ? [...data.seasons].sort((a, b) => b.number - a.number) : []), [data]);
  useEffect(() => {
    if (seasons.length && !seasons.some((s) => s.id === seasonId)) setSeasonId(seasons[0].id);
  }, [seasons, seasonId]);

  if (error && !data) {
    return (
      <div className="error">
        Couldn’t load data: {error}
        {/does not exist|schema cache/.test(error) && (
          <p style={{ marginBottom: 0 }}>
            Looks like the database hasn’t been upgraded yet — run <code>supabase/migrations/002-leicester-youth.sql</code> in the Supabase SQL Editor.
          </p>
        )}
      </div>
    );
  }
  if (!data) return <p className="muted">Loading…</p>;

  const seasonOptions = seasons.map((s) => ({ value: s.id, label: seasonLabel(s) }));
  const seasonName = (id) => seasonLabel(data.seasons.find((s) => s.id === id));
  const needsSeason = ['Matches', 'Trophies'].includes(tab);

  return (
    <>
      {api.demo && (
        <div className="notice">
          Demo mode — Supabase isn’t connected, so changes here only last until you refresh. See README to connect.
        </div>
      )}
      <div className="row" style={{ marginBottom: 20 }}>
        <div>
          <div className="eyebrow">Admin</div>
          <h1 style={{ fontSize: 36 }}>Manage the career</h1>
        </div>
        <span className="spacer" />
        {email && <span className="muted">{email}</span>}
        {onSignOut && <button className="btn secondary small" onClick={onSignOut}>Sign out</button>}
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {needsSeason &&
        (seasons.length === 0 ? (
          <div className="notice">
            Create a season first in the{' '}
            <button className="linkish" onClick={() => setTab('Seasons')}>Seasons</button> tab.
          </div>
        ) : (
          <div className="row" style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Season
              <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} style={{ width: 'auto' }}>
                {seasonOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        ))}

      {tab === 'Matches' && seasonId && (
        data.players.length === 0 ? (
          <div className="notice">
            Add some players first in the{' '}
            <button className="linkish" onClick={() => setTab('Players')}>Players</button> tab.
          </div>
        ) : (
          <MatchEditor key={seasonId} data={data} seasonId={seasonId} api={api} onChanged={reload} />
        )
      )}

      {tab === 'Players' && (
        <CrudSection
          title="Players"
          itemName="player"
          table="players"
          api={api}
          onChanged={reload}
          deleteWarning="Their match stats will be deleted too — to keep them, untick “In squad” instead. "
          rows={[...data.players].sort(
            (a, b) => Number(b.is_active) - Number(a.is_active) || positionOrder(a.position) - positionOrder(b.position) || a.name.localeCompare(b.name)
          )}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'position', label: 'Position', type: 'select', required: true, options: POSITIONS.map((p) => ({ value: p, label: p })) },
            { key: 'age', label: 'Age', type: 'number', min: 14, max: 45 },
            { key: 'country', label: 'Country', suggestions: COUNTRIES },
            { key: 'is_active', label: 'In squad', type: 'checkbox' },
          ]}
          defaults={{ position: 'ST' }}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'position', label: 'Pos' },
            { key: 'age', label: 'Age' },
            { key: 'country', label: 'Country' },
            { key: 'is_active', label: 'Status', render: (p) => (p.is_active ? <span className="badge green">Squad</span> : <span className="badge">Left</span>) },
          ]}
        />
      )}

      {tab === 'Seasons' && <SeasonEditor data={data} api={api} onChanged={reload} />}

      {tab === 'Trophies' && seasonId && (
        <CrudSection
          key={`t-${seasonId}`}
          title="Trophies"
          itemName="trophy"
          table="trophies"
          api={api}
          onChanged={reload}
          defaults={{ season_id: seasonId }}
          rows={data.trophies.filter((t) => t.season_id === seasonId)}
          fields={[
            { key: 'season_id', label: 'Season', type: 'select', options: seasonOptions, required: true },
            { key: 'name', label: 'Trophy', required: true, suggestions: TOURNAMENTS },
          ]}
          columns={[
            { key: 'name', label: 'Trophy' },
            { key: 'season_id', label: 'Season', render: (t) => seasonName(t.season_id) },
          ]}
        />
      )}

      {tab === 'Site settings' && <SettingsForm api={api} settings={data.settings} onChanged={reload} />}
    </>
  );
}

function SettingsForm({ api, settings, onChanged }) {
  const fields = [
    { key: 'club_name', label: 'Club name', required: true },
    { key: 'creator_name', label: 'Creator / channel name' },
    { key: 'youtube_url', label: 'YouTube playlist or channel URL', type: 'url', wide: true },
    { key: 'tagline', label: 'Tagline', type: 'textarea', wide: true },
  ];
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.key, settings?.[f.key] ?? ''])));
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const row = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
      await api.saveSettings(row);
      await onChanged();
      setMsg('Saved ✓');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="form-grid">
        {fields.map((f) => (
          <Field key={f.key} field={f} value={form[f.key]} onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))} />
        ))}
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        {msg && <span className="muted">{msg}</span>}
      </div>
    </form>
  );
}
