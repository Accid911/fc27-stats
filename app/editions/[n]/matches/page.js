import { loadEdition } from '@/lib/server-data';
import MatchesView from '@/views/MatchesView';
import ArchiveLocked from '@/components/ArchiveLocked';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { n } = await params;
  const data = await loadEdition(n).catch(() => null);
  return { title: data ? `Matches · ${data.edition.club} · ${data.edition.game}` : 'Archive' };
}

export default async function Page({ params, searchParams }) {
  const { n } = await params;
  const { season } = await searchParams;
  const data = await loadEdition(n);
  if (!data) return <ArchiveLocked />;
  return <MatchesView data={data} season={season} base={`/editions/${n}`} edition={data.edition} />;
}
