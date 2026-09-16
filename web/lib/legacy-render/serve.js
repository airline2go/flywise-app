// Shared helper for the verbatim SEO Route Handlers: wrap a rendered HTML
// string (or null → 404) in the right Response.
export function htmlResponse(html) {
  if (!html) return new Response('Not found', { status: 404 });

  // [SEO-TRUTHFULNESS] Footer tagline is shared across all localized pages.
  // Older translation bundles contained a static "600+ airlines" claim that
  // is not a route-specific or runtime-verified metric. Remove only the
  // affected footer paragraph rather than inventing a replacement statistic.
  const safeHtml = String(html).replace(/<p class="fdes">[^<]*(?:600\+?|600|hundreds|hunderte|centenas|centaines|centinaia|honderden|yüzlerce)[^<]*<\/p>/gi, '');

  return new Response(safeHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// [ROUTE-CANONICAL-REDIRECT] F1 — a permanent (301) redirect from a consolidated
// duplicate URL to its canonical winner. Body-less, with an absolute-path
// Location; cacheable by the platform like the rendered pages next to it.
export function redirectResponse(location, status = 301) {
  return new Response(null, { status, headers: { location } });
}

// The six non-default languages that live under a /xx/ prefix. German is the
// unprefixed root, so it is intentionally NOT here — /de/city/… must 404 like
// production, as must any unknown prefix (/zz/…). Route Handlers aren't wrapped
// by [lang]/layout.js, so each localized handler validates the prefix itself.
export const PREFIXED_LANGS = new Set(['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr']);

export function isPrefixedLang(lang) {
  return PREFIXED_LANGS.has(lang);
}
