import { loadAll, loadArchive } from '@/lib/server-data';
import { buildModel, playerStats, statusText, seasonLabel } from '@/lib/data';
import SearchBox from '@/components/SearchBox';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Search', robots: { index: false } };

// Everything this visitor may see: the current edition + public archive editions (+ hidden ones for admins).
async function searchSets() {
  let archive = [];
  try {
    archive = (await loadArchive()).editions;
  } catch {}
  const sets = archive.map(({ edition, data }) => ({
    data,
    base: edition.is_current ? '' : `/editions/${edition.number}`,
    label: edition.is_current ? edition.club : `#${edition.number} ${edition.club} · ${edition.game}`,
    current: !!edition.is_current,
    order: edition.is_current ? 0 : 100 - edition.number,
  }));
  if (!sets.some((s) => s.current)) {
    const data = await loadAll();
    sets.unshift({ data, base: '', label: data.settings?.club_name || 'Leicester City', current: true, order: 0 });
  }
  return sets.sort((a, b) => a.order - b.order);
}

function buildIndex(sets) {
  const players = [];
  const opponents = [];
  for (const set of sets) {
    const model = buildModel(set.data);
    for (const p of playerStats(model)) {
      players.push({
        key: `${set.base}|${p.id}`,
        name: p.name,
        kit: p.kit_number ?? null,
        sub: [p.position, p.country, statusText(model.statusById[p.id])].filter(Boolean).join(' · '),
        stats: `${p.apps} apps · ${p.goals} goals · ${p.assists} assists`,
        edition: set.label,
        current: set.current,
        href: `${set.base}/players/${p.id}`,
      });
    }
    const opp = {};
    for (const m of model.matches) {
      const o = (opp[m.opponent] ||= { name: m.opponent, P: 0, W: 0, D: 0, L: 0, last: null });
      o.P++;
      o[m.result]++;
      o.last = m;
    }
    for (const o of Object.values(opp)) {
      if (!o.name) continue;
      opponents.push({
        key: `${set.base}|${o.name}`,
        name: o.name,
        sub: `${o.P} played · ${o.W}W ${o.D}D ${o.L}L`,
        stats: `Last: ${o.last.goals_for}–${o.last.goals_against} (${seasonLabel(o.last.season)})`,
        edition: set.label,
        current: set.current,
        href: `${set.base}/matches/${o.last.id}`,
      });
    }
  }
  return { players, opponents };
}

export default async function Page({ searchParams }) {
  const { q = '' } = await searchParams;
  const index = buildIndex(await searchSets());
  return (
    <>
      <div className="eyebrow">Find anything</div>
      <h1 style={{ marginBottom: 8 }}>Search</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Players and opponents from every Youth Edition on this site.</p>
      <SearchBox index={index} initial={String(q).slice(0, 60)} />
    </>
  );
}
