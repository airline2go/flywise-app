import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../../lib/admin/adminFetch';

// [DEAD-ROUTES] Bulk-delete every route flagged 'dead'. A static `dead`
// segment here takes precedence over the sibling `[id]` route, so this
// never gets treated as a route id.
export async function DELETE() {
  const res = await adminFetch('/admin/route-pages/dead', { method: 'DELETE' });
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
  return NextResponse.json(data, { status: res.status });
}
