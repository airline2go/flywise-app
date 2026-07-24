// German (unprefixed root) "Popular destinations" hub — /popular. Serves the
// verbatim legacy HTML like every other entity page (see
// lib/legacy-render/render.js); a Route Handler is required so the full
// original <html> document is returned without Next's root layout wrapping it.
import { renderPopularHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 86400; // 24h — daily safety-net revalidation; admin edits refresh affected entity pages immediately via /api/revalidate

export async function GET() {
  return htmlResponse(await renderPopularHtml('de'));
}
