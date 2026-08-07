import { NextResponse } from 'next/server';
import { adminFetch } from '../../../../lib/admin/adminFetch';
import reportMod from '../../../../lib/seo/report.js';

// [SEO-OPPORTUNITY §7] Admin report data source. Proxies to flywise-server's
// GSC feed, then normalizes + classifies + sorts server-side via the pure
// report builder. The classifier/report carry NO GSC numbers of their own — the
// rows come only from the backend feed here, so wiring up a live Google Search
// Console OAuth/API on the server later needs zero change on this side.
//
// Until that feed exists, the backend endpoint may be absent — we then return an
// explicit `connected: false` with an empty report (NEVER the dev sample data),
// so the UI shows an honest "not connected yet" state instead of fake rows.
const { buildOpportunityReport } = reportMod;

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { search } = new URL(request.url);

  let payload = null;
  try {
    const res = await adminFetch(`/admin/seo-opportunities${search}`);
    if (res.status === 401) {
      // Forward auth failures so the client can bounce to login, matching the
      // other admin proxies.
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (res.ok) payload = await res.json().catch(() => null);
  } catch {
    payload = null;
  }

  // Backend not reachable / endpoint not deployed / no data yet → honest empty.
  if (!payload || payload.ok === false || !Array.isArray(payload.rows)) {
    return NextResponse.json({
      ok: true,
      connected: false,
      generatedAt: new Date().toISOString(),
      rows: [],
      note: 'No Google Search Console feed is connected yet. Connect GSC on the server (/admin/seo-opportunities) to populate this report.',
    });
  }

  // `payload.rows` are raw GSC rows; `payload.status` is the optional per-URL
  // operator overlay (optimization status + last-optimized date).
  const rows = buildOpportunityReport(payload.rows, payload.status || {});
  return NextResponse.json({
    ok: true,
    connected: true,
    generatedAt: payload.generatedAt || new Date().toISOString(),
    dateRange: payload.dateRange || null,
    rows,
  });
}
