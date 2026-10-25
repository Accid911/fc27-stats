'use client';

import { useEffect, useRef, useState } from 'react';

// Overall rating over time, oldest first.
// points: [{ id, ovr, season (number|null), label ('Signed', 'Start', 'Mid', 'End'), episode }]
export default function OverallChart({ points }) {
  const box = useRef(null);
  const [W, setW] = useState(900);
  const [active, setActive] = useState(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (points.length < 2) return null;

  const H = W < 600 ? 200 : 230;
  const pad = { l: 34, r: 18, t: 34, b: 26 };
  const vals = points.map((p) => p.ovr);
  const lo = Math.max(1, Math.floor((Math.min(...vals) - 3) / 5) * 5);
  const hi = Math.min(99, Math.ceil((Math.max(...vals) + 3) / 5) * 5);
  const n = points.length;
  const x = (i) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - pad.t - pad.b);
  const ticks = [];
  for (let t = lo; t <= hi; t += hi - lo > 20 ? 10 : 5) ticks.push(t);
  const path = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${path} L${x(n - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  const seasonStarts = points
    .map((p, i) => (i === 0 || p.season !== points[i - 1].season ? { i, season: p.season } : null))
    .filter(Boolean);
  const roomy = (W - pad.l - pad.r) / Math.max(1, n - 1) >= 34; // room for a label under every dot
  const showValues = (W - pad.l - pad.r) / Math.max(1, n - 1) >= 22;

  return (
    <div className="rating-chart ovr-chart" ref={box} onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Overall rating over time">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="tick">{t}</text>
          </g>
        ))}
        {seasonStarts.map((s) => {
          const sx = s.i > 0 ? (x(s.i - 1) + x(s.i)) / 2 : pad.l;
          return (
            <g key={`${s.season}-${s.i}`}>
              {s.i > 0 && <line x1={sx} x2={sx} y1={pad.t - 22} y2={H - pad.b} className="season-line" />}
              {s.season != null && <text x={sx + 5} y={pad.t - 18} className="season-label">S{s.season}</text>}
            </g>
          );
        })}
        <path d={area} className="ovr-area" />
        <path d={path} className="line" />
        {points.map((p, i) => (
          <g key={p.id} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)}>
            <circle cx={x(i)} cy={y(p.ovr)} r={active === i ? 6 : 4.5} className="dot ovr-dot" />
            {(showValues || active === i) && (
              <text x={x(i)} y={y(p.ovr) - 10} textAnchor="middle" className="ovr-val">{p.ovr}</text>
            )}
            {roomy && (
              <text x={x(i)} y={H - pad.b + 16} textAnchor="middle" className="tick">{p.label}</text>
            )}
            <rect x={x(i) - 14} y={pad.t - 10} width={28} height={H - pad.t - pad.b + 10} fill="transparent" />
          </g>
        ))}
      </svg>
      {active != null && (
        <div className="muted ovr-active">
          <b style={{ color: 'var(--text)' }}>{points[active].ovr}</b> · {points[active].season != null ? `Season ${points[active].season}` : 'No season'} · {points[active].long}
          {points[active].episode ? ` · episode ${points[active].episode}` : ''}
        </div>
      )}
    </div>
  );
}
