// Tiny single-series charts in plain HTML/CSS (hover shows a tooltip).

export function BarList({ rows, max, format = (v) => v, tip }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="muted">No data yet.</p>;
  return (
    <div className="bars" role="list">
      {rows.map((r) => (
        <div className="bar-row" role="listitem" key={r.label} data-tip={tip ? tip(r) : `${r.label}: ${format(r.value)}`}>
          <span className="bar-label">{r.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${Math.max(2, (r.value / top) * 85)}%` }} />
            <span className="bar-val" style={{ left: `${Math.max(2, (r.value / top) * 85)}%` }}>{format(r.value)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function ColumnChart({ rows, format = (v) => v, tip }) {
  const top = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="muted">No data yet.</p>;
  return (
    <div className="vbars" role="list">
      {rows.map((r) => (
        <div className="vbar" role="listitem" key={r.label} title={tip ? tip(r) : `${r.label}: ${format(r.value)}`}>
          <span className="v">{format(r.value)}</span>
          <span className="fill" style={{ height: `${(r.value / top) * 100}%` }} />
          <span className="l">{r.label}</span>
        </div>
      ))}
    </div>
  );
}
