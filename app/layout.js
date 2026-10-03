import '@fontsource-variable/inter';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Logo from '@/components/Logo';
import SiteNav from '@/components/SiteNav';
import { loadSettings } from '@/lib/server-data';
import { CREATOR, MAKER, SERIES, creatorInfo } from '@/lib/site';
import './globals.css';

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000';
const description = `Fan-made stats for ${CREATOR.name}'s FC27 career mode series ${SERIES}: Leicester City with academy players only. Every season, match, player and transfer.`;

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${CREATOR.name}'s Youth Edition — Leicester City FC27 career stats`,
    template: `%s · ${CREATOR.name} Youth Edition`,
  },
  description,
  openGraph: {
    title: `${CREATOR.name}'s Youth Edition — Leicester City`,
    description,
    type: 'website',
    siteName: `${CREATOR.name} Youth Edition stats`,
  },
  twitter: { card: 'summary_large_image' },
};

export default async function RootLayout({ children }) {
  let clubName = 'Leicester City';
  let creator = creatorInfo(null);
  try {
    const settings = await loadSettings();
    clubName = settings?.club_name || clubName;
    creator = creatorInfo(settings);
  } catch {}

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand" aria-label={`${clubName} Youth Edition – home`}>
              <Logo size={34} />
              <span className="brand-text">
                {clubName}
                <small>{creator.name} · Youth Edition</small>
              </span>
            </Link>
            <SiteNav channel={creator.channel} />
          </div>
        </header>
        <main>
          <div className="container">{children}</div>
        </main>
        <footer className="footer">
          <div className="container footer-grid">
            <div>
              <b>{clubName} · {SERIES}</b> — the stats hub for{' '}
              <a href={creator.channel} target="_blank" rel="noreferrer">{creator.name}</a>’s FC27 career mode series.
              <br />
              Fan-made site. Not affiliated with EA SPORTS or {clubName} FC; crests and names belong to their owners.
            </div>
            <div className="made-by">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MAKER.avatar} alt={`${MAKER.name} logo`} width={36} height={36} />
              <span>
                Site made by <b>{MAKER.name}</b>
              </span>
            </div>
            <div className="footer-links">
              <a href={creator.channel} target="_blank" rel="noreferrer">Watch on YouTube</a>
              <a href={creator.subscribe} target="_blank" rel="noreferrer">Subscribe</a>
              <a href="/api/export" download>⬇ Download all stats (Excel)</a>
              <Link href="/about">About this site</Link>
            </div>
          </div>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
