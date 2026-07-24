// Shared GET handler for the per-type sitemap route handlers
// (app/sitemap-{type}.xml/route.js). Each of those files is a one-line binding
// of this factory to its type's URL builder (from sitemap-urls.js), so the
// actual XML building logic lives in exactly one place.
import { urlsetXml } from './sitemap-urls';

export function makeTypeSitemapRoute(buildUrls) {
  return async function GET() {
    const urls = await buildUrls();
    return new Response(urlsetXml(urls), {
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        // Match the daily-ish freshness of the old deploy-time sitemaps: a
        // 1-hour ISR window with a long stale-while-revalidate so crawlers
        // never wait on a cold rebuild.
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  };
}
