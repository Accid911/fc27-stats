'use client';

import Link from 'next/link';
import { CREATOR } from '@/lib/site';

// Shown when the stats can't be loaded (database down, settings missing…) — never fake data.
export default function Error({ reset }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 48, maxWidth: 620, margin: '40px auto' }}>
      <div className="eyebrow">Half-time break</div>
      <h1 style={{ fontSize: 40 }}>Stats temporarily unavailable</h1>
      <p className="muted" style={{ fontSize: 16 }}>
        We couldn’t load the career stats right now. Please try again in a minute.
      </p>
      <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
        <button className="btn" onClick={() => reset()}>Try again</button>
        <a className="btn yt" href={CREATOR.channel} target="_blank" rel="noreferrer">▶ Watch on YouTube</a>
        <Link className="btn secondary" href="/about">About</Link>
      </div>
    </div>
  );
}
