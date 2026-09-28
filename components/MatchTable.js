import Fixture from './Fixture';

// Matches with result, scorers and POTM. `matches` come from buildModel (have lineup + result).
export default function MatchTable({ matches, playerById, clubName, showSeason = false }) {
  if (!matches.length) return <p className="muted" style={{ padding: 20, margin: 0 }}>No matches logged yet.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {showSeason && <th>Season</th>}
            <th>Tournament</th>
            <th>Match</th>
            <th></th>
            <th>Scorers</th>
            <th>POTM</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const scorers = m.lineup
              .filter((r) => r.goals > 0)
              .map((r) => `${playerById[r.player_id]?.name?.split(' ').slice(-1)[0]}${r.goals > 1 ? ` ×${r.goals}` : ''}`);
            const potm = m.lineup.find((r) => r.potm);
            return (
              <tr key={m.id}>
                {showSeason && <td className="muted">S{m.season.number}</td>}
                <td className="muted">{m.tournament || '—'}</td>
                <td><Fixture m={m} clubName={clubName} href={`/matches/${m.id}`} /></td>
                <td><span className={`result ${m.result}`}>{m.result}</span></td>
                <td className="scorers">{scorers.join(', ') || '—'}</td>
                <td>{potm ? <span className="badge gold">★ {playerById[potm.player_id]?.name}</span> : <span className="muted">—</span>}</td>
                <td>
                  {m.video_url && (
                    <a className="watch" href={m.video_url} target="_blank" rel="noreferrer" title="Watch this episode on YouTube">▶</a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
