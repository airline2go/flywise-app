import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../lib/admin/adminFetch';

// Social Studio queue — proxies to flywise-server's /admin/social-posts (which
// owns the service-role DB access + auth), exactly like the blog/routes admin.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const status = new URL(request.url).searchParams.get('status');
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await adminFetch(`/admin/social-posts${qs}`);
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request) {
  const body = await request.text();
  const res = await adminFetch('/admin/social-posts', { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
