// Personalised look for an edition of the archive: club colours, crest, nickname, stadium.
// Add an entry per edition number when it gets personalised. Editions without an entry use the normal look.
//
// colors: every key is optional; missing ones keep the site default.
//   rgb values ('255, 163, 0') are used for glows and soft backgrounds.

export const EDITION_THEMES = {
  9: {
    club: '1860 Munich',
    shortName: '1860',
    nickname: 'Die Löwen (The Lions)',
    stadium: 'Grünwalder Stadion',
    founded: 1860,
    colorsLabel: 'Sky blue & white',
    crest: '/crests/1860-munich.png',
    colors: {
      bg: '#060a10',
      surface: '#0c141f',
      surface2: '#121d2c',
      border: '#223349',
      text: '#eef4fb',
      muted: '#93a6bd',
      accent: '#6cb8f0',
      accentInk: '#03111f',
      onAccent: '#03111f',
      accentRgb: '108, 184, 240',
      accentSoft: '#0e2236',
      accentLine: '#2b5577',
      gold: '#f2d27a',
      glowRgb: '40, 120, 190',
      headerRgb: '6, 10, 16',
      ogGlow: '#14507f',
    },
  },
  10: {
    club: 'Sutton United',
    shortName: 'Sutton',
    nickname: 'The U’s',
    stadium: 'Gander Green Lane',
    founded: 1898,
    colorsLabel: 'Amber & chocolate',
    crest: '/crests/sutton-united.png',
    colors: {
      bg: '#0c0805',
      surface: '#170f0a',
      surface2: '#21160e',
      border: '#3e2a1a',
      text: '#f6efe6',
      muted: '#ad9a86',
      accent: '#f6a81c',
      accentInk: '#1a0f00',
      onAccent: '#1a0f00',
      accentRgb: '246, 168, 28',
      accentSoft: '#2d1c08',
      accentLine: '#6f4714',
      gold: '#ffd27a',
      glowRgb: '120, 62, 22',
      headerRgb: '12, 8, 5',
      ogGlow: '#5a2f12',
    },
  },
  11: {
    club: 'Bromley',
    shortName: 'Bromley',
    nickname: 'The Ravens',
    stadium: 'Hayes Lane',
    founded: 1892,
    colorsLabel: 'White & black',
    crest: '/crests/bromley.png',
    colors: {
      bg: '#080808',
      surface: '#121212',
      surface2: '#1b1b1b',
      border: '#2e2e2e',
      text: '#f4f4f4',
      muted: '#a0a0a0',
      accent: '#f4f4f4',
      accentInk: '#0a0a0a',
      onAccent: '#0a0a0a',
      accentRgb: '244, 244, 244',
      accentSoft: '#222222',
      accentLine: '#5a5a5a',
      gold: '#c9a86a',
      glowRgb: '183, 150, 99',
      headerRgb: '8, 8, 8',
      ogGlow: '#4a3d27',
    },
  },
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
      onAccent: '#140c00',
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
  accentLine: '--accent-line', onAccent: '--on-accent', gold: '--gold', glowRgb: '--glow-rgb', headerRgb: '--header-rgb',
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
