import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../../../lib/admin/adminFetch';

export async function POST(request, { params }) {
  const { order_id } = await params;
  const res = await adminFetch(`/admin/sync-failures/${encodeURIComponent(order_id)}/resolve`, { method: 'POST' });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
