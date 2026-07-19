// [MULTILANG-LINKS] Rewrites internal entity links inside stored HTML content
// (e.g. a blog article body) to the current language's URL prefix, so one
// canonical set of links authored once works for every language. German is the
// platform default and lives at the unprefixed root, so it is never rewritten.
//
// Pure + dependency-free so it is unit-testable with `node --test`.
//
// Only the entity sections whose slug is SHARED across languages are localized
// (flights / city / country / airport / airline). Blog links are intentionally
// left alone: a blog post's slug differs per language, so blindly prefixing
// /blog/<de-slug> with /tr would point at a non-existent Turkish slug. External
// links, anchors, mailto/tel, and already-prefixed links are never touched.

const LOCALIZABLE_SECTION = /^\/(flights|city|country|airport|airline)\//;
const PREFIXED_LANGS = new Set(['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr']);

export function localizeLinks(html, lang) {
  // German (default/root) keeps links as-authored; nothing to rewrite.
  if (!html || !lang || lang === 'de') return html;
  const prefix = `/${lang}`;
  return String(html).replace(/(<a\b[^>]*?\bhref=")(\/[^"]*)(")/gi, (full, pre, href, post) => {
    // Already carries a known language prefix (/en/…, /tr/…) → leave as-is.
    const seg = href.match(/^\/([a-z]{2})\//);
    if (seg && PREFIXED_LANGS.has(seg[1])) return full;
    // Only localize the shared-slug entity sections.
    if (!LOCALIZABLE_SECTION.test(href)) return full;
    return `${pre}${prefix}${href}${post}`;
  });
}

export { LOCALIZABLE_SECTION, PREFIXED_LANGS };
