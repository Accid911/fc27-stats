import { loadAll } from '@/lib/server-data';
import PlayerView, { metaFor } from '@/views/PlayerView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    return metaFor(await loadAll(), id);
  } catch {
    return {};
  }
}

export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const { log } = await searchParams;
  return <PlayerView data={await loadAll()} id={id} fullLog={log === 'all'} />;
}
