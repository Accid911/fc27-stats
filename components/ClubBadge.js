import Logo from './Logo';
import { clubInitials, crestUrl } from '@/lib/editions';
import { editionTheme } from '@/lib/themes';

// Crest for an edition: uploaded crest URL, the Leicester crest for the current edition, or an initials badge.
export default function ClubBadge({ edition, size = 40, className = '' }) {
  const crest = crestUrl(edition);
  if (crest) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={crest} width={size} height={size} alt={`${edition.club} crest`} className={`logo-img ${className}`} style={{ objectFit: 'contain' }} />;
  }
  if (!edition || edition.is_current) return <Logo size={size} className={className} />;
  const badge = editionTheme(edition)?.badge;
  return (
    <span
      className={`initials-badge ${className}`}
      style={{
        width: size, height: size, fontSize: Math.round(size * 0.32),
        // personalised edition without a crest yet: the badge in the club's colours
        ...(badge ? { background: badge.bg, color: badge.fg, borderColor: badge.ring, borderWidth: Math.max(2, Math.round(size / 18)) } : {}),
      }}
      aria-label={`${edition.club} badge`}
    >
      {clubInitials(edition.club)}
    </span>
  );
}
