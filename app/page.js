import Link from 'next/link';
import { loadAll, careerTotals, record, sortSeasons, topBy, ordinal, sumStats } from '@/lib/data';
import Leaderboard from '@/components/Leaderboard';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await loadAll();
  const { settings, trophies, matches } = data;
  const seasons = sortSeasons(data.seasons);
  const totals = careerTotals(data);
  const rec = record(matches);
  const current = seasons[0];
  const currentStats = current
    ? data.player_season_stats
        .filter((s) => s.season_id === current.id)
        .map((s) => ({ ...s, ...data.players.find((p) => p.id === s.player_id), id: s.player_id }))
    : [];
  const currentRec = current ? record(matches.filter((m) => m.season_id === current.id)) : null;
  const currentTop = topBy(currentStats, 'goals', 1)[0];
  const allGoals = sumStats(data.player_season_stats).goals;

  return (
    <>
      <DemoNotice demo={data.demo} />

      <section className="card hero">
        <div className="eyebrow">FC27 Career Mode{settings.creator_name ? ` · ${settings.creator_name}` : ''}</div>
        <h1>{settings.club_name}</h1>
        {settings.tagline && <p>{settings.tagline}</p>}
        {settings.youtube_url && (
          <div style={{ marginTop: 18 }}>
            <a className="btn" href={settings.youtube_url} target="_blank" rel="noreferrer">▶ Watch the series</a>
          </div>
        )}
      </section>

      <section className="section grid grid-kpi">
        <Kpi value={seasons.length} label="Seasons" />
        <Kpi value={trophies.length} label="Trophies" gold />
        <Kpi value={`${rec.W}-${rec.D}-${rec.L}`} label="W-D-L (logged matches)" />
        <Kpi value={allGoals} label="Player goals" />
        <Kpi value={data.players.filter((p) => p.is_active).length} label="Players in squad" />
      </section>

      {current && (
        <section className="section">
          <div className="row" style={{ marginBottom: 14 }}>
            <h2 style={{ margin: 0 }}>Latest season · {current.name}</h2>
            <span className="spacer" />
            <Link className="link" href={`/seasons/${current.id}`}>Full season →</Link>
          </div>
          <div className="grid grid-kpi">
            <Kpi value={current.league || '—'} label={current.club || 'League'} small />
            <Kpi value={ordinal(current.league_position)} label="League position" />
            <Kpi value={`${currentRec.W}-${currentRec.D}-${currentRec.L}`} label="W-D-L" />
            <Kpi value={currentTop ? currentTop.goals : '—'} label={currentTop ? `Top scorer: ${currentTop.name}` : 'Top scorer'} />
          </div>
        </section>
      )}

      <section className="section grid grid-2">
        <Leaderboard title="All-time top scorers" rows={topBy(totals, 'goals')} valueKey="goals" />
        <Leaderboard title="All-time top assists" rows={topBy(totals, 'assists')} valueKey="assists" />
        <Leaderboard title="Most appearances" rows={topBy(totals, 'appearances')} valueKey="appearances" />
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Trophy cabinet</h3>
          {trophies.length === 0 && <p className="muted">No silverware yet… give it time.</p>}
          {sortSeasons(data.seasons).flatMap((s) =>
            trophies
              .filter((t) => t.season_id === s.id)
              .map((t) => (
                <div className="leader" key={t.id}>
                  <span className="rank">🏆</span>
                  <span className="name">{t.name}</span>
                  <Link className="badge gold" href={`/seasons/${s.id}`}>{s.name}</Link>
                </div>
              ))
          )}
        </div>
      </section>
    </>
  );
}

function Kpi({ value, label, gold, small }) {
  return (
    <div className="card kpi">
      <div className="value" style={{ color: gold ? 'var(--gold)' : undefined, fontSize: small ? 26 : undefined }}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}
