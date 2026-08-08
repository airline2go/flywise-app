import { NextResponse } from 'next/server';
import { adminFetch, getAdminSession } from '../../../../../lib/admin/adminFetch';

// [SEO-AI-OPTIMIZE §16-17] Thin proxy to the trusted backend's optimization
// history + review lifecycle. Holds NO secret — it forwards the admin session
// token to api.airpiv.com and relays the response. Record/audit only; it applies
// nothing to any live page.
//
//   GET   ?slug=&language=   → GET  /admin/seo/optimizations  (route history)
//   PATCH  { id, status }    → PATCH /admin/seo/optimizations/:id (status)
export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9-]{2,80}$/i;
const STATUSES = new Set(['generated', 'reviewed', 'approved', 'rejected', 'applied']);

export async function GET(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get('slug') || '').trim();
  if (!SLUG_RE.test(slug)) return NextResponse.json({ ok: false, error: 'Invalid slug' }, { status: 400 });
  const language = (searchParams.get('language') || '').trim();

  const qs = new URLSearchParams({ slug });
  if (language) qs.set('language', language);
  try {
    const res = await adminFetch(`/admin/seo/optimizations?${qs.toString()}`, { method: 'GET' });
    if (!res.ok) return NextResponse.json({ ok: true, configured: false, optimizations: [] });
    const data = await res.json().catch(() => null);
    return NextResponse.json({ ok: true, configured: true, optimizations: (data && data.optimizations) || [] });
  } catch {
    // Backend unreachable → empty history rather than an error (feature optional).
    return NextResponse.json({ ok: true, configured: false, optimizations: [] });
  }
}

export async function PATCH(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }
  const id = body && typeof body.id === 'string' ? body.id.trim() : '';
  const status = body && body.status;
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  if (!STATUSES.has(status)) return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });

  try {
    const res = await adminFetch(`/admin/seo/optimizations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return NextResponse.json({ ok: false, error: (data && data.error) || `backend ${res.status}` }, { status: res.status });
    return NextResponse.json({ ok: true, optimization: data && data.optimization });
  } catch {
    return NextResponse.json({ ok: false, error: 'backend unreachable' }, { status: 502 });
  }
}
