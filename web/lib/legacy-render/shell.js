const { LANGUAGES, DEFAULT_LANGUAGE, getLanguage, pathPrefix, pathFor } = require('./languages');
const { stringsFor } = require('./translate');

// Fixed, identical-across-every-language site paths — never real
// "translated" content, so these live here as constants rather than in
// translations/*.json (which previously carried them redundantly, once
// per language, even though every language's value was the same string).
const ABOUT_HREF = '/about.html';
const BLOG_HREF = '/blog.html';
const CONTACT_HREF = '/contact.html';
const PRIVACY_HREF = '/privacy.html';
const TERMS_HREF = '/terms.html';
// E-E-A-T trust pages — static, single-URL (German) like the other content
// pages, so linked as fixed paths rather than per-language routes.
const HOW_IT_WORKS_HREF = '/how-it-works.html';
const DATA_SOURCES_HREF = '/data-sources.html';
const METHODOLOGY_HREF = '/methodology.html';
const EDITORIAL_POLICY_HREF = '/editorial-policy.html';
const TRANSPARENCY_HREF = '/transparency.html';

function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// [JSONLD-XSS-FIX] JSON.stringify(schema) can legitimately contain "</",
// "<!--" or "<script" if any field feeding the schema (title, intro text,
// FAQ question/answer, etc. — several of which are admin-editable, with no
// tag-stripping on the admin side) happens to contain those substrings.
// Since these are embedded as literal text inside a real <script> tag
// (not through the DOM), the HTML parser itself would end the script
// element early on a literal "</script" appearing anywhere in the JSON
// string, letting an attacker who controls one of those fields inject
// markup that runs as real HTML on the public page it appears on. The
// standard fix (same one used for inline JSON on any server-rendered
// page): replace every literal "<" character with its JSON unicode
// escape sequence (backslash, u, 0, 0, 3, c). JSON.parse decodes that
// escape back to the exact original "<" character, so the schema
// round-trips byte-for-byte — but the raw "<" byte, and so "</script>"
// or "<!--", can never appear in the document itself.
function jsonLdScript(schema) {
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

// [SHARED-ORGANIZATION-SCHEMA] Previously only render-flight-route.js and
// render-blog-post.js declared an Organization schema (each with its own
// separately hand-written literal) — city/country/airport pages had none at
// all. Injected once here into every page's <head>, so it's uniform across
// all 5 entity types instead of ad hoc per render-*.js file.
const ORGANIZATION_SCHEMA = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Airpiv', url: 'https://airpiv.com', logo: 'https://airpiv.com/apple-touch-icon.png' };

// [WEBSITE-SEARCHACTION] WebSite schema with the Google sitelinks-searchbox
// SearchAction — previously only the static home (index.html) declared it, so
// the entity pages (city/country/airport/airline/route/blog) had no WebSite
// node. Injected once here into every shell-rendered page, using the exact same
// query target the home already exposes (app.js handles /?q=...).
const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Airpiv',
  url: 'https://airpiv.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://airpiv.com/?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

// [OG-LOCALE] schema.org locale tags (BCP-47-ish og:locale values) per
// language — og:locale was previously absent entirely, which link
// previews/crawlers use to pick the right localized rendering.
const OG_LOCALE = { de: 'de_DE', en: 'en_GB', ar: 'ar_AR', es: 'es_ES', fr: 'fr_FR', it: 'it_IT', nl: 'nl_NL', tr: 'tr_TR' };

// [SPEAKABLE] A SpeakableSpecification for voice assistants (Google Assistant
// TTS): the page's <h1> plus its FAQ questions — short, self-contained, read-
// aloud-friendly text. `speakable` is only valid on WebPage / Article (its
// schema.org domain), so it is attached to those nodes on the route/city/
// country/blog pages, never onto the airport/airline Place/Organization nodes
// where it would not validate. Each caller passes its own FAQ-question CSS
// selector since the class name differs per page type.
function speakableSpec(...selectors) {
  return { '@type': 'SpeakableSpecification', cssSelector: ['h1', ...selectors.filter(Boolean)] };
}

// Root-relative home URL for a language, honoring the same
// default-language-stays-unprefixed rule as every generated page URL.
function homeHref(lang) {
  const prefix = pathPrefix(lang);
  return prefix ? `/${prefix}/` : '/';
}

// [PAGE-SHELL] The header/nav/footer boilerplate shared by every entity
// page, parameterized by language — replaces 10 files' worth of duplicated
// <head>/<nav>/<footer> markup with one function. `urls` is a
// {en, de, ar, es, fr, it, nl} map of this page's URL in every language it
// exists in (a page missing from `urls` for some language simply gets no
// hreflang entry for that language, rather than crashing) — replacing the
// old hardcoded `deUrl`/`enUrl` named params.
function renderShell({
  lang, title, description, canonicalUrl, urls = {}, includeHreflang = true,
  ogType = 'website', ogImage = 'https://airpiv.com/og-image.png',
  robotsContent = 'index, follow',
  headExtra = '', bodyPrefix = '', mainContent, bodySuffix = '', scripts = '',
}) {
  const s = stringsFor(lang);
  const direction = getLanguage(lang).direction;
  const twitterImage = ogImage;
  const defaultUrl = urls[DEFAULT_LANGUAGE] || urls.en || canonicalUrl;
  const hreflangHtml = includeHreflang
    ? LANGUAGES.filter((l) => urls[l.code]).map((l) => `<link rel="alternate" hreflang="${l.code}" href="${escHtml(urls[l.code])}">`).join('\n')
      + `\n<link rel="alternate" hreflang="x-default" href="${escHtml(defaultUrl)}">`
    : '';
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${direction}">
<head>
<link rel="preconnect" href="https://api.airpiv.com">
<link rel="dns-prefetch" href="https://api.airpiv.com">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-2K257GSWEM"></script>
<script src="/analytics.js" defer></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)}</title>
<meta name="description" content="${escHtml(description)}">
<meta name="robots" content="${escHtml(robotsContent)}">
<link rel="canonical" href="${escHtml(canonicalUrl)}">
${hreflangHtml}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="Airpiv">
<meta property="og:locale" content="${OG_LOCALE[lang] || OG_LOCALE.en}">
<meta property="og:title" content="${escHtml(title)}">
<meta property="og:description" content="${escHtml(description)}">
<meta property="og:url" content="${escHtml(canonicalUrl)}">
<meta property="og:image" content="${escHtml(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${escHtml(twitterImage)}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/shared-layout.css">
${jsonLdScript(ORGANIZATION_SCHEMA)}
${jsonLdScript(WEBSITE_SCHEMA)}
${headExtra}
</head>
<body>
${bodyPrefix}
<nav class="topnav">
  <div class="navi">
    <a href="${homeHref(lang)}" class="logo"><picture>
      <source srcset="/airpiv-logo.webp" type="image/webp">
      <img src="/airpiv-logo.png" alt="Airpiv" width="118" height="38">
    </picture></a>
    <div class="navr">
      <a href="/" class="btn-t">${s.searchLabel}</a>
    </div>
  </div>
</nav>

${mainContent}

${bodySuffix}
<footer><div class="fi2">
  <div class="fgr">
    <div><div class="flo"><span style="display:inline-flex;width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#12C7B0,#0A9384);align-items:center;justify-content:center"><svg width="17" height="17" viewBox="0 0 64 64" fill="none"><path d="M32 14 L46 46 L32 38 L18 46 Z" fill="#0A1822"/></svg></span>Air<span style="color:var(--teal)">piv</span></div><p class="fdes">${s.footerTagline}</p></div>
    <div class="fcol"><h4>${s.companyLabel}</h4><ul><li><a href="${ABOUT_HREF}">${s.aboutLabel}</a></li><li><a href="${BLOG_HREF}">${s.blogLabel}</a></li><li><a href="${pathFor(lang, 'popular')}">${s.popularLabel}</a></li><li><a href="${pathFor(lang, 'sitemap')}">${s.sitemapLabel}</a></li></ul></div>
    <div class="fcol"><h4>${s.transparencyLabel}</h4><ul><li><a href="${TRANSPARENCY_HREF}">${s.transparencyPageLabel}</a></li><li><a href="${HOW_IT_WORKS_HREF}">${s.howItWorksLabel}</a></li><li><a href="${DATA_SOURCES_HREF}">${s.dataSourcesLabel}</a></li><li><a href="${METHODOLOGY_HREF}">${s.methodologyLabel}</a></li><li><a href="${EDITORIAL_POLICY_HREF}">${s.editorialPolicyLabel}</a></li></ul></div>
    <div class="fcol"><h4>${s.supportLabel}</h4><ul><li><a href="${CONTACT_HREF}">${s.contactLabel}</a></li><li><a href="${PRIVACY_HREF}">${s.privacyLabel}</a></li><li><a href="${TERMS_HREF}">${s.termsLabel}</a></li></ul></div>
  </div>
  <div class="fbot"><p>${s.copyright}</p></div>
</div></footer>
${scripts}
</body>
</html>
`;
}

module.exports = { renderShell, escHtml, jsonLdScript, homeHref, ORGANIZATION_SCHEMA, speakableSpec };
