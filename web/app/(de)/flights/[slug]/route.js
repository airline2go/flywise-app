// German flight-route page (unprefixed root) — verbatim legacy HTML, see
// lib/legacy-render/render.js.
import { renderFlightRouteHtml, resolveFlightRedirect } from '@/lib/legacy-render/render';
import { renderCanonicalRoutePriceHtml } from '@/lib/legacy-render/route-html-enhance';
import { resolveRouteSlugAlias } from '@/lib/legacy-render/route-alias';
import { htmlResponse, redirectResponse } from '@/lib/legacy-render/serve';
import { getAvailableRouteHreflang, stripUnavailableRouteHreflang } from '@/lib/route-hreflang';
import { pathFor } from '@/lib/legacy-render/languages';

// Route catalogue changes can happen outside a frontend deploy; keep the
// on-demand safety-net short enough that a newly published route does not
// remain a cached 404 for more than 15 minutes. Admin publishes still revalidate
// immediately through /api/revalidate.
export const revalidate = 900;
export const dynamic = 'force-static';

// [BUILD-SAFETY] Flight-route pages must never be prerendered from the live
// catalogue during `next build`. The catalogue/API is protected and may return
// 403/429 to Vercel's build workers. Routes are generated and cached on demand
// when requested, while the 15-minute revalidation window keeps the catalogue
// reasonably fresh. This also removes build-time dependence on route-page data.

export async function GET(_req, { params }) {
  const { slug } = await params;

  // Safe alias normalization runs before canonical consolidation. It only
  // redirects to an existing published route and never guesses between
  // multiple airport variants. This preserves link equity without creating
  // redirect chains or 301 -> 404 targets.
  const alias = await resolveRouteSlugAlias(slug);
  if (alias) return redirectResponse(pathFor('de', `flights/${encodeURIComponent(alias)}`), 301);

  // Persistent/admin redirects and canonical consolidation remain the
  // authoritative SEO consolidation layer after alias normalization.
  const redirect = await resolveFlightRedirect(slug);
  if (redirect) return redirectResponse(pathFor('de', `flights/${encodeURIComponent(redirect.target)}`), redirect.status);

  const html = await renderFlightRouteHtml(slug, 'de');
  const rendered = await renderCanonicalRoutePriceHtml(html, slug, 'de');
  try {
    // A noindex route must not advertise reciprocal language alternates.
    // Detect the final SSR robots verdict rather than re-implementing the
    // backend indexability policy in this handler.
    const robotsTag = rendered.match(/<meta\b[^>]*\bname=["']robots["'][^>]*>/i)?.[0] || '';
    const noindex = /\bnoindex\b/i.test(robotsTag);
    const available = noindex ? new Set() : await getAvailableRouteHreflang(slug);
    return htmlResponse(stripUnavailableRouteHreflang(rendered, available));
  } catch {
    // Hreflang filtering is a safety layer. A temporary availability-endpoint
    // failure must never turn an otherwise healthy route page into a 5xx.
    return htmlResponse(rendered);
  }
}
