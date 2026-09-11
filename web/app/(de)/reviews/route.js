// German (unprefixed root) Airpiv reviews hub — /reviews. Serves the verbatim
// legacy HTML like every other hub page (see lib/legacy-render/render.js); a
// Route Handler is required so the full original <html> document is returned
// without Next's root layout wrapping it.
import { renderReviewsHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 86400; // 24h — daily safety-net; new/published reviews refresh this page immediately via /api/revalidate

export async function GET() {
  return htmlResponse(await renderReviewsHtml('de'));
}
