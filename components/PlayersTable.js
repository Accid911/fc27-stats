'use client';

import { useState } from 'react';
import SortableTable from './SortableTable';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'squad', label: 'In squad' },
  { key: 'sold', label: 'Transferred' },
  { key: 'loan', label: 'On loan' },
  { key: 'released', label: 'Released' },
];

// Players table with a status filter (rows carry statusKey: squad | sold | loan | released).
export default function PlayersTable({ rows, columns, defaultSort }) {
  const [filter, setFilter] = useState('all');
  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.statusKey === k).length);
  // "Released" only shows up once somebody has actually been released.
  const filters = FILTERS.filter((f) => f.key !== 'released' || count('released') > 0);
  const shown = filter === 'all' ? rows : rows.filter((r) => r.statusKey === filter);

  return (
    <>
      <div className="chips" role="group" aria-label="Filter players" style={{ marginBottom: 14 }}>
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`chip ${filter === f.key ? 'on' : ''}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <span className="muted">({count(f.key)})</span>
          </button>
        ))}
      </div>
      <div className="card pad-0">
        {shown.length ? (
          <SortableTable rows={shown} columns={columns} defaultSort={defaultSort} rank />
        ) : (
          <p className="muted" style={{ padding: 20, margin: 0 }}>No players here.</p>
        )}
      </div>
    </>
  );
}
