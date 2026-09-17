// English authority/data asset: /en/research/germany-europe-flight-network.
// Other language prefixes are excluded until translated copy exists.
import { renderGermanyEuropeFlightNetworkHtml } from '@/lib/legacy-render/render-germany-europe-flight-network.mjs';
import { htmlResponse, isPrefixedLang } from '@/lib/legacy-render/serve';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;
export const dynamicParams = true;

export async function GET(_req, { params }) {
  const { lang } = await params;
  if (lang !== 'en' || !isPrefixedLang(lang)) return htmlResponse(null);
  return htmlResponse(await renderGermanyEuropeFlightNetworkHtml('en'));
}
