import { loadAll, buildModel, teamRecord, leagueTable, playerStats, topBy, ordinal, seasonLabel } from '@/lib/data';
import SortableTable from '@/components/SortableTable';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seasons' };

export default async function SeasonsPage() {
  const data = await loadAll();
  const model = buildModel(data);
  const rows = [...model.seasons].reverse().map((s) => {
    const ms = model.matches.filter((m) => m.season_id === s.id);
    const r = teamRecord(ms);
    const t = leagueTable(model, s.id).club;
    const stats = playerStats(model, ms);
    const top = topBy(stats, 'goals', 1)[0];
    const potm = topBy(stats, 'potm', 1)[0];
    return {
      id: s.id,
      href: `/seasons/${s.id}`,
      number: s.number,
      name: seasonLabel(s),
      tournament: s.tournament,
      pos: t?.pos ?? null,
      posLabel: t ? ordinal(t.pos) : '—',
      points: t?.points ?? null,
      P: r.P,
      record: `${r.W}-${r.D}-${r.L}`,
      GF: r.GF,
      GA: r.GA,
      trophies: data.trophies.filter((x) => x.season_id === s.id).length,
      top: top ? `${top.name} (${top.goals})` : null,
      potm: potm ? `${potm.name} (${potm.potm})` : null,
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
          defaultSort="number"
          columns={[
            { key: 'name', label: 'Season', href: 'href' },
            { key: 'tournament', label: 'League' },
            { key: 'posLabel', label: 'Finish' },
            { key: 'points', label: 'Pts', num: true },
            { key: 'P', label: 'Played', num: true },
            { key: 'record', label: 'W-D-L' },
            { key: 'GF', label: 'GF', num: true },
            { key: 'GA', label: 'GA', num: true },
            { key: 'trophies', label: '🏆', num: true },
            { key: 'top', label: 'Top scorer' },
            { key: 'potm', label: 'Most POTM' },
          ]}
        />
      </div>
    </>
  );
}
