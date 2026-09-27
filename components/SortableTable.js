'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

/**
 * columns: [{ key, label, num?: bool, decimals?: number, href?: string (row field holding a URL) }]
 * rows: plain objects
 */
export default function SortableTable({ columns, rows, defaultSort, defaultDir = 'desc', rank = false }) {
  const [sort, setSort] = useState(defaultSort);
  const [dir, setDir] = useState(defaultDir);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const out = [...rows].sort((a, b) => {
      const x = a[sort];
      const y = b[sort];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return dir === 'asc' ? c : -c;
    });
    return out;
  }, [rows, sort, dir]);

  function toggle(key, num) {
    if (sort === key) setDir(dir === 'asc' ? 'desc' : 'asc');
    else {
      setSort(key);
      setDir(num ? 'desc' : 'asc');
    }
  }

  if (!rows.length) return <p className="muted" style={{ padding: 20, margin: 0 }}>Nothing here yet.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {rank && <th className="num">#</th>}
            {columns.map((c) => (
              <th
                key={c.key}
                className={`sortable ${c.num ? 'num' : ''} ${sort === c.key ? 'sorted' : ''}`}
                onClick={() => toggle(c.key, c.num)}
              >
                {c.label}
                {sort === c.key ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.id ?? i}>
              {rank && <td className="num muted">{i + 1}</td>}
              {columns.map((c) => {
                const v = r[c.key];
                const content = v == null || v === '' ? '—' : c.decimals != null && typeof v === 'number' ? v.toFixed(c.decimals) : v;
                return (
                  <td key={c.key} className={c.num ? 'num' : ''}>
                    {c.href && r[c.href] ? <Link href={r[c.href]}>{content}</Link> : content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
