// Shared bits for the link-preview images (Open Graph) of players and matches.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const OG_SIZE = { width: 1200, height: 630 };

export async function ogAssets(crestPath = '/crest.png') {
  const [bold, semi, crest] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/BarlowCondensed-800.woff')),
    readFile(join(process.cwd(), 'assets/fonts/BarlowCondensed-600.woff')),
    readFile(join(process.cwd(), 'public', crestPath)),
  ]);
  return {
    crest: `data:image/png;base64,${crest.toString('base64')}`,
    fonts: [
      { name: 'Barlow', data: bold, weight: 800, style: 'normal' },
      { name: 'Barlow', data: semi, weight: 600, style: 'normal' },
    ],
  };
}

export const OG_COLORS = { bg: '#070a14', royal: '#1840b8', gold: '#fdbe11', text: '#e9edf7', muted: '#9aa5c3', card: '#111a33' };

// Frame: dark background, blue glow, crest on the right, series line on top.
export function OgFrame({ crest, children, colors = null, label = 'SPARRINGDK · THE YOUTH EDITION · LEICESTER CITY' }) {
  const c = { ...OG_COLORS, ...(colors || {}) };
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: `radial-gradient(circle at 85% 30%, ${c.royal} 0%, ${c.bg} 60%)`,
        color: c.text,
        fontFamily: 'Barlow',
        padding: '56px 64px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: 820 }}>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: c.gold, letterSpacing: 2 }}>
          {label}
        </div>
        {children}
      </div>
      <img src={crest} width={250} height={250} style={{ position: 'absolute', right: 60, top: 60 }} />
    </div>
  );
}

export function OgStat({ value, label, colors = null }) {
  const c = { ...OG_COLORS, ...(colors || {}) };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: c.card, borderRadius: 16, padding: '18px 26px', marginRight: 18, minWidth: 140 }}>
      <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, lineHeight: 1 }}>{String(value)}</div>
      <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, color: c.muted, marginTop: 6 }}>{label}</div>
    </div>
  );
}
