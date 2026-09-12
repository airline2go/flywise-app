// Per-type sitemap (sitemap-reviews.xml) — the central /reviews hub in every
// language, listed only while the page is actually indexable (see
// buildReviewsUrls in sitemap-urls.js: it returns [] when there are zero
// published reviews, so this file is an empty urlset and the index references
// no shard for it). Logic lives in lib/sitemap-route.js, same as every other
// per-type root route.
import { buildReviewsUrls } from '@/lib/sitemap-urls';
import { makeTypeSitemapRoute } from '@/lib/sitemap-route';

export const revalidate = 3600;

export const GET = makeTypeSitemapRoute(buildReviewsUrls);
