// Per-language entity sitemap (sitemap-fr.xml) — replicates the old
// build-time sitemap-fr.xml. Logic lives in lib/sitemap-route.js.
import { makeSitemapRoute } from '@/lib/sitemap-route';

export const revalidate = 3600;

export const GET = makeSitemapRoute('fr');
