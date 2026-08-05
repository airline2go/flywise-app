import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../lib/admin/adminFetch';

// "Recommended Today" opportunity candidates — proxied to flywise-server, which
// computes real price drops from route_price_history. The frontend scores them.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const limit = new URL(request.url).searchParams.get('limit');
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : '';
  const res = await adminFetch(`/admin/content-opportunities${qs}`);
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
