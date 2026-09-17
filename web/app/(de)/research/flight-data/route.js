// Public German authority/data asset: /research/flight-data.
// The page is server-rendered from the same persisted route catalogue used by
// production SEO pages, so every statistic is reproducible from site data.
import { renderAuthorityHtml } from '@/lib/legacy-render/render-authority.mjs';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

export async function GET() {
  return htmlResponse(await renderAuthorityHtml('de'));
}
