import ClubBadge from './ClubBadge';
import EditionSwitcher from './EditionSwitcher';
import { listPublicEditions } from '@/lib/server-data';

// Server side of the edition switcher: which editions to list and which one you're on.
// active: 'current' (main site), an edition number, or null (archive pages: nothing ticked).
// extra: an edition this visitor can see that isn't public (an admin previewing a hidden edition).
export default async function EditionMenu({ brand, active = 'current', extra = null }) {
  let eds = await listPublicEditions();
  if (extra && !eds.some((e) => e.id === extra.id)) eds = [...eds, extra];
  const items = [...eds]
    .sort((a, b) => b.number - a.number)
    .map((e) => ({
      key: e.id,
      href: e.is_current ? '/' : `/editions/${e.number}`,
      game: e.game,
      club: e.club,
      current: !!e.is_current,
      active: active === 'current' ? !!e.is_current : e.number === active,
      locked: !e.is_public,
      badge: <ClubBadge edition={e} size={30} />,
    }));
  return <EditionSwitcher brand={brand} items={items} />;
}
