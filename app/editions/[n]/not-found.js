import Link from 'next/link';

// Inside the edition's header/footer (the layout already provides them).
export default function NotFound() {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 48 }}>
      <h1>Offside</h1>
      <p className="muted">That page doesn’t exist in this edition.</p>
      <Link className="btn" href="/editions">All editions</Link>
    </div>
  );
}
