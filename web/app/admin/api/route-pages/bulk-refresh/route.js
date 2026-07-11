import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../../lib/admin/adminFetch';

export async function PUT(request) {
  const body = await request.text();
  const res = await adminFetch('/admin/route-pages/bulk-refresh', { method: 'PUT', body });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
