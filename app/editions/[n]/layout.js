import Link from 'next/link';
import { listEditions } from '@/lib/server-data';
import ClubBadge from '@/components/ClubBadge';
import EditionNav from '@/components/EditionNav';

export default async function EditionLayout({ children, params }) {
  const { n } = await params;
  let edition = null;
  let isAdmin = false;
  try {
    const res = await listEditions();
    isAdmin = res.isAdmin;
    edition = res.editions.find((e) => e.number === Number(n)) || null;
  } catch {}
  if (!edition) return children; // the page itself shows "coming soon"

  const base = `/editions/${edition.number}`;
  return (
    <>
      {isAdmin && !edition.is_public && (
        <div className="private-banner">🔒 Only admins can see this edition. Make it public in Admin → Editions when it’s ready.</div>
      )}
      <div className="archive-bar">
        <Link href="/editions" className="link" style={{ fontSize: 14 }}>← Archive</Link>
        <ClubBadge edition={edition} size={40} />
        <span className="ed-title">
          <small>Youth Edition #{edition.number} · {edition.game}</small>
          <b>{edition.club}</b>
        </span>
        <EditionNav base={base} />
      </div>
      {children}
    </>
  );
}
