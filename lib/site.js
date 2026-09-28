// Who and what this site is about. Site settings (admin) can override name / link / tagline.
export const CREATOR = {
  name: 'SparringDK',
  channel: 'https://www.youtube.com/@SparringDK',
  subscribe: 'https://www.youtube.com/@SparringDK?sub_confirmation=1',
};
export const SERIES = 'The Youth Edition';
export const DEFAULT_TAGLINE =
  'The stats hub for SparringDK’s FC27 Youth Edition career: Leicester City with academy players only. Every match, goal, rating and transfer, updated as the series goes on.';

export function creatorInfo(settings) {
  return {
    name: settings?.creator_name || CREATOR.name,
    channel: settings?.youtube_url || CREATOR.channel,
    subscribe: CREATOR.subscribe,
    tagline: settings?.tagline || DEFAULT_TAGLINE,
  };
}

// Who built the site
export const MAKER = { name: 'Accid911', avatar: '/accid911.jpg' };
