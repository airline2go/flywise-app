// Public German authority/data asset: /research/route-network.
import { renderRouteNetworkHtml } from '@/lib/legacy-render/render-route-network.mjs';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

export async function GET() {
  return htmlResponse(await renderRouteNetworkHtml('de'));
}
