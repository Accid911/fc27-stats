'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { readAdminCookie, setAdminCookie } from '@/lib/admin-cookie';

// Supabase keeps a signed-in session in localStorage under "sb-<project>-auth-token".
function hasStoredSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) if (/^sb-.*-auth-token$/.test(localStorage.key(i) || '')) return true;
  } catch {}
  return false;
}

// On archive pages: if you're signed in to the admin in this browser, refresh the access cookie
// (it expires after an hour) and reload the page so hidden editions appear.
// The database code is only downloaded when there is a session — visitors never need it.
export default function AdminSessionSync() {
  const router = useRouter();
  useEffect(() => {
    if (!hasStoredSession()) return;
    let stop = false;
    import('@/lib/supabase').then(({ getSupabase }) => {
      const sb = getSupabase();
      if (!sb || stop) return;
      sb.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token;
        if (stop || !token || token === readAdminCookie()) return;
        setAdminCookie(token);
        router.refresh();
      });
    });
    return () => {
      stop = true;
    };
  }, [router]);
  return null;
}
