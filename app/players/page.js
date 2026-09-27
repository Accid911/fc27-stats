import { loadAll, buildModel, playerStats } from '@/lib/data';
import SortableTable from '@/components/SortableTable';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Players · Leicester City Youth' };

export default async function PlayersPage() {
  const data = await loadAll();
  const model = buildModel(data);
  const rows = playerStats(model).map((p) => ({
    ...p,
    href: `/players/${p.id}`,
    status: p.is_active ? 'Squad' : 'Left',
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
            { key: 'age', label: 'Age', num: true },
            { key: 'country', label: 'Country' },
            { key: 'status', label: 'Status' },
            { key: 'apps', label: 'Apps', num: true },
            { key: 'goals', label: 'Goals', num: true },
            { key: 'assists', label: 'Ast', num: true },
            { key: 'ga', label: 'G+A', num: true },
            { key: 'potm', label: 'POTM', num: true },
            { key: 'avg_rating', label: 'Avg', num: true, decimals: 1 },
            { key: 'best_rating', label: 'Best', num: true, decimals: 1 },
            { key: 'winPct', label: 'Win %', num: true },
          ]}
        />
      </div>
    </>
  );
}
