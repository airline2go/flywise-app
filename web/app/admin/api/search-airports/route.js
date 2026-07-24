import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../lib/admin/adminFetch';

// [ADMIN-SEARCH-PROXY] Server-side proxy for the public GET /search/airports
// endpoint used by the route-page editor's airport/city autocomplete
// (AirportAutocomplete, BulkRouteModal, RouteMatrixModal). Those components
// used to call https://api.airpiv.com/search/airports DIRECTLY from the
// browser — which only works from the exact origin the API's CORS allowlist
// names (https://airpiv.com). On any other origin (Vercel preview deployments,
// a new domain, localhost dev) the browser blocks the cross-origin request, the
// components' catch() swallows it, and the dropdown silently shows nothing.
// Routing it through this same-origin handler makes the request server-to-
// server (no CORS at all), so the autocomplete works everywhere the admin does.
export async function GET(request) {
  const { search } = new URL(request.url);
  const res = await adminFetch(`/search/airports${search}`);
  const data = await res.json().catch(() => ({ ok: false, airports: [] }));
  return NextResponse.json(data, { status: res.status });
}
