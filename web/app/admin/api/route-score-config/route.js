import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../lib/admin/adminFetch';

export async function GET() {
  const res = await adminFetch('/admin/route-score-config');
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request) {
  const body = await request.text();
  const res = await adminFetch('/admin/route-score-config', { method: 'POST', body });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
