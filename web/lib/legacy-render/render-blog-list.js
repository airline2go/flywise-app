// [P0-5 Option A] Server-rendered blog listing (/blog).
//
// Historically the German blog listing was only public/blog.html — a static SPA
// that fetched /blog-posts and injected the article cards client-side, so the raw
// HTML a crawler saw shipped no article links (P0-5 option B later stamped links
// into blog.html at build; this is option A: a clean, server-rendered /blog URL).
//
// This renders the listing through the SAME renderShell chrome the blog POST
// pages (/blog/[slug]) already use, so the listing and the articles it links to
// share one header/footer/JSON-LD, and loads the existing public/blog.css so the
// hero + card grid look exactly like the old listing. Every article link is in
// the first byte (crawlable, no JS). Self-canonical https://airpiv.com/blog.
const { escHtml, renderShell, jsonLdScript } = require('./shell');

const SITE = 'https://airpiv.com';
const BLOG_URL = `${SITE}/blog`;

// Google Fonts used by blog.css (Syne / Space Grotesk / IBM Plex Mono), mirroring
// the blog post head, plus the listing stylesheet.
const HEAD_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/blog.css">`;

const NOIMG = '<div class="post-ticket-noimg"><svg width="34" height="34" viewBox="0 0 64 64" fill="none"><path d="M32 10 L48 46 L32 37 L16 46 Z" fill="#0FB5A0" opacity="0.85"/></svg></div>';
const NOIMG_LG = '<div class="post-ticket-noimg post-feat-noimg"><svg width="52" height="52" viewBox="0 0 64 64" fill="none"><path d="M32 10 L48 46 L32 37 L16 46 Z" fill="#0FB5A0" opacity="0.85"/></svg></div>';

function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return ''; }
}

// Cards mirror scripts/prerender-blog-list.mjs (which stamps the same markup into
// blog.html) and the client renderPosts(), so styling via blog.css is identical.
function ticketHtml(p) {
  const cover = p.cover_image_url
    ? `<img class="post-ticket-cover" src="${escHtml(p.cover_image_url)}" loading="lazy" alt="${escHtml(p.title)}">`
    : NOIMG;
  return `<a class="post-ticket" href="/blog/${encodeURIComponent(p.slug)}">${cover}`
    + '<div class="post-ticket-perf" aria-hidden="true"></div><div class="post-ticket-body">'
    + '<span class="post-ticket-eyebrow">Airpiv Journal</span>'
    + `<h2 class="post-ticket-title">${escHtml(p.title)}</h2>`
    + (p.excerpt ? `<p class="post-ticket-excerpt">${escHtml(p.excerpt)}</p>` : '<span style="flex:1"></span>')
    + `<div class="post-ticket-meta"><span>${escHtml(p.author || 'Airpiv Team')}</span><span class="dot">·</span><span>${escHtml(fmtDate(p.published_at))}</span></div>`
    + '</div></a>';
}

function featuredHtml(p) {
  const cover = p.cover_image_url
    ? `<img class="post-feat-cover" src="${escHtml(p.cover_image_url)}" loading="lazy" alt="${escHtml(p.title)}">`
    : NOIMG_LG;
  return `<a class="post-ticket post-featured" href="/blog/${encodeURIComponent(p.slug)}">${cover}`
    + '<div class="post-feat-body"><span class="post-ticket-eyebrow">★ Neuester Beitrag</span>'
    + `<h2 class="post-feat-title">${escHtml(p.title)}</h2>`
    + (p.excerpt ? `<p class="post-feat-excerpt">${escHtml(p.excerpt)}</p>` : '')
    + `<div class="post-ticket-meta"><span>${escHtml(p.author || 'Airpiv Team')}</span><span class="dot">·</span><span>${escHtml(fmtDate(p.published_at))}</span></div>`
    + '</div></a>';
}

function buildGridHtml(posts) {
  if (!posts.length) return '<p class="jrn-empty">Bald gibt es hier neue Beiträge.</p>';
  if (posts.length > 1) return featuredHtml(posts[0]) + posts.slice(1).map(ticketHtml).join('');
  return posts.map(ticketHtml).join('');
}

function itemListSchema(posts) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.map((p, i) => ({
      '@type': 'ListItem', position: i + 1,
      url: `${SITE}/blog/${encodeURIComponent(p.slug)}`, name: p.title,
    })),
  };
}

// Returns { html }. `posts` is listBlogPosts('de'); German listing only.
function renderBlogListPage(posts) {
  const list = Array.isArray(posts) ? posts : [];
  const mainContent = `<header class="jrn-hero">
  <div class="jrn-hero-in">
    <a href="/" class="back-link" style="color:rgba(255,255,255,.6)">← Zurück zur Startseite</a>
    <div class="jrn-eyebrow">✈ Airpiv Journal</div>
    <h1>Geschichten, die <em>weiter</em> fliegen.</h1>
    <p class="sub">Reisetipps, Preisvergleiche und Inspiration von Menschen, die selbst ständig unterwegs sind.</p>
    <div class="jrn-route" aria-hidden="true"><div class="jrn-route-line"></div><div class="jrn-route-plane">✈</div></div>
  </div>
</header>
<main class="jrn-main">
  <div class="blog-grid" id="blog-grid">${buildGridHtml(list)}</div>
</main>`;

  const html = renderShell({
    lang: 'de',
    title: 'Blog | Airpiv',
    description: 'Tipps und Tricks für günstige Flüge, Reise-Inspiration und alles Wissenswerte rund ums Fliegen — vom Airpiv-Team.',
    canonicalUrl: BLOG_URL,
    // Only the German listing exists, so the cluster is de + x-default, both self
    // (matches the old blog.html hreflang shape; no fake per-language listings).
    urls: { de: BLOG_URL },
    ogType: 'website',
    headExtra: `${HEAD_FONTS}\n${jsonLdScript(itemListSchema(list))}`,
    mainContent,
  });
  return { html };
}

module.exports = { renderBlogListPage, buildGridHtml, ticketHtml, featuredHtml, itemListSchema };
