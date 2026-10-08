// Youth Edition archive helpers (safe to use in the browser and on the server).

export const editionPath = (ed) => `/editions/${ed.number}`;
export const editionLabel = (ed) => (ed ? `#${ed.number} · ${ed.game} · ${ed.club}` : '');

export const TABLES_WITH_EDITION = ['seasons', 'standings', 'players', 'player_moves', 'matches', 'match_players', 'trophies'];

// Keep only one edition's rows (rows without edition_id = before migration 007 → always kept).
export function filterByEdition(data, editionId) {
  if (!editionId) return data;
  const out = { ...data };
  for (const t of TABLES_WITH_EDITION) {
    out[t] = (data[t] || []).filter((r) => !r.edition_id || r.edition_id === editionId);
  }
  return out;
}

// Settings for an edition page: same site settings, but that edition's club.
export function editionSettings(settings, ed) {
  return { ...(settings || {}), club_name: ed.club };
}

// Initials badge for clubs without a crest yet, e.g. "Newport County" → "NC"
export function clubInitials(club) {
  const words = String(club || '').replace(/\b(FC|AFC|CF)\b/gi, '').trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.slice(0, 3).map((w) => w[0]) : [words[0]?.slice(0, 3) || '?']).join('').toUpperCase();
}

export const ADMIN_COOKIE = 'ye_admin';

// Crests that ship with the site (public/crests). A crest URL set in Admin → Editions wins.
const BUILTIN_CRESTS = {
  'cambridge united': '/crests/cambridge-united.png',
  'bromley': '/crests/bromley.png',
  'sutton united': '/crests/sutton-united.png',
  '1860 munich': '/crests/1860-munich.png',
  'newport county': '/crests/newport-county.png',
  'notts county': '/crests/notts-county.png',
  'cheltenham town': '/crests/cheltenham-town.png',
  'forest green rovers': '/crests/forest-green-rovers.png',
  'oldham athletic': '/crests/oldham-athletic.png',
  'salford city': '/crests/salford-city.png',
  'bolton wanderers': '/crests/bolton-wanderers.png',
  'hartlepool united': '/crests/hartlepool-united.png',
};
const clubKey = (club) => String(club || '').toLowerCase().replace(/\b(fc|afc|cf)\b/g, '').replace(/\s+/g, ' ').trim();
// A crest URL from the database must be a normal web link or a site path like /crests/x.png.
const okCrest = (u) => (typeof u === 'string' && (/^https?:\/\//i.test(u) || /^\/[^/]/.test(u)) ? u : null);
export const crestUrl = (ed) => okCrest(ed?.crest_url) || BUILTIN_CRESTS[clubKey(ed?.club)] || null;
