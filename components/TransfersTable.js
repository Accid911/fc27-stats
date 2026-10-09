'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

// Transfers & loans history; click a column name to sort (click again to reverse).
// rows: [{ id, order, seasonNo, season, seasonHref, date, player, playerHref, pos, posOrder, what, badge, club, fee, feeText, now }]
const COLUMNS = [
  { key: 'season', label: 'Season', sortKey: 'seasonNo', num: true },
  { key: 'date', label: 'Date', sortKey: 'date' },
  { key: 'player', label: 'Player', sortKey: 'player' },
  { key: 'pos', label: 'Pos', sortKey: 'posOrder', num: true },
  { key: 'what', label: 'What', sortKey: 'what' },
  { key: 'club', label: 'Club', sortKey: 'club' },
  { key: 'fee', label: 'Fee', sortKey: 'fee', num: true, right: true },
  { key: 'now', label: 'Now', sortKey: 'now' },
];

const empty = (v) => v == null || v === '';

export default function TransfersTable({ rows }) {
  const [sort, setSort] = useState(null); // null = newest first (default)
  const [dir, setDir] = useState('desc');

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sort);
    if (!col) return [...rows].sort((a, b) => b.order - a.order);
    const k = col.sortKey;
    return [...rows].sort((a, b) => {
      const x = a[k];
      const y = b[k];
      // empty values always at the bottom
      if (empty(x) && empty(y)) return b.order - a.order;
      if (empty(x)) return 1;
      if (empty(y)) return -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return dir === 'asc' ? c || a.order - b.order : -c || b.order - a.order;
    });
  }, [rows, sort, dir]);

  function toggle(col) {
    if (sort === col.key) setDir(dir === 'asc' ? 'desc' : 'asc');
    else {
      setSort(col.key);
      // numbers and dates: biggest/newest first; text: A→Z
      setDir(col.num || col.key === 'date' ? 'desc' : 'asc');
    }
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className={`sortable ${c.right ? 'num' : ''} ${sort === c.key ? 'sorted' : ''}`}
                onClick={() => toggle(c)}
                aria-sort={sort === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {c.label}
                {sort === c.key ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>
              <td>{r.seasonHref ? <Link href={r.seasonHref}>{r.season}</Link> : r.season || '—'}</td>
              <td className="muted">{r.date || '—'}</td>
              <td><Link href={r.playerHref}>{r.player}</Link></td>
              <td className="muted">{r.pos || '—'}</td>
              <td><span className={`badge ${r.badge}`}>{r.what}</span></td>
              <td>{r.club || '—'}</td>
              <td className="num" style={{ fontWeight: 700 }}>{r.feeText}</td>
              <td className="muted">{r.now}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
