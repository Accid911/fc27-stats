export const POSITIONS = ['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'];

export const positionOrder = (p) => {
  const i = POSITIONS.indexOf(String(p || '').toUpperCase());
  return i === -1 ? 99 : i;
};

export const TOURNAMENTS = [
  'Premier League',
  'Championship',
  'FA Cup',
  'EFL Cup',
  'Community Shield',
  'Champions League',
  'Europa League',
  'Conference League',
  'UEFA Super Cup',
  'Club World Cup',
  'Friendly',
];

export const COUNTRIES = [
  'England', 'Scotland', 'Wales', 'Northern Ireland', 'Ireland', 'Belgium', 'Netherlands', 'France', 'Germany', 'Spain',
  'Portugal', 'Italy', 'Switzerland', 'Austria', 'Denmark', 'Norway', 'Sweden', 'Finland', 'Poland', 'Czechia', 'Croatia',
  'Serbia', 'Slovenia', 'Hungary', 'Ukraine', 'Turkey', 'Greece', 'Morocco', 'Algeria', 'Tunisia', 'Egypt', 'Senegal',
  'Ivory Coast', 'Ghana', 'Nigeria', 'Cameroon', 'Mali', 'DR Congo', 'South Africa', 'USA', 'Canada', 'Mexico', 'Jamaica',
  'Brazil', 'Argentina', 'Uruguay', 'Colombia', 'Chile', 'Ecuador', 'Japan', 'South Korea', 'Australia', 'New Zealand',
];
