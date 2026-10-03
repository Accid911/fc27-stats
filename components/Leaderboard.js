import Link from 'next/link';

export default function Leaderboard({ title, rows, valueKey, sub, format = (v) => v, empty = 'No data yet.', base = '' }) {
  return (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      {rows.length === 0 && <p className="muted">{empty}</p>}
      {rows.map((r, i) => (
        <div className="leader" key={r.id}>
          <span className="rank">{i + 1}</span>
          <span className="name">
            <Link href={`${base}/players/${r.id}`}>{r.name}</Link>
            {sub && <span className="muted" style={{ display: 'block', fontSize: 12, fontWeight: 400 }}>{sub(r)}</span>}
          </span>
          <span className="badge">{r.position || '—'}</span>
          <span className="val">{format(r[valueKey])}</span>
        </div>
      ))}
    </div>
  );
}
