import AdminSessionSync from '@/components/AdminSessionSync';

// Archive pages are not indexed by search engines while the archive is private.
export const metadata = { robots: { index: false, follow: false } };

export default function ArchiveLayout({ children }) {
  return (
    <>
      <AdminSessionSync />
      {children}
    </>
  );
}
