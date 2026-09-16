// German (unprefixed root) "Popular destinations" hub — /popular. Serves the
// verbatim legacy HTML like every other entity page (see
// lib/legacy-render/render.js); a Route Handler is required so the full
// original <html> document is returned without Next's root layout wrapping it.
import { renderPopularHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

// [BUILD-SAFETY] This hub performs a catalogue-wide ranking (including
// per-airline route counts). Keep it out of the deployment-time static export:
// the page is still server-rendered and cached by the platform, but one slow
// upstream catalogue fetch cannot fail an otherwise healthy deployment.
export const dynamic = 'force-dynamic';
export const revalidate = 86400;

export async function GET() {
  return htmlResponse(await renderPopularHtml('de'));
}
