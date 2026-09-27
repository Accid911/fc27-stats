// Original "Leicester City – Youth Edition" badge for this fan site (not the official club crest).
export default function Logo({ size = 40, className = '' }) {
  const font = "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif";
  return (
    <svg
      className={className}
      width={size}
      height={Math.round(size * 1.125)}
      viewBox="0 0 64 72"
      role="img"
      aria-label="Leicester City Youth Edition badge"
    >
      <path d="M32 3 L59 11 V35 C59 52 47 63 32 69 C17 63 5 52 5 35 V11 Z" fill="#1840b8" stroke="#fdbe11" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 8.5 L54 15 V35 C54 49 44.5 58 32 63.5 C19.5 58 10 49 10 35 V15 Z" fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1" />
      <path d="M32 13.5 l1.8 3.7 4.1 .6 -3 2.9 .7 4.1 -3.6 -1.9 -3.6 1.9 .7 -4.1 -3 -2.9 4.1 -.6 z" fill="#fdbe11" />
      <text x="32" y="41" textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="19" fill="#ffffff" letterSpacing="0.5">LCFC</text>
      <rect x="8.5" y="45" width="47" height="10" rx="2" fill="#fdbe11" />
      <text x="32" y="52.7" textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="8.2" fill="#061233" letterSpacing="1.4">YOUTH</text>
    </svg>
  );
}
