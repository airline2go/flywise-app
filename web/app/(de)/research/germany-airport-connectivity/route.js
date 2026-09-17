import { renderGermanyAirportConnectivityHtml } from '@/lib/legacy-render/render-germany-airport-connectivity.mjs';
import { htmlResponse } from '@/lib/legacy-render/serve';

export async function GET() {
  return htmlResponse(await renderGermanyAirportConnectivityHtml('de'));
}
