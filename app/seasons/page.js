import { loadAll, record, sortSeasons, topBy, ordinal } from '@/lib/data';
import SortableTable from '@/components/SortableTable';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seasons · FC27 Career Stats' };

export default async function SeasonsPage() {
  const data = await loadAll();
  const rows = sortSeasons(data.seasons).map((s) => {
    const r = record(data.matches.filter((m) => m.season_id === s.id));
    const stats = data.player_season_stats
      .filter((x) => x.season_id === s.id)
      .map((x) => ({ ...x, name: data.players.find((p) => p.id === x.player_id)?.name }));
    const top = topBy(stats, 'goals', 1)[0];
    return {
      id: s.id,
      href: `/seasons/${s.id}`,
      name: s.name,
      start_year: s.start_year,
      club: s.club,
      league: s.league,
      pos: s.league_position,
      posLabel: ordinal(s.league_position),
      record: `${r.W}-${r.D}-${r.L}`,
      GF: r.GF,
      GA: r.GA,
      trophies: data.trophies.filter((t) => t.season_id === s.id).length,
      top: top ? `${top.name} (${top.goals})` : null,
    };
  });

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">Career</div>
      <h1 style={{ marginBottom: 24 }}>Seasons</h1>
      <div className="card pad-0">
        <SortableTable
          rows={rows}
          defaultSort="start_year"
          columns={[
            { key: 'name', label: 'Season', href: 'href' },
            { key: 'club', label: 'Club' },
            { key: 'league', label: 'League' },
            { key: 'posLabel', label: 'Pos' },
            { key: 'record', label: 'W-D-L' },
            { key: 'GF', label: 'GF', num: true },
            { key: 'GA', label: 'GA', num: true },
            { key: 'trophies', label: 'Trophies', num: true },
            { key: 'top', label: 'Top scorer' },
          ]}
        />
      </div>
    </>
  );
}
