import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../../../lib/admin/adminFetch';

// Restore a queued post's content to an earlier version — proxied to flywise-server.
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { id } = await params;
  const body = await request.text();
  const res = await adminFetch(`/admin/social-posts/${encodeURIComponent(id)}/revert`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
