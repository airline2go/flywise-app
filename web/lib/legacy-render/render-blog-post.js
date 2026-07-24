const { parse } = require('node-html-parser');
const { escHtml, renderShell, jsonLdScript, speakableSpec } = require('./shell');
const { detectCitiesInText, citiesToCountries } = require('./data');
const { computeReadingTime, buildTocAndIds, extractFaq } = require('./blog-post-helpers');
const { blogHreflangUrls } = require('./blog-hreflang');

// blog-post.css is inlined (bundled string, not a <link>) so it isn't a
// render-blocking round-trip — same reasoning as the flight-route page.
const BLOG_POST_CSS = require('./blog-post-css');
const BLOG_POST_HEAD_EXTRA = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>${BLOG_POST_CSS}</style>`;

// [POPULAR-ROUTES] Computed at build time from the full route list already
// fetched for this build run — the same city-detection/scoring logic as
// loadPopularRoutes() in blog-post.html/-en.html, just run once here instead
// of fetched client-side. [BUG-FIX] the English page previously never
// anglicized origin_city/destination_city here (showing German names on an
// English page) — this shared implementation anglicizes for both languages.
function buildPopularRoutesHtml(post, allRoutes, lang) {
  const de = lang !== 'en';
  const { localizeCity } = require('./data');
  const detectedCities = detectCitiesInText(`${post.title || ''} ${(post.content || '').replace(/<[^>]+>/g, ' ')}`);
  if (!allRoutes || !allRoutes.length) return '';
  let heading = de ? '✈ Beliebte Flugverbindungen' : '✈ Popular flight routes';
  let chosen = allRoutes.slice(0, 4);
  if (detectedCities.length) {
    const scored = allRoutes.map((r) => {
      const oMatch = detectedCities.some((c) => r.origin_city && r.origin_city.toLowerCase() === c.toLowerCase());
      const dMatch = detectedCities.some((c) => r.destination_city && r.destination_city.toLowerCase() === c.toLowerCase());
      return { route: r, score: (oMatch ? 1 : 0) + (dMatch ? 1 : 0) };
    }).filter((s) => s.score > 0);
    if (scored.length) {
      scored.sort((a, b) => b.score - a.score);
      chosen = scored.map((s) => s.route).slice(0, 4);
      heading = de ? '✈ Passende Flugverbindungen' : '✈ Matching flight routes';
    }
  }
  if (!chosen.length) return '';
  const flightsHrefBase = de ? '/flights/' : '/en/flights/';
  const cards = chosen.map((r) => {
    const oCity = localizeCity(r.origin_city, r.origin_iata, lang);
    const dCity = localizeCity(r.destination_city, r.destination_iata, lang);
    return `<a class="post-route-link" href="${flightsHrefBase}${encodeURIComponent(r.slug)}">${escHtml(oCity)} → ${escHtml(dCity)}</a>`;
  }).join('');
  return `<div class="post-routes"><h2>${heading}</h2><div class="post-routes-grid">${cards}</div></div>`;
}

// [MENTIONED-DESTINATIONS] Internal links from a blog post to the CITY pages
// of the destinations it mentions — the popular-routes block above only links
// flight routes, leaving the city entity pages unlinked from the blog. Cities
// are detected in the post text (same detector as the routes block) and
// resolved to real city pages via the route list's city_slug, so we only ever
// link a city that actually has a page. Blog is DE/EN-only, so the two hrefs
// are inline like the rest of this file.
function buildMentionedDestinationsHtml(post, allRoutes, lang) {
  const de = lang !== 'en';
  const { localizeCity, slugForIata } = require('./data');
  const detected = detectCitiesInText(`${post.title || ''} ${(post.content || '').replace(/<[^>]+>/g, ' ')}`);
  if (!detected.length || !allRoutes || !allRoutes.length) return '';
  const detLower = detected.map((c) => c.toLowerCase());
  // The route-pages list carries IATA but no city_slug, so resolve the slug
  // from the airport code via slugForIata (populated by setGeoData).
  const bySlug = new Map();
  for (const r of allRoutes) {
    for (const side of [['origin_city', 'origin_iata'], ['destination_city', 'destination_iata']]) {
      const name = r[side[0]];
      const iata = r[side[1]];
      if (!name || !detLower.includes(name.toLowerCase())) continue;
      const slug = slugForIata(iata);
      if (slug && !bySlug.has(slug)) bySlug.set(slug, { slug, iata, name });
    }
  }
  const dests = [...bySlug.values()].slice(0, 6);
  if (!dests.length) return '';
  const cityHrefBase = de ? '/city/' : '/en/city/';
  const heading = de ? '🌍 Reiseziele im Artikel' : '🌍 Destinations in this article';
  const chips = dests
    .map((d) => `<a class="post-route-link" href="${cityHrefBase}${encodeURIComponent(d.slug)}">${escHtml(localizeCity(d.name, d.iata, lang))}</a>`)
    .join('');
  return `<div class="post-routes"><h2>${heading}</h2><div class="post-routes-grid">${chips}</div></div>`;
}

// [SIMILAR-POSTS] Same tiered matching (same city > same country > recency
// fallback) as loadSimilarPosts(), computed at build time from the full
// post list for this language.
function buildSimilarPostsHtml(post, allPosts, lang) {
  const de = lang !== 'en';
  const currentCities = detectCitiesInText(`${post.title || ''} ${(post.content || '').replace(/<[^>]+>/g, ' ')}`);
  const currentCountries = citiesToCountries(currentCities, lang);
  let others = (allPosts || []).filter((p) => p.slug !== post.slug);
  let heading = de ? '📚 Ähnliche Artikel' : '📚 Similar articles';
  if (currentCities.length) {
    const withMeta = others.map((p) => {
      const pCities = detectCitiesInText(`${p.title || ''} ${p.excerpt || ''}`);
      const pCountries = citiesToCountries(pCities, lang);
      const cityOverlap = pCities.filter((c) => currentCities.indexOf(c) !== -1).length;
      const countryOverlap = pCountries.filter((c) => currentCountries.indexOf(c) !== -1).length;
      return { post: p, cityOverlap, countryOverlap };
    });
    const byCity = withMeta.filter((s) => s.cityOverlap > 0).sort((a, b) => b.cityOverlap - a.cityOverlap);
    const byCountry = withMeta.filter((s) => s.cityOverlap === 0 && s.countryOverlap > 0).sort((a, b) => b.countryOverlap - a.countryOverlap);
    if (byCity.length) { others = byCity.map((s) => s.post); heading = de ? '📚 Passende Artikel zum gleichen Reiseziel' : '📚 Matching articles for this destination'; } else if (byCountry.length) { others = byCountry.map((s) => s.post); heading = de ? `📚 Weitere Artikel aus ${currentCountries[0]}` : `📚 More articles from ${currentCountries[0]}`; }
  }
  others = others.slice(0, 4);
  if (!others.length) return '';
  const blogHrefBase = de ? '/blog/' : '/en/blog/';
  const cards = others.map((p) => `<a class="post-similar-card" href="${blogHrefBase}${encodeURIComponent(p.slug)}"><div class="post-similar-card-title">${escHtml(p.title)}</div></a>`).join('');
  return `<div class="post-similar"><h2>${heading}</h2><div class="post-similar-grid">${cards}</div></div>`;
}

// [UI-ONLY SCRIPT] Reading-progress bar, back-to-top button, FAQ
// expand/collapse, and copy-link button are pure client-side UI behavior —
// not SEO content. They never touch title/description/canonical/schema,
// unlike the old anti-pattern this generator replaces.
function buildUiScript(url) {
  return `<script>
function toggleFaq(btn) {
  var item = btn.closest('.post-faq-item');
  var answer = item.querySelector('.post-faq-a');
  var isOpen = item.classList.contains('open');
  document.querySelectorAll('.post-faq-item.open').forEach(function(el) {
    el.classList.remove('open');
    el.querySelector('.post-faq-a').style.maxHeight = null;
  });
  if (!isOpen) {
    item.classList.add('open');
    answer.style.maxHeight = answer.scrollHeight + 'px';
  }
}
function copyPostLink(btn) {
  navigator.clipboard.writeText(${JSON.stringify(url)}).then(function() {
    var toast = btn.querySelector('.post-copy-toast');
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 1600);
  }).catch(function() {});
}
(function() {
  var rafPending = false;
  var progressEl = document.getElementById('reading-progress');
  var backBtn = document.getElementById('back-to-top');
  function update() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
    progressEl.style.width = pct + '%';
    backBtn.classList.toggle('show', scrollTop > 500);
  }
  window.addEventListener('scroll', function() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function() { rafPending = false; update(); });
  }, { passive: true });
  backBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
})();
</script>`;
}

function renderBlogPostPage(post, allRoutes, allPosts, lang) {
  const de = lang !== 'en';
  const url = `https://airpiv.com/${de ? '' : 'en/'}blog/${encodeURIComponent(post.slug)}`;
  const deUrl = `https://airpiv.com/blog/${encodeURIComponent(post.slug)}`;
  // [BLOG-HREFLANG-FIX] Only advertise language alternates that actually
  // exist — the full rule lives in lib/legacy-render/blog-hreflang.js.
  const hreflangUrls = blogHreflangUrls(post, de, url, deUrl);
  const description = post.meta_description || post.excerpt || `${post.title} — Airpiv Blog`;
  const image = post.cover_image_url || 'https://airpiv.com/og-image.png';

  const plainText = (post.content || '').replace(/<[^>]+>/g, ' ');
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  const readingMin = computeReadingTime(post.content || '');

  const pubDate = post.published_at ? new Date(post.published_at) : null;
  const updDate = post.updated_at ? new Date(post.updated_at) : null;
  const locale = de ? 'de-DE' : 'en-GB';
  const dateStr = pubDate ? pubDate.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const showUpdated = updDate && pubDate && (updDate.getTime() - pubDate.getTime() > 24 * 60 * 60 * 1000);
  const updatedStr = showUpdated ? updDate.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : null;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: de ? 'Startseite' : 'Home', item: de ? 'https://airpiv.com/' : 'https://airpiv.com/en/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: de ? 'https://airpiv.com/blog.html' : 'https://airpiv.com/en/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description,
    image,
    publisher: { '@type': 'Organization', name: 'Airpiv', url: 'https://airpiv.com', logo: { '@type': 'ImageObject', url: 'https://airpiv.com/airpiv-logo.png' } },
    author: { '@type': 'Organization', name: post.author || 'Airpiv Team' },
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: 'Reisetipps',
    wordCount,
    inLanguage: de ? 'de-DE' : 'en-GB',
    speakable: speakableSpec('.post-faq-q'),
  };

  const cover = post.cover_image_url ? `<img class="post-cover" src="${escHtml(post.cover_image_url)}" alt="${escHtml(post.title)}" loading="lazy">` : '';
  const authorName = post.author || 'Airpiv Team';
  const authorInitial = authorName.trim().charAt(0).toUpperCase();

  // [CONTENT-PROCESSING] Parse once, mutate for TOC ids, extract FAQ (which
  // removes the matched heading/Q&A nodes from the tree), then serialize —
  // build-time equivalent of what the browser DOM did after the fact.
  const bodyRoot = parse(`<div>${post.content || ''}</div>`);
  bodyRoot.querySelectorAll('img').forEach((img) => {
    if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.getAttribute('alt')) img.setAttribute('alt', post.title);
    const existingStyle = img.getAttribute('style') || '';
    img.setAttribute('style', `${existingStyle};max-width:100%;height:auto`);
  });
  const tocItems = buildTocAndIds(bodyRoot);
  const tocHtml = tocItems.length >= 2
    ? `<div class="post-toc"><div class="post-toc-title">📑 ${de ? 'Inhaltsverzeichnis' : 'Table of contents'}</div><ol>${tocItems.map((t) => `<li class="${t.level === 'h3' ? 'toc-h3' : ''}"><a href="#${t.id}">${escHtml(t.text)}</a></li>`).join('')}</ol></div>`
    : '';
  const faq = extractFaq(bodyRoot);
  const processedBody = bodyRoot.toString().replace(/^<div>|<\/div>$/g, '');

  let faqHtml = '';
  let faqSchema = null;
  if (faq.items.length) {
    faqHtml = `<div class="post-faq"><h2>${de ? 'Häufig gestellte Fragen' : 'Frequently asked questions'}</h2>${faq.items.map((f, i) => `<div class="post-faq-item" data-idx="${i}"><button class="post-faq-q" onclick="toggleFaq(this)">${escHtml(f.question)}<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button><div class="post-faq-a"><div class="post-faq-a-in">${escHtml(f.answer)}</div></div></div>`).join('')}</div>`;
    faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.items.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) };
  }

  const shareText = encodeURIComponent(post.title);
  const shareUrl = encodeURIComponent(url);
  const shareHtml = `<span class="post-share-lbl">${de ? 'Teilen' : 'Share'}</span>` +
    `<a class="post-share-btn" target="_blank" rel="noopener" href="https://wa.me/?text=${shareText}%20${shareUrl}" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.82L2 22l5.42-1.36c1.38.72 2.94 1.13 4.62 1.13 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m0 1.67c4.55 0 8.24 3.69 8.24 8.24s-3.69 8.24-8.24 8.24c-1.5 0-2.9-.4-4.11-1.1l-.29-.17-3.06.77.8-2.98-.19-.31a8.18 8.18 0 0 1-1.24-4.37c0-4.63 3.69-8.32 8.24-8.32Z"/></svg></a>` +
    `<a class="post-share-btn" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" aria-label="X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.2 8.2L22.5 22h-6.6l-5.2-6.8L4.6 22H1.5l7.7-8.8L1 2h6.7l4.7 6.2Z"/></svg></a>` +
    `<a class="post-share-btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.87v-6.99H7.9V12h2.5V9.8c0-2.47 1.47-3.83 3.72-3.83 1.08 0 2.21.19 2.21.19v2.43h-1.24c-1.23 0-1.61.76-1.61 1.55V12h2.75l-.44 2.88h-2.31v6.99A10 10 0 0 0 22 12"/></svg></a>` +
    `<a class="post-share-btn" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13M7.12 20.45H3.56V9h3.56z"/></svg></a>` +
    `<a class="post-share-btn" href="mailto:?subject=${shareText}&body=${shareUrl}" aria-label="${de ? 'E-Mail' : 'Email'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg></a>` +
    `<button class="post-share-btn post-copy-btn" onclick="copyPostLink(this)" aria-label="${de ? 'Link kopieren' : 'Copy link'}"><span class="post-copy-toast">${de ? 'Kopiert!' : 'Copied!'}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>`;

  const popularRoutesHtml = buildPopularRoutesHtml(post, allRoutes, lang);
  const mentionedDestinationsHtml = buildMentionedDestinationsHtml(post, allRoutes, lang);
  const similarPostsHtml = buildSimilarPostsHtml(post, allPosts, lang);

  const blogHref = de ? '/blog.html' : '/en/blog';
  const homeHref = de ? '/' : '/en/';

  const mainContent = `<main id="post-main">
  <div id="post-content">
<nav class="post-breadcrumb" aria-label="Breadcrumb"><a href="${homeHref}">${de ? 'Startseite' : 'Home'}</a><span class="sep">›</span><a href="${blogHref}">Blog</a><span class="sep">›</span><span class="cur">${escHtml(post.title)}</span></nav>
<div class="pass">
  <div class="pass-strip">
    <div class="pass-strip-brand"><svg width="15" height="15" viewBox="0 0 64 64" fill="none"><path d="M32 10 L48 46 L32 37 L16 46 Z" fill="#0FB5A0"/></svg>Airpiv</div>
    <div class="pass-strip-label">Boarding Pass</div>
  </div>
  <div class="pass-route">
    <div class="pass-route-col">
      <div class="pass-route-eyebrow">${de ? 'Von' : 'From'}</div>
      <div class="pass-route-from">Airpiv Journal</div>
    </div>
    <div class="pass-route-plane">✈</div>
    <div class="pass-route-col">
      <div class="pass-route-eyebrow">${de ? 'Zu' : 'To'}</div>
      <h1 class="pass-route-title">${escHtml(post.title)}</h1>
    </div>
  </div>
  <div class="pass-perf" aria-hidden="true"></div>
  <div class="pass-meta">
    <div class="pass-meta-item"><div class="pass-meta-eyebrow">${de ? 'Autor' : 'Author'}</div><div class="pass-meta-val">${escHtml(authorName)}</div></div>
    <div class="pass-meta-item"><div class="pass-meta-eyebrow">${de ? 'Veröffentlicht' : 'Published'}</div><div class="pass-meta-val">${dateStr}</div></div>
    ${updatedStr ? `<div class="pass-meta-item"><div class="pass-meta-eyebrow">${de ? 'Aktualisiert' : 'Updated'}</div><div class="pass-meta-val">${updatedStr}</div></div>` : ''}
    <div class="pass-meta-item"><div class="pass-meta-eyebrow">${de ? 'Lesezeit' : 'Reading time'}</div><div class="pass-meta-val">${readingMin} ${de ? 'Min.' : 'min'}</div></div>
  </div>
</div>
${cover}
<div class="post-share" id="post-share">${shareHtml}</div>
${tocHtml}
<div class="post-body" id="post-body">${processedBody}</div>
${popularRoutesHtml}
${mentionedDestinationsHtml}
${faqHtml}
<div class="post-author">
  <div class="post-author-av">${escHtml(authorInitial)}</div>
  <div>
    <div class="post-author-name">${escHtml(authorName)}</div>
    <div class="post-author-role">${de ? 'Airpiv Redaktion' : 'Airpiv Editorial'}</div>
    <div class="post-author-bio">${de ? 'Schreibt für Airpiv über günstige Flüge, Reiseplanung und alles, was das Fliegen einfacher macht.' : 'Writes for Airpiv about cheap flights, travel planning, and everything that makes flying easier.'}</div>
  </div>
</div>
${similarPostsHtml}
  </div>
</main>`;

  const headExtraParts = [
    jsonLdScript(breadcrumbSchema),
    jsonLdScript(articleSchema),
  ];
  if (faqSchema) headExtraParts.push(jsonLdScript(faqSchema));
  headExtraParts.push(BLOG_POST_HEAD_EXTRA);

  const html = renderShell({
    lang: de ? 'de' : 'en',
    title: `${post.title} | Airpiv Blog`,
    description,
    canonicalUrl: url,
    urls: hreflangUrls,
    ogType: 'article',
    ogImage: image,
    headExtra: headExtraParts.join('\n'),
    bodyPrefix: '<div id="reading-progress"></div>',
    mainContent,
    bodySuffix: `<button id="back-to-top" aria-label="${de ? 'Nach oben' : 'Back to top'}">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
</button>`,
    scripts: buildUiScript(url),
  });

  return { html, seo: { title: `${post.title} | Airpiv Blog`, description, canonicalUrl: url, schema: articleSchema } };
}

module.exports = { renderBlogPostPage };
