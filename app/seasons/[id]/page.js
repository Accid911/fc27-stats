import { notFound } from 'next/navigation';
import { loadAll, buildModel, teamRecord, leagueTable, playerStats, ordinal, seasonLabel } from '@/lib/data';
import SortableTable from '@/components/SortableTable';
import MatchTable from '@/components/MatchTable';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';

export default async function SeasonPage({ params }) {
  const { id } = await params;
  const data = await loadAll();
  const model = buildModel(data);
  const season = model.seasonById[id];
  if (!season) notFound();

  const matches = model.matches.filter((m) => m.season_id === id);
  const r = teamRecord(matches);
  const table = leagueTable(model, id);
  const trophies = data.trophies.filter((t) => t.season_id === id);
  const rows = playerStats(model, matches)
    .filter((p) => p.apps > 0)
    .map((p) => ({ ...p, href: `/players/${p.id}` }));

  const tournaments = [...new Set(matches.map((m) => m.tournament || '—'))];

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">{season.tournament}</div>
      <h1>{seasonLabel(season)}</h1>
      <div className="row" style={{ marginTop: 12 }}>
        {table.club && <span className="badge blue">{ordinal(table.club.pos)} · {table.club.points} pts</span>}
        <span className="badge">P{r.P} · W{r.W} D{r.D} L{r.L}</span>
        <span className="badge">GF {r.GF} · GA {r.GA}</span>
        <span className="badge">{r.CS} clean sheets</span>
        {trophies.map((t) => <span key={t.id} className="badge gold">🏆 {t.name}</span>)}
      </div>
      {season.notes && <p className="muted" style={{ marginTop: 14 }}>{season.notes}</p>}

      <section className="section grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <div>
          <h2>{season.tournament} table</h2>
          <div className="card pad-0">
            {table.rows.length === 0 ? (
              <p className="muted" style={{ padding: 20, margin: 0 }}>No table entered yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th className="num">#</th><th>Team</th><th className="num">Pts</th></tr></thead>
                  <tbody>
                    {table.rows.map((t) => (
                      <tr key={t.id} className={t.club ? 'is-club' : ''}>
                        <td className="num muted">{t.pos}</td>
                        <td style={{ fontWeight: t.club ? 700 : 500 }}>{t.team}</td>
                        <td className="num" style={{ fontWeight: 700 }}>{t.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2>By tournament</h2>
          <div className="card pad-0">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Tournament</th><th className="num">P</th><th>W-D-L</th><th className="num">GF</th><th className="num">GA</th></tr></thead>
                <tbody>
                  {tournaments.length === 0 && <tr><td colSpan={5} className="muted">No matches yet.</td></tr>}
                  {tournaments.map((t) => {
                    const x = teamRecord(matches.filter((m) => (m.tournament || '—') === t));
                    return (
                      <tr key={t}>
                        <td style={{ fontWeight: 600 }}>{t}</td>
                        <td className="num">{x.P}</td>
                        <td>{x.W}-{x.D}-{x.L}</td>
                        <td className="num">{x.GF}</td>
                        <td className="num">{x.GA}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Player stats</h2>
        <div className="card pad-0">
          <SortableTable
            rows={rows}
            defaultSort="goals"
            columns={[
              { key: 'name', label: 'Player', href: 'href' },
              { key: 'position', label: 'Pos' },
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
        <h2>Matches</h2>
        <div className="card pad-0">
          <MatchTable matches={[...matches].reverse()} playerById={model.playerById} />
        </div>
      </section>
    </>
  );
}
