import Logo from './Logo';
import SiteChrome from './SiteChrome';
import { loadSettings, listPublicEditions } from '@/lib/server-data';
import { creatorInfo } from '@/lib/site';
import EditionMenu from './EditionMenu';

// The normal (Leicester City) header and footer.
// viewing: 'current' (main site), an edition number (unthemed edition page) or null (archive pages).
export default async function DefaultChrome({ children, viewing = 'current', extraEdition = null }) {
  let clubName = 'Leicester City';
  let creator = creatorInfo(null);
  try {
    const settings = await loadSettings();
    clubName = settings?.club_name || clubName;
    creator = creatorInfo(settings);
  } catch {}
  const editions = await listPublicEditions();
  const current = editions.find((e) => e.is_current);
  const hasArchive = editions.some((e) => e.is_public && !e.is_current);
  const brand = { href: '/', name: clubName, sub: `${current?.game || 'FC 27'} · Youth Edition`, logo: <Logo size={34} /> };

  return (
    <SiteChrome
      brand={brand}
      brandSlot={<EditionMenu brand={brand} active={viewing} extra={extraEdition} />}
      channel={creator.channel}
      footer={{ clubName, creator, game: 'FC27', exportHref: '/api/export', archiveHref: hasArchive ? '/editions' : null }}
    >
      {children}
    </SiteChrome>
  );
}
