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
        // Keep the edge cache aligned with the 15-minute sitemap feed
        // revalidation window; an evidence correction should not remain hidden
        // behind a one-hour public cache.
        'cache-control': 'public, max-age=900, stale-while-revalidate=86400',
      },
    });
  };
}
