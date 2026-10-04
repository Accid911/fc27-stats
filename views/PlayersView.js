import { buildModel, playerStats, statusText } from '@/lib/data';
import PlayersTable from '@/components/PlayersTable';
import DemoNotice from '@/components/DemoNotice';
import TransfersSection from '@/components/TransfersSection';

export default function PlayersView({ data, base = '', edition = null }) {
  const model = buildModel(data);
  const rows = playerStats(model).map((p) => ({
    ...p,
    href: `${base}/players/${p.id}`,
    status: statusText(model.statusById[p.id]),
    statusKey: model.statusById[p.id]?.status || 'squad',
    joinedNo: p.joined?.season.number ?? null,
    joined: undefined,
  }));

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">Academy</div>
      <h1 style={{ marginBottom: 8 }}>Players</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        All-time totals from every logged match. Click a column to sort. <a className="link" href="#transfers">Transfers &amp; loans ↓</a>
      </p>
      <PlayersTable
          rows={rows}
          defaultSort="goals"
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

      <TransfersSection base={base} model={model} data={data} />
    </>
  );
}
