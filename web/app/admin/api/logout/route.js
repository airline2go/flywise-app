// Clears the admin session cookies. Best-effort revokes the server-side
// staff session too (a no-op on flywise-server's side for the legacy
// shared ADMIN_TOKEN, which isn't a real session — same as the old
// admin.js's staff-logout behavior).
import { NextResponse } from 'next/server';
import { adminFetch, clearAdminSession } from '../../../../lib/admin/adminFetch';

export async function POST() {
  await adminFetch('/admin/staff-logout', { method: 'POST' }).catch(() => {});
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
