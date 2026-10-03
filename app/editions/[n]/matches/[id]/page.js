import { loadEdition } from '@/lib/server-data';
import MatchView, { metaFor } from '@/views/MatchView';
import ArchiveLocked from '@/components/ArchiveLocked';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { n, id } = await params;
  const data = await loadEdition(n).catch(() => null);
  if (!data) return { title: 'Archive' };
  const m = metaFor(data, id);
  return { ...m, title: `${m.title || 'Archive'} · ${data.edition.game}` };
}

export default async function Page({ params }) {
  const { n, id } = await params;
  const data = await loadEdition(n);
  if (!data) return <ArchiveLocked />;
  return <MatchView data={data} id={id} base={`/editions/${n}`} edition={data.edition} />;
}
