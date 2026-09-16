// German (unprefixed root) HTML sitemap hub — /sitemap. Serves the verbatim
// legacy HTML like every other entity page (see lib/legacy-render/render.js); a
// Route Handler is required so the full original <html> document is returned
// without Next's root layout wrapping it. Distinct from /sitemap.xml (the XML
// index) — this is the human/crawler-facing link hub.
import { renderSitemapHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

// [BUILD-SAFETY] The sitemap reads the live catalogue and must not block a
// deployment when the backend/API shield rejects build-time requests.
// It remains server-rendered and cached by the platform at runtime.
export const dynamic = 'force-dynamic';
export const revalidate = 86400;

export async function GET() {
  return htmlResponse(await renderSitemapHtml('de'));
}
