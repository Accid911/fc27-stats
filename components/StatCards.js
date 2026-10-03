import Link from 'next/link';
import { fixture, seasonLabel } from '@/lib/data';

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : /(s|x|ch|sh)$/.test(word) ? 'es' : 's'}`;

export function Kpi({ value, label, gold }) {
  return (
    <div className="card kpi">
      <div className="value" style={{ color: gold ? 'var(--gold)' : undefined }}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export function Mini({ value, label }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function Record({ label, big, sub }) {
  return (
    <div className="card record-card">
      <div className="label">{label}</div>
      <div className="big">{big}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}

export function MatchRecord({ label, m, clubName }) {
  if (!m) return <Record label={label} big="—" sub="Not yet" />;
  const f = fixture(m, clubName);
  const short = (t) => (t.club ? clubName.split(' ')[0] : t.name);
  return (
    <div className="card record-card">
      <div className="label">{label}</div>
      <div className="big">{f.home.goals}–{f.away.goals}{f.pens ? <span style={{ fontSize: 16 }}> ({f.home.pens}–{f.away.pens} p)</span> : null}</div>
      <div className="sub">
        <Link href={`/matches/${m.id}`}>{short(f.home)} v {short(f.away)}</Link> · {seasonLabel(m.season)}
      </div>
    </div>
  );
}

export function PlayerRecord({ label, r, fmt = (v) => v }) {
  if (!r) return <Record label={label} big="—" sub="Not yet" />;
  return (
    <div className="card record-card">
      <div className="label">{label}</div>
      <div className="big">{fmt(r.value)}</div>
      <div className="sub">
        <Link href={`/players/${r.player.id}`}>{r.player.name}</Link> vs <Link href={`/matches/${r.match.id}`}>{r.match.opponent}</Link>
      </div>
    </div>
  );
}
