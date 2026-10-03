import { notFound } from 'next/navigation';
import Link from 'next/link';
import { buildModel, teamRecord, leagueTable, playerStats, ordinal, seasonLabel, formatMoney, MOVE_LABEL, seasonHonours } from '@/lib/data';
import SortableTable from '@/components/SortableTable';
import MatchTable from '@/components/MatchTable';
import DemoNotice from '@/components/DemoNotice';

export function metaFor(data, id) {
  try {
    const model = buildModel(data);
    const s = model.seasonById[id];
    if (!s) return { title: 'Season not found' };
    const club = leagueTable(model, id).club;
    const r = teamRecord(model.matches.filter((m) => m.season_id === id));
    const title = `${seasonLabel(s)} – ${s.tournament}${club ? `, ${ordinal(club.pos)} place` : ''}`;
    const honours = seasonHonours(model, s).map((h) => h.name);
    const description = `${model.clubName} in ${s.tournament}: W${r.W} D${r.D} L${r.L}, ${r.GF} goals scored.${honours.length ? ` Trophies: ${honours.join(', ')}.` : ''}`;
    return { title, description, openGraph: { title, description }, twitter: { title, description } };
  } catch {
    return { title: 'Season' };
  }
}

export default function SeasonView({ data, id, base = '', edition = null }) {
  const model = buildModel(data);
  const season = model.seasonById[id];
  if (!season) notFound();

  const matches = model.matches.filter((m) => m.season_id === id);
  const r = teamRecord(matches);
  const table = leagueTable(model, id);
  const trophies = seasonHonours(model, season);
  const rows = playerStats(model, matches)
    .filter((p) => p.apps > 0)
    .map((p) => ({ ...p, href: `${base}/players/${p.id}`, joined: undefined }));
  const intake = data.players
    .filter((p) => model.joinedById[p.id]?.season.id === id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const tournaments = [...new Set([season.tournament, ...(season.cups || []), ...matches.map((m) => m.tournament || '—')])];
  const moves = model.moves.filter((mv) => mv.season_id === id).reverse();

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
      {season.cups?.length > 0 && (
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <span className="muted" style={{ fontSize: 14 }}>Cups:</span>
          {season.cups.map((c) => {
            const res = season.cup_results?.[c];
            return (
              <span key={c} className={`badge ${res === 'Winner' ? 'gold' : ''}`}>
                {c}{res ? ` · ${res === 'Winner' ? '🏆 Winner' : res}` : ''}
              </span>
            );
          })}
        </div>
      )}
      {season.notes && <p className="muted" style={{ marginTop: 14 }}>{season.notes}</p>}

      <section className="section grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)', alignItems: 'start' }}>
        <div>
          <h2>{season.tournament} table</h2>
          <div className="card pad-0">
            {table.rows.length === 0 ? (
              <p className="muted" style={{ padding: 20, margin: 0 }}>No table entered yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="num">#</th><th>Team</th>
                      <th className="num">P</th><th className="num">W</th><th className="num">D</th><th className="num">L</th>
                      <th className="num">GF</th><th className="num">GA</th><th className="num">GD</th><th className="num">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((t) => (
                      <tr key={t.id} className={t.club ? 'is-club' : ''}>
                        <td className="num muted">{t.pos}</td>
                        <td style={{ fontWeight: t.club ? 700 : 500 }}>{t.team}</td>
                        <td className="num muted">{t.played ?? '—'}</td>
                        <td className="num">{t.won ?? '—'}</td>
                        <td className="num">{t.drawn ?? '—'}</td>
                        <td className="num">{t.lost ?? '—'}</td>
                        <td className="num">{t.gf ?? '—'}</td>
                        <td className="num">{t.ga ?? '—'}</td>
                        <td className="num">{t.gd == null ? '—' : t.gd > 0 ? `+${t.gd}` : t.gd}</td>
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
              { key: 'cs', label: 'CS', num: true },
              { key: 'avg_rating', label: 'Avg', num: true, decimals: 1 },
              { key: 'best_rating', label: 'Best', num: true, decimals: 1 },
            ]}
          />
        </div>
      </section>

      {intake.length > 0 && (
        <section className="section">
          <h2>Academy intake</h2>
          <p className="muted" style={{ marginTop: -6 }}>Youngsters who joined the first team this season.</p>
          <div className="chips">
            {intake.map((p) => (
              <Link key={p.id} href={`${base}/players/${p.id}`} className="chip">
                <span className="chip-pos">{p.position}</span> {p.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {moves.length > 0 && (
        <section className="section">
          <h2>Transfers &amp; loans</h2>
          <div className="card pad-0">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Player</th><th>What</th><th>Club</th><th className="num">Fee</th></tr></thead>
                <tbody>
                  {moves.map((mv) => (
                    <tr key={mv.id}>
                      <td><Link href={`${base}/players/${mv.player_id}`}>{mv.player.name}</Link></td>
                      <td>{MOVE_LABEL[mv.type]}</td>
                      <td>{mv.club || '—'}</td>
                      <td className="num">{mv.fee != null ? formatMoney(mv.fee, model.currency) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <h2>Matches</h2>
        <div className="card pad-0">
          <MatchTable base={base} matches={[...matches].reverse()} playerById={model.playerById} clubName={model.clubName} />
        </div>
      </section>
    </>
  );
}
