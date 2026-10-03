'use client';
import { ADMIN_COOKIE } from './editions';

// Lets archive pages (server-rendered) know a signed-in admin is looking, so hidden editions can be shown.
export function setAdminCookie(token) {
  if (!token) return clearAdminCookie();
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ADMIN_COOKIE}=${token}; Path=/; Max-Age=3600; SameSite=Lax${secure}`;
}
export function clearAdminCookie() {
  document.cookie = `${ADMIN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
export function readAdminCookie() {
  const m = document.cookie.match(new RegExp(`(?:^|; )${ADMIN_COOKIE}=([^;]*)`));
  return m ? m[1] : '';
}
