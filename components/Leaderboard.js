import Link from 'next/link';

export default function Leaderboard({ title, rows, valueKey }) {
  return (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      {rows.length === 0 && <p className="muted">No data yet.</p>}
      {rows.map((r, i) => (
        <div className="leader" key={r.id}>
          <span className="rank">{i + 1}</span>
          <Link className="name" href={`/players/${r.id}`}>{r.name}</Link>
          <span className="badge">{r.position || '—'}</span>
          <span className="val">{r[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}
