// German (unprefixed root) HTML sitemap hub — /sitemap. Serves the verbatim
// legacy HTML like every other entity page (see lib/legacy-render/render.js); a
// Route Handler is required so the full original <html> document is returned
// without Next's root layout wrapping it. Distinct from /sitemap.xml (the XML
// index) — this is the human/crawler-facing link hub.
import { renderSitemapHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 86400; // 24h — daily safety-net revalidation; admin edits refresh affected entity pages immediately via /api/revalidate

export async function GET() {
  return htmlResponse(await renderSitemapHtml('de'));
}
