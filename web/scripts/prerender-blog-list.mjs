// [P0-5 / P2-5] Runs before `next build` (after prerender-popular-routes).
//
// The German blog listing (public/blog.html) fills its #blog-grid client-side
// (fetch /blog-posts → renderPosts), so the raw HTML Googlebot parses first ships
// only skeletons and an EMPTY ItemList — the article links to /blog/<slug> are
// invisible without running JS. This stamps real, crawlable <a href="/blog/slug">
// cards into #blog-grid and populates the ItemList JSON-LD at deploy time, so the
// links are present on first byte for crawlers and no-JS clients. The existing
// client JS still runs and re-renders the grid for interactive search/filtering —
// same links, just enhanced.
//
// Deliberately defensive (same contract as prerender-popular-routes): any problem
// logs a warning and exits 0 so it can never break a deployment (the client-side
// fallback then populates the grid at runtime as before).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return ''; }
}

const NOIMG = '<div class="post-ticket-noimg"><svg width="34" height="34" viewBox="0 0 64 64" fill="none"><path d="M32 10 L48 46 L32 37 L16 46 Z" fill="#0FB5A0" opacity="0.85"/></svg></div>';
const NOIMG_LG = '<div class="post-ticket-noimg post-feat-noimg"><svg width="52" height="52" viewBox="0 0 64 64" fill="none"><path d="M32 10 L48 46 L32 37 L16 46 Z" fill="#0FB5A0" opacity="0.85"/></svg></div>';

// One standard post card — mirrors the client ticketHtml() so styling matches.
export function ticketHtml(p) {
  const cover = p.cover_image_url
    ? `<img class="post-ticket-cover" src="${escHtml(p.cover_image_url)}" loading="lazy" alt="${escHtml(p.title)}">`
    : NOIMG;
  return `<a class="post-ticket" href="/blog/${encodeURIComponent(p.slug)}">${cover}`
    + '<div class="post-ticket-perf" aria-hidden="true"></div><div class="post-ticket-body">'
    + '<span class="post-ticket-eyebrow">Airpiv Journal</span>'
    + `<h2 class="post-ticket-title">${escHtml(p.title)}</h2>`
    + (p.excerpt ? `<p class="post-ticket-excerpt">${escHtml(p.excerpt)}</p>` : '<span style="flex:1"></span>')
    + `<div class="post-ticket-meta"><span>${escHtml(p.author || 'Airpiv Team')}</span><span class="dot">·</span><span>${fmtDate(p.published_at)}</span></div>`
    + '</div></a>';
}

// The featured (newest) post card — mirrors the client featuredHtml().
export function featuredHtml(p) {
  const cover = p.cover_image_url
    ? `<img class="post-feat-cover" src="${escHtml(p.cover_image_url)}" loading="lazy" alt="${escHtml(p.title)}">`
    : NOIMG_LG;
  return `<a class="post-ticket post-featured" href="/blog/${encodeURIComponent(p.slug)}">${cover}`
    + '<div class="post-feat-body"><span class="post-ticket-eyebrow">★ Neuester Beitrag</span>'
    + `<h2 class="post-feat-title">${escHtml(p.title)}</h2>`
    + (p.excerpt ? `<p class="post-feat-excerpt">${escHtml(p.excerpt)}</p>` : '')
    + `<div class="post-ticket-meta"><span>${escHtml(p.author || 'Airpiv Team')}</span><span class="dot">·</span><span>${fmtDate(p.published_at)}</span></div>`
    + '</div></a>';
}

// Grid inner HTML: featured newest + the rest as tickets (matches the client's
// !q && length>1 branch), or plain tickets for 0/1 posts.
export function buildGridHtml(posts) {
  if (!posts.length) return '';
  if (posts.length > 1) return featuredHtml(posts[0]) + posts.slice(1).map(ticketHtml).join('');
  return posts.map(ticketHtml).join('');
}

export function buildItemListJson(posts) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.map((p, i) => ({
      '@type': 'ListItem', position: i + 1,
      url: `https://airpiv.com/blog/${encodeURIComponent(p.slug)}`, name: p.title,
    })),
  });
}

// Replace #blog-grid's inner content (skeletons) with real cards, and clear the
// aria-busy flag. Non-greedy match to the container's own </div> close.
export function injectBlogGrid(html, gridHtml) {
  const re = /(<div class="blog-grid" id="blog-grid")[^>]*>[\s\S]*?(<\/div>\s*<\/main>)/;
  if (!re.test(html)) throw new Error('#blog-grid container not found');
  return html.replace(re, `$1>${gridHtml}$2`);
}

// Populate the empty ItemList schema script by id.
export function injectItemList(html, json) {
  const re = /(<script type="application\/ld\+json" id="itemlist-schema">)[\s\S]*?(<\/script>)/;
  if (!re.test(html)) throw new Error('#itemlist-schema not found');
  return html.replace(re, `$1${json}$2`);
}

export function injectBlogList(html, posts) {
  let out = injectBlogGrid(html, buildGridHtml(posts));
  out = injectItemList(out, buildItemListJson(posts));
  return out;
}

async function fetchGermanPosts() {
  const base = process.env.API_BASE || 'https://api.airpiv.com';
  const res = await fetch(`${base}/blog-posts`);
  if (!res.ok) throw new Error(`/blog-posts → HTTP ${res.status}`);
  const data = await res.json();
  return (data && data.posts) || [];
}

async function main() {
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const indexPath = join(publicDir, 'blog.html');
  if (!existsSync(indexPath)) { console.warn('[prerender-blog-list] public/blog.html not found — skipping'); return; }
  const posts = await fetchGermanPosts();
  if (!posts.length) { console.warn('[prerender-blog-list] no published posts — leaving client-side fallback in place'); return; }
  const html = readFileSync(indexPath, 'utf8');
  const next = injectBlogList(html, posts);
  writeFileSync(indexPath, next);
  console.log(`[prerender-blog-list] injected ${posts.length} crawlable blog links + ItemList into public/blog.html`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => { console.warn('[prerender-blog-list] non-fatal error, skipping:', err && err.message); process.exit(0); });
}
