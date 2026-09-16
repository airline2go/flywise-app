const API_BASE = process.env.API_BASE || 'https://api.airpiv.com';
const REVALIDATE = 900;

// Uses the backend's generated locale rows as the authoritative discovery set.
async function fetchPage(lang, page) {
  const url = `${API_BASE}/sitemap-data/routes-localized?lang=${encodeURIComponent(lang)}&page=${page}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for localized route sitemap ${lang} page ${page}`);
  return res.json();
}

export async function listLocalizedRouteSitemap(lang) {
  const items = [];
  for (let page = 0; page < 10000; page++) {
    const data = await fetchPage(lang, page);
    const rows = Array.isArray(data?.items) ? data.items : [];
    items.push(...rows);
    if (!data?.hasMore || rows.length === 0) break;
  }
  return items;
}
