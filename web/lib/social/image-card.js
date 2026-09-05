'use strict';

// [SOCIAL-STUDIO] Deterministic branded social-image generator — turns the same
// real flight/route/city/blog data behind a post into a ready-to-post, on-brand
// SVG card, sized per platform. Pure module, no LLM, no external image API, no
// network, no fonts/logos to fetch: the whole card is one self-contained SVG
// string the operator can preview and download as PNG/SVG. Honest by design —
// a price badge is drawn ONLY when a real price is supplied, mirroring the copy
// generator's "never fabricate a price" rule.

const TEMPLATE_TYPES = ['flight_deal', 'city_guide', 'blog_promo'];
// [P0-10] LANGUAGES is defined below, DERIVED from the label dictionaries that
// actually exist (TAGLINE/DIRECT_CHIP/KICKER) — see the note there.

// Airpiv brand palette (kept in sync with the admin theme / site dark surface).
const BRAND = {
  bg: '#0a0e1a', // deep navy ground
  bg2: '#111a2e', // gradient toward a slightly lit corner
  teal: '#00c9a7', // primary accent
  tealDark: '#04121b', // legible text on a teal fill
  ink: '#e2e8f0', // headline text
  sub: '#94a3b8', // secondary text
  faint: '#475569', // watermark / de-emphasized text
};

// A broad system-font stack. When the SVG is rasterized in the browser (canvas),
// these resolve to the viewer's installed fonts, including Arabic coverage.
const FONT = "'IBM Plex Sans Arabic','Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif";

// Per-platform canvas. Each platform's feed favours a different aspect ratio;
// these are the common "safe" export sizes so the card looks native wherever
// it lands (square for Instagram, landscape for the link-preview platforms,
// tall portrait for Pinterest/Threads).
const PLATFORM_DIMENSIONS = {
  facebook: { width: 1200, height: 630 },
  instagram: { width: 1080, height: 1080 },
  x: { width: 1200, height: 675 },
  linkedin: { width: 1200, height: 627 },
  pinterest: { width: 1000, height: 1500 },
  threads: { width: 1080, height: 1350 },
};
const DEFAULT_DIMENSIONS = PLATFORM_DIMENSIONS.facebook;

// Localized bottom tagline — the brand promise, matching the copy templates.
const TAGLINE = {
  en: 'Compare 600+ airlines · airpiv.com',
  de: '600+ Airlines vergleichen · airpiv.com',
  es: 'Compara 600+ aerolíneas · airpiv.com',
  fr: 'Comparez 600+ compagnies · airpiv.com',
  it: 'Confronta 600+ compagnie · airpiv.com',
  nl: 'Vergelijk 600+ airlines · airpiv.com',
  ar: 'قارن أكثر من 600 شركة طيران · airpiv.com',
};

// Localized "Direct" chip label (drawn only when the data says the route is direct).
const DIRECT_CHIP = {
  en: 'Direct', de: 'Direkt', es: 'Directo', fr: 'Direct',
  it: 'Diretto', nl: 'Direct', ar: 'مباشر',
};

// Localized kicker above the headline, per template — a small eyebrow label.
const KICKER = {
  flight_deal: { en: 'FLIGHT DEAL', de: 'FLUGDEAL', es: 'OFERTA DE VUELO', fr: 'BON PLAN VOL', it: 'OFFERTA VOLO', nl: 'VLUCHTDEAL', ar: 'عرض رحلة' },
  city_guide: { en: 'CITY GUIDE', de: 'CITY-GUIDE', es: 'GUÍA DE CIUDAD', fr: 'GUIDE VILLE', it: 'GUIDA CITTÀ', nl: 'STADSGIDS', ar: 'دليل مدينة' },
  blog_promo: { en: 'AIRPIV JOURNAL', de: 'AIRPIV JOURNAL', es: 'AIRPIV JOURNAL', fr: 'AIRPIV JOURNAL', it: 'AIRPIV JOURNAL', nl: 'AIRPIV JOURNAL', ar: 'مدونة Airpiv' },
};

// [P0-10] Supported card languages, DERIVED from the label copy that actually
// exists — a language is supported only when the tagline, the direct chip, and
// every kicker type have real text for it, so a card never renders English
// labels mislabeled as another language. Single source of truth; cannot drift
// from the dictionaries above. Turkish (tr) is in the site's canonical set but
// has no card copy yet, so it is intentionally excluded until real tr labels
// are added (we do not AI-translate to fill the gap).
const LANGUAGES = Object.keys(TAGLINE).filter(
  (code) => DIRECT_CHIP[code] && TEMPLATE_TYPES.every((t) => KICKER[t] && KICKER[t][code]),
);

function pick(map, lang) {
  return map[lang] || map.en;
}

// Escape the five XML entities so arbitrary place/article names are safe to
// interpolate into the SVG markup.
function escapeXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Naive word-wrap for a headline: split into at most `maxLines` lines that each
// fit `maxChars`, hard-truncating the last line with an ellipsis if the text
// still overflows. Deterministic and font-metric-free — good enough for a card
// headline where the sizes below leave comfortable slack.
function wrapText(text, maxChars, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length <= maxChars || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  // If a single line is still longer than the budget, ellipsize it.
  return lines.map((l) => (l.length > maxChars ? `${l.slice(0, Math.max(0, maxChars - 1)).trim()}…` : l));
}

// Normalize the caller's data into the fields the card actually draws. Mirrors
// the copy generator's per-type shape: flight_deal reads origin/destination/
// price/direct, city_guide reads city/country, blog_promo reads title.
function buildCardModel({ type, platform, lang, data = {} } = {}) {
  const t = TEMPLATE_TYPES.includes(type) ? type : 'flight_deal';
  const l = LANGUAGES.includes(lang) ? lang : 'en';
  const p = PLATFORM_DIMENSIONS[platform] ? platform : 'facebook';

  let headline = '';
  let sub = '';
  let price = null;
  let direct = false;

  if (t === 'flight_deal') {
    const o = String(data.origin || '').trim();
    const d = String(data.destination || '').trim();
    headline = o && d ? `${o} → ${d}` : (o || d || 'Airpiv');
    price = data.price ? String(data.price).trim() : null;
    direct = !!data.directFlight;
    sub = '';
  } else if (t === 'city_guide') {
    headline = String(data.city || '').trim() || 'Airpiv';
    sub = String(data.country || '').trim();
  } else {
    headline = String(data.title || '').trim() || 'Airpiv Journal';
    sub = String(data.excerpt || '').trim();
  }

  return {
    type: t,
    platform: p,
    lang: l,
    rtl: l === 'ar',
    headline,
    sub,
    price,
    direct,
    kicker: pick(KICKER[t], l),
    tagline: pick(TAGLINE, l),
    directLabel: pick(DIRECT_CHIP, l),
  };
}

// Render the normalized model to a standalone SVG string at the platform's
// dimensions. Type scales off the width but is bounded by height, and the
// middle content is a measured, vertically-centered stack, so every aspect
// ratio stays balanced. All text is center-anchored; Arabic flips to RTL.
function renderCardSVG(model, dims) {
  const W = dims.width;
  const H = dims.height;
  const cx = W / 2;
  // Separate horizontal / vertical padding: a width-based pad would waste far
  // too much vertical room on short landscape cards (e.g. 1200×630).
  const padX = Math.round(W * 0.07);
  const padY = Math.round(H * 0.07);
  const dir = model.rtl ? 'rtl' : 'ltr';

  // Type scale relative to width. The headline is additionally bounded by the
  // card height so short landscape formats (e.g. 1200×630) don't get an
  // oversized headline that overruns the fixed brand/tagline bands.
  const subSize = Math.round(W * 0.038);
  const kickerSize = Math.round(W * 0.026);
  const priceSize = Math.round(W * 0.058);
  const brandSize = Math.round(W * 0.034);
  const taglineSize = Math.round(W * 0.026);

  const maxChars = model.type === 'blog_promo' ? 22 : 16;
  const headLines = wrapText(model.headline, maxChars, 2);
  let headSize = Math.round(Math.min(W * 0.105, H * 0.155));
  // With two lines, shrink so the whole block still clears the fixed bands.
  if (headLines.length > 1) headSize = Math.round(headSize * 0.8);
  const lineGap = Math.round(headSize * 1.06);

  const headTspans = headLines
    .map((ln, i) => `<tspan x="${cx}" ${i === 0 ? '' : `dy="${lineGap}"`}>${escapeXml(ln)}</tspan>`)
    .join('');

  // ── Measured vertical stack ──
  // The middle content (kicker → headline → sub → badges) is measured as a
  // block and centered in the safe region between the top brand band and the
  // bottom tagline band, so elements never overlap regardless of aspect ratio.
  const safeTop = padY + Math.round(brandSize * 1.6);
  const safeBot = H - padY - Math.round(taglineSize * 2.2);
  const gap = Math.round(H * 0.028);

  const chips = [];
  if (model.price) {
    const pw = Math.max(priceSize * 4.2, model.price.length * priceSize * 0.62 + priceSize * 1.6);
    chips.push({ w: pw, fill: BRAND.teal, fg: BRAND.tealDark, text: model.price, weight: 800, size: priceSize });
  }
  if (model.direct && model.type === 'flight_deal') {
    const dw = model.directLabel.length * priceSize * 0.55 + priceSize * 1.8;
    chips.push({ w: dw, fill: 'none', fg: BRAND.ink, text: `✈ ${model.directLabel}`, weight: 700, size: Math.round(priceSize * 0.62), stroke: BRAND.teal });
  }
  const subText = model.sub ? (model.sub.length > 42 ? `${model.sub.slice(0, 41).trim()}…` : model.sub) : '';

  // Heights of each stack element (0 when absent).
  const kH = Math.round(kickerSize * 1.3);
  const hH = (headLines.length - 1) * lineGap + Math.round(headSize * 1.0);
  const sH = subText ? Math.round(subSize * 1.5) : 0;
  const badgeH = chips.length ? Math.round(priceSize * 1.9) : 0;
  const parts = [kH, hH, sH, badgeH].filter((h) => h > 0);
  const stackH = parts.reduce((a, h) => a + h, 0) + gap * (parts.length - 1);

  // Center the stack in the safe region (clamp to safeTop if it's taller).
  let cursor = safeTop + Math.max(0, Math.round((safeBot - safeTop - stackH) / 2));

  // Kicker eyebrow.
  const kickerY = cursor + Math.round(kickerSize * 0.95);
  const kicker = `<text x="${cx}" y="${kickerY}" text-anchor="middle" font-family="${FONT}" font-size="${kickerSize}" font-weight="700" letter-spacing="${Math.round(kickerSize * 0.18)}" fill="${BRAND.teal}" direction="${dir}">${escapeXml(model.kicker)}</text>`;
  cursor += kH + gap;

  // Headline (first-line baseline sits ~0.78·size below the block top).
  const headBaseline = cursor + Math.round(headSize * 0.78);
  const headline = `<text x="${cx}" y="${headBaseline}" text-anchor="middle" font-family="${FONT}" font-size="${headSize}" font-weight="800" fill="${BRAND.ink}" direction="${dir}">${headTspans}</text>`;
  cursor += hH + gap;

  // Optional sub line (country / excerpt).
  let sub = '';
  if (subText) {
    const subY = cursor + Math.round(subSize * 1.0);
    sub = `<text x="${cx}" y="${subY}" text-anchor="middle" font-family="${FONT}" font-size="${subSize}" font-weight="500" fill="${BRAND.sub}" direction="${dir}">${escapeXml(subText)}</text>`;
    cursor += sH + gap;
  }

  // Price badge + direct chip row. Price is drawn ONLY when real (no fabrication).
  let badges = '';
  if (chips.length) {
    const badgeCY = cursor + Math.round(badgeH / 2);
    const chipGap = Math.round(W * 0.03);
    const totalW = chips.reduce((a, c) => a + c.w, 0) + chipGap * (chips.length - 1);
    let x = cx - totalW / 2;
    badges = chips.map((c) => {
      const h = Math.round(c.size * 1.9);
      const rect = `<rect x="${Math.round(x)}" y="${badgeCY - h / 2}" width="${Math.round(c.w)}" height="${h}" rx="${Math.round(h / 2)}" fill="${c.fill}"${c.stroke ? ` stroke="${c.stroke}" stroke-width="${Math.max(2, Math.round(W * 0.003))}"` : ''}/>`;
      const txt = `<text x="${Math.round(x + c.w / 2)}" y="${badgeCY}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="${c.size}" font-weight="${c.weight}" fill="${c.fg}">${escapeXml(c.text)}</text>`;
      x += c.w + chipGap;
      return rect + txt;
    }).join('');
  }

  // Brand wordmark (top) and tagline (bottom).
  const brandY = padY + Math.round(brandSize * 0.4);
  const brand = `<g>
    <circle cx="${padX + Math.round(brandSize * 0.35)}" cy="${brandY - Math.round(brandSize * 0.28)}" r="${Math.round(brandSize * 0.34)}" fill="${BRAND.teal}"/>
    <text x="${padX + Math.round(brandSize * 0.95)}" y="${brandY}" text-anchor="start" font-family="${FONT}" font-size="${brandSize}" font-weight="800" fill="${BRAND.ink}" letter-spacing="0.5">airpiv</text>
  </g>`;
  const taglineY = H - padY;
  const tagline = `<text x="${cx}" y="${taglineY}" text-anchor="middle" font-family="${FONT}" font-size="${taglineSize}" font-weight="600" fill="${BRAND.faint}" direction="${dir}">${escapeXml(model.tagline)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND.bg}"/>
      <stop offset="1" stop-color="${BRAND.bg2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.12" r="0.9">
      <stop offset="0" stop-color="${BRAND.teal}" stop-opacity="0.20"/>
      <stop offset="0.5" stop-color="${BRAND.teal}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="${W}" height="${Math.max(6, Math.round(H * 0.012))}" fill="${BRAND.teal}"/>
  ${brand}
  ${kicker}
  ${headline}
  ${sub}
  ${badges}
  ${tagline}
</svg>`;
}

// UTF-8-safe base64 for the data URI (handles Arabic / accented names). Uses
// Buffer on the server (tests) and btoa+encodeURIComponent in the browser.
function toBase64(str) {
  if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf-8').toString('base64');
  return btoa(unescape(encodeURIComponent(str)));
}

function svgToDataUri(svg) {
  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

// A filesystem-safe filename stem for the download, e.g. "airpiv-instagram-malaga-ibiza".
function cardFilename(model) {
  const stem = String(model.headline || model.type)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || model.type;
  return `airpiv-${model.platform}-${stem}`;
}

// Main entry point. Returns everything the UI needs to preview and download.
function buildImageCard({ type, platform, lang, data = {} } = {}) {
  const model = buildCardModel({ type, platform, lang, data });
  const dims = PLATFORM_DIMENSIONS[model.platform] || DEFAULT_DIMENSIONS;
  const svg = renderCardSVG(model, dims);
  return {
    type: model.type,
    platform: model.platform,
    language: model.lang,
    width: dims.width,
    height: dims.height,
    headline: model.headline,
    svg,
    dataUri: svgToDataUri(svg),
    filename: cardFilename(model),
  };
}

module.exports = {
  LANGUAGES,
  TEMPLATE_TYPES,
  PLATFORM_DIMENSIONS,
  BRAND,
  escapeXml,
  wrapText,
  buildCardModel,
  renderCardSVG,
  svgToDataUri,
  cardFilename,
  buildImageCard,
};
