// German flight-route page (unprefixed root) — verbatim legacy HTML, see
// lib/legacy-render/render.js.
import { renderFlightRouteHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';
import { listRoutePages } from '@/lib/content-api';

export const revalidate = 86400; // 24h — daily safety-net revalidation; admin edits refresh immediately via /api/revalidate
export const dynamicParams = true;

// [PRERENDER-TOP-ROUTES] Prerender only the highest-value German flight routes
// at build time (ranked by route_score). Those pages are then baked into every
// deployment — always present, instantly crawlable, and never regenerated on a
// cold first hit after a deploy. dynamicParams=true keeps the entire long tail
// on-demand (built + cached on first visit, then held per the revalidate window
// above), so build time stays bounded and adding a new route needs no code
// change. Only German (the default/root language) is prerendered here — the six
// prefixed languages stay fully on-demand by design. Tune the count with the
// PRERENDER_TOP_ROUTES env var (0 disables prerendering entirely).
const PRERENDER_TOP_ROUTES = Number(process.env.PRERENDER_TOP_ROUTES ?? 300);

export async function generateStaticParams() {
  if (!Number.isFinite(PRERENDER_TOP_ROUTES) || PRERENDER_TOP_ROUTES <= 0) return [];
  try {
    const routes = await listRoutePages();
    return [...routes]
      .filter((r) => r && r.slug)
      .sort((a, b) => (b.route_score || 0) - (a.route_score || 0))
      .slice(0, PRERENDER_TOP_ROUTES)
      .map((r) => ({ slug: r.slug }));
  } catch (e) {
    // A backend hiccup at build time must never fail the whole deploy — fall
    // back to pure on-demand generation (empty list = prior behavior).
    console.warn(`[generateStaticParams] flights prerender skipped: ${e.message}`);
    return [];
  }
}

export async function GET(_req, { params }) {
  const { slug } = await params;
  return htmlResponse(await renderFlightRouteHtml(slug, 'de'));
}
