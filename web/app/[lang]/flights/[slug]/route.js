// Localized flights page (/en/flights/…, /ar/flights/… etc.) — verbatim legacy HTML
// for the requested language, see lib/legacy-render/render.js. Route Handlers
// aren't wrapped by [lang]/layout.js, so the language prefix is validated here:
// an unknown or default-language (/de/…) prefix 404s, matching production.
import { renderFlightRouteHtml, resolveCanonicalRedirect } from '@/lib/legacy-render/render';
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
  // [F1] A consolidated duplicate slug 301s to its canonical winner in-language.
  const winner = await resolveCanonicalRedirect(slug);
  if (winner) return redirectResponse(pathFor(lang, `flights/${encodeURIComponent(winner)}`));
  return htmlResponse(await renderFlightRouteHtml(slug, lang));
}
