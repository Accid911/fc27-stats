import Logo from './Logo';
import SiteChrome from './SiteChrome';
import { loadSettings } from '@/lib/server-data';
import { creatorInfo } from '@/lib/site';

// The normal (Leicester City) header and footer.
export default async function DefaultChrome({ children }) {
  let clubName = 'Leicester City';
  let creator = creatorInfo(null);
  try {
    const settings = await loadSettings();
    clubName = settings?.club_name || clubName;
    creator = creatorInfo(settings);
  } catch {}

  return (
    <SiteChrome
      brand={{ href: '/', name: clubName, sub: `${creator.name} · Youth Edition`, logo: <Logo size={34} /> }}
      channel={creator.channel}
      footer={{ clubName, creator, game: 'FC27', exportHref: '/api/export' }}
    >
      {children}
    </SiteChrome>
  );
}
