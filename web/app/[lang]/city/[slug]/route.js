// Localized city page (/en/city/…, /ar/city/… etc.) — verbatim legacy HTML
// for the requested language, see lib/legacy-render/render.js. Route Handlers
// aren't wrapped by [lang]/layout.js, so the language prefix is validated here:
// an unknown or default-language (/de/…) prefix 404s, matching production.
import { renderCityHtml } from '@/lib/legacy-render/render';
import { htmlResponse, isPrefixedLang } from '@/lib/legacy-render/serve';

export const revalidate = 86400; // 24h — daily safety-net revalidation; admin edits refresh immediately via /api/revalidate
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang, slug } = await params;
  if (!isPrefixedLang(lang)) return htmlResponse(null);
  return htmlResponse(await renderCityHtml(slug, lang));
}
