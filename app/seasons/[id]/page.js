import { notFound } from 'next/navigation';
import { loadAll, record, ordinal } from '@/lib/data';
import SortableTable from '@/components/SortableTable';
import MatchList from '@/components/MatchList';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';

export default async function SeasonPage({ params }) {
  const { id } = await params;
  const data = await loadAll();
  const season = data.seasons.find((s) => s.id === id);
  if (!season) notFound();

  const matches = data.matches.filter((m) => m.season_id === id);
  const r = record(matches);
  const trophies = data.trophies.filter((t) => t.season_id === id);
  const rows = data.player_season_stats
    .filter((s) => s.season_id === id)
    .map((s) => {
      const p = data.players.find((x) => x.id === s.player_id) || {};
      return {
        ...s,
        id: s.player_id,
        name: p.name,
        position: p.position,
        href: `/players/${s.player_id}`,
        avg_rating: s.avg_rating == null ? null : Number(s.avg_rating),
        ga: s.goals + s.assists,
      };
    });

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">{season.club || 'Season'} · {season.league || ''}</div>
      <h1>{season.name}</h1>
      <div className="row" style={{ marginTop: 12 }}>
        <span className="badge green">{ordinal(season.league_position)} place</span>
        <span className="badge">P{r.P} · W{r.W} D{r.D} L{r.L}</span>
        <span className="badge">GF {r.GF} · GA {r.GA}</span>
        {trophies.map((t) => (
          <span key={t.id} className="badge gold">🏆 {t.name}</span>
        ))}
      </div>
      {season.notes && <p className="muted" style={{ marginTop: 14 }}>{season.notes}</p>}

      <section className="section">
        <h2>Player stats</h2>
        <div className="card pad-0">
          <SortableTable
            rows={rows}
            defaultSort="goals"
            columns={[
              { key: 'name', label: 'Player', href: 'href' },
              { key: 'position', label: 'Pos' },
              { key: 'appearances', label: 'Apps', num: true },
              { key: 'goals', label: 'Goals', num: true },
              { key: 'assists', label: 'Ast', num: true },
              { key: 'ga', label: 'G+A', num: true },
              { key: 'clean_sheets', label: 'CS', num: true },
              { key: 'motm', label: 'MOTM', num: true },
              { key: 'yellow_cards', label: 'YC', num: true },
              { key: 'red_cards', label: 'RC', num: true },
              { key: 'avg_rating', label: 'Rating', num: true },
            ]}
          />
        </div>
      </section>

      <section className="section">
        <h2>Matches</h2>
        <div className="card pad-0">
          <MatchList matches={matches} />
        </div>
      </section>
    </>
  );
}
