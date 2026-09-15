// German/default-language flight routes use the unprefixed /flights/:slug path.
// Keep this handler on the same resolver stack as localized routes so SEO
// redirects and route rendering cannot diverge by language.
import { renderFlightRouteHtml, resolveFlightRedirect } from '@/lib/legacy-render/render';
import { resolveRouteSlugAlias } from '@/lib/legacy-render/route-alias';
import { htmlResponse, redirectResponse } from '@/lib/legacy-render/serve';
import { pathFor } from '@/lib/legacy-render/languages';
import { withRouteLocale } from '@/lib/route-locale-context';

export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function GET(_req, { params }) {
  const { slug } = await params;

  const alias = await resolveRouteSlugAlias(slug);
  if (alias) return redirectResponse(pathFor('de', `flights/${encodeURIComponent(alias)}`), 301);

  const redirect = await resolveFlightRedirect(slug);
  if (redirect) return redirectResponse(pathFor('de', `flights/${encodeURIComponent(redirect.target)}`), redirect.status);

  return withRouteLocale('de', async () => htmlResponse(await renderFlightRouteHtml(slug, 'de')));
}
