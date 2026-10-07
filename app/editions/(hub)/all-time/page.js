import Link from 'next/link';
import { loadArchive } from '@/lib/server-data';
import { buildModel, teamRecord, playerStats, topBy, allHonours, leagueTable, ordinal, seasonLabel } from '@/lib/data';
import { editionPath } from '@/lib/editions';
import ClubBadge from '@/components/ClubBadge';
import ArchiveLocked from '@/components/ArchiveLocked';
import DemoNotice from '@/components/DemoNotice';
import { Kpi } from '@/components/StatCards';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'All-time stats' };

export default async function AllTimePage() {
  const { editions, isAdmin, demo } = await loadArchive();
  const anyOldPublic = editions.some(({ edition }) => edition.is_public && !edition.is_current);
  if (!isAdmin && !anyOldPublic) return <ArchiveLocked />;

  // Per edition
  const rows = editions.map(({ edition, data }) => {
    const model = buildModel(data);
    const stats = playerStats(model).map((p) => ({ ...p, edition, href: `${editionPath(edition)}/players/${p.id}` }));
    const honours = allHonours(model).map((h) => ({ ...h, edition }));
    const rec = teamRecord(model.matches);
    // best single-season goal tally and league finishes
    const seasonBests = model.seasons.map((s) => {
      const st = playerStats(model, model.matches.filter((m) => m.season_id === s.id));
      const best = topBy(st, 'goals', 1)[0];
      const club = leagueTable(model, s.id).club;
      return { season: s, best, club };
    });
    return { edition, model, stats, honours, rec, seasonBests };
  });

  const all = rows.flatMap((r) => r.stats).filter((p) => p.apps > 0);
  const total = rows.reduce(
    (a, r) => ({ seasons: a.seasons + r.model.seasons.length, P: a.P + r.rec.P, W: a.W + r.rec.W, GF: a.GF + r.rec.GF, trophies: a.trophies + r.honours.length }),
    { seasons: 0, P: 0, W: 0, GF: 0, trophies: 0 }
  );
  const leaders = (key, n = 10, filter = () => true) => topBy(all, key, n, filter);
  const bestSeasons = rows
    .flatMap((r) => r.seasonBests.filter((x) => x.best).map((x) => ({ ...x, edition: r.edition })))
    .sort((a, b) => b.best.goals - a.best.goals)
    .slice(0, 10);
  const minApps = 20;

  const Board = ({ title, rows: list, valueKey, fmt = (v) => v, empty = 'No data yet.' }) => (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      {list.length === 0 && <p className="muted">{empty}</p>}
      {list.map((p, i) => (
        <div className="leader" key={`${p.edition.id}-${p.id}`}>
          <span className="rank">{i + 1}</span>
          <span className="name">
            <Link href={p.href}>{p.name}</Link>
            <span className="muted" style={{ display: 'block', fontSize: 12, fontWeight: 400 }}>
              {p.edition.club} · {p.edition.game}
            </span>
          </span>
          <span className="val">{fmt(p[valueKey])}</span>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <DemoNotice demo={demo} />
      <div className="eyebrow">SparringDK · The Youth Edition</div>
      <h1 style={{ marginBottom: 8 }}>All-time stats</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Every edition together. <Link className="link" href="/editions">← Back to the archive</Link>
      </p>

      <section className="grid grid-kpi">
        <Kpi value={rows.length} label="Editions" />
        <Kpi value={total.seasons} label="Seasons" />
        <Kpi value={total.P} label="Matches" />
        <Kpi value={total.P ? `${Math.round((total.W / total.P) * 100)}%` : '—'} label="Win rate" />
        <Kpi value={total.GF} label="Goals scored" />
        <Kpi value={all.length} label="Academy players used" />
        <Kpi value={total.trophies} label="Trophies" gold />
      </section>

      <section className="section">
        <h2>Edition by edition</h2>
        <div className="card pad-0">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Club</th><th>Game</th><th className="num">Seasons</th><th className="num">P</th><th>W-D-L</th>
                  <th className="num">GF</th><th className="num">🏆</th><th>Top scorer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ edition, model, rec, honours, stats }) => {
                  const top = topBy(stats, 'goals', 1)[0];
                  return (
                    <tr key={edition.id}>
                      <td className="muted">{edition.number}</td>
                      <td>
                        <Link href={editionPath(edition)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <ClubBadge edition={edition} size={24} /> {edition.club}
                        </Link>
                        {isAdmin && !edition.is_public && <span className="muted" style={{ fontSize: 12 }}> 🔒</span>}
                      </td>
                      <td className="muted">{edition.game}</td>
                      <td className="num">{model.seasons.length}</td>
                      <td className="num">{rec.P}</td>
                      <td>{rec.P ? `${rec.W}-${rec.D}-${rec.L}` : '—'}</td>
                      <td className="num">{rec.GF}</td>
                      <td className="num">{honours.length}</td>
                      <td>{top ? `${top.name} (${top.goals})` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>All-time leaders</h2>
        <div className="grid grid-2">
          <Board title="Top scorers" rows={leaders('goals')} valueKey="goals" />
          <Board title="Most assists" rows={leaders('assists')} valueKey="assists" />
          <Board title="Most appearances" rows={leaders('apps')} valueKey="apps" />
          <Board title="Player of the Match awards" rows={leaders('potm')} valueKey="potm" />
          <Board title="Clean sheets (GK & defenders)" rows={leaders('cs')} valueKey="cs" />
          <Board
            title="Best average rating"
            rows={leaders('avg_rating', 10, (p) => p.rated >= minApps)}
            valueKey="avg_rating"
            fmt={(v) => v.toFixed(1)}
            empty={`Needs ${minApps}+ rated games.`}
          />
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Best scoring seasons</h3>
          {bestSeasons.length === 0 && <p className="muted">No data yet.</p>}
          {bestSeasons.map(({ edition, season, best }, i) => (
            <div className="leader" key={`${edition.id}-${season.id}`}>
              <span className="rank">{i + 1}</span>
              <span className="name">
                <Link href={`${editionPath(edition)}/players/${best.id}`}>{best.name}</Link>
                <span className="muted" style={{ display: 'block', fontSize: 12, fontWeight: 400 }}>
                  {edition.club} · {seasonLabel(season)} · {season.tournament}
                </span>
              </span>
              <span className="val">{best.goals}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Trophy cabinet</h3>
          {total.trophies === 0 && <p className="muted">No silverware yet.</p>}
          {[...rows].reverse().flatMap(({ edition, honours }) =>
            [...honours].reverse().map((h) => (
              <div className="leader" key={`${edition.id}-${h.id}`}>
                <span className="rank">🏆</span>
                <span className="name">
                  {h.name}
                  <span className="muted" style={{ display: 'block', fontSize: 12, fontWeight: 400 }}>{edition.club} · {edition.game}</span>
                </span>
                <Link className="badge gold" href={`${editionPath(edition)}/seasons/${h.season.id}`}>{seasonLabel(h.season)}</Link>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="section">
        <h2>League finishes</h2>
        <div className="card pad-0">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Edition</th><th>Season</th><th>League</th><th>Finish</th><th className="num">Pts</th></tr></thead>
              <tbody>
                {rows.flatMap(({ edition, seasonBests }) =>
                  seasonBests.map(({ season, club }) => (
                    <tr key={`${edition.id}-${season.id}`}>
                      <td className="muted">#{edition.number} {edition.club}</td>
                      <td><Link href={`${editionPath(edition)}/seasons/${season.id}`}>{seasonLabel(season)}</Link></td>
                      <td>{season.tournament}</td>
                      <td>{club ? ordinal(club.pos) : '—'}</td>
                      <td className="num">{club ? club.points : '—'}</td>
                    </tr>
                  ))
                )}
                {total.seasons === 0 && <tr><td colSpan={5} className="muted">No seasons yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
