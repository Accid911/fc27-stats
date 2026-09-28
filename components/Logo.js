// Club crest (public/crest.png). To change it, replace that file (square PNG, transparent background).
export default function Logo({ size = 40, className = '' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/crest.png" width={size} height={size} alt="Leicester City crest" className={className} style={{ display: 'block' }} />
  );
}
