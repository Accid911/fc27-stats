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
