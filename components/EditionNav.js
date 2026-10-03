'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function EditionNav({ base }) {
  const pathname = usePathname();
  const links = [['', 'Overview'], ['/seasons', 'Seasons'], ['/matches', 'Matches'], ['/players', 'Players'], ['/records', 'Records']];
  return (
    <nav aria-label="Edition">
      {links.map(([href, label]) => {
        const full = base + href;
        const active = href === '' ? pathname === base : pathname?.startsWith(full);
        return (
          <Link key={href} href={full} className={active ? 'active' : ''}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
