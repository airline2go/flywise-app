// [HREFLANG-AUDIT] Pure, unit-tested validation of a page's hreflang cluster.
// The renderer (shell.js) emits, for every page, one <link rel="alternate"
// hreflang="xx"> per language plus an hreflang="x-default", and a self-
// referencing <link rel="canonical">. Google's rules for a valid cluster:
//   • the page must reference ITSELF in the set (return-tag reciprocity),
//   • its rel=canonical must be one of the hreflang URLs (never point outside
//     the cluster — a canonical to a non-alternate silently drops the page),
//   • an x-default should be present,
//   • no duplicate hreflang code may map to two different URLs.
// This module parses the <head> links and checks those invariants. It is
// transport-free (takes an html string + the page's own URL + expected lang),
// so it runs in unit tests and drives the live scripts/audit-hreflang.mjs.

const LINK_RE = /<link\b[^>]*>/gi;
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? m[1] : null;
};

// Extract { canonical, alternates: Map(hreflang -> url) } from a page's HTML.
export function parseHreflang(html) {
  let canonical = null;
  const alternates = new Map();
  const dupes = [];
  for (const tag of String(html || '').match(LINK_RE) || []) {
    const rel = (attr(tag, 'rel') || '').toLowerCase();
    const href = attr(tag, 'href');
    if (!href) continue;
    if (rel === 'canonical') canonical = href;
    else if (rel === 'alternate') {
      const hl = attr(tag, 'hreflang');
      if (!hl) continue;
      if (alternates.has(hl) && alternates.get(hl) !== href) dupes.push(hl);
      alternates.set(hl, href);
    }
  }
  return { canonical, alternates, dupes };
}

// Validate one page's cluster. `pageUrl` is the URL actually fetched (its own
// self URL); `expectedLang` is the language that page is served in.
// `allowSingleLanguage` (for the static, single-locale pages) treats a page
// with NO alternates as valid AS LONG AS it self-canonicals — Google does not
// require hreflang on a page served in a single language. Returns a list of
// error strings — empty means a valid cluster.
export function auditHreflangCluster({ html, pageUrl, expectedLang, allowSingleLanguage = false }) {
  const errors = [];
  const { canonical, alternates, dupes } = parseHreflang(html);
  const norm = (u) => String(u || '').replace(/\/$/, '');

  if (!canonical) errors.push('missing rel=canonical');
  if (alternates.size === 0) {
    // A single-language page needs no hreflang, but it MUST self-canonical so it
    // is indexed as itself rather than pointing elsewhere.
    if (allowSingleLanguage) {
      if (canonical && norm(canonical) !== norm(pageUrl)) {
        errors.push(`single-language page canonical ${canonical} ≠ self ${pageUrl}`);
      }
      return errors;
    }
    errors.push('no hreflang alternates');
    return errors;
  }

  for (const hl of new Set(dupes)) errors.push(`duplicate hreflang "${hl}" points at two URLs`);

  if (!alternates.has('x-default')) errors.push('missing hreflang="x-default"');

  // Self-reference: the page's own language must be in the set and must equal
  // the page's own URL (ignoring a trailing slash).
  if (expectedLang) {
    if (!alternates.has(expectedLang)) {
      errors.push(`self hreflang "${expectedLang}" absent (no return tag)`);
    } else if (norm(alternates.get(expectedLang)) !== norm(pageUrl)) {
      errors.push(`self hreflang "${expectedLang}" → ${alternates.get(expectedLang)} ≠ page ${pageUrl}`);
    }
  }

  // Canonical must be a member of the hreflang set — a canonical pointing
  // outside the cluster de-indexes the page.
  if (canonical) {
    const urls = new Set([...alternates.values()].map(norm));
    if (!urls.has(norm(canonical))) errors.push(`canonical ${canonical} is not among the hreflang alternates`);
  }
  return errors;
}
