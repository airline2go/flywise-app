// Localized country page (/en/country/…, /ar/country/… etc.) — verbatim legacy HTML
// for the requested language, see lib/legacy-render/render.js. Route Handlers
// aren't wrapped by [lang]/layout.js, so the language prefix is validated here:
// an unknown or default-language (/de/…) prefix 404s, matching production.
import { renderCountryHtml } from '@/lib/legacy-render/render';
import { htmlResponse, isPrefixedLang } from '@/lib/legacy-render/serve';

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang, code } = await params;
  if (!isPrefixedLang(lang)) return htmlResponse(null);
  return htmlResponse(await renderCountryHtml(code, lang));
}
