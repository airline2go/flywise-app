import { getRouteSitemapPage } from '@/lib/legacy-render/route-sitemap';
import { renderRouteSitemapPage } from '@/lib/legacy-render/render-route-sitemap';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 900;
export const dynamicParams = true;
export function generateStaticParams() { return []; }

export async function GET(_req, { params }) {
  const { page } = await params;
  const data = await getRouteSitemapPage(page);
  if (!data) return htmlResponse(null);
  return htmlResponse(renderRouteSitemapPage({ ...data, lang: 'de' }).html);
}
