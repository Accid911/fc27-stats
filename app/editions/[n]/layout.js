import Link from 'next/link';
import { listEditions, loadSettings } from '@/lib/server-data';
import { creatorInfo, safeUrl } from '@/lib/site';
import { editionTheme, themeCss, badgeDataUrl } from '@/lib/themes';
import { clubInitials, crestUrl } from '@/lib/editions';
import ClubBadge from '@/components/ClubBadge';
import EditionNav from '@/components/EditionNav';
import DefaultChrome from '@/components/DefaultChrome';
import SiteChrome from '@/components/SiteChrome';
import EditionMenu from '@/components/EditionMenu';

// The edition this visitor may see (null = doesn't exist or hidden for them).
async function visibleEdition(n) {
  try {
    const res = await listEditions();
    const edition = res.editions.find((e) => e.number === Number(n)) || null;
    return { edition, isAdmin: res.isAdmin, current: res.editions.find((e) => e.is_current) || null };
  } catch {
    return { edition: null, isAdmin: false, current: null };
  }
}

// Thin strip on older editions so nobody mistakes them for the current career.
function EarlierStrip({ edition, current }) {
  if (edition.is_current) return null;
  return (
    <div className="earlier-strip">
      <span>
        You’re viewing <b>{edition.game} · {edition.club}</b>, an earlier Youth Edition.
      </span>
      <Link href="/" className="link">
        Back to the current career{current ? ` (${current.game} · ${current.club})` : ''} →
      </Link>
    </div>
  );
}

// Personalised editions get their own crest as browser-tab icon and their club in the page titles.
export async function generateMetadata({ params }) {
  const { n } = await params;
  const { edition } = await visibleEdition(n);
  const theme = editionTheme(edition);
  if (!edition || !theme) return {};
  return {
    title: { default: `${edition.club} · Youth Edition #${edition.number}`, template: `%s · ${edition.club} Youth Edition` },
    // the crest, or (no crest yet) the initials badge in club colours
    icons: (() => {
      const icon = crestUrl(edition) || badgeDataUrl(theme, clubInitials(edition.club));
      return { icon, apple: icon };
    })(),
  };
}

export default async function EditionLayout({ children, params }) {
  const { n } = await params;
  const { edition, isAdmin, current } = await visibleEdition(n);
  if (!edition) return <DefaultChrome>{children}</DefaultChrome>; // the page itself shows "coming soon"

  const base = `/editions/${edition.number}`;
  const banner = isAdmin && !edition.is_public && (
    <div className="private-banner">🔒 Only admins can see this edition. Make it public in Admin → Editions when it’s ready.</div>
  );
  const theme = editionTheme(edition);

  // Not personalised yet: normal Leicester header + the archive bar.
  if (!theme) {
    return (
      <DefaultChrome viewing={edition.number} extraEdition={edition}>
        <EarlierStrip edition={edition} current={current} />
        {banner}
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
      </DefaultChrome>
    );
  }

  // Personalised: the whole page in the club's colours, with its crest and name top left.
  let creator = creatorInfo(null);
  try {
    creator = creatorInfo(await loadSettings());
  } catch {}
  const brand = {
    href: base,
    name: edition.club,
    sub: `${edition.game} · Youth Edition #${edition.number}`,
    logo: <ClubBadge edition={edition} size={34} />,
  };
  return (
    <SiteChrome
      css={themeCss(theme)}
      brand={brand}
      brandSlot={<EditionMenu brand={brand} active={edition.number} extra={edition} />}
      links={[
        [base, 'Overview'],
        [`${base}/seasons`, 'Seasons'],
        [`${base}/matches`, 'Matches'],
        [`${base}/players`, 'Players'],
        [`${base}/records`, 'Records'],
      ]}
      channel={safeUrl(edition.youtube_url, creator.channel)}
      footer={{ clubName: edition.club, creator, game: edition.game, exportHref: `/api/export?edition=${edition.number}` }}
    >
      <EarlierStrip edition={edition} current={current} />
      {banner}
      {children}
    </SiteChrome>
  );
}
