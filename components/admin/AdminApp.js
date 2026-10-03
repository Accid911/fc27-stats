'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase, demoAllowed } from '@/lib/supabase';
import { makeApi } from '@/lib/admin-api';
import { seasonLabel } from '@/lib/data';
import { CUPS, CURRENCIES, LEAGUES } from '@/lib/constants';
import CrudSection, { Field } from './CrudSection';
import MatchEditor from './MatchEditor';
import SeasonEditor from './SeasonEditor';
import { CREATOR, DEFAULT_TAGLINE } from '@/lib/site';
import PlayersAdmin from './PlayersAdmin';
import BackupPanel, { readLastBackup, daysAgo } from './BackupPanel';

const TABS = ['Matches', 'Players', 'Seasons', 'Other trophies', 'Backup', 'Site settings'];

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

  if (!sb && !demoAllowed) {
    return <div className="error">The database isn’t connected — check the Supabase environment variables on Vercel, then redeploy.</div>;
  }
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
  const [backupAge, setBackupAge] = useState(0);
  useEffect(() => setBackupAge(daysAgo(readLastBackup())), [tab]);

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
            Looks like the database hasn’t been upgraded yet — run the files in <code>supabase/migrations/</code> you haven’t run yet (002, then 003) in the Supabase SQL Editor.
          </p>
        )}
      </div>
    );
  }
  if (!data) return <p className="muted">Loading…</p>;

  const seasonOptions = seasons.map((s) => ({ value: s.id, label: seasonLabel(s) }));
  const seasonName = (id) => seasonLabel(data.seasons.find((s) => s.id === id));
  const needsSeason = ['Matches', 'Other trophies'].includes(tab);

  return (
    <>
      {api.demo && (
        <div className="notice">
          Demo mode — Supabase isn’t connected, so changes here only last until you refresh. See README to connect.
        </div>
      )}
      {data.missing?.length > 0 && (
        <div className="notice">
          The database needs an upgrade for transfers &amp; cups — run <code>supabase/migrations/003-transfers-cups.sql</code> in the Supabase SQL Editor.
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

      {!api.demo && tab !== 'Backup' && (backupAge == null || backupAge > 14) && (
        <div className="notice">
          {backupAge == null ? 'No backup downloaded on this computer yet.' : `Last backup was ${backupAge} days ago.`}{' '}
          <button className="linkish" onClick={() => setTab('Backup')}>Download one now</button> — it takes a second.
        </div>
      )}

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

      {tab === 'Players' && <PlayersAdmin data={data} api={api} onChanged={reload} />}

      {tab === 'Seasons' && <SeasonEditor data={data} api={api} onChanged={reload} />}

      {tab === 'Other trophies' && seasonId && (
        <p className="muted" style={{ marginTop: -4 }}>
          League titles and cup wins are added automatically (league table and cup results in the <b>Seasons</b> tab).
          Use this only for anything else, like a pre-season tournament.
        </p>
      )}
      {tab === 'Other trophies' && seasonId && (
        <CrudSection
          key={`t-${seasonId}`}
          title="Other trophies"
          itemName="trophy"
          table="trophies"
          api={api}
          onChanged={reload}
          defaults={{ season_id: seasonId }}
          rows={data.trophies.filter((t) => t.season_id === seasonId)}
          fields={[
            { key: 'season_id', label: 'Season', type: 'select', options: seasonOptions, required: true },
            { key: 'name', label: 'Trophy', required: true, suggestions: [...LEAGUES, ...CUPS] },
          ]}
          columns={[
            { key: 'name', label: 'Trophy' },
            { key: 'season_id', label: 'Season', render: (t) => seasonName(t.season_id) },
          ]}
        />
      )}

      {tab === 'Backup' && <BackupPanel api={api} onChanged={reload} />}

            {tab === 'Site settings' && <SettingsForm api={api} settings={data.settings} onChanged={reload} />}
    </>
  );
}

function SettingsForm({ api, settings, onChanged }) {
  const fields = [
    { key: 'club_name', label: 'Club name', required: true },
    { key: 'creator_name', label: 'Creator / channel name', placeholder: CREATOR.name },
    { key: 'currency', label: 'Currency for transfer fees', type: 'select', required: true, options: CURRENCIES.map((c) => ({ value: c, label: c })) },
    { key: 'youtube_url', label: 'YouTube playlist or channel URL (empty = SparringDK channel)', type: 'url', wide: true, placeholder: CREATOR.channel },
    { key: 'tagline', label: 'Tagline on the homepage (empty = default text)', type: 'textarea', wide: true, placeholder: DEFAULT_TAGLINE },
  ];
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.key, settings?.[f.key] ?? (f.key === 'currency' ? '£' : '')])));
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
