import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../../lib/admin/adminFetch';

// Manually trigger a daily auto-generation cycle now — proxied to flywise-server.
export const dynamic = 'force-dynamic';

export async function POST() {
  const res = await adminFetch('/admin/social-auto-generate/run', { method: 'POST' });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
