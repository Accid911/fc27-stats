import { matchResult } from '@/lib/data';

export default function MatchList({ matches }) {
  if (!matches.length) return <p className="muted" style={{ padding: 20, margin: 0 }}>No matches logged yet.</p>;
  const sorted = [...matches].sort((a, b) => String(b.played_on || '').localeCompare(String(a.played_on || '')));
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Competition</th><th>Opponent</th><th>H/A</th><th className="num">Score</th><th></th><th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => {
            const r = matchResult(m);
            return (
              <tr key={m.id}>
                <td className="muted">{m.played_on || '—'}</td>
                <td>{m.competition || '—'}</td>
                <td style={{ fontWeight: 600 }}>{m.opponent}</td>
                <td className="muted">{m.venue}</td>
                <td className="num" style={{ fontWeight: 700 }}>{m.goals_for} – {m.goals_against}</td>
                <td><span className={`result ${r}`}>{r}</span></td>
                <td className="link">{m.video_url ? <a href={m.video_url} target="_blank" rel="noreferrer">Watch</a> : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
