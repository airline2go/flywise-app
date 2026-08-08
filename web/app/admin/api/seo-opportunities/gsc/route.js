import { NextResponse } from 'next/server';
import { adminFetch, getAdminSession } from '../../../../../lib/admin/adminFetch';

// [GSC-OAUTH] Thin proxy for the Google Search Console connection. Holds NO
// secret — it forwards the admin session token to the backend, which owns the
// OAuth client secret and the stored refresh token.
//   GET               → backend /admin/seo/gsc/status
//   POST {connect}    → backend /admin/seo/gsc/connect  (returns the consent URL)
//   POST {disconnect} → backend /admin/seo/gsc/disconnect
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const res = await adminFetch('/admin/seo/gsc/status');
    if (!res.ok) return NextResponse.json({ ok: true, configured: false, connected: false });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data || { ok: true, configured: false, connected: false });
  } catch {
    return NextResponse.json({ ok: true, configured: false, connected: false });
  }
}

export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const action = body && body.action;

  try {
    if (action === 'connect') {
      const res = await adminFetch('/admin/seo/gsc/connect');
      const data = await res.json().catch(() => null);
      if (!res.ok) return NextResponse.json({ ok: false, error: (data && data.error) || `backend ${res.status}` }, { status: res.status });
      return NextResponse.json({ ok: true, authUrl: data && data.authUrl });
    }
    if (action === 'disconnect') {
      const res = await adminFetch('/admin/seo/gsc/disconnect', { method: 'POST' });
      const data = await res.json().catch(() => null);
      return NextResponse.json(data || { ok: true, connected: false });
    }
    return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: 'backend unreachable' }, { status: 502 });
  }
}
