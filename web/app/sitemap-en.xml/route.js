// Per-language entity sitemap (sitemap-en.xml) — replicates the old
// build-time sitemap-en.xml. Logic lives in lib/sitemap-route.js.
import { makeSitemapRoute } from '@/lib/sitemap-route';

export const revalidate = 3600;

export const GET = makeSitemapRoute('en');
