// English authority/data asset: /en/research/route-network.
// Other language prefixes are excluded until translated copy exists.
import { renderRouteNetworkHtml } from '@/lib/legacy-render/render-route-network.mjs';
import { htmlResponse, isPrefixedLang } from '@/lib/legacy-render/serve';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;
export const dynamicParams = true;

export async function GET(_req, { params }) {
  const { lang } = await params;
  if (lang !== 'en' || !isPrefixedLang(lang)) return htmlResponse(null);
  return htmlResponse(await renderRouteNetworkHtml('en'));
}
