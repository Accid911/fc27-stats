'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Top-left of the header: the club you're looking at, and a drop-down to switch to another Youth Edition.
// items: [{ key, href, game, club, current, active, locked, badge }] (newest first)
export default function EditionSwitcher({ brand, items }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onDown = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const text = (
    <span className="brand-text">
      {brand.name}
      <small>{brand.sub}</small>
    </span>
  );

  // Only one edition to show: a plain link home, like before.
  if (items.length < 2) {
    return (
      <Link href={brand.href} className="brand" aria-label={`${brand.name} Youth Edition – home`}>
        {brand.logo}
        {text}
      </Link>
    );
  }

  return (
    <div className="ed-switch" ref={box}>
      <button
        type="button"
        className="brand ed-switch-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="ed-switch-menu"
        title="Switch to another Youth Edition"
        onClick={() => setOpen((o) => !o)}
      >
        {brand.logo}
        {text}
        <span className={`ed-caret ${open ? 'open' : ''}`} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="ed-menu" id="ed-switch-menu">
          <div className="ed-menu-title">Youth Editions</div>
          {items.map((it) => (
            <Link key={it.key} href={it.href} className={`ed-item ${it.active ? 'active' : ''}`} aria-current={it.active ? 'page' : undefined}>
              {it.badge}
              <span className="ed-item-text">
                <b>{it.club}</b>
                <small>
                  {it.game}
                  {it.current ? ' · current career' : ''}
                  {it.locked ? ' · 🔒 hidden' : ''}
                </small>
              </span>
              {it.active && <span className="ed-check" aria-label="You are here">✓</span>}
            </Link>
          ))}
          <div className="ed-menu-links">
            <Link href="/editions">All editions →</Link>
            <Link href="/editions/all-time">All-time stats →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
