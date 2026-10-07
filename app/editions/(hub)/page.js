import Link from 'next/link';
import { loadArchive } from '@/lib/server-data';
import { buildModel, teamRecord, playerStats, topBy, allHonours } from '@/lib/data';
import { editionPath } from '@/lib/editions';
import ClubBadge from '@/components/ClubBadge';
import ArchiveLocked from '@/components/ArchiveLocked';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Youth Edition archive' };

export default async function ArchivePage() {
  const { editions, isAdmin, demo } = await loadArchive();
  // The archive opens to the public as soon as an older edition is made public.
  const anyOldPublic = editions.some(({ edition }) => edition.is_public && !edition.is_current);
  if (!isAdmin && !anyOldPublic) return <ArchiveLocked />;

  const cards = editions.map(({ edition, data }) => {
    const model = buildModel(data);
    const rec = teamRecord(model.matches);
    const top = topBy(playerStats(model), 'goals', 1)[0];
    return { edition, seasons: model.seasons.length, rec, trophies: allHonours(model).length, top, empty: !model.seasons.length };
  });

  return (
    <>
      <DemoNotice demo={demo} />
      <div className="eyebrow">SparringDK · The Youth Edition</div>
      <h1 style={{ marginBottom: 8 }}>The archive</h1>
      <div className="row" style={{ marginBottom: 24 }}>
        <p className="muted" style={{ margin: 0 }}>Every Youth Edition save since FIFA 15 — one club, academy players only.</p>
        <span className="spacer" />
        <Link className="btn secondary" href="/editions/all-time">All-time stats →</Link>
      </div>

      <div className="edition-grid">
        {[...cards].reverse().map(({ edition, seasons, rec, trophies, top, empty }) => (
          <Link key={edition.id} href={editionPath(edition)} className={`card edition-card ${empty ? 'empty' : ''}`}>
            <div className="ed-head">
              <ClubBadge edition={edition} size={56} />
              <div>
                <div className="ed-num">#{edition.number} · {edition.game}</div>
                <h3>{edition.club}</h3>
              </div>
            </div>
            {empty ? (
              <span className="muted" style={{ fontSize: 14 }}>No stats added yet</span>
            ) : (
              <div className="ed-stats">
                <span><b>{seasons}</b>seasons</span>
                <span><b>{rec.W}-{rec.D}-{rec.L}</b>W-D-L</span>
                <span><b>{trophies}</b>trophies</span>
              </div>
            )}
            <div className="row" style={{ gap: 6 }}>
              {edition.is_current && <span className="badge green">Current</span>}
              {isAdmin && !edition.is_public && <span className="badge">🔒 Hidden</span>}
              {top && <span className="badge gold">⚽ {top.name} · {top.goals}</span>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
