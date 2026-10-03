import Link from 'next/link';
import { buildModel, seasonLabel } from '@/lib/data';
import MatchTable from '@/components/MatchTable';
import DemoNotice from '@/components/DemoNotice';

export default function MatchesView({ data, season, base = '', edition = null }) {
  const model = buildModel(data);
  const selected = season && model.seasonById[season] ? season : '';
  const matches = model.matches.filter((m) => !selected || m.season_id === selected).reverse();

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">Results</div>
      <h1 style={{ marginBottom: 16 }}>Matches</h1>
      <div className="chips" style={{ marginBottom: 20 }}>
        <Link className="chip" href={`${base}/matches`} style={!selected ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}>All</Link>
        {[...model.seasons].reverse().map((s) => (
          <Link
            key={s.id}
            className="chip"
            href={`${base}/matches?season=${s.id}`}
            style={selected === s.id ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
          >
            {seasonLabel(s)}
          </Link>
        ))}
      </div>
      <div className="card pad-0">
        <MatchTable base={base} matches={matches} playerById={model.playerById} clubName={model.clubName} showSeason={!selected} />
      </div>
    </>
  );
}
