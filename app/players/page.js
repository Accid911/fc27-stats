import { loadAll, buildModel, playerStats, statusText } from '@/lib/data';
import SortableTable from '@/components/SortableTable';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Players' };

export default async function PlayersPage() {
  const data = await loadAll();
  const model = buildModel(data);
  const rows = playerStats(model).map((p) => ({
    ...p,
    href: `/players/${p.id}`,
    status: statusText(model.statusById[p.id]),
    joinedNo: p.joined?.season.number ?? null,
    joined: undefined,
  }));

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">Academy</div>
      <h1 style={{ marginBottom: 8 }}>Players</h1>
      <p className="muted" style={{ marginBottom: 24 }}>All-time totals from every logged match. Click a column to sort.</p>
      <div className="card pad-0">
        <SortableTable
          rows={rows}
          defaultSort="goals"
          rank
          columns={[
            { key: 'name', label: 'Player', href: 'href' },
            { key: 'position', label: 'Pos' },
            { key: 'country', label: 'Country' },
            { key: 'joinedNo', label: 'Joined (S)', num: true },
            { key: 'status', label: 'Status' },
            { key: 'apps', label: 'Apps', num: true },
            { key: 'goals', label: 'Goals', num: true },
            { key: 'assists', label: 'Ast', num: true },
            { key: 'ga', label: 'G+A', num: true },
            { key: 'potm', label: 'POTM', num: true },
            { key: 'cs', label: 'CS', num: true },
            { key: 'avg_rating', label: 'Avg', num: true, decimals: 1 },
            { key: 'best_rating', label: 'Best', num: true, decimals: 1 },
            { key: 'winPct', label: 'Win %', num: true },
          ]}
        />
      </div>
    </>
  );
}
