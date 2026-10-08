'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const LINKS = [
  ['/', 'Overview'],
  ['/seasons', 'Seasons'],
  ['/matches', 'Matches'],
  ['/players', 'Players'],
  ['/records', 'Records'],
  ['/search', 'Search'],
  ['/about', 'About'],
  ['/admin', 'Admin'],
];

// Full menu on desktop; a "Menu" button with a drop-down on phones and small screens.
// links: [href, label, exact?] — the first link (home) always matches exactly.
export default function SiteNav({ channel, links = LINKS }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const active = (href, exact) => (exact || href === links[0][0] ? pathname === href : pathname?.startsWith(href));

  return (
    <>
      <button
        type="button"
        className={`nav-toggle ${open ? 'open' : ''}`}
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="burger" aria-hidden="true"><i /><i /><i /></span>
        {open ? 'Close' : 'Menu'}
      </button>
      <nav id="site-nav" className={`nav ${open ? 'open' : ''}`}>
        {links.map(([href, label, exact]) => (
          <Link key={href} href={href} className={active(href, exact) ? 'active' : ''} aria-current={active(href, exact) ? 'page' : undefined}>
            {label}
          </Link>
        ))}
        <a className="nav-yt" href={channel} target="_blank" rel="noreferrer">▶ YouTube</a>
      </nav>
    </>
  );
}
