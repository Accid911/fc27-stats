'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { makeApi } from '@/lib/admin-api';
import { sortSeasons, matchResult } from '@/lib/data';
import CrudSection, { Field } from './CrudSection';
import StatsEditor from './StatsEditor';

const TABS = ['Player stats', 'Matches', 'Trophies', 'Seasons', 'Players', 'Site settings'];

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

  const seasons = useMemo(() => (data ? sortSeasons(data.seasons) : []), [data]);
  useEffect(() => {
    if (seasons.length && !seasons.some((s) => s.id === seasonId)) setSeasonId(seasons[0].id);
  }, [seasons, seasonId]);

  if (error && !data) return <div className="error">Couldn’t load data: {error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  const seasonOptions = seasons.map((s) => ({ value: s.id, label: s.name }));
  const seasonName = (id) => data.seasons.find((s) => s.id === id)?.name || '—';
  const needsSeason = ['Player stats', 'Matches', 'Trophies'].includes(tab);

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
          <h1 style={{ fontSize: 36 }}>Manage stats</h1>
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

      {needsSeason && (
        seasons.length === 0 ? (
          <div className="notice">Create a season first in the <b>Seasons</b> tab.</div>
        ) : (
          <div className="row" style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Season
              <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} style={{ width: 'auto' }}>
                {seasonOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        )
      )}

      {tab === 'Player stats' && seasonId && (
        <StatsEditor data={data} seasonId={seasonId} api={api} onChanged={reload} />
      )}

      {tab === 'Matches' && seasonId && (
        <CrudSection
          key={`m-${seasonId}`}
          title="Matches"
          itemName="match"
          table="matches"
          api={api}
          onChanged={reload}
          defaults={{ season_id: seasonId, venue: 'H', competition: 'League', goals_for: 0, goals_against: 0 }}
          rows={data.matches
            .filter((m) => m.season_id === seasonId)
            .sort((a, b) => String(b.played_on || '').localeCompare(String(a.played_on || '')))}
          fields={[
            { key: 'season_id', label: 'Season', type: 'select', options: seasonOptions, required: true },
            { key: 'played_on', label: 'Date', type: 'date' },
            { key: 'competition', label: 'Competition' },
            { key: 'opponent', label: 'Opponent', required: true },
            { key: 'venue', label: 'Venue', type: 'select', required: true, options: [
              { value: 'H', label: 'Home' }, { value: 'A', label: 'Away' }, { value: 'N', label: 'Neutral' },
            ] },
            { key: 'goals_for', label: 'Goals for', type: 'number', required: true },
            { key: 'goals_against', label: 'Goals against', type: 'number', required: true },
            { key: 'video_url', label: 'YouTube link', type: 'url', wide: true },
            { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
          ]}
          columns={[
            { key: 'played_on', label: 'Date' },
            { key: 'competition', label: 'Comp' },
            { key: 'opponent', label: 'Opponent' },
            { key: 'venue', label: 'H/A' },
            { key: 'score', label: 'Score', render: (m) => (
              <><b>{m.goals_for} – {m.goals_against}</b> <span className={`result ${matchResult(m)}`}>{matchResult(m)}</span></>
            ) },
          ]}
        />
      )}

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
            { key: 'name', label: 'Trophy', required: true },
          ]}
          columns={[
            { key: 'name', label: 'Trophy' },
            { key: 'season_id', label: 'Season', render: (t) => seasonName(t.season_id) },
          ]}
        />
      )}

      {tab === 'Seasons' && (
        <CrudSection
          title="Seasons"
          itemName="season"
          table="seasons"
          api={api}
          onChanged={reload}
          defaults={nextSeasonDefaults(seasons)}
          rows={seasons}
          fields={[
            { key: 'name', label: 'Name (e.g. 2026/27)', required: true },
            { key: 'start_year', label: 'Start year', type: 'number', required: true },
            { key: 'club', label: 'Club' },
            { key: 'league', label: 'League' },
            { key: 'league_position', label: 'League position', type: 'number' },
            { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
          ]}
          columns={[
            { key: 'name', label: 'Season' },
            { key: 'club', label: 'Club' },
            { key: 'league', label: 'League' },
            { key: 'league_position', label: 'Pos' },
          ]}
        />
      )}

      {tab === 'Players' && (
        <CrudSection
          title="Players"
          itemName="player"
          table="players"
          api={api}
          onChanged={reload}
          rows={[...data.players].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name))}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'position', label: 'Position', type: 'select', options: POSITIONS.map((p) => ({ value: p, label: p })) },
            { key: 'nationality', label: 'Nationality' },
            { key: 'shirt_number', label: 'Shirt #', type: 'number' },
            { key: 'overall', label: 'Overall', type: 'number' },
            { key: 'potential', label: 'Potential', type: 'number' },
            { key: 'is_active', label: 'Currently in squad', type: 'checkbox' },
            { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
          ]}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'position', label: 'Pos' },
            { key: 'nationality', label: 'Nation' },
            { key: 'overall', label: 'OVR' },
            { key: 'is_active', label: 'Status', render: (p) => (p.is_active ? <span className="badge green">Squad</span> : <span className="badge">Left</span>) },
          ]}
        />
      )}

      {tab === 'Site settings' && <SettingsForm api={api} settings={data.settings} onChanged={reload} />}
    </>
  );
}

const POSITIONS = ['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'];

function nextSeasonDefaults(seasons) {
  const last = seasons[0];
  if (!last) {
    const y = new Date().getFullYear();
    return { start_year: y, name: `${y}/${String(y + 1).slice(2)}` };
  }
  const y = last.start_year + 1;
  return { start_year: y, name: `${y}/${String(y + 1).slice(2)}`, club: last.club || '', league: last.league || '' };
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
