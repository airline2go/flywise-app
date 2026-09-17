const API_BASE = process.env.API_BASE || 'https://api.airpiv.com';
const REVALIDATE = 900;

export async function getAvailableRouteHreflang(slug) {
  const url = `${API_BASE}/route-pages/${encodeURIComponent(slug)}/hreflang`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for route hreflang ${slug}`);
  const data = await res.json();
  return new Set((data?.hreflang || []).map((item) => String(item?.hrefLang || '').toLowerCase()).filter(Boolean));
}

export function stripUnavailableRouteHreflang(html, available) {
  if (!(available instanceof Set)) return html;
  return String(html).replace(/<link\b[^>]*\brel=["']alternate["'][^>]*>/gi, (tag) => {
    const match = tag.match(/\bhreflang=["']([^"']+)["']/i);
    if (!match) return tag;
    return available.has(match[1].toLowerCase()) ? tag : '';
  });
}
