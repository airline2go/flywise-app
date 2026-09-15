// Localized flights page (/en/flights/…, /ar/flights/… etc.) — verbatim legacy HTML
// for the requested language, see lib/legacy-render/render.js. Route Handlers
// aren't wrapped by [lang]/layout.js, so the language prefix is validated here:
// an unknown or default-language (/de/…) prefix 404s, matching production.
import { renderFlightRouteHtml, resolveFlightRedirect } from '@/lib/legacy-render/render';
import { resolveRouteSlugAlias } from '@/lib/legacy-render/route-alias';
import { htmlResponse, isPrefixedLang, redirectResponse } from '@/lib/legacy-render/serve';
import { pathFor } from '@/lib/legacy-render/languages';
import { withRouteLocale } from '@/lib/route-locale-context';

export const revalidate = 86400; // 24h — daily safety-net revalidation; admin edits refresh immediately via /api/revalidate
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang, slug } = await params;
  if (!isPrefixedLang(lang)) return htmlResponse(null);

  // Safe alias normalization runs before canonical consolidation. It only
  // redirects to an existing published route and never guesses between
  // multiple airport variants. This preserves link equity without creating
  // redirect chains or 301 -> 404 targets.
  const alias = await resolveRouteSlugAlias(slug);
  if (alias) return redirectResponse(pathFor(lang, `flights/${encodeURIComponent(alias)}`), 301);

  // Canonical/persistent redirects remain the authoritative SEO consolidation
  // layer after alias normalization.
  const redirect = await resolveFlightRedirect(slug);
  if (redirect) return redirectResponse(pathFor(lang, `flights/${encodeURIComponent(redirect.target)}`), redirect.status);

  return withRouteLocale(lang, async () => htmlResponse(await renderFlightRouteHtml(slug, lang)));
}
