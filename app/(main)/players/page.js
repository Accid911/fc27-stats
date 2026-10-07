import { loadAll } from '@/lib/server-data';
import PlayersView from '@/views/PlayersView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Players' };

export default async function Page() {
  return <PlayersView data={await loadAll()} />;
}
