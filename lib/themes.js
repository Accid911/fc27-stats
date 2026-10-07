// Personalised look for an edition of the archive: club colours, crest, nickname, stadium.
// Add an entry per edition number when it gets personalised. Editions without an entry use the normal look.
//
// colors: every key is optional; missing ones keep the site default.
//   rgb values ('255, 163, 0') are used for glows and soft backgrounds.

export const EDITION_THEMES = {
  12: {
    club: 'Cambridge United',
    shortName: 'Cambridge',
    nickname: 'The U’s',
    stadium: 'Abbey Stadium',
    founded: 1912,
    colorsLabel: 'Amber & black',
    crest: '/crests/cambridge-united.png',
    colors: {
      bg: '#0a0806',
      surface: '#15110b',
      surface2: '#1e1910',
      border: '#382d1c',
      text: '#f4efe6',
      muted: '#a99d89',
      accent: '#ffa000',
      accentInk: '#140c00',
      accentRgb: '255, 160, 0',
      accentSoft: '#2b1d05',
      accentLine: '#6e4a0e',
      gold: '#ffd166',
      glowRgb: '255, 140, 0',
      headerRgb: '10, 8, 6',
      ogGlow: '#6b3d00', // background glow of the link-preview image (darker, so the crest stands out)
    },
  },
};

export const editionTheme = (edition) => (edition ? EDITION_THEMES[edition.number] || null : null);

const VARS = {
  bg: '--bg', surface: '--surface', surface2: '--surface-2', border: '--border', text: '--text', muted: '--muted',
  accent: '--accent', accentInk: '--accent-ink', accentRgb: '--accent-rgb', accentSoft: '--accent-soft',
  accentLine: '--accent-line', gold: '--gold', glowRgb: '--glow-rgb', headerRgb: '--header-rgb',
};

// CSS that switches the whole page to the edition's colours (only while that edition is shown).
export function themeCss(theme) {
  if (!theme?.colors) return '';
  const decl = Object.entries(theme.colors)
    .filter(([k]) => VARS[k])
    .map(([k, v]) => `${VARS[k]}: ${v};`)
    .join(' ');
  return `:root { ${decl} }`;
}
