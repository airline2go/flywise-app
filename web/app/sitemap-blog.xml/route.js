// Per-type entity sitemap (sitemap-blog.xml) — every blog URL in all 8
// languages. Logic lives in lib/sitemap-route.js + lib/sitemap-urls.js.
// Keep this sitemap dynamic so a transient backend 429 cannot fail the entire
// production deployment during Next's build-time prerender phase.
import { buildBlogUrls } from '@/lib/sitemap-urls';
import { makeTypeSitemapRoute } from '@/lib/sitemap-route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = makeTypeSitemapRoute(buildBlogUrls);
