import { loadAll } from '@/lib/server-data';
import OverviewView from '@/views/OverviewView';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return <OverviewView data={await loadAll()} />;
}
