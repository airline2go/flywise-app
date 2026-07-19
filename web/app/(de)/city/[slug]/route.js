// German city page (unprefixed root). Serves the verbatim legacy HTML — see
// lib/legacy-render/render.js. A Route Handler (not a page) is required so the
// full original <html> document is returned byte-for-byte, without Next's
// root layout wrapping it.
import { renderCityHtml } from '@/lib/legacy-render/render';

export const revalidate = 86400; // 24h — daily safety-net revalidation; admin edits refresh immediately via /api/revalidate
export const dynamicParams = true;

// On-demand generation: nothing prebuilt at deploy, each slug renders on its
// first visit then caches — mirrors the pages this replaces.
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { slug } = await params;
  const html = await renderCityHtml(slug, 'de');
  if (!html) return new Response('Not found', { status: 404 });
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
