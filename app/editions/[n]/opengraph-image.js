import { ImageResponse } from 'next/og';
import { loadEdition } from '@/lib/server-data';
import { buildModel, teamRecord } from '@/lib/data';
import { editionTheme } from '@/lib/themes';
import { OG_SIZE, OgFrame, OgStat, ogAssets } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Youth Edition';
export const revalidate = 600;

// Link preview for an edition. Personalised editions use their crest and colours.
// Hidden editions are never shown here (link-preview bots aren't signed in).
export default async function Image({ params }) {
  const { n } = await params;
  let data = null;
  try {
    data = await loadEdition(n);
  } catch {}
  const edition = data?.edition || null;
  const theme = editionTheme(edition);
  const { crest, fonts } = await ogAssets(theme?.crest || '/crest.png');
  const colors = theme
    ? { bg: theme.colors.bg, royal: theme.colors.ogGlow || theme.colors.accent, gold: theme.colors.gold, text: theme.colors.text, muted: theme.colors.muted, card: theme.colors.surface2 }
    : null;

  let rec = null;
  let seasons = 0;
  if (edition) {
    const model = buildModel(data);
    rec = teamRecord(model.matches);
    seasons = model.seasons.length;
  }

  return new ImageResponse(
    (
      <OgFrame
        crest={crest}
        colors={colors}
        label={edition ? `SPARRINGDK · YOUTH EDITION #${edition.number} · ${edition.game.toUpperCase()}` : 'SPARRINGDK · THE YOUTH EDITION · ARCHIVE'}
      >
        <div style={{ display: 'flex', fontSize: 104, fontWeight: 800, lineHeight: 1, marginTop: 34, textTransform: 'uppercase' }}>
          {edition ? edition.club : 'Youth Edition'}
        </div>
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 600, color: colors?.muted || '#9aa5c3', marginTop: 14 }}>
          {theme ? [theme.nickname, theme.stadium].filter(Boolean).join(' · ') : 'Every Youth Edition career, season by season'}
        </div>
        {rec && (
          <div style={{ display: 'flex', marginTop: 'auto' }}>
            <OgStat colors={colors} value={seasons} label="Seasons" />
            <OgStat colors={colors} value={rec.P} label="Matches" />
            <OgStat colors={colors} value={rec.W} label="Wins" />
            <OgStat colors={colors} value={rec.GF} label="Goals" />
          </div>
        )}
      </OgFrame>
    ),
    { ...size, fonts }
  );
}
