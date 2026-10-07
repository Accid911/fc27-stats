import { loadAll } from '@/lib/server-data';
import SeasonView, { metaFor } from '@/views/SeasonView';

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
  return <SeasonView data={await loadAll()} id={id} />;
}
