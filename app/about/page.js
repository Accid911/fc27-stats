import Link from 'next/link';
import { loadSettings } from '@/lib/server-data';
import { MAKER, SERIES, creatorInfo } from '@/lib/site';
import Logo from '@/components/Logo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'About the Youth Edition' };

export default async function AboutPage() {
  let settings = null;
  try {
    settings = await loadSettings();
  } catch {}
  const creator = creatorInfo(settings);
  const club = settings?.club_name || 'Leicester City';

  return (
    <div className="prose">
      <div className="row" style={{ gap: 20, alignItems: 'center' }}>
        <Logo size={84} />
        <div>
          <div className="eyebrow">About</div>
          <h1 style={{ fontSize: 'clamp(30px, 5vw, 46px)' }}>{SERIES}</h1>
        </div>
      </div>

      <p style={{ marginTop: 20 }}>
        This site is the stats hub for <b>{creator.name}</b>’s FC27 career mode series <b>{SERIES}</b>. It keeps
        track of every season, match, player and transfer of the save, so you can look back at how the squad
        developed between episodes.
      </p>

      <div className="row" style={{ margin: '20px 0 8px' }}>
        <a className="btn yt" href={creator.channel} target="_blank" rel="noreferrer">▶ {creator.name} on YouTube</a>
        <a className="btn secondary" href={creator.subscribe} target="_blank" rel="noreferrer">Subscribe</a>
      </div>

      <h2>The challenge</h2>
      <ul>
        <li><b>One club:</b> the whole career is played with {club}.</li>
        <li><b>Academy players only:</b> the squad is built from youth academy players, who grow up together over the seasons.</li>
        <li><b>Players move on:</b> when a youngster is sold, loaned out or released, you’ll find it under <Link href="/players#transfers">Transfers &amp; loans</Link> on the Players page, with the club and fee.</li>
      </ul>

      <h2>How the stats work</h2>
      <ul>
        <li>After each match the line-up is entered with every player’s <b>match rating</b>, <b>goals</b>, <b>assists</b> and the <b>Player of the Match</b>, as shown in the game.</li>
        <li>All player totals — appearances, goals, assists, average rating, records — are calculated from those match line-ups.</li>
        <li>Cup matches decided by a <b>penalty shoot-out</b> count as a win or a loss (shown as e.g. “1–1 (5–4 pens)”).</li>
        <li>League tables are copied from the game at the end of each season (or during it).</li>
        <li>Away matches are shown with the home team first, like on a real fixture list.</li>
      </ul>

      <h2>Where to start</h2>
      <ul>
        <li><Link href="/">Overview</Link> — records, form, top scorers and the trophy cabinet.</li>
        <li><Link href="/seasons">Seasons</Link> — league tables and every season’s results.</li>
        <li><Link href="/matches">Matches</Link> — every result, with line-ups and ratings.</li>
        <li><Link href="/players">Players</Link> — the academy graduates and their career numbers.</li>
      </ul>

      <h2>Who made this</h2>
      <div className="maker-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MAKER.avatar} alt={`${MAKER.name} logo`} width={96} height={96} />
        <p style={{ margin: 0 }}>
          This site was built by <b>{MAKER.name}</b>, a viewer of the series, to keep track of every stat of{' '}
          {creator.name}’s Youth Edition career.
        </p>
      </div>

      <h2>Small print</h2>
      <p>
        This is a fan-made website. It isn’t affiliated with EA SPORTS or {club} FC; club names and crests belong to
        their owners. Spotted a mistake in the stats? Let us know in the comments of the latest video.
      </p>
    </div>
  );
}
