import Link from 'next/link';

// Shown for archive pages that aren't public yet (or don't exist). Never shows any data.
export default function ArchiveLocked() {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 48, maxWidth: 620, margin: '40px auto' }}>
      <div className="eyebrow">Youth Edition archive</div>
      <h1 style={{ fontSize: 40 }}>Coming soon</h1>
      <p className="muted" style={{ fontSize: 16 }}>This part of the site isn’t public yet.</p>
      <p className="muted" style={{ fontSize: 13 }}>Admins: sign in on the <Link className="link" href="/admin">Admin</Link> page first, then come back.</p>
      <Link className="btn" href="/" style={{ marginTop: 10 }}>Back to the current edition</Link>
    </div>
  );
}
