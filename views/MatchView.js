import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildModel, seasonLabel, fixture, fixtureText } from '@/lib/data';
import { positionOrder } from '@/lib/constants';
import DemoNotice from '@/components/DemoNotice';

export function metaFor(data, id) {
  try {
    const model = buildModel(data);
    const m = model.matches.find((x) => x.id === id);
    if (!m) return { title: 'Match not found' };
    const title = fixtureText(m, model.clubName);
    const scorers = m.lineup.filter((r) => r.goals > 0).map((r) => model.playerById[r.player_id]?.name).filter(Boolean);
    const potm = m.lineup.find((r) => r.potm);
    const description = [
      `${seasonLabel(m.season)} · ${m.tournament || 'Match'}`,
      scorers.length ? `Goals: ${scorers.join(', ')}` : null,
      potm ? `Player of the Match: ${model.playerById[potm.player_id]?.name}` : null,
    ].filter(Boolean).join(' · ');
    return { title, description, openGraph: { title, description }, twitter: { title, description } };
  } catch {
    return { title: 'Match' };
  }
}

const RESULT = { W: 'Win', D: 'Draw', L: 'Defeat' };
const VENUE = { H: 'Home', A: 'Away', N: 'Neutral' };

export default function MatchView({ data, id, base = '', edition = null }) {
  const model = buildModel(data);
  const m = model.matches.find((x) => x.id === id);
  if (!m) notFound();

  const lineup = [...m.lineup].sort((a, b) => {
    const pa = model.playerById[a.player_id];
    const pb = model.playerById[b.player_id];
    return positionOrder(pa.position) - positionOrder(pb.position) || pa.name.localeCompare(pb.name);
  });
  const f = fixture(m, model.clubName);
  const potm = m.lineup.find((r) => r.potm);
  const rated = m.lineup.filter((r) => r.rating != null);
  const teamAvg = rated.length ? (rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length).toFixed(1) : null;

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">
        <Link href={`${base}/seasons/${m.season_id}`}>{seasonLabel(m.season)}</Link> · {m.tournament || 'Match'}
        {m.venue ? ` · ${VENUE[m.venue]}` : ''}
        {m.played_on ? ` · ${m.played_on}` : ''}
      </div>

      <div className="card hero" style={{ textAlign: 'center' }}>
        <div className="scoreline" style={{ margin: 0 }}>
          <span className="team" style={{ fontSize: 'clamp(18px, 4vw, 30px)', color: f.home.club ? 'var(--text)' : 'var(--muted)' }}>{f.home.name}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 9vw, 72px)', fontWeight: 800 }}>
            {f.home.goals} – {f.away.goals}
          </span>
          <span className="team" style={{ fontSize: 'clamp(18px, 4vw, 30px)', textAlign: 'left', color: f.away.club ? 'var(--text)' : 'var(--muted)' }}>{f.away.name}</span>
        </div>
        {f.pens && (
          <div className="muted" style={{ fontSize: 16, marginTop: 4 }}>
            Penalties: <b style={{ color: 'var(--text)' }}>{f.home.pens} – {f.away.pens}</b>
          </div>
        )}
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          <span className={`result lg ${m.result}`}>{m.result}</span>
          <span className="muted">{RESULT[m.result]}{f.pens ? ' on penalties' : ''}</span>
          {potm && <span className="badge gold">★ POTM: {model.playerById[potm.player_id].name}</span>}
          {teamAvg && <span className="badge">Team rating {teamAvg}</span>}
        </div>
        {m.video_url && (
          <div style={{ marginTop: 16 }}>
            <a className="btn" href={m.video_url} target="_blank" rel="noreferrer">▶ Watch this match</a>
          </div>
        )}
      </div>

      {m.notes && <p className="muted" style={{ marginTop: 16 }}>{m.notes}</p>}

      <section className="section">
        <h2>Players</h2>
        <div className="card pad-0">
          {lineup.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>No line-up entered for this match.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Pos</th><th>Player</th><th className="num">Rating</th><th className="num">Goals</th><th className="num">Assists</th><th></th></tr>
                </thead>
                <tbody>
                  {lineup.map((r) => {
                    const p = model.playerById[r.player_id];
                    return (
                      <tr key={r.player_id} className={r.potm ? 'is-potm' : ''}>
                        <td className="muted">{p.position}</td>
                        <td><Link href={`${base}/players/${p.id}`}>{p.name}</Link></td>
                        <td className="num" style={{ fontWeight: 700 }}>{r.rating != null ? Number(r.rating).toFixed(1) : '—'}</td>
                        <td className="num">{r.goals ? '⚽'.repeat(Math.min(r.goals, 5)) + (r.goals > 5 ? ` ${r.goals}` : '') : ''}</td>
                        <td className="num">{r.assists || ''}</td>
                        <td>{r.potm ? <span className="badge gold">★ POTM</span> : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
