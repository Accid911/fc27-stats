import Link from 'next/link';
import DefaultChrome from '@/components/DefaultChrome';

export default function NotFound() {
  return (
    <DefaultChrome>
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <h1>Offside</h1>
        <p className="muted">That page doesn’t exist.</p>
        <Link className="btn" href="/">Back to overview</Link>
      </div>
    </DefaultChrome>
  );
}
