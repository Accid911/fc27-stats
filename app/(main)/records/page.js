import { loadAll } from '@/lib/server-data';
import RecordsView from '@/views/RecordsView';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Records',
  description: 'Record book, fun facts, all-time leaders and charts from SparringDK’s Youth Edition career.',
};

export default async function Page() {
  return <RecordsView data={await loadAll()} />;
}
