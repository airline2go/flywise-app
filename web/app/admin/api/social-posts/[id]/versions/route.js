import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../../../lib/admin/adminFetch';

// Content version history for a queued post — proxied to flywise-server.
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = await params;
  const res = await adminFetch(`/admin/social-posts/${encodeURIComponent(id)}/versions`);
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
