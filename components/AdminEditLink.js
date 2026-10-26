'use client';

import { useEffect, useState } from 'react';

// Small "Edit in admin" link, only shown in a browser where an admin is signed in
// (Supabase keeps the session in localStorage as "sb-<project>-auth-token"). Visitors never see it.
export default function AdminEditLink({ href, label = '✎ Edit in admin' }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) if (/^sb-.*-auth-token$/.test(localStorage.key(i) || '')) return setShow(true);
    } catch {}
  }, []);
  if (!show) return null;
  return (
    <a className="btn secondary small" href={href}>
      {label}
    </a>
  );
}
