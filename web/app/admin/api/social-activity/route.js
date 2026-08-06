import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../lib/admin/adminFetch';

// Social Studio activity feed (audit log) — proxied to flywise-server.
export const dynamic = 'force-dynamic';

export async function GET() {
  const res = await adminFetch('/admin/social-activity');
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
