import { loadAll } from '@/lib/server-data';
import MatchView, { metaFor } from '@/views/MatchView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    return metaFor(await loadAll(), id);
  } catch {
    return {};
  }
}

export default async function Page({ params }) {
  const { id } = await params;
  return <MatchView data={await loadAll()} id={id} />;
}
