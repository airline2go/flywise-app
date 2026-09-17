// Public German authority/data asset: /research/germany-europe-flight-network.
import { renderGermanyEuropeFlightNetworkHtml } from '@/lib/legacy-render/render-germany-europe-flight-network.mjs';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

export async function GET() {
  return htmlResponse(await renderGermanyEuropeFlightNetworkHtml('de'));
}
