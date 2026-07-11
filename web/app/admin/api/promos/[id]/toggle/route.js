import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../../../lib/admin/adminFetch';

export async function POST(request, { params }) {
  const { id } = await params;
  const res = await adminFetch(`/admin/promos/${encodeURIComponent(id)}/toggle`, { method: 'POST' });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
