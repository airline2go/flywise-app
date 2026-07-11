// Thin proxy to flywise-server's /admin/route-pages (list + create) —
// forwards the query string/body as-is and passes the upstream status
// code straight through, matching the old adminFetch()'s "the caller
// checks j.ok" contract rather than reinterpreting errors here.
import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../lib/admin/adminFetch';

export async function GET(request) {
  const { search } = new URL(request.url);
  const res = await adminFetch(`/admin/route-pages${search}`);
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request) {
  const body = await request.text();
  const res = await adminFetch('/admin/route-pages', { method: 'POST', body });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
