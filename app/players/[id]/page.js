import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadAll, buildModel, playerStats, seasonLabel } from '@/lib/data';
import SortableTable from '@/components/SortableTable';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';

export default async function PlayerPage({ params }) {
  const { id } = await params;
  const data = await loadAll();
  const model = buildModel(data);
  const player = model.playerById[id];
  if (!player) notFound();

  const all = playerStats(model).find((p) => p.id === id);
  const bySeason = model.seasons
    .map((s) => {
      const st = playerStats(model, model.matches.filter((m) => m.season_id === s.id)).find((p) => p.id === id);
      return st.apps ? { ...st, id: s.id, season: seasonLabel(s), number: s.number, tournament: s.tournament, href: `/seasons/${s.id}` } : null;
    })
    .filter(Boolean);

  const log = model.matches
    .map((m) => ({ m, r: m.lineup.find((x) => x.player_id === id) }))
    .filter((x) => x.r)
    .reverse();

  const kpis = [
    ['Apps', all.apps],
    ['Goals', all.goals],
    ['Assists', all.assists],
    ['POTM', all.potm],
    ['Avg rating', all.avg_rating ?? '—'],
    ['Best rating', all.best_rating ?? '—'],
    ['Win %', all.winPct != null ? `${all.winPct}%` : '—'],
  ];

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">
        {player.position || 'Player'}
        {player.age ? ` · Age ${player.age}` : ''}
        {player.country ? ` · ${player.country}` : ''}
      </div>
      <h1>{player.name}</h1>
      <div className="row" style={{ marginTop: 12 }}>
        <span className={`badge ${player.is_active ? 'green' : ''}`}>{player.is_active ? 'In squad' : 'Left club'}</span>
        {all.hatTricks > 0 && <span className="badge gold">{all.hatTricks} hat-trick{all.hatTricks > 1 ? 's' : ''}</span>}
      </div>

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
            defaultSort="number"
            columns={[
              { key: 'season', label: 'Season', href: 'href' },
              { key: 'tournament', label: 'League' },
              { key: 'apps', label: 'Apps', num: true },
              { key: 'goals', label: 'Goals', num: true },
              { key: 'assists', label: 'Ast', num: true },
              { key: 'ga', label: 'G+A', num: true },
              { key: 'potm', label: 'POTM', num: true },
              { key: 'avg_rating', label: 'Avg', num: true, decimals: 1 },
              { key: 'best_rating', label: 'Best', num: true, decimals: 1 },
            ]}
          />
        </div>
      </section>

      <section className="section">
        <h2>Match log</h2>
        <div className="card pad-0">
          {log.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>Hasn’t played yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Season</th><th>Tournament</th><th>Opponent</th><th className="num">Score</th><th></th><th className="num">Rating</th><th className="num">G</th><th className="num">A</th><th></th></tr>
                </thead>
                <tbody>
                  {log.map(({ m, r }) => (
                    <tr key={m.id} className={r.potm ? 'is-potm' : ''}>
                      <td className="muted">S{m.season.number}</td>
                      <td className="muted">{m.tournament || '—'}</td>
                      <td><Link href={`/matches/${m.id}`}>{m.opponent}</Link></td>
                      <td className="num" style={{ fontWeight: 700 }}>{m.goals_for} – {m.goals_against}</td>
                      <td><span className={`result ${m.result}`}>{m.result}</span></td>
                      <td className="num" style={{ fontWeight: 700 }}>{r.rating != null ? Number(r.rating).toFixed(1) : '—'}</td>
                      <td className="num">{r.goals || ''}</td>
                      <td className="num">{r.assists || ''}</td>
                      <td>{r.potm ? <span className="badge gold">★</span> : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
