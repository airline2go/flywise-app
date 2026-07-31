// Shared GET handler for the per-type sitemap route handlers
// (app/sitemap-{type}.xml/route.js). Each of those files is a one-line binding
// of this factory to its type's URL builder (from sitemap-urls.js), so the
// actual XML building logic lives in exactly one place.
//
// [SHARDING] A /sitemap-<type>.xml root route serves shard 1 — the first ≤50k
// URLs. When a type outgrows one file, shards 2..N are served by the overflow
// route (app/sitemap-shard/[file]/route.js) and enumerated by the index. This
// keeps the flat, Search-Console-stable name for the common single-shard case.
import { urlsetXml, chunkUrls } from './sitemap-urls';

export function makeTypeSitemapRoute(buildUrls) {
  return async function GET() {
    const urls = await buildUrls();
    const firstShard = chunkUrls(urls)[0] || [];
    return new Response(urlsetXml(firstShard), {
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
