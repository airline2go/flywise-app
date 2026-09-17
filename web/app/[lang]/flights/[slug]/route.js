// Localized flights page (/en/flights/…, /ar/flights/… etc.) — verbatim legacy HTML
// for the requested language, see lib/legacy-render/render.js. Route Handlers
// aren't wrapped by [lang]/layout.js, so the language prefix is validated here:
// an unknown or default-language (/de/…) prefix 404s, matching production.
import { renderFlightRouteHtml, resolveFlightRedirect } from '@/lib/legacy-render/render';
import { renderCanonicalRoutePriceHtml } from '@/lib/legacy-render/route-html-enhance';
import { renderRouteSearchPanelHtml } from '@/lib/legacy-render/route-search-panel';
import { getRoutePage } from '@/lib/content-api';
import { getRouteSearchData } from '@/lib/route-search-data';
import { resolveRouteSlugAlias } from '@/lib/legacy-render/route-alias';
import { htmlResponse, isPrefixedLang, redirectResponse } from '@/lib/legacy-render/serve';
import { getAvailableRouteHreflang, stripUnavailableRouteHreflang } from '@/lib/route-hreflang';
import { pathFor } from '@/lib/legacy-render/languages';
import { withRouteLocale } from '@/lib/route-locale-context';

// Route catalogue changes can happen outside a frontend deploy; keep the
// on-demand safety-net short enough that a newly published route does not
// remain a cached 404 for more than 15 minutes. Admin publishes still
// revalidate immediately through /api/revalidate.
export const revalidate = 900;
// Let Next/Vercel apply the ISR policy from the route's revalidate setting and
// its cacheable fetches. Forcing `force-static` caused this dynamic slug handler
// to remain a static route output across deployments, which could preserve an
// older HTML shell even after code changes. `auto` keeps cached data while
// allowing the handler to execute when an ISR entry is regenerated.
export const dynamic = 'auto';
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang, slug } = await params;
  if (!isPrefixedLang(lang)) return htmlResponse(null);

  const alias = await resolveRouteSlugAlias(slug);
  if (alias) return redirectResponse(pathFor(lang, `flights/${encodeURIComponent(alias)}`), 301);

  const redirect = await resolveFlightRedirect(slug);
  if (redirect) return redirectResponse(pathFor(lang, `flights/${encodeURIComponent(redirect.target)}`), redirect.status);

  return withRouteLocale(lang, async () => {
    const html = await renderFlightRouteHtml(slug, lang);
    const withPrice = await renderCanonicalRoutePriceHtml(html, slug, lang);
    const route = await getRouteSearchData(slug) || await getRoutePage(slug);
    const rendered = route ? renderRouteSearchPanelHtml(withPrice, route, lang) : withPrice;
    try {
      const robotsTag = rendered.match(/<meta\b[^>]*\bname=["']robots["'][^>]*>/i)?.[0] || '';
      const noindex = /\bnoindex\b/i.test(robotsTag);
      const available = noindex ? new Set() : await getAvailableRouteHreflang(slug);
      return htmlResponse(stripUnavailableRouteHreflang(rendered, available));
    } catch {
      return htmlResponse(rendered);
    }
  });
}
