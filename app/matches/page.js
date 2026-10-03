import { loadAll } from '@/lib/server-data';
import MatchesView from '@/views/MatchesView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Matches' };

export default async function Page({ searchParams }) {
  const { season } = await searchParams;
  return <MatchesView data={await loadAll()} season={season} />;
}
