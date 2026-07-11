import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../../lib/admin/adminFetch';

export async function POST() {
  const res = await adminFetch('/admin/booking-failures/mark-read', { method: 'POST' });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
