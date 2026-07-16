// Shared GET handler for the 7 per-language sitemap route handlers
// (app/sitemap-{lang}.xml/route.js). Each of those files is a one-line
// re-export binding this factory to its language code, so the actual XML
// building logic lives in exactly one place.
import { buildUrlsForLang, urlsetXml } from './sitemap-urls';

export function makeSitemapRoute(lang) {
  return async function GET() {
    const urls = await buildUrlsForLang(lang);
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
