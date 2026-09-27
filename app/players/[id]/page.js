import { notFound } from 'next/navigation';
import { loadAll, sumStats, sortSeasons } from '@/lib/data';
import SortableTable from '@/components/SortableTable';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';

export default async function PlayerPage({ params }) {
  const { id } = await params;
  const data = await loadAll();
  const player = data.players.find((p) => p.id === id);
  if (!player) notFound();

  const statRows = data.player_season_stats.filter((s) => s.player_id === id);
  const t = sumStats(statRows);
  const bySeason = sortSeasons(data.seasons)
    .map((season) => {
      const s = statRows.find((x) => x.season_id === season.id);
      if (!s) return null;
      return {
        ...s,
        id: season.id,
        season: season.name,
        start_year: season.start_year,
        club: season.club,
        href: `/seasons/${season.id}`,
        avg_rating: s.avg_rating == null ? null : Number(s.avg_rating),
        ga: s.goals + s.assists,
      };
    })
    .filter(Boolean);

  const kpis = [
    ['Apps', t.appearances],
    ['Goals', t.goals],
    ['Assists', t.assists],
    ['G+A', t.ga],
    [player.position === 'GK' ? 'Clean sheets' : 'MOTM', player.position === 'GK' ? t.clean_sheets : t.motm],
    ['Avg rating', t.avg_rating ?? '—'],
  ];

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">
        {player.position || 'Player'}
        {player.nationality ? ` · ${player.nationality}` : ''}
        {player.shirt_number ? ` · #${player.shirt_number}` : ''}
      </div>
      <h1>{player.name}</h1>
      <div className="row" style={{ marginTop: 12 }}>
        <span className={`badge ${player.is_active ? 'green' : ''}`}>{player.is_active ? 'In squad' : 'Left club'}</span>
        {player.overall && <span className="badge">OVR {player.overall}</span>}
        {player.potential && <span className="badge">POT {player.potential}</span>}
      </div>
      {player.notes && <p className="muted" style={{ marginTop: 14 }}>{player.notes}</p>}

      <section className="section grid grid-kpi">
        {kpis.map(([label, value]) => (
          <div className="card kpi" key={label}>
            <div className="value">{value}</div>
            <div className="label">{label}</div>
          </div>
        ))}
      </section>

      <section className="section">
        <h2>Season by season</h2>
        <div className="card pad-0">
          <SortableTable
            rows={bySeason}
            defaultSort="start_year"
            columns={[
              { key: 'season', label: 'Season', href: 'href' },
              { key: 'club', label: 'Club' },
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
    </>
  );
}
