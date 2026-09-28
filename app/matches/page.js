import Link from 'next/link';
import { loadAll, buildModel, seasonLabel } from '@/lib/data';
import MatchTable from '@/components/MatchTable';
import DemoNotice from '@/components/DemoNotice';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Matches' };

export default async function MatchesPage({ searchParams }) {
  const { season } = await searchParams;
  const data = await loadAll();
  const model = buildModel(data);
  const selected = season && model.seasonById[season] ? season : '';
  const matches = model.matches.filter((m) => !selected || m.season_id === selected).reverse();

  return (
    <>
      <DemoNotice demo={data.demo} />
      <div className="eyebrow">Results</div>
      <h1 style={{ marginBottom: 16 }}>Matches</h1>
      <div className="chips" style={{ marginBottom: 20 }}>
        <Link className="chip" href="/matches" style={!selected ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}>All</Link>
        {[...model.seasons].reverse().map((s) => (
          <Link
            key={s.id}
            className="chip"
            href={`/matches?season=${s.id}`}
            style={selected === s.id ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
          >
            {seasonLabel(s)}
          </Link>
        ))}
      </div>
      <div className="card pad-0">
        <MatchTable matches={matches} playerById={model.playerById} clubName={model.clubName} showSeason={!selected} />
      </div>
    </>
  );
}
