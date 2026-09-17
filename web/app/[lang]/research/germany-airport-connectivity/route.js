import { renderGermanyAirportConnectivityHtml } from '@/lib/legacy-render/render-germany-airport-connectivity.mjs';
import { htmlResponse, isPrefixedLang } from '@/lib/legacy-render/serve';

export async function GET(request, { params }) {
  const lang = params?.lang;
  if (!isPrefixedLang(lang) || lang !== 'en') return new Response('Not Found', { status: 404 });
  return htmlResponse(await renderGermanyAirportConnectivityHtml('en'));
}
