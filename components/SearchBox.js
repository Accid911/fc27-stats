'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

// "Álvarez" matches "alvarez", case doesn't matter.
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function Results({ title, rows, q }) {
  if (!rows.length) return null;
  return (
    <section className="section" style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: 22 }}>{title} <span className="muted" style={{ fontSize: 16 }}>({rows.length})</span></h2>
      <div className="card pad-0">
        <ul className="search-results">
          {rows.slice(0, 50).map((r) => (
            <li key={r.key}>
              <Link href={r.href}>
                <span className="sr-main">
                  {r.kit != null && <span className="kit-no">{r.kit}</span>}
                  <b>{r.name}</b>
                  <span className="muted"> · {r.sub}</span>
                </span>
                <span className="sr-side">
                  <span className="muted">{r.stats}</span>
                  {!r.current && <span className="badge">{r.edition}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {rows.length > 50 && <p className="muted" style={{ fontSize: 13 }}>Showing the first 50 — type more to narrow it down.</p>}
    </section>
  );
}

export default function SearchBox({ index, initial = '' }) {
  const [q, setQ] = useState(initial);
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);
  // keep ?q= in the address bar so a search can be shared
  useEffect(() => {
    const url = new URL(window.location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  }, [q]);

  const { players, opponents } = useMemo(() => {
    const n = norm(q);
    if (n.length < 2) return { players: [], opponents: [] };
    const hit = (r) => norm(r.name).includes(n) || (r.kit != null && String(r.kit) === n.replace('#', ''));
    const rank = (a, b) => Number(norm(b.name).startsWith(n)) - Number(norm(a.name).startsWith(n)) || Number(b.current) - Number(a.current) || a.name.localeCompare(b.name);
    return { players: index.players.filter(hit).sort(rank), opponents: index.opponents.filter(hit).sort(rank) };
  }, [q, index]);

  const tooShort = norm(q).length < 2;
  return (
    <>
      <input
        ref={ref}
        type="search"
        className="search-input"
        value={q}
        onChange={(e) => setQ(e.target.value.slice(0, 60))}
        placeholder="Type a player or club name, or a kit number like #7"
        aria-label="Search players and opponents"
      />
      {tooShort ? (
        <p className="muted" style={{ marginTop: 14 }}>
          {index.players.length} players and {index.opponents.length} opponents to search.
        </p>
      ) : players.length + opponents.length === 0 ? (
        <p className="muted" style={{ marginTop: 14 }}>Nothing found for “{q}”.</p>
      ) : null}
      <Results title="Players" rows={players} q={q} />
      <Results title="Opponents" rows={opponents} q={q} />
    </>
  );
}
