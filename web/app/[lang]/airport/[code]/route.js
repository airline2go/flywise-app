// Localized airport page (/en/airport/…, /ar/airport/… etc.) — verbatim legacy HTML
// for the requested language, see lib/legacy-render/render.js. Route Handlers
// aren't wrapped by [lang]/layout.js, so the language prefix is validated here:
// an unknown or default-language (/de/…) prefix 404s, matching production.
import { renderAirportHtml } from '@/lib/legacy-render/render';
import { htmlResponse, isPrefixedLang } from '@/lib/legacy-render/serve';

export const revalidate = 86400; // 24h — daily safety-net revalidation; admin edits refresh immediately via /api/revalidate
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang, code } = await params;
  if (!isPrefixedLang(lang)) return htmlResponse(null);
  return htmlResponse(await renderAirportHtml(code, lang));
}
