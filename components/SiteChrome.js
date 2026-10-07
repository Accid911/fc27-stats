import Link from 'next/link';
import { MAKER, SERIES } from '@/lib/site';
import SiteNav from './SiteNav';

// Header + footer around every page. The main site uses the Leicester look (DefaultChrome);
// a personalised edition passes its own brand, menu and footer text.
export default function SiteChrome({ brand, links, channel, footer, children, css }) {
  return (
    <>
      {css ? <style>{css}</style> : null}
      <header className="site-header">
        <div className="container">
          <Link href={brand.href} className="brand" aria-label={`${brand.name} Youth Edition – home`}>
            {brand.logo}
            <span className="brand-text">
              {brand.name}
              <small>{brand.sub}</small>
            </span>
          </Link>
          <SiteNav channel={channel} links={links} />
        </div>
      </header>
      <main>
        <div className="container">{children}</div>
      </main>
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <b>{footer.clubName} · {SERIES}</b> — the stats hub for{' '}
            <a href={footer.creator.channel} target="_blank" rel="noreferrer">{footer.creator.name}</a>’s {footer.game} career mode series.
            <br />
            Fan-made site. Not affiliated with EA SPORTS or {footer.clubName} FC; crests and names belong to their owners.
          </div>
          <div className="made-by">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MAKER.avatar} alt={`${MAKER.name} logo`} width={36} height={36} />
            <span>
              Site made by <b>{MAKER.name}</b>
            </span>
          </div>
          <div className="footer-links">
            <a href={footer.creator.channel} target="_blank" rel="noreferrer">Watch on YouTube</a>
            <a href={footer.creator.subscribe} target="_blank" rel="noreferrer">Subscribe</a>
            <a href={footer.exportHref} download>⬇ Download all stats (Excel)</a>
            <Link href="/about">About this site</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
