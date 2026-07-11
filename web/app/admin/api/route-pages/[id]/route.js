import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../../lib/admin/adminFetch';

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.text();
  const res = await adminFetch(`/admin/route-pages/${encodeURIComponent(id)}`, { method: 'PUT', body });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const res = await adminFetch(`/admin/route-pages/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
