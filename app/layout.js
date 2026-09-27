import '@fontsource-variable/inter';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import Link from 'next/link';
import { loadAll } from '@/lib/data';
import './globals.css';

export const metadata = {
  title: 'FC27 Career Stats',
  description: 'Every season, player and trophy from the FC27 career mode.',
};

export default async function RootLayout({ children }) {
  let clubName = 'FC27 Stats';
  try {
    const { settings } = await loadAll();
    clubName = settings?.club_name || clubName;
  } catch {}

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              {clubName} <span>FC27</span>
            </Link>
            <nav className="nav">
              <Link href="/">Overview</Link>
              <Link href="/seasons">Seasons</Link>
              <Link href="/players">Players</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </div>
        </header>
        <main>
          <div className="container">{children}</div>
        </main>
        <footer className="footer">
          <div className="container">Fan-made stats tracker · Not affiliated with EA Sports</div>
        </footer>
      </body>
    </html>
  );
}
