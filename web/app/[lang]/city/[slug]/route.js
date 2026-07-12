// Localized city page (/en/city/…, /ar/city/… etc.). Serves the verbatim
// legacy HTML for the requested language — see lib/legacy-render/render.js.
import { renderCityHtml } from '@/lib/legacy-render/render';

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang, slug } = await params;
  const html = await renderCityHtml(slug, lang);
  if (!html) return new Response('Not found', { status: 404 });
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
