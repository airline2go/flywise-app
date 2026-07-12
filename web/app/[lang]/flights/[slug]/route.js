// Localized flight-route page (/en/flights/…, /ar/flights/… etc.) — verbatim
// legacy HTML for the requested language, see lib/legacy-render/render.js.
import { renderFlightRouteHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { lang, slug } = await params;
  return htmlResponse(await renderFlightRouteHtml(slug, lang));
}
