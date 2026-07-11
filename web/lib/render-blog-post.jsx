// Ported from flywise-app/build/render-blog-post.js + blog-post-helpers.js.
// Blog is DE/EN-only (independently-authored content per language via
// separate backend endpoints, see [BLOG-STAYS-DE-EN] in generate-pages.js)
// — it never used the 7-language translate()/format() system the other
// five entity types use, and this port preserves that: German/English
// copy stays inline `de ? 'X' : 'Y'` ternaries exactly as the original had
// them, not migrated onto translate() keys that don't exist for blog.
//
// Three structural differences from render-city.jsx/etc.:
// 1. post.content is admin-authored rich-text HTML (from the blog CMS),
//    parsed once with node-html-parser to assign heading ids (TOC) and
//    extract a trailing FAQ block — the same DOM mutation the original
//    did, just server-side instead of build-time-via-Node (functionally
//    identical, `node-html-parser` is the same pure JS lib either way).
// 2. The processed post body, the FAQ accordion, and the share-button row
//    are rendered via dangerouslySetInnerHTML (escHtml'd where the
//    original did), matching the original's raw-HTML-string construction
//    exactly — including the onclick="toggleFaq(this)"/onclick=
//    "copyPostLink(this)" inline handlers. Converting those to real React
//    event handlers would require a 'use client' boundary and is a bigger
//    architectural change than "port this page," so this preserves the
//    original mechanism as-is (this app doesn't set a CSP, so unlike the
//    old static site's hardened CSP, inline handlers aren't blocked here).
// 3. Google Fonts (Space Grotesk/Syne/IBM Plex Mono) are loaded only on
//    this entity type (BLOG_POST_HEAD_EXTRA in the original) — the
//    external stylesheet <link> needs an explicit `precedence` prop for
//    React to hoist it into <head> (see RootLayoutChrome.jsx's header
//    comment on the same hoisting mechanism for the local shared-layout
//    CSS import; an external URL can't go through Next's CSS-import
//    pipeline, so `precedence` is set directly on the raw <link> instead).
import { parse } from 'node-html-parser';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { getBlogPost, listBlogPosts, listRoutePages, getGeoIndex } from './content-api';
import { localizeCity, detectCitiesInText, citiesToCountries } from './geo';
import { urlFor } from './languages';
import { JsonLd, homeHref } from './page-shell';
import '../styles/blog-post.css';

const OG_LOCALE = { de: 'de_DE', en: 'en_GB' };

function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Ported verbatim from blog-post-helpers.js ─────────────────────────

function computeReadingTime(html) {
  const text = html.replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function slugifyHeading(text) {
  const base = text.trim().toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c]))
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') || 'abschnitt';
  return base;
}

function buildTocAndIds(root) {
  const headings = root.querySelectorAll('h2, h3');
  const items = [];
  const seen = {};
  headings.forEach((h) => {
    const base = slugifyHeading(h.text);
    let id = base;
    let n = 2;
    while (seen[id]) { id = `${base}-${n++}`; }
    seen[id] = true;
    h.setAttribute('id', id);
    items.push({ level: h.tagName.toLowerCase(), text: h.text.trim(), id });
  });
  return items;
}

const FAQ_HEADING_RE = /^(FAQ|FAQs|Häufig gestellte Fragen|Oft gestellte Fragen|Fragen und Antworten|Wichtige Fragen|Frequently Asked Questions|Questions and Answers)$/i;

function extractFaq(root) {
  const h2s = root.querySelectorAll('h2');
  const faqHeading = h2s.find((h) => FAQ_HEADING_RE.test(h.text.trim().replace(/^[^\wäöüÄÖÜ]+/, '')));
  if (!faqHeading) return { items: [] };

  const items = [];
  const toRemove = [faqHeading];
  let node = faqHeading.nextElementSibling;
  let curQ = null;
  let curA = [];
  function flush() { if (curQ && curA.length) items.push({ question: curQ, answer: curA.join(' ') }); curQ = null; curA = []; }
  while (node && node.tagName !== 'H2') {
    toRemove.push(node);
    if (node.tagName === 'H3') { flush(); curQ = node.text.trim(); }
    else if (node.tagName === 'P' && curQ) { curA.push(node.text.trim()); }
    node = node.nextElementSibling;
  }
  flush();
  toRemove.forEach((n) => n.remove());
  return { items };
}

// ─── [POPULAR-ROUTES] ported from buildPopularRoutesHtml(), now JSX ────

function PopularRoutesSection({ post, allRoutes, lang, geoIndex }) {
  const de = lang !== 'en';
  const detectedCities = detectCitiesInText(`${post.title || ''} ${(post.content || '').replace(/<[^>]+>/g, ' ')}`);
  if (!allRoutes || !allRoutes.length) return null;
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
  if (!chosen.length) return null;
  const flightsHrefBase = de ? '/flights/' : '/en/flights/';
  return (
    <div className="post-routes">
      <h2>{heading}</h2>
      <div className="post-routes-grid">
        {chosen.map((r) => {
          const oCity = localizeCity(geoIndex, r.origin_city, r.origin_iata, lang);
          const dCity = localizeCity(geoIndex, r.destination_city, r.destination_iata, lang);
          return (
            <a key={r.slug} className="post-route-link" href={`${flightsHrefBase}${encodeURIComponent(r.slug)}`}>
              {oCity} → {dCity}
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── [SIMILAR-POSTS] ported from buildSimilarPostsHtml(), now JSX ──────

function SimilarPostsSection({ post, allPosts, lang }) {
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
  if (!others.length) return null;
  const blogHrefBase = de ? '/blog/' : '/en/blog/';
  return (
    <div className="post-similar">
      <h2>{heading}</h2>
      <div className="post-similar-grid">
        {others.map((p) => (
          <a key={p.slug} className="post-similar-card" href={`${blogHrefBase}${encodeURIComponent(p.slug)}`}>
            <div className="post-similar-card-title">{p.title}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── [UI-ONLY SCRIPT] ported verbatim from buildUiScript() ─────────────
// Reading-progress bar, back-to-top button, FAQ expand/collapse, and
// copy-link button are pure client-side UI behavior — never touch
// title/description/canonical/schema.

function buildUiScript(url) {
  return `function toggleFaq(btn) {
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
})();`;
}

// ─── View model + metadata ──────────────────────────────────────────────

async function loadBlogPostViewModel(slug, lang) {
  // Blog is DE/EN-only — the other 5 prefixed languages 404 here even
  // though they're otherwise valid site languages (see [lang]/layout.js).
  if (lang !== 'de' && lang !== 'en') return null;
  const post = await getBlogPost(slug, lang);
  if (!post) return null;
  const de = lang !== 'en';

  const url = urlFor(lang, `blog/${encodeURIComponent(post.slug)}`);
  const deUrl = urlFor('de', `blog/${encodeURIComponent(post.slug)}`);
  const enUrl = urlFor('en', `blog/${encodeURIComponent(post.slug)}`);
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

  // [CONTENT-PROCESSING] Parse once, mutate for TOC ids, extract FAQ
  // (which removes the matched heading/Q&A nodes from the tree), then
  // serialize — same as the original build-time step.
  const bodyRoot = parse(`<div>${post.content || ''}</div>`);
  bodyRoot.querySelectorAll('img').forEach((img) => {
    if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.getAttribute('alt')) img.setAttribute('alt', post.title);
    const existingStyle = img.getAttribute('style') || '';
    img.setAttribute('style', `${existingStyle};max-width:100%;height:auto`);
  });
  const tocItems = buildTocAndIds(bodyRoot);
  const faq = extractFaq(bodyRoot);
  const processedBody = bodyRoot.toString().replace(/^<div>|<\/div>$/g, '');

  const geoIndex = await getGeoIndex();
  const allRoutes = await listRoutePages();
  const allPosts = await listBlogPosts(lang);

  const authorName = post.author || 'Airpiv Team';
  const authorInitial = authorName.trim().charAt(0).toUpperCase();

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: de ? 'Startseite' : 'Home', item: urlFor(lang, '') },
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
    author: { '@type': 'Organization', name: authorName },
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: 'Reisetipps',
    wordCount,
    inLanguage: de ? 'de-DE' : 'en-GB',
  };
  const faqSchema = faq.items.length
    ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.items.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }
    : null;

  return {
    post, de, url, deUrl, enUrl, description, image, readingMin, dateStr, updatedStr,
    tocItems, faq, processedBody, geoIndex, allRoutes, allPosts,
    authorName, authorInitial, breadcrumbSchema, articleSchema, faqSchema,
  };
}

async function buildBlogPostMetadata(slug, lang) {
  const vm = await loadBlogPostViewModel(slug, lang);
  if (!vm) notFound();
  const { post, description, image, url, deUrl, enUrl } = vm;
  const fullTitle = `${post.title} | Airpiv Blog`;
  return {
    title: fullTitle,
    description,
    robots: 'index, follow',
    alternates: { canonical: url, languages: { de: deUrl, en: enUrl, 'x-default': deUrl } },
    openGraph: {
      type: 'article',
      siteName: 'Airpiv',
      locale: OG_LOCALE[lang] || OG_LOCALE.en,
      title: fullTitle,
      description,
      url,
      images: [image],
    },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}

function shareButtonsHtml(post, url, de) {
  const shareText = encodeURIComponent(post.title);
  const shareUrl = encodeURIComponent(url);
  return `<span class="post-share-lbl">${de ? 'Teilen' : 'Share'}</span>` +
    `<a class="post-share-btn" target="_blank" rel="noopener" href="https://wa.me/?text=${shareText}%20${shareUrl}" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.82L2 22l5.42-1.36c1.38.72 2.94 1.13 4.62 1.13 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m0 1.67c4.55 0 8.24 3.69 8.24 8.24s-3.69 8.24-8.24 8.24c-1.5 0-2.9-.4-4.11-1.1l-.29-.17-3.06.77.8-2.98-.19-.31a8.18 8.18 0 0 1-1.24-4.37c0-4.63 3.69-8.32 8.24-8.32Z"/></svg></a>` +
    `<a class="post-share-btn" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" aria-label="X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.2 8.2L22.5 22h-6.6l-5.2-6.8L4.6 22H1.5l7.7-8.8L1 2h6.7l4.7 6.2Z"/></svg></a>` +
    `<a class="post-share-btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.87v-6.99H7.9V12h2.5V9.8c0-2.47 1.47-3.83 3.72-3.83 1.08 0 2.21.19 2.21.19v2.43h-1.24c-1.23 0-1.61.76-1.61 1.55V12h2.75l-.44 2.88h-2.31v6.99A10 10 0 0 0 22 12"/></svg></a>` +
    `<a class="post-share-btn" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13M7.12 20.45H3.56V9h3.56z"/></svg></a>` +
    `<a class="post-share-btn" href="mailto:?subject=${shareText}&body=${shareUrl}" aria-label="${de ? 'E-Mail' : 'Email'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg></a>` +
    `<button class="post-share-btn post-copy-btn" onclick="copyPostLink(this)" aria-label="${de ? 'Link kopieren' : 'Copy link'}"><span class="post-copy-toast">${de ? 'Kopiert!' : 'Copied!'}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>`;
}

function faqAccordionHtml(faqItems, de) {
  return `<h2>${de ? 'Häufig gestellte Fragen' : 'Frequently asked questions'}</h2>${faqItems.map((f, i) => `<div class="post-faq-item" data-idx="${i}"><button class="post-faq-q" onclick="toggleFaq(this)">${escHtml(f.question)}<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button><div class="post-faq-a"><div class="post-faq-a-in">${escHtml(f.answer)}</div></div></div>`).join('')}`;
}

async function BlogPostPageBody({ slug, lang }) {
  const vm = await loadBlogPostViewModel(slug, lang);
  if (!vm) notFound();
  const {
    post, de, url, readingMin, dateStr, updatedStr, tocItems, faq, processedBody,
    geoIndex, allRoutes, allPosts, authorName, authorInitial,
    breadcrumbSchema, articleSchema, faqSchema,
  } = vm;

  const blogHref = de ? '/blog.html' : '/en/blog';

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- these are page-specific fonts, not shared site-wide (see file header); no _document.js equivalent exists in the App Router. */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@700;800&family=IBM+Plex+Mono:wght@500;600&display=swap"
        rel="stylesheet"
        precedence="high"
      />
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={articleSchema} />
      {faqSchema && <JsonLd schema={faqSchema} />}
      <div id="reading-progress" />
      <main id="post-main">
        <div id="post-content">
          <nav className="post-breadcrumb" aria-label="Breadcrumb">
            {/* see PLAIN-ANCHORS-INTENTIONAL in page-shell.jsx — "/" and the blog index aren't part of this Next.js app yet */}
            <a href={homeHref(lang)}>{de ? 'Startseite' : 'Home'}</a><span className="sep">›</span>
            <a href={blogHref}>Blog</a><span className="sep">›</span>
            <span className="cur">{post.title}</span>
          </nav>
          <div className="pass">
            <div className="pass-strip">
              <div className="pass-strip-brand"><svg width="15" height="15" viewBox="0 0 64 64" fill="none"><path d="M32 10 L48 46 L32 37 L16 46 Z" fill="#0FB5A0" /></svg>Airpiv</div>
              <div className="pass-strip-label">Boarding Pass</div>
            </div>
            <div className="pass-route">
              <div className="pass-route-col">
                <div className="pass-route-eyebrow">{de ? 'Von' : 'From'}</div>
                <div className="pass-route-from">Airpiv Journal</div>
              </div>
              <div className="pass-route-plane">✈</div>
              <div className="pass-route-col">
                <div className="pass-route-eyebrow">{de ? 'Zu' : 'To'}</div>
                <h1 className="pass-route-title">{post.title}</h1>
              </div>
            </div>
            <div className="pass-perf" aria-hidden="true" />
            <div className="pass-meta">
              <div className="pass-meta-item"><div className="pass-meta-eyebrow">{de ? 'Autor' : 'Author'}</div><div className="pass-meta-val">{authorName}</div></div>
              <div className="pass-meta-item"><div className="pass-meta-eyebrow">{de ? 'Veröffentlicht' : 'Published'}</div><div className="pass-meta-val">{dateStr}</div></div>
              {updatedStr && (
                <div className="pass-meta-item"><div className="pass-meta-eyebrow">{de ? 'Aktualisiert' : 'Updated'}</div><div className="pass-meta-val">{updatedStr}</div></div>
              )}
              <div className="pass-meta-item"><div className="pass-meta-eyebrow">{de ? 'Lesezeit' : 'Reading time'}</div><div className="pass-meta-val">{readingMin} {de ? 'Min.' : 'min'}</div></div>
            </div>
          </div>
          {post.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element -- cover_image_url is an arbitrary admin-supplied external URL (no remotePatterns configured); matches the original's plain <img loading="lazy">.
            <img className="post-cover" src={post.cover_image_url} alt={post.title} loading="lazy" />
          )}
          <div className="post-share" id="post-share" dangerouslySetInnerHTML={{ __html: shareButtonsHtml(post, url, de) }} />
          {tocItems.length >= 2 && (
            <div className="post-toc">
              <div className="post-toc-title">📑 {de ? 'Inhaltsverzeichnis' : 'Table of contents'}</div>
              <ol>
                {tocItems.map((t) => (
                  <li key={t.id} className={t.level === 'h3' ? 'toc-h3' : ''}><a href={`#${t.id}`}>{t.text}</a></li>
                ))}
              </ol>
            </div>
          )}
          <div className="post-body" id="post-body" dangerouslySetInnerHTML={{ __html: processedBody }} />
          <PopularRoutesSection post={post} allRoutes={allRoutes} lang={lang} geoIndex={geoIndex} />
          {faq.items.length > 0 && (
            <div className="post-faq" dangerouslySetInnerHTML={{ __html: faqAccordionHtml(faq.items, de) }} />
          )}
          <div className="post-author">
            <div className="post-author-av">{authorInitial}</div>
            <div>
              <div className="post-author-name">{authorName}</div>
              <div className="post-author-role">{de ? 'Airpiv Redaktion' : 'Airpiv Editorial'}</div>
              <div className="post-author-bio">{de ? 'Schreibt für Airpiv über günstige Flüge, Reiseplanung und alles, was das Fliegen einfacher macht.' : 'Writes for Airpiv about cheap flights, travel planning, and everything that makes flying easier.'}</div>
            </div>
          </div>
          <SimilarPostsSection post={post} allPosts={allPosts} lang={lang} />
        </div>
      </main>
      <button id="back-to-top" aria-label={de ? 'Nach oben' : 'Back to top'}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
      </button>
      <Script id={`blog-ui-${post.slug}-${lang}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: buildUiScript(url) }} />
    </>
  );
}

export { buildBlogPostMetadata, BlogPostPageBody };
