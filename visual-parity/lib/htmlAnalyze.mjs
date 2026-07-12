// [HTML-ANALYZE] Extract the SEO/structure-relevant facets of a rendered
// HTML document so two pages can be compared facet-by-facet (text, links,
// images, structured data, meta tags, CSS, layout). This is what a crawler
// sees, so it works on the SEO entity pages (city/airport/…) where a pixel
// diff can't run without live data — the raw HTML is the source of truth.
//
// Two kinds of noise are normalized away so only *real* drift is reported:
//   - Host: the caller replaces each page's own origin with https://SITE
//     before calling, so airpiv.com/x and the-preview.vercel.app/x compare
//     equal (they are the same page on different hosts).
//   - Framework plumbing: Next.js injects <script src=/_next/…>, preload
//     <link>s and a bundled stylesheet. Those are excluded from the layout
//     signature (they are not visible layout) and the CSS facet compares
//     *rule contents* (supplied resolved by the caller), not bundle URLs.

import { parse } from 'node-html-parser';

const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim();

// Normalize one CSS rule so two build systems' formatting/declaration-order
// don't read as differences: lowercase, strip spaces, sort declarations.
// Canonicalize the formatting differences between prettified source CSS and
// a bundler's minified output so only *real* declaration differences remain:
// collapse whitespace, tighten punctuation, drop leading zeros (0.3 → .3) and
// spaces after commas (rgba(0, 0, 0, 0.3) → rgba(0,0,0,.3)).
function canonicalizeCss(s) {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();:>+~,])\s*/g, '$1')
    .replace(/(^|[\s(,:;])0+(\.\d)/g, '$1$2')
    .trim();
}

export function normalizeRule(rule) {
  const m = rule.match(/^([^{]*)\{([\s\S]*)\}$/);
  if (!m) return canonicalizeCss(rule);
  const sel = canonicalizeCss(m[1]);
  const decls = m[2]
    .split(';')
    .map((d) => canonicalizeCss(d))
    .filter(Boolean)
    .sort();
  return `${sel}{${decls.join(';')}}`;
}

// Brace-depth-aware split of CSS into top-level `{ prelude, body }` blocks, so
// an @media block is one unit instead of being shredded at inner braces.
function splitBlocks(css) {
  const blocks = [];
  let depth = 0;
  let start = 0;
  let preludeEnd = -1;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      if (depth === 0) preludeEnd = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        blocks.push({ prelude: css.slice(start, preludeEnd), body: css.slice(preludeEnd + 1, i) });
        start = i + 1;
      }
    }
  }
  return blocks;
}

// Split CSS text into individual normalized rules. Nested at-rules (@media,
// @supports) are flattened: each inner rule is emitted prefixed with the
// condition, so "@media(max-width:760px){.fgr{…}}" compares cleanly. @import
// is dropped (it is a bundling detail, not a visual rule).
export function cssRules(cssText) {
  const noComments = (cssText || '').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  for (const { prelude, body } of splitBlocks(noComments)) {
    const at = prelude.trim().toLowerCase();
    if (at.startsWith('@import')) continue;
    if (at.startsWith('@media') || at.startsWith('@supports')) {
      const cond = collapse(at).replace(/\s+/g, '');
      for (const inner of splitBlocks(body)) {
        out.push(`${cond}{${normalizeRule(`${inner.prelude}{${inner.body}}`)}}`);
      }
    } else {
      out.push(normalizeRule(`${prelude}{${body}}`));
    }
  }
  return out.filter(Boolean);
}

// Element tags that are plumbing, not visible layout.
const NON_LAYOUT_TAGS = new Set(['script', 'style', 'noscript', 'template', 'link', 'meta', 'title', 'base', 'head']);

// A structural signature of the *body* DOM: the depth-prefixed tag (+ id and
// sorted classes) of every visible element, ignoring text and plumbing.
function layoutSignature(root) {
  const body = root.querySelector('body') || root;
  const out = [];
  const walk = (node, depth) => {
    for (const child of node.childNodes) {
      if (child.nodeType !== 1) continue;
      const tag = (child.rawTagName || '?').toLowerCase();
      if (NON_LAYOUT_TAGS.has(tag)) continue;
      const id = child.getAttribute('id');
      const cls = child.getAttribute('class');
      let sig = `${depth}:${tag}`;
      if (id && !id.startsWith('__next')) sig += `#${id}`;
      if (cls) sig += `.${collapse(cls).split(' ').filter(Boolean).sort().join('.')}`;
      out.push(sig);
      walk(child, depth + 1);
    }
  };
  walk(body, 0);
  return out;
}

// Robust visible-text extraction: drop scripts/styles/comments/doctype, turn
// every tag into a space (so block boundaries never fuse two words), then let
// the parser decode entities.
function visibleText(html) {
  const stripped = html
    .replace(/<!doctype[^>]*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return collapse(parse(`<d>${stripped}</d>`).text);
}

// `externalCssRules` (optional): normalized rules the caller resolved by
// fetching this page's <link rel=stylesheet> files, merged into the CSS facet.
export function analyzeHtml(html, { externalCssRules = [] } = {}) {
  const root = parse(html, { comment: false, blockTextElements: { script: true, style: true, pre: true } });

  const text = visibleText(html);
  const textWords = text ? text.split(' ') : [];

  const links = root.querySelectorAll('a[href]').map((a) => collapse(a.getAttribute('href'))).filter(Boolean);

  const images = root.querySelectorAll('img').map((img) => ({
    src: collapse(img.getAttribute('src') || ''),
    alt: collapse(img.getAttribute('alt') || ''),
  }));

  const jsonld = [];
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      jsonld.push(JSON.stringify(sortDeep(JSON.parse(s.text))));
    } catch {
      jsonld.push('INVALID_JSON:' + collapse(s.text).slice(0, 80));
    }
  }

  const meta = {};
  const title = root.querySelector('title');
  if (title) meta['<title>'] = collapse(title.text);
  for (const m of root.querySelectorAll('meta')) {
    const key = m.getAttribute('name') || m.getAttribute('property') || (m.getAttribute('charset') != null ? 'charset' : null);
    if (!key) continue;
    // charset case ("UTF-8" vs "utf-8") and viewport "1.0" vs "1" are not
    // real SEO/visual differences — normalize them.
    let val = collapse(m.getAttribute('content') || m.getAttribute('charset') || '');
    if (key === 'charset') val = val.toLowerCase();
    if (key === 'viewport') val = val.replace(/initial-scale=1\.0/, 'initial-scale=1').replace(/\s+/g, '');
    meta[`meta:${key}`] = val;
  }
  for (const l of root.querySelectorAll('link[rel]')) {
    const rel = l.getAttribute('rel');
    if (rel === 'canonical') meta['link:canonical'] = collapse(l.getAttribute('href'));
    if (rel === 'alternate' && l.getAttribute('hreflang')) meta[`link:hreflang:${l.getAttribute('hreflang')}`] = collapse(l.getAttribute('href'));
  }

  // Inline <style> rules + the caller-resolved external stylesheet rules.
  const inlineRules = [];
  for (const s of root.querySelectorAll('style')) inlineRules.push(...cssRules(s.text));
  const cssAllRules = [...new Set([...inlineRules, ...externalCssRules])];

  return { text, textWords, links, images, jsonld, meta, css: { rules: cssAllRules }, layout: layoutSignature(root) };
}

// Return the absolute external stylesheet URLs a page links, resolved against
// its real URL — the caller fetches these to compare rule *contents*.
export function externalStylesheetUrls(html, pageUrl) {
  const root = parse(html);
  const urls = [];
  for (const l of root.querySelectorAll('link[rel="stylesheet"][href]')) {
    try {
      urls.push(new URL(l.getAttribute('href'), pageUrl).toString());
    } catch {
      /* skip unresolvable */
    }
  }
  return urls;
}

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    return Object.keys(v).sort().reduce((acc, k) => {
      acc[k] = sortDeep(v[k]);
      return acc;
    }, {});
  }
  return v;
}
