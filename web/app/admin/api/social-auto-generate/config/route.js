import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../../lib/admin/adminFetch';

// Social Studio daily auto-generation config — proxied to flywise-server.
export const dynamic = 'force-dynamic';

export async function GET() {
  const res = await adminFetch('/admin/social-auto-generate/config');
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(request) {
  const body = await request.text();
  const res = await adminFetch('/admin/social-auto-generate/config', { method: 'PUT', body, headers: { 'Content-Type': 'application/json' } });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
