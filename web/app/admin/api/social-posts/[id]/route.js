import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../../lib/admin/adminFetch';

// Update (status / schedule / publish / notes) or delete a queued post —
// proxied to flywise-server, which enforces auth and validates the fields.
export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.text();
  const res = await adminFetch(`/admin/social-posts/${encodeURIComponent(id)}`, { method: 'PUT', body, headers: { 'Content-Type': 'application/json' } });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const res = await adminFetch(`/admin/social-posts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
