import AdminApp from '@/components/admin/AdminApp';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };

export default function AdminPage() {
  return <AdminApp />;
}
