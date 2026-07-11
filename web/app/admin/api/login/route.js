// Proxies both admin login paths (owner password-only, staff
// email+password) to flywise-server, then stores the returned token in
// an httpOnly cookie — the raw token is never returned in this
// response body or exposed to page JS. See lib/admin/adminFetch.js's
// header comment for the full rationale.
import { NextResponse } from 'next/server';
import { setAdminSession, API_BASE } from '../../../../lib/admin/adminFetch';

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const { mode, password, email } = body;
  let upstreamPath;
  let upstreamBody;
  if (mode === 'staff') {
    if (!email || !password) return NextResponse.json({ ok: false, error: 'E-Mail und Passwort erforderlich' }, { status: 400 });
    upstreamPath = '/admin/staff-login';
    upstreamBody = { email, password };
  } else {
    if (!password) return NextResponse.json({ ok: false, error: 'Passwort erforderlich' }, { status: 400 });
    upstreamPath = '/admin/login';
    upstreamBody = { password };
  }

  const upstreamRes = await fetch(`${API_BASE}${upstreamPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(upstreamBody),
    cache: 'no-store',
  });
  const data = await upstreamRes.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  if (!upstreamRes.ok || !data.ok) {
    return NextResponse.json({ ok: false, error: data.error || 'Login failed' }, { status: upstreamRes.status });
  }

  await setAdminSession({ token: data.token, role: data.role, name: data.name });
  return NextResponse.json({ ok: true, role: data.role, name: data.name || null });
}
