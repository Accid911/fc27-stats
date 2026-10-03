import { ImageResponse } from 'next/og';
import { loadAll } from '@/lib/server-data';
import { buildModel, fixture, seasonLabel } from '@/lib/data';
import { OG_SIZE, OG_COLORS, OgFrame, ogAssets } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Match result';
export const revalidate = 600;

const RESULT = { W: ['WIN', '#3ddc84'], D: ['DRAW', '#a3abbd'], L: ['DEFEAT', '#ef5d5d'] };

export default async function Image({ params }) {
  const { id } = await params;
  const { crest, fonts } = await ogAssets();
  let m = null;
  let model = null;
  try {
    model = buildModel(await loadAll());
    m = model.matches.find((x) => x.id === id) || null;
  } catch {}

  const f = m ? fixture(m, model.clubName) : null;
  const potm = m?.lineup.find((r) => r.potm);
  const scorers = m
    ? m.lineup.filter((r) => r.goals > 0).map((r) => `${model.playerById[r.player_id]?.name}${r.goals > 1 ? ` ×${r.goals}` : ''}`).join(', ')
    : '';
  const team = (t) => (
    <div style={{ display: 'flex', fontSize: 60, fontWeight: 800, textTransform: 'uppercase', color: t.club ? OG_COLORS.text : OG_COLORS.muted }}>
      {t.name}
    </div>
  );

  return new ImageResponse(
    (
      <OgFrame crest={crest}>
        {m ? (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30 }}>
            <div style={{ display: 'flex', fontSize: 32, fontWeight: 600, color: OG_COLORS.muted }}>
              {seasonLabel(m.season)} · {m.tournament || 'Match'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18 }}>
              {team(f.home)}
              <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
                <div style={{ display: 'flex', fontSize: 130, fontWeight: 800, lineHeight: 1 }}>{`${f.home.goals} – ${f.away.goals}`}</div>
                <div
                  style={{
                    display: 'flex', marginLeft: 28, fontSize: 34, fontWeight: 800, color: '#0b0f0d',
                    background: RESULT[m.result][1], borderRadius: 12, padding: '6px 16px',
                  }}
                >
                  {RESULT[m.result][0]}{f.pens ? ` ON PENS ${f.home.pens}–${f.away.pens}` : ''}
                </div>
              </div>
              {team(f.away)}
            </div>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 600, color: OG_COLORS.muted, marginTop: 22 }}>
              {[scorers && `Goals: ${scorers}`, potm && `POTM: ${model.playerById[potm.player_id]?.name}`].filter(Boolean).join('   ·   ')}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 90, fontWeight: 800, marginTop: 60 }}>MATCH</div>
        )}
      </OgFrame>
    ),
    { ...size, fonts }
  );
}
