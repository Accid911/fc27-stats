import { loadAll } from '@/lib/server-data';
import SeasonsView from '@/views/SeasonsView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seasons' };

export default async function Page() {
  return <SeasonsView data={await loadAll()} />;
}
