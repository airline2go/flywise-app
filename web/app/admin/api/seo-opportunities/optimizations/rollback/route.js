import { NextResponse } from 'next/server';
import { adminFetch, getAdminSession } from '../../../../../../lib/admin/adminFetch';

// [SEO-AI-OPTIMIZE §18] Proxy to the backend's ROLLBACK endpoint. Holds NO
// secret — the restore of route_pages to its captured previous values happens
// entirely on Render; this only forwards the admin session token, the
// optimization id, and an optional reason.
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }
  const id = body && typeof body.id === 'string' ? body.id.trim() : '';
  const reason = body && typeof body.reason === 'string' ? body.reason : null;
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  try {
    const res = await adminFetch(`/admin/seo/optimizations/${encodeURIComponent(id)}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return NextResponse.json({ ok: false, error: (data && data.error) || `backend ${res.status}` }, { status: res.status });
    return NextResponse.json({ ok: true, optimization: data && data.optimization });
  } catch {
    return NextResponse.json({ ok: false, error: 'backend unreachable' }, { status: 502 });
  }
}
