export const POSITIONS = ['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'];

export const positionOrder = (p) => {
  const i = POSITIONS.indexOf(String(p || '').toUpperCase());
  return i === -1 ? 99 : i;
};

// Leagues Leicester can play in (lowest → highest)
export const LEAGUES = ['National League', 'EFL League Two', 'EFL League One', 'Championship', 'Premier League', '3. Liga', '2. Bundesliga', 'Bundesliga'];

// Play-offs per league. The result is saved with the season (like a cup run).
// promotes: winning them means promotion — true, or a function of the league position (German play-offs
// are for promotion from 3rd place but for staying up from 16th).
const ENGLISH = (name, places, rounds = ['Semi-final', 'Final']) => ({
  name,
  places,
  results: [
    { value: 'Winner', label: '🏆 Won the final (promoted)' },
    ...[...rounds].reverse().map((r) => ({ value: r, label: `Lost in the ${r.toLowerCase()}` })),
  ],
  promotes: () => true,
});
const GERMAN = (name, places, promotes) => ({
  name,
  places,
  results: [
    { value: 'Winner', label: 'Won the play-off' },
    { value: 'Lost', label: 'Lost the play-off' },
  ],
  promotes,
});
export const PLAYOFFS = {
  'National League': ENGLISH('National League Play-offs', '2nd–7th', ['Quarter-final', 'Semi-final', 'Final']),
  'EFL League Two': ENGLISH('League Two Play-offs', '4th–7th'),
  'EFL League One': ENGLISH('League One Play-offs', '3rd–6th'),
  Championship: ENGLISH('Championship Play-offs', '3rd–6th'),
  '3. Liga': GERMAN('Promotion play-off', '3rd place, against 16th of the 2. Bundesliga', () => true),
  '2. Bundesliga': GERMAN('Bundesliga play-off', '3rd (for promotion) or 16th (to stay up)', (pos) => pos == null || pos <= 3),
  Bundesliga: GERMAN('Relegation play-off', '16th place, to stay up', () => false),
};
export const playoffFor = (league) => PLAYOFFS[league] || null;

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

// Every FIFA nation (football names: England, Scotland, Wales and Northern Ireland separately). You can still type any other country.
export const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Aruba', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados',
  'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana',
  'Brazil', 'British Virgin Islands', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada',
  'Cape Verde', 'Cayman Islands', 'Central African Republic', 'Chad', 'Chile', 'China', 'Chinese Taipei', 'Colombia',
  'Comoros', 'Congo', 'Cook Islands', 'Costa Rica', 'Croatia', 'Cuba', 'Curaçao', 'Cyprus', 'Czechia', 'Denmark',
  'Djibouti', 'Dominica', 'Dominican Republic', 'DR Congo', 'Ecuador', 'Egypt', 'El Salvador', 'England',
  'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Faroe Islands', 'Fiji', 'Finland', 'France',
  'French Guiana', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Gibraltar', 'Greece', 'Grenada', 'Guadeloupe',
  'Guam', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Martinique', 'Mauritania', 'Mauritius', 'Mexico', 'Moldova', 'Mongolia', 'Montenegro', 'Montserrat', 'Morocco',
  'Mozambique', 'Myanmar', 'Namibia', 'Nepal', 'Netherlands', 'New Caledonia', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Northern Ireland', 'Norway', 'Oman', 'Pakistan', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Puerto Rico', 'Qatar', 'Romania',
  'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'São Tomé and Príncipe', 'Saudi Arabia', 'Scotland', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
  'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
  'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Tahiti', 'Tajikistan', 'Tanzania', 'Thailand',
  'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Turks and Caicos Islands',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'Uruguay', 'US Virgin Islands', 'USA', 'Uzbekistan', 'Vanuatu',
  'Venezuela', 'Vietnam', 'Wales', 'Yemen', 'Zambia', 'Zimbabwe',
];

// "kevin o'brien-smith" → "Kevin O'Brien-Smith". Only ever upper-cases (never lowers what you typed).
// Name particles like "van", "de", "da" stay as typed unless they're the first word ("virgil van dijk" → "Virgil van Dijk").
const PARTICLES = new Set(['van', 'der', 'den', 'de', 'da', 'di', 'do', 'dos', 'das', 'del', 'della', 'du', 'la', 'le', 'von', 'ten', 'ter', 'bin', 'al']);
export const capitalizeName = (s) =>
  String(s || '').replace(/(^|[\s\-'’.])(\p{Ll}[\p{L}]*)/gu, (whole, sep, word, offset) =>
    offset > 0 && /\s/.test(sep) && PARTICLES.has(word) ? whole : sep + word[0].toUpperCase() + word.slice(1)
  );
