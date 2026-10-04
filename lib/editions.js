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
};
const clubKey = (club) => String(club || '').toLowerCase().replace(/\b(fc|afc|cf)\b/g, '').replace(/\s+/g, ' ').trim();
export const crestUrl = (ed) => ed?.crest_url || BUILTIN_CRESTS[clubKey(ed?.club)] || null;
