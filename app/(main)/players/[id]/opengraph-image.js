import { ImageResponse } from 'next/og';
import { loadAll } from '@/lib/server-data';
import { buildModel, playerStats, statusText, seasonLabel } from '@/lib/data';
import { OG_SIZE, OG_COLORS, OgFrame, OgStat, ogAssets } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Player stats';
export const revalidate = 600;

export default async function Image({ params }) {
  const { id } = await params;
  const { crest, fonts } = await ogAssets();
  let p = null;
  let st = null;
  try {
    const model = buildModel(await loadAll());
    p = playerStats(model).find((x) => x.id === id) || null;
    st = p ? model.statusById[p.id] : null;
  } catch {}

  const sub = p ? [p.position, p.country, p.joined ? `Joined ${seasonLabel(p.joined.season)}` : null].filter(Boolean).join(' · ') : '';
  return new ImageResponse(
    (
      <OgFrame crest={crest}>
        <div style={{ display: 'flex', fontSize: 104, fontWeight: 800, lineHeight: 1, marginTop: 34, textTransform: 'uppercase' }}>
          {p ? p.name : 'Player'}
        </div>
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 600, color: OG_COLORS.muted, marginTop: 14 }}>
          {sub}{p && st && st.status !== 'squad' ? ` · ${statusText(st)}` : ''}
        </div>
        {p && (
          <div style={{ display: 'flex', marginTop: 'auto' }}>
            <OgStat value={p.apps} label="Apps" />
            <OgStat value={p.goals} label="Goals" />
            <OgStat value={p.assists} label="Assists" />
            {p.cs != null ? <OgStat value={p.cs} label="Clean sheets" /> : <OgStat value={p.potm} label="POTM" />}
            <OgStat value={p.avg_rating != null ? p.avg_rating.toFixed(1) : '—'} label="Avg rating" />
          </div>
        )}
      </OgFrame>
    ),
    { ...size, fonts }
  );
}
