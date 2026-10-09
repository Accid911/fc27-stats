'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// Match rating of one player in every match he got a rating, oldest first.
// points: [{ id, rating, result: 'W'|'D'|'L', label, sub, href, season }]
export default function RatingChart({ points, span = 5 }) {
  const [active, setActive] = useState(null);
  // draw at the real width (1 unit = 1 pixel) so it stays readable on phones
  const box = useRef(null);
  const [W, setW] = useState(900);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (points.length < 2) return null;

  const H = W < 600 ? 220 : 260;
  const pad = { l: 34, r: 14, t: 26, b: 22 };
  const vals = points.map((p) => p.rating);
  const lo = Math.max(0, Math.floor(Math.min(...vals) - 0.5));
  const hi = Math.min(10, Math.ceil(Math.max(...vals) + 0.3));
  const n = points.length;
  const x = (i) => pad.l + (n === 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v) => pad.t + (1 - (v - lo) / Math.max(0.5, hi - lo)) * (H - pad.t - pad.b);
  const ticks = [];
  for (let t = lo; t <= hi; t += hi - lo > 4 ? 2 : 1) ticks.push(t);

  // average of the last `window` matches (form line)
  const avg = points.map((_, i) => {
    const slice = vals.slice(Math.max(0, i - span + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
  const line = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  // where a new season starts
  const seasonStarts = points
    .map((p, i) => (i === 0 || p.season !== points[i - 1].season ? { i, season: p.season } : null))
    .filter(Boolean);

  const r = Math.max(2.5, Math.min(5, ((W - 48) / n) * 0.35));
  const a = active != null ? points[active] : null;
  const leftPct = active != null ? (x(active) / W) * 100 : 0;

  return (
    <div className="rating-chart" ref={box} onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Match rating in every match">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="tick">{t}</text>
          </g>
        ))}
        {seasonStarts.map((s) => (
          <g key={s.season}>
            {s.i > 0 && <line x1={(x(s.i - 1) + x(s.i)) / 2} x2={(x(s.i - 1) + x(s.i)) / 2} y1={pad.t - 14} y2={H - pad.b} className="season-line" />}
            <text x={(s.i > 0 ? (x(s.i - 1) + x(s.i)) / 2 : pad.l) + 5} y={pad.t - 10} className="season-label">S{s.season}</text>
          </g>
        ))}
        <path d={line(vals)} className="line" />
        <path d={line(avg)} className="avg" />
        {points.map((p, i) => (
          <circle
            key={p.id}
            cx={x(i)}
            cy={y(p.rating)}
            r={active === i ? r + 2 : r}
            className={`dot ${p.result}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
          />
        ))}
        {/* wider invisible hit areas so dots are easy to hit on a phone */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.id}`}
            x={x(i) - (W - pad.l - pad.r) / Math.max(1, n - 1) / 2}
            y={pad.t}
            width={(W - pad.l - pad.r) / Math.max(1, n - 1)}
            height={H - pad.t - pad.b}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
          />
        ))}
      </svg>
      {a && (
        <div
          className="rating-tip"
          style={{
            left: `clamp(90px, ${leftPct}%, calc(100% - 90px))`,
            // next to the dot: below it when the dot is high up, above it when it's low
            ...(y(a.rating) < H / 2
              ? { top: y(a.rating) + 14, transform: 'translateX(-50%)' }
              : { top: y(a.rating) - 14, transform: 'translate(-50%, -100%)' }),
          }}
        >
          <b>{a.rating.toFixed(1)}</b> <span className={`result ${a.result}`}>{a.result}</span>
          <div>{a.label}</div>
          {a.sub && <div className="muted">{a.sub}</div>}
          <Link href={a.href} className="link">Match details →</Link>
        </div>
      )}
      <div className="rating-legend">
        <span><i className="lg-dot" /> Rating per match</span>
        <span><i className="lg-avg" /> Average of the last {span} matches</span>
        <span className="muted">Tap or hover a dot for the match</span>
      </div>
    </div>
  );
}
