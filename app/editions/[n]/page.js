import { loadEdition } from '@/lib/server-data';
import OverviewView from '@/views/OverviewView';
import ArchiveLocked from '@/components/ArchiveLocked';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { n } = await params;
  const data = await loadEdition(n).catch(() => null);
  return { title: data ? `${data.edition.club} · ${data.edition.game}` : 'Archive' };
}

export default async function Page({ params }) {
  const { n } = await params;
  const data = await loadEdition(n);
  if (!data) return <ArchiveLocked />;
  return <OverviewView data={data} base={`/editions/${n}`} edition={data.edition} />;
}
