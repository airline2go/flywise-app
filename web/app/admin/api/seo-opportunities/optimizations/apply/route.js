import { NextResponse } from 'next/server';
import { adminFetch, getAdminSession } from '../../../../../../lib/admin/adminFetch';

// [SEO-AI-OPTIMIZE §7] Proxy to the backend's APPLY endpoint. Holds NO secret —
// the write to route_pages happens entirely on Render; this only forwards the
// admin session token and the optimization id, and relays the result (incl. the
// captured old/new values). Individual apply only.
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }
  const id = body && typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  try {
    const res = await adminFetch(`/admin/seo/optimizations/${encodeURIComponent(id)}/apply`, { method: 'POST' });
    const data = await res.json().catch(() => null);
    if (!res.ok) return NextResponse.json({ ok: false, error: (data && data.error) || `backend ${res.status}` }, { status: res.status });
    return NextResponse.json({ ok: true, optimization: data && data.optimization, oldValues: data && data.oldValues, newValues: data && data.newValues });
  } catch {
    return NextResponse.json({ ok: false, error: 'backend unreachable' }, { status: 502 });
  }
}
