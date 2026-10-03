export const POSITIONS = ['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'];

export const positionOrder = (p) => {
  const i = POSITIONS.indexOf(String(p || '').toUpperCase());
  return i === -1 ? 99 : i;
};

// Leagues Leicester can play in (lowest → highest)
export const LEAGUES = ['National League', 'EFL League Two', 'EFL League One', 'Championship', 'Premier League', '3. Liga', '2. Bundesliga', 'Bundesliga'];

// Cups that can be added to a season
export const CUPS = [
  'FA Cup',
  'EFL Cup',
  'EFL Trophy',
  'FA Trophy',
  'DFB-Pokal',
  'Community Shield',
  'Champions League',
  'Europa League',
  'Conference League',
  'UEFA Super Cup',
  'Club World Cup',
];

export const CURRENCIES = ['£', '€', '$'];

export const COUNTRIES = [
  'England', 'Scotland', 'Wales', 'Northern Ireland', 'Ireland', 'Belgium', 'Netherlands', 'France', 'Germany', 'Spain',
  'Portugal', 'Italy', 'Switzerland', 'Austria', 'Denmark', 'Norway', 'Sweden', 'Finland', 'Poland', 'Czechia', 'Croatia',
  'Serbia', 'Slovenia', 'Hungary', 'Ukraine', 'Turkey', 'Greece', 'Morocco', 'Algeria', 'Tunisia', 'Egypt', 'Senegal',
  'Ivory Coast', 'Ghana', 'Nigeria', 'Cameroon', 'Mali', 'DR Congo', 'South Africa', 'USA', 'Canada', 'Mexico', 'Jamaica',
  'Brazil', 'Argentina', 'Uruguay', 'Colombia', 'Chile', 'Ecuador', 'Japan', 'South Korea', 'Australia', 'New Zealand',
];

// "kevin o'brien-smith" → "Kevin O'Brien-Smith". Only ever upper-cases (never lowers what you typed).
// Name particles like "van", "de", "da" stay as typed unless they're the first word ("virgil van dijk" → "Virgil van Dijk").
const PARTICLES = new Set(['van', 'der', 'den', 'de', 'da', 'di', 'do', 'dos', 'das', 'del', 'della', 'du', 'la', 'le', 'von', 'ten', 'ter', 'bin', 'al']);
export const capitalizeName = (s) =>
  String(s || '').replace(/(^|[\s\-'’.])(\p{Ll}[\p{L}]*)/gu, (whole, sep, word, offset) =>
    offset > 0 && /\s/.test(sep) && PARTICLES.has(word) ? whole : sep + word[0].toUpperCase() + word.slice(1)
  );
