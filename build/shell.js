const { STRINGS } = require('./data');

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

// [PAGE-SHELL] The header/nav/footer boilerplate shared by every entity
// page, parameterized by language — replaces 10 files' worth of duplicated
// <head>/<nav>/<footer> markup with one function.
function renderShell({
  lang, title, description, canonicalUrl, deUrl, enUrl, includeHreflang = true,
  ogType = 'website', ogImage = 'https://airpiv.com/og-image.png',
  headExtra = '', bodyPrefix = '', mainContent, bodySuffix = '', scripts = '',
}) {
  const s = STRINGS[lang];
  const twitterImage = ogImage;
  const hreflangHtml = includeHreflang
    ? `<link rel="alternate" hreflang="de" href="${escHtml(deUrl)}">
<link rel="alternate" hreflang="en" href="${escHtml(enUrl)}">
<link rel="alternate" hreflang="x-default" href="${escHtml(deUrl)}">`
    : '';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<link rel="preconnect" href="https://api.airpiv.com">
<link rel="dns-prefetch" href="https://api.airpiv.com">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-2K257GSWEM"></script>
<script src="/analytics.js" defer></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)}</title>
<meta name="description" content="${escHtml(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${escHtml(canonicalUrl)}">
${hreflangHtml}
<meta property="og:type" content="${ogType}">
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
${headExtra}
</head>
<body>
${bodyPrefix}
<nav class="topnav">
  <div class="navi">
    <a href="${s.homeHref}" class="logo"><picture>
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
    <div class="fcol"><h4>${s.companyLabel}</h4><ul><li><a href="${s.aboutHref}">${s.aboutLabel}</a></li><li><a href="${s.blogHref}">${s.blogLabel}</a></li></ul></div>
    <div class="fcol"><h4>${s.supportLabel}</h4><ul><li><a href="${s.contactHref}">${s.contactLabel}</a></li><li><a href="${s.privacyHref}">${s.privacyLabel}</a></li><li><a href="${s.termsHref}">${s.termsLabel}</a></li></ul></div>
  </div>
  <div class="fbot"><p>${s.copyright}</p></div>
</div></footer>
${scripts}
</body>
</html>
`;
}

module.exports = { renderShell, escHtml, jsonLdScript };
