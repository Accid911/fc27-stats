'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { NAV_LINKS as LINKS } from '@/lib/site';

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
  const searchOn = pathname === '/search';
  const search = (cls) => (
    <Link href="/search" className={`nav-search ${cls} ${searchOn ? 'active' : ''}`} aria-label="Search players, clubs and episodes" title="Search">
      <SearchIcon />
    </Link>
  );

  return (
    <>
      {search('only-small')}
      <button
        type="button"
        className={`nav-toggle ${open ? 'open' : ''}`}
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="burger" aria-hidden="true"><i /><i /><i /></span>
        <span className="nav-toggle-label">{open ? 'Close' : 'Menu'}</span>
      </button>
      <nav id="site-nav" className={`nav ${open ? 'open' : ''}`}>
        {links.map(([href, label, exact]) => (
          <Link key={href} href={href} className={active(href, exact) ? 'active' : ''} aria-current={active(href, exact) ? 'page' : undefined}>
            {label}
          </Link>
        ))}
        {search('only-wide')}
        <a className="nav-yt" href={channel} target="_blank" rel="noreferrer">▶ YouTube</a>
      </nav>
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </svg>
  );
}
