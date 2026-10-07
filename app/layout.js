import '@fontsource-variable/inter';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { CREATOR, SERIES } from '@/lib/site';
import './globals.css';

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000';
const description = `Fan-made stats for ${CREATOR.name}'s FC27 career mode series ${SERIES}: Leicester City with academy players only. Every season, match, player and transfer.`;

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${CREATOR.name}'s Youth Edition — Leicester City FC27 career stats`,
    template: `%s · ${CREATOR.name} Youth Edition`,
  },
  description,
  openGraph: {
    title: `${CREATOR.name}'s Youth Edition — Leicester City`,
    description,
    type: 'website',
    siteName: `${CREATOR.name} Youth Edition stats`,
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
