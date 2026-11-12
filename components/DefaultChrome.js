import Logo from './Logo';
import SiteChrome from './SiteChrome';
import { loadSettings, listPublicEditions } from '@/lib/server-data';
import { creatorInfo, NAV_LINKS as LINKS } from '@/lib/site';

// The normal (Leicester City) header and footer.
export default async function DefaultChrome({ children }) {
  let clubName = 'Leicester City';
  let creator = creatorInfo(null);
  try {
    const settings = await loadSettings();
    clubName = settings?.club_name || clubName;
    creator = creatorInfo(settings);
  } catch {}
  // Show the archive in the menu once an older Youth Edition is public
  const hasArchive = (await listPublicEditions()).some((e) => e.is_public && !e.is_current);
  const links = hasArchive ? [...LINKS.slice(0, -2), ['/editions', 'Archive'], ...LINKS.slice(-2)] : undefined;

  return (
    <SiteChrome
      links={links}
      brand={{ href: '/', name: clubName, sub: `${creator.name} · Youth Edition`, logo: <Logo size={34} /> }}
      channel={creator.channel}
      footer={{ clubName, creator, game: 'FC27', exportHref: '/api/export', archiveHref: hasArchive ? '/editions' : null }}
    >
      {children}
    </SiteChrome>
  );
}
