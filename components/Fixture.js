import Link from 'next/link';
import { fixture } from '@/lib/data';

// Home team first, e.g. "Luton 1–2 Leicester" when Leicester play away.
export default function Fixture({ m, clubName = 'Leicester City', href, short = true }) {
  const f = fixture(m, clubName);
  const name = (t) => (t.club && short ? clubName.split(' ')[0] : t.name);
  const inner = (
    <>
      <span className={f.home.club ? 'fx-club' : 'fx-team'}>{name(f.home)}</span>
      <span className="fx-score">{f.home.goals}–{f.away.goals}</span>
      <span className={f.away.club ? 'fx-club' : 'fx-team'}>{name(f.away)}</span>
      {f.pens && <span className="fx-pens">({f.home.pens}–{f.away.pens} pens)</span>}
      {m.venue === 'N' && <span className="fx-pens">(neutral)</span>}
    </>
  );
  return href ? (
    <Link href={href} className="fixture">{inner}</Link>
  ) : (
    <span className="fixture">{inner}</span>
  );
}
