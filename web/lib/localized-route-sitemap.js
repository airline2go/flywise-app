// [SITEMAP-ORIGIN] The localized sitemap feed is a build-time discovery
// endpoint. Production must bypass any stale/misconfigured frontend API proxy
// and use the live backend origin directly.
const SITEMAP_API_BASE = 'https://flywise-server-eu.onrender.com';
const REVALIDATE = 900;
const FEED_VERSION = '2';

async function fetchPage(lang, page, slugs) {
  const params = new URLSearchParams({ lang, page: String(page), v: FEED_VERSION });
  if (Array.isArray(slugs) && slugs.length) params.set('slugs', slugs.join(','));
  const url = `${SITEMAP_API_BASE}/sitemap-data/routes-localized?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for localized route sitemap ${lang} page ${page}`);
  return res.json();
}

export async function listLocalizedRouteSitemap(lang, slugs = null) {
  const items = [];
  const boundedSlugs = Array.isArray(slugs)
    ? [...new Set(slugs.map((slug) => String(slug || '').trim().toLowerCase()).filter(Boolean))].slice(0, 100)
    : null;

  try {
    for (let page = 0; page < (boundedSlugs ? 1 : 10000); page++) {
      const data = await fetchPage(lang, page, boundedSlugs);
      const rows = Array.isArray(data?.items) ? data.items : [];
      items.push(...rows);
      if (!data?.hasMore || rows.length === 0) break;
    }
  } catch {
    // Discovery must fail closed: a backend outage must never make the entire
    // sitemap build fail, and must never cause fabricated localized URLs.
    return [];
  }
  return items;
}
