const { escHtml, renderShell, jsonLdScript, homeHref } = require('./shell');
const { translate, format } = require('./translate');
const { LANGUAGES, getLanguage, urlFor, urlsFor } = require('./languages');

// [REVIEWS-P1] The central /reviews hub — a real, content-bearing page that
// shows the live aggregate (average / count / 5→1 distribution) and the
// published reviews themselves. Data is server-rendered from
// flywise-server's GET /reviews (published rows only); nothing is fabricated.
//
// HONESTY / SEO: the page is only worth indexing once real reviews exist —
// an empty page is thin, so it renders `noindex, follow` until there is at
// least one published review. No AggregateRating structured data is emitted
// here yet (that's gated on the Google-eligibility check in a later phase,
// per the plan's §19/§20); this page carries only a plain WebPage +
// Breadcrumb schema, exactly like the Popular hub.

const REVIEWS_CSS = `<style>
.breadcrumb{display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px;flex-wrap:wrap}
.breadcrumb a{color:var(--teal);text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.rv-intro{font-size:14px;color:var(--tx2);line-height:1.6;margin:0 0 18px}
.rv-summary{display:flex;gap:24px;align-items:center;background:var(--bg2);border:1px solid var(--bd);border-radius:16px;padding:20px 22px;flex-wrap:wrap}
.rv-score{display:flex;flex-direction:column;align-items:center;min-width:120px}
.rv-score-num{font-family:'Syne',sans-serif;font-size:2.8rem;line-height:1;color:var(--tx);font-weight:800}
.rv-score-out{font-size:13px;color:var(--tx3);margin-top:2px}
.rv-stars{color:var(--teal);letter-spacing:2px;font-size:16px}
.rv-stars .off{color:var(--bd2)}
.rv-score-count{font-size:12.5px;color:var(--tx3);margin-top:4px}
.rv-dist{flex:1;min-width:220px;display:flex;flex-direction:column;gap:5px}
.rv-dist-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--tx3)}
.rv-dist-row .lbl{width:34px;text-align:right;color:var(--tx2);font-weight:600}
.rv-bar{flex:1;height:8px;background:var(--bd);border-radius:6px;overflow:hidden}
.rv-bar span{display:block;height:100%;background:var(--teal);border-radius:6px}
.rv-dist-row .cnt{width:34px;color:var(--tx3)}
.rv-list{margin-top:26px;display:flex;flex-direction:column;gap:14px}
.rv-card{background:var(--bg);border:1px solid var(--bd);border-radius:14px;padding:16px 18px}
.rv-card-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.rv-card-stars{color:var(--teal);letter-spacing:1.5px;font-size:14px}
.rv-card-stars .off{color:var(--bd2)}
.rv-verified{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:700;color:var(--gr);background:var(--gr-bg);padding:2px 8px;border-radius:20px}
.rv-comment{font-size:14px;color:var(--tx);line-height:1.6;margin:0 0 8px}
.rv-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
.rv-tag{font-size:11.5px;color:var(--tx2);background:var(--bg2);border:1px solid var(--bd);border-radius:20px;padding:2px 9px}
.rv-meta{font-size:12.5px;color:var(--tx3);font-weight:600}
.rv-empty{background:var(--bg2);border:1px dashed var(--bd2);border-radius:14px;padding:26px;text-align:center;color:var(--tx3);font-size:14px}
</style>`;

// ★★★☆☆ — filled up to `rating`, empty after, out of 5. Decorative; the
// numeric score + aria-label carry the real value for assistive tech.
function starsHtml(rating) {
  const r = Math.round(Number(rating) || 0);
  let out = '';
  for (let i = 1; i <= 5; i++) out += i <= r ? '★' : '<span class="off">★</span>';
  return out;
}

const LIKED_TAGS = ['easy_search', 'clear_prices', 'fast_results', 'good_information', 'easy_booking'];

// One review card. `review` is a published row from GET /reviews.
function reviewCard(review, lang, locale) {
  const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating) || 0)));
  const author = (review.author_name && String(review.author_name).trim()) || translate('reviewsAnonymous', lang);
  const parts = [escHtml(author)];
  if (review.country) parts.push(escHtml(String(review.country)));
  if (review.created_at) {
    const d = new Date(review.created_at);
    if (!isNaN(d)) parts.push(escHtml(d.toLocaleDateString(locale, { year: 'numeric', month: 'long' })));
  }

  const tags = Array.isArray(review.liked_tags)
    ? review.liked_tags.filter((t) => LIKED_TAGS.includes(t))
      .map((t) => `<span class="rv-tag">${escHtml(translate(`reviewsTag_${t}`, lang))}</span>`).join('')
    : '';
  const tagsHtml = tags ? `<div class="rv-tags">${tags}</div>` : '';

  const verifiedHtml = review.verified
    ? `<span class="rv-verified">✓ ${escHtml(translate('reviewsVerified', lang))}</span>`
    : '';

  const commentHtml = review.comment
    ? `<p class="rv-comment">${escHtml(String(review.comment))}</p>`
    : '';

  return `<article class="rv-card">
<div class="rv-card-top">
<span class="rv-card-stars" role="img" aria-label="${rating}/5">${starsHtml(rating)}</span>
${verifiedHtml}
</div>
${commentHtml}${tagsHtml}
<div class="rv-meta">${parts.join(' · ')}</div>
</article>`;
}

// data: { reviews, total, aggregate: { average, count, distribution } }
function renderReviewsPage(data, lang) {
  const locale = getLanguage(lang).locale;
  const { reviews = [], aggregate = {} } = data || {};
  const count = Number(aggregate.count) || 0;
  const average = aggregate.average;
  const distribution = aggregate.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const nf = (n) => Number(n).toLocaleString(locale);

  const title = translate('reviewsPageTitle', lang);
  const description = translate('reviewsMetaDescription', lang);
  const urls = urlsFor('reviews');
  const url = urls[lang];

  const breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${homeHref(lang)}">${escHtml(translate('homeLabel', lang))}</a><span>›</span><span>${escHtml(translate('reviewsLabel', lang))}</span></nav>`;

  let summaryHtml = '';
  let listHtml = '';
  if (count > 0 && average != null) {
    const avgStr = Number(average).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const maxBucket = Math.max(1, ...[1, 2, 3, 4, 5].map((r) => distribution[r] || 0));
    const distRows = [5, 4, 3, 2, 1].map((r) => {
      const c = distribution[r] || 0;
      const pct = Math.round((c / maxBucket) * 100);
      return `<div class="rv-dist-row"><span class="lbl">${r}★</span><span class="rv-bar"><span style="width:${pct}%"></span></span><span class="cnt">${nf(c)}</span></div>`;
    }).join('');

    summaryHtml = `<section class="rv-summary" aria-label="${escHtml(title)}">
<div class="rv-score">
<span class="rv-score-num">${avgStr}</span>
<span class="rv-stars" role="img" aria-label="${avgStr}/5">${starsHtml(average)}</span>
<span class="rv-score-out">/ 5</span>
<span class="rv-score-count">${escHtml(format(translate('reviewsBasedOn', lang), { count: nf(count) }))}</span>
</div>
<div class="rv-dist">${distRows}</div>
</section>`;

    listHtml = `<div class="rv-list">${reviews.map((rv) => reviewCard(rv, lang, locale)).join('')}</div>`;
  } else {
    summaryHtml = `<div class="rv-empty">${escHtml(translate('reviewsEmpty', lang))}</div>`;
  }

  const mainContent = `<main id="reviews-main">
  <div id="reviews-content">
${breadcrumbHtml}
<h1>${escHtml(translate('reviewsH1', lang))}</h1>
<p class="rv-intro">${escHtml(translate('reviewsIntro', lang))}</p>
${summaryHtml}
${listHtml}
  </div>
</main>`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    inLanguage: locale,
    availableLanguage: LANGUAGES.map((l) => l.locale),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') },
      { '@type': 'ListItem', position: 2, name: translate('reviewsLabel', lang), item: url },
    ],
  };
  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}\n${REVIEWS_CSS}`;

  // Thin until there's something real to show — never index an empty hub.
  const robotsContent = count > 0 ? 'index, follow' : 'noindex, follow';

  const html = renderShell({
    lang,
    title: `${title} | Airpiv`,
    description,
    canonicalUrl: url,
    urls,
    robotsContent,
    headExtra,
    mainContent,
  });

  return { html, seo: { title: `${title} | Airpiv`, description, canonicalUrl: url, schema } };
}

// ─── Route-page reviews section (P1-b) ───────────────────────────────────
// Server-rendered "Traveler reviews" block injected into a flight-route page
// (see render.js renderFlightRouteHtml). Data is this route's own published
// reviews + aggregate from GET /reviews?route=<slug>.
//
// SEO thresholds (§14 of the plan) — avoids thin content on low-review
// routes and never inflates an empty section:
//   • < 3 published reviews → nothing rendered at all
//   • ≥ 3 → the review cards
//   • ≥ 5 → a rating summary (average + stars)
//   • ≥ 10 → the summary AND the 5→1 distribution
// No AggregateRating structured data here (gated on the Google-eligibility
// check in a later phase, §19/§20) — this block is visual UGC only.
const ROUTE_REVIEWS_MIN = 3;
const ROUTE_REVIEWS_SUMMARY_MIN = 5;
const ROUTE_REVIEWS_DISTRIBUTION_MIN = 10;
const ROUTE_REVIEWS_SHOWN = 6;

const ROUTE_REVIEWS_CSS = `<style>
.route-reviews-section{margin-top:34px}
.route-reviews-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:14px}
.route-rv-summary{display:flex;gap:20px;align-items:center;background:var(--bg2);border:1px solid var(--bd);border-radius:14px;padding:16px 18px;flex-wrap:wrap;margin-bottom:16px}
.route-rv-score{display:flex;flex-direction:column;min-width:96px}
.route-rv-score-num{font-family:'Syne',sans-serif;font-size:2.1rem;line-height:1;color:var(--tx);font-weight:800}
.route-rv-score .rv-stars{color:var(--teal);letter-spacing:1.5px;font-size:14px;margin-top:3px}
.route-rv-score .rv-stars .off{color:var(--bd2)}
.route-rv-score-count{font-size:12px;color:var(--tx3);margin-top:3px}
.route-rv-dist{flex:1;min-width:200px;display:flex;flex-direction:column;gap:4px}
.route-rv-dist-row{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--tx3)}
.route-rv-dist-row .lbl{width:30px;text-align:right;color:var(--tx2);font-weight:600}
.route-rv-bar{flex:1;height:7px;background:var(--bd);border-radius:6px;overflow:hidden}
.route-rv-bar span{display:block;height:100%;background:var(--teal);border-radius:6px}
.route-rv-dist-row .cnt{width:30px;color:var(--tx3)}
.route-rv-list{display:flex;flex-direction:column;gap:12px}
.route-rv-card{background:var(--bg);border:1px solid var(--bd);border-radius:12px;padding:14px 16px}
.route-rv-card-top{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:6px}
.route-rv-card-stars{color:var(--teal);letter-spacing:1.5px;font-size:13px}
.route-rv-card-stars .off{color:var(--bd2)}
.route-rv-verified{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:var(--gr);background:var(--gr-bg);padding:2px 8px;border-radius:20px}
.route-rv-comment{font-size:13.5px;color:var(--tx);line-height:1.55;margin:0 0 6px}
.route-rv-meta{font-size:12px;color:var(--tx3);font-weight:600}
.route-rv-more{font-size:12.5px;margin-top:12px}
.route-rv-more a{color:var(--teal);text-decoration:none;font-weight:600}
.route-rv-more a:hover{text-decoration:underline}
</style>`;

// A single route-scoped review card (tighter than the central page's card).
function routeReviewCard(review, lang, locale) {
  const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating) || 0)));
  const author = (review.author_name && String(review.author_name).trim()) || translate('reviewsAnonymous', lang);
  const parts = [escHtml(author)];
  if (review.country) parts.push(escHtml(String(review.country)));
  if (review.created_at) {
    const d = new Date(review.created_at);
    if (!isNaN(d)) parts.push(escHtml(d.toLocaleDateString(locale, { year: 'numeric', month: 'long' })));
  }
  const verifiedHtml = review.verified ? `<span class="route-rv-verified">✓ ${escHtml(translate('reviewsVerified', lang))}</span>` : '';
  const commentHtml = review.comment ? `<p class="route-rv-comment">${escHtml(String(review.comment))}</p>` : '';
  return `<article class="route-rv-card">
<div class="route-rv-card-top"><span class="route-rv-card-stars" role="img" aria-label="${rating}/5">${starsHtml(rating)}</span>${verifiedHtml}</div>
${commentHtml}<div class="route-rv-meta">${parts.join(' · ')}</div>
</article>`;
}

// data: { reviews, total, aggregate:{average,count,distribution} } for ONE route.
// `reviewsHref` links to the central /reviews hub in the page's language.
// Returns '' when below the min threshold (§14) — the caller then renders no
// section at all.
function renderRouteReviewsSection(data, lang, reviewsHref) {
  const { reviews = [], total = 0, aggregate = {} } = data || {};
  const count = Number(aggregate.count) || 0;
  if (count < ROUTE_REVIEWS_MIN) return '';

  const locale = getLanguage(lang).locale;
  const nf = (n) => Number(n).toLocaleString(locale);
  const distribution = aggregate.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  let summaryHtml = '';
  if (count >= ROUTE_REVIEWS_SUMMARY_MIN && aggregate.average != null) {
    const avgStr = Number(aggregate.average).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    let distHtml = '';
    if (count >= ROUTE_REVIEWS_DISTRIBUTION_MIN) {
      const maxBucket = Math.max(1, ...[1, 2, 3, 4, 5].map((r) => distribution[r] || 0));
      const rows = [5, 4, 3, 2, 1].map((r) => {
        const c = distribution[r] || 0;
        const pct = Math.round((c / maxBucket) * 100);
        return `<div class="route-rv-dist-row"><span class="lbl">${r}★</span><span class="route-rv-bar"><span style="width:${pct}%"></span></span><span class="cnt">${nf(c)}</span></div>`;
      }).join('');
      distHtml = `<div class="route-rv-dist">${rows}</div>`;
    }
    summaryHtml = `<div class="route-rv-summary">
<div class="route-rv-score">
<span class="route-rv-score-num">${avgStr}</span>
<span class="rv-stars" role="img" aria-label="${avgStr}/5">${starsHtml(aggregate.average)}</span>
<span class="route-rv-score-count">${escHtml(format(translate('reviewsBasedOn', lang), { count: nf(count) }))}</span>
</div>
${distHtml}
</div>`;
  }

  const cards = reviews.slice(0, ROUTE_REVIEWS_SHOWN).map((rv) => routeReviewCard(rv, lang, locale)).join('');
  const moreHtml = (reviewsHref && total > ROUTE_REVIEWS_SHOWN)
    ? `<p class="route-rv-more"><a href="${escHtml(reviewsHref)}">${escHtml(translate('reviewsLabel', lang))} →</a></p>`
    : '';

  return `${ROUTE_REVIEWS_CSS}
<section class="route-reviews-section" id="route-reviews-section">
<h2>${escHtml(translate('reviewsRouteHeading', lang))}</h2>
${summaryHtml}
<div class="route-rv-list">${cards}</div>
${moreHtml}
</section>`;
}

module.exports = { renderReviewsPage, renderRouteReviewsSection };
