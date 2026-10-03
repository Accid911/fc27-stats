import { loadEdition } from '@/lib/server-data';
import RecordsView from '@/views/RecordsView';
import ArchiveLocked from '@/components/ArchiveLocked';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { n } = await params;
  const data = await loadEdition(n).catch(() => null);
  return { title: data ? `Records · ${data.edition.club} · ${data.edition.game}` : 'Archive' };
}

export default async function Page({ params }) {
  const { n } = await params;
  const data = await loadEdition(n);
  if (!data) return <ArchiveLocked />;
  return <RecordsView data={data} base={`/editions/${n}`} edition={data.edition} />;
}
