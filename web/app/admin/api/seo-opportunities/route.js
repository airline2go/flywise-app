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
    const res = await adminFetch(`/admin/seo/gsc/data${search}`);
    if (res.status === 401) {
      // Forward auth failures so the client can bounce to login, matching the
      // other admin proxies.
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (res.ok) payload = await res.json().catch(() => null);
  } catch {
    payload = null;
  }

  // Backend unreachable / GSC not connected / no data yet → honest empty (the UI
  // then shows CSV import + a Connect button, never fake rows).
  if (!payload || payload.ok === false || !payload.connected || !Array.isArray(payload.rows) || !payload.rows.length) {
    return NextResponse.json({
      ok: true,
      connected: false,
      generatedAt: new Date().toISOString(),
      rows: [],
      note: 'Google Search Console ist noch nicht verbunden — verbinde es oben oder importiere einen CSV-Export.',
    });
  }

  // `payload.rows` are the raw GSC Pages rows; classify + sort via the pure
  // report builder (the operator's status overlay is loaded separately).
  const rows = buildOpportunityReport(payload.rows, {});
  return NextResponse.json({
    ok: true,
    connected: true,
    generatedAt: payload.generatedAt || new Date().toISOString(),
    dateRange: payload.dateRange || null,
    rows,
  });
}
