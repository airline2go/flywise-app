// Shared proxy for GET /admin/bookings — used by both the customers tab
// (aggregates bookings client-side into per-customer rows, matching
// admin.js's buildCustomers()) and the bookings tab itself.
import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../lib/admin/adminFetch';

export async function GET(request) {
  const { search } = new URL(request.url);
  const res = await adminFetch(`/admin/bookings${search}`);
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
