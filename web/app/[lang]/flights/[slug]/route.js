// Localized flights page (/en/flights/…, /ar/flights/… etc.) — verbatim legacy HTML
// for the requested language, see lib/legacy-render/render.js. Route Handlers
// aren't wrapped by [lang]/layout.js, so the language prefix is validated here:
// an unknown or default-language (/de/…) prefix 404s, matching production.
import { renderFlightRouteHtml, resolveFlightRedirect } from '@/lib/legacy-render/render';
import { htmlResponse, isPrefixedLang, redirectResponse } from '@/lib/legacy-render/serve';
import { pathFor } from '@/lib/legacy-render/languages';

export const revalidate = 86400; // 24h — daily safety-net revalidation; admin edits refresh immediately via /api/revalidate
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang, slug } = await params;
  if (!isPrefixedLang(lang)) return htmlResponse(null);
  // [VERIFIED-REDIRECT] Persistent redirect then canonical backstop, applied by
  // resolveFlightRedirect — which only ever returns a target that renders, so no
  // localized URL can 301 into a 404 either. null → render the slug in `lang`.
  const redirect = await resolveFlightRedirect(slug);
  if (redirect) return redirectResponse(pathFor(lang, `flights/${encodeURIComponent(redirect.target)}`), redirect.status);
  return htmlResponse(await renderFlightRouteHtml(slug, lang));
}
