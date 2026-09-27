import { loadAll, careerTotals } from '@/lib/data';
import SortableTable from '@/components/SortableTable';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Players · FC27 Career Stats' };

export default async function PlayersPage() {
  const data = await loadAll();
  const rows = careerTotals(data).map((p) => ({
    ...p,
    href: `/players/${p.id}`,
    status: p.is_active ? 'Squad' : 'Left',
  }));

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">All-time</div>
      <h1 style={{ marginBottom: 8 }}>Players</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Career totals across every season. Click a column to sort.</p>
      <div className="card pad-0">
        <SortableTable
          rows={rows}
          defaultSort="goals"
          rank
          columns={[
            { key: 'name', label: 'Player', href: 'href' },
            { key: 'position', label: 'Pos' },
            { key: 'nationality', label: 'Nation' },
            { key: 'status', label: 'Status' },
            { key: 'seasons', label: 'Seasons', num: true },
            { key: 'appearances', label: 'Apps', num: true },
            { key: 'goals', label: 'Goals', num: true },
            { key: 'assists', label: 'Ast', num: true },
            { key: 'ga', label: 'G+A', num: true },
            { key: 'clean_sheets', label: 'CS', num: true },
            { key: 'motm', label: 'MOTM', num: true },
            { key: 'avg_rating', label: 'Rating', num: true },
            { key: 'overall', label: 'OVR', num: true },
          ]}
        />
      </div>
    </>
  );
}
