'use strict';

// [SEO-ANALYZE Phase 3 + 14] Reads the REAL rendered route page (not GSC alone)
// and reports what SEO elements it actually contains, plus a transparent
// multi-factor SEO score. It is READ-ONLY and never fabricates: a signal that
// isn't present in the HTML (or a GSC metric that wasn't supplied) is reported
// as absent / "data unavailable", never guessed. It proposes nothing and writes
// nothing — that is a later, approval-gated phase.
const { parse } = require('node-html-parser');

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const textOf = (el) => (el ? el.text.replace(/\s+/g, ' ').trim() : '');

// Collect every @type in a JSON-LD node (handles arrays, @graph, nested).
function collectTypes(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => collectTypes(n, out)); return; }
  if (node['@type']) [].concat(node['@type']).forEach((t) => out.add(String(t)));
  if (node['@graph']) collectTypes(node['@graph'], out);
}

// [Phase 3] Extract the concrete SEO elements from the rendered HTML.
function extractSeoElements(html) {
  const root = parse(html || '', { comment: false, blockTextElements: { script: true, style: true } });

  const titleEl = root.querySelector('title');
  const title = textOf(titleEl) || null;

  let metaDescription = null;
  for (const m of root.querySelectorAll('meta')) {
    if ((m.getAttribute('name') || '').toLowerCase() === 'description') {
      metaDescription = (m.getAttribute('content') || '').trim() || null;
      break;
    }
  }

  const h1El = root.querySelector('h1');
  const h1 = textOf(h1El) || null;

  let canonical = null;
  const hreflangs = [];
  for (const link of root.querySelectorAll('link')) {
    const rel = (link.getAttribute('rel') || '').toLowerCase();
    if (rel === 'canonical') canonical = link.getAttribute('href') || canonical;
    if (rel === 'alternate' && link.getAttribute('hreflang')) hreflangs.push(link.getAttribute('hreflang'));
  }

  // JSON-LD structured-data types actually present.
  const schemaTypes = new Set();
  for (const s of root.querySelectorAll('script')) {
    if ((s.getAttribute('type') || '').toLowerCase() !== 'application/ld+json') continue;
    try { collectTypes(JSON.parse(s.text), schemaTypes); } catch { /* ignore malformed block */ }
  }

  // Internal links, grouped by the entity they point at (default + /xx/ prefixes).
  const linkGroups = { flights: 0, city: 0, airport: 0, airline: 0, country: 0, blog: 0, other: 0 };
  let internalTotal = 0;
  for (const a of root.querySelectorAll('a')) {
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    internalTotal += 1;
    const path = href.replace(/^\/[a-z]{2}\//, '/'); // strip a leading /xx/ language prefix
    if (path.startsWith('/flights/')) linkGroups.flights += 1;
    else if (path.startsWith('/city/')) linkGroups.city += 1;
    else if (path.startsWith('/airport/')) linkGroups.airport += 1;
    else if (path.startsWith('/airline/')) linkGroups.airline += 1;
    else if (path.startsWith('/country/')) linkGroups.country += 1;
    else if (path.startsWith('/blog/')) linkGroups.blog += 1;
    else linkGroups.other += 1;
  }

  // Route-specific content blocks, detected by the renderer's own markers — a
  // real presence check, not a keyword guess.
  const faqCount = root.querySelectorAll('.route-faq-q').length;
  const hasFlightTime = !!root.querySelector('.route-facts-section, .route-insight-card, .route-insights-section');
  const hasAirlines = linkGroups.airline > 0;
  const hasDistance = /(\d[\d.,]*)\s*km/i.test(root.querySelector('#route-content') ? root.querySelector('#route-content').text : root.text);
  const hasBreadcrumb = !!root.querySelector('.breadcrumb') || schemaTypes.has('BreadcrumbList');
  const hasRelatedRoutes = !!root.querySelector('#related-routes-section, .related-route-card');
  const hasPrice = !!root.querySelector('.route-price-box, .route-facts-note');
  // Direct/nonstop info is a text signal inside FAQ/facts (localized) — check a
  // small multilingual marker set; absence is reported, never assumed false-negative.
  const bodyText = (root.querySelector('#route-main') || root).text;
  const hasDirectInfo = /(direkt|nonstop|non-stop|direct|escala|mit zwischenstopp|stopover|مباشر|بدون توقف)/i.test(bodyText);

  // robots meta (indexing signal, read-only).
  let robots = null;
  for (const m of root.querySelectorAll('meta')) {
    if ((m.getAttribute('name') || '').toLowerCase() === 'robots') { robots = (m.getAttribute('content') || '').trim() || null; break; }
  }

  return {
    title,
    titleLength: title ? title.length : 0,
    metaDescription,
    metaLength: metaDescription ? metaDescription.length : 0,
    h1,
    canonical,
    hreflangCount: hreflangs.length,
    robots,
    schemaTypes: [...schemaTypes],
    internalLinks: { total: internalTotal, ...linkGroups },
    content: { faqCount, hasFlightTime, hasAirlines, hasDistance, hasDirectInfo, hasBreadcrumb, hasRelatedRoutes, hasPrice },
  };
}

// [Phase 14] Transparent multi-factor score. Each factor is 0–100 with a reason,
// and marks itself `available:false` when the data it needs is missing (so a
// missing GSC metric lowers coverage, never invents a number). The overall score
// is the mean of the AVAILABLE factors only.
function scoreFactors(el, gsc) {
  const factors = {};

  // TECHNICAL_HEALTH — title/meta/H1/canonical/hreflang/schema presence + sane lengths.
  {
    const checks = [];
    let pts = 0;
    const add = (ok, weight, label) => { checks.push(`${ok ? '✓' : '✗'} ${label}`); if (ok) pts += weight; };
    add(!!el.title, 18, 'title');
    add(el.titleLength >= 15 && el.titleLength <= 65, 8, 'title length');
    add(!!el.metaDescription, 18, 'meta description');
    add(el.metaLength >= 50 && el.metaLength <= 165, 8, 'meta length');
    add(!!el.h1, 14, 'H1');
    add(!!el.canonical, 10, 'canonical');
    add(el.hreflangCount > 0, 8, 'hreflang');
    add(el.schemaTypes.length > 0, 16, 'structured data');
    factors.TECHNICAL_HEALTH = { score: clamp(pts, 0, 100), available: true, reason: checks.join(' · ') };
  }

  // INTERNAL_LINKING — count vs a ~15-link target for a route page.
  {
    const n = el.internalLinks.total;
    factors.INTERNAL_LINKING = {
      score: clamp(Math.round((n / 15) * 100), 0, 100),
      available: true,
      reason: `${n} internal links (flights ${el.internalLinks.flights}, city ${el.internalLinks.city}, airport ${el.internalLinks.airport}, airline ${el.internalLinks.airline}, blog ${el.internalLinks.blog})`,
    };
  }

  // DATA_COMPLETENESS — how many real data blocks the page actually exposes.
  {
    const c = el.content;
    const items = [['flight-time', c.hasFlightTime], ['distance', c.hasDistance], ['airlines', c.hasAirlines], ['direct info', c.hasDirectInfo], ['FAQ', c.faqCount > 0]];
    const present = items.filter(([, v]) => v).length;
    factors.DATA_COMPLETENESS = {
      score: Math.round((present / items.length) * 100),
      available: true,
      reason: items.map(([k, v]) => `${v ? '✓' : '✗'} ${k}`).join(' · '),
    };
  }

  // CONTENT_MATCH — does the page substantively answer the route intent (has the
  // flight-time facts + FAQ + a clear H1)? Real page signals only.
  {
    const c = el.content;
    let pts = 0;
    if (c.hasFlightTime) pts += 40;
    if (c.faqCount > 0) pts += 30;
    if (el.h1) pts += 15;
    if (c.hasDistance) pts += 15;
    factors.CONTENT_MATCH = { score: clamp(pts, 0, 100), available: true, reason: `flight-time ${c.hasFlightTime ? 'yes' : 'no'}, FAQ ${c.faqCount}, H1 ${el.h1 ? 'yes' : 'no'}` };
  }

  // QUERY_OPPORTUNITY — needs GSC. High impressions + a rankable position = high
  // opportunity. Unavailable (not zero) when GSC wasn't supplied.
  if (gsc && Number.isFinite(Number(gsc.impressions)) && Number.isFinite(Number(gsc.position))) {
    const imp = Number(gsc.impressions);
    const pos = Number(gsc.position);
    const demand = clamp(Math.log10(imp + 1) / 3, 0, 1);
    const rank = clamp((30 - pos) / 29, 0, 1);
    factors.QUERY_OPPORTUNITY = { score: Math.round(((demand * 0.6) + (rank * 0.4)) * 100), available: true, reason: `${imp} impressions at position ${pos.toFixed(1)}` };
  } else {
    factors.QUERY_OPPORTUNITY = { score: null, available: false, reason: 'GSC data unavailable' };
  }

  // CTR_OPPORTUNITY — needs real clicks. High impressions + good position + low
  // CTR = big opportunity. Unavailable when per-URL clicks weren't in the export.
  if (gsc && gsc.clicks != null && Number.isFinite(Number(gsc.impressions)) && Number(gsc.impressions) > 0 && Number.isFinite(Number(gsc.position))) {
    const imp = Number(gsc.impressions);
    const ctr = Number(gsc.clicks) / imp;
    const pos = Number(gsc.position);
    // Opportunity rises as CTR falls below what the position could earn, weighted by demand.
    const demand = clamp(Math.log10(imp + 1) / 3, 0, 1);
    const rankable = pos <= 15 ? 1 : pos <= 25 ? 0.5 : 0.15;
    const ctrGap = clamp(1 - (ctr / 0.05), 0, 1); // 0% CTR → full gap, ≥5% → none
    factors.CTR_OPPORTUNITY = { score: Math.round(demand * rankable * ctrGap * 100), available: true, reason: `CTR ${(ctr * 100).toFixed(1)}% at position ${pos.toFixed(1)} over ${imp} impressions` };
  } else {
    factors.CTR_OPPORTUNITY = { score: null, available: false, reason: gsc && gsc.clicks == null ? 'per-URL clicks unavailable' : 'GSC data unavailable' };
  }

  return factors;
}

// Factual, rule-based observations (NOT AI, NOT applied) — each is a plain
// statement grounded in an extracted signal or a real GSC metric.
function buildFlags(el, factors, gsc) {
  const flags = [];
  const c = el.content;
  if (factors.CTR_OPPORTUNITY.available && factors.CTR_OPPORTUNITY.score >= 55) {
    flags.push({ level: 'opportunity', text: 'CTR optimization opportunity — high impressions & rankable position but low CTR.' });
  }
  if (!el.title) flags.push({ level: 'issue', text: 'Missing <title>.' });
  else if (el.titleLength > 65) flags.push({ level: 'warn', text: `Title is long (${el.titleLength} chars) — may truncate in results.` });
  if (!el.metaDescription) flags.push({ level: 'issue', text: 'Missing meta description.' });
  if (!el.canonical) flags.push({ level: 'issue', text: 'Missing canonical link.' });
  if (el.hreflangCount === 0) flags.push({ level: 'warn', text: 'No hreflang alternates found.' });
  if (el.robots && /noindex/i.test(el.robots)) flags.push({ level: 'warn', text: `Page is noindex (${el.robots}).` });
  if (!c.hasFlightTime) flags.push({ level: 'observation', text: 'No flight-time section detected on the page.' });
  if (!c.hasDirectInfo) flags.push({ level: 'observation', text: 'No direct/nonstop information detected.' });
  if (el.internalLinks.total < 8) flags.push({ level: 'warn', text: `Only ${el.internalLinks.total} internal links.` });
  if (el.schemaTypes.length === 0) flags.push({ level: 'issue', text: 'No JSON-LD structured data detected.' });
  return flags;
}

// Analyze a rendered route page. `gsc` (optional) is the page's row from the
// opportunity report ({ impressions, clicks, position, ... }).
function analyzeRoutePage({ html, slug = null, lang = 'de', url = null, gsc = null } = {}) {
  const elements = extractSeoElements(html);
  const factors = scoreFactors(elements, gsc);
  const available = Object.values(factors).filter((f) => f.available && f.score != null);
  const overall = available.length ? Math.round(available.reduce((s, f) => s + f.score, 0) / available.length) : null;
  const flags = buildFlags(elements, factors, gsc);
  return { slug, lang, url, elements, factors, score: overall, coverage: available.length, flags };
}

module.exports = { analyzeRoutePage, extractSeoElements, scoreFactors };
