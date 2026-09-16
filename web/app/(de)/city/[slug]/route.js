// German city page (unprefixed root). Serves the legacy HTML through the
// shared SEO truthfulness boundary so unsupported entity-page claims cannot
// reach production HTML.
import { renderCityHtml } from '@/lib/legacy-render/render';
import { htmlResponse } from '@/lib/legacy-render/serve';

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { slug } = await params;
  return htmlResponse(await renderCityHtml(slug, 'de'));
}
