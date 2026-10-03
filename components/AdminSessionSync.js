'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { readAdminCookie, setAdminCookie } from '@/lib/admin-cookie';

// On archive pages: if you're signed in to the admin in this browser, refresh the access cookie
// (it expires after an hour) and reload the page so hidden editions appear.
export default function AdminSessionSync() {
  const router = useRouter();
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let stop = false;
    sb.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (stop || !token || token === readAdminCookie()) return;
      setAdminCookie(token);
      router.refresh();
    });
    return () => {
      stop = true;
    };
  }, [router]);
  return null;
}
