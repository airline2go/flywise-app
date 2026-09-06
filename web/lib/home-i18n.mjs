// [P2-4] Single source of truth for localizing the homepage <head> per language.
//
// The customer home is ONE verbatim public/index.html served under every
// language prefix (/en, /ar, …) via next.config.mjs rewrites. Historically the
// per-language <title>/<meta description>/<html lang>/canonical were fixed up
// only CLIENT-SIDE (public/canonical-fix.js), so the RAW HTML Googlebot parses
// first was entirely German AND canonicalised /en → the German root — meaning a
// crawler could treat /en as a duplicate of / before JS ran (the P2-4 finding).
//
// scripts/prerender-localized-homes.mjs uses `localizeHomeHtml` below to emit a
// build-time public/<lang>.html for each prefixed language with a SELF canonical
// and the correct lang/title/description in the first byte. canonical-fix.js is
// kept as a redundant client-side safety net; it now re-applies identical values
// (no visible flip). URLs are unchanged — only the rewrite target moves from
// /index.html to /<lang>.html.
//
// HOME_LANGS / HOME_META are intentionally kept byte-compatible with the same
// tables in public/canonical-fix.js (browser IIFE, not importable) and the
// LANG_HOMES list in next.config.mjs — keep all three in sync.

// German is the default and is served UNPREFIXED at the root (public/index.html
// verbatim); it is deliberately absent here — the static German head is already
// correct, so no de.html is generated.
export const DEFAULT_HOME_LANG = 'de';
export const HOME_LANGS = ['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];
const SITE = 'https://airpiv.com';

// title (t), description (d), og:locale (ogl) — mirrors public/canonical-fix.js META.
export const HOME_META = {
  en: {
    t: 'Airpiv | Book cheap flights & compare airfares',
    d: 'Search and book cheap flights on Airpiv. Compare airfares worldwide, find last-minute deals and get the best prices with no hidden fees.',
    ogl: 'en_GB',
  },
  ar: {
    t: 'Airpiv | احجز رحلات طيران رخيصة وقارن أسعار التذاكر',
    d: 'ابحث واحجز رحلات طيران رخيصة على Airpiv. قارن أسعار تذاكر الطيران حول العالم، واعثر على عروض اللحظة الأخيرة، واحصل على أفضل الأسعار دون رسوم خفية.',
    ogl: 'ar_AR',
  },
  es: {
    t: 'Airpiv | Reserva vuelos baratos y compara billetes de avión',
    d: 'Busca y reserva vuelos baratos en Airpiv. Compara billetes de avión en todo el mundo, encuentra ofertas de última hora y consigue los mejores precios sin cargos ocultos.',
    ogl: 'es_ES',
  },
  fr: {
    t: "Airpiv | Réservez des vols pas chers et comparez les billets d'avion",
    d: "Recherchez et réservez des vols pas chers sur Airpiv. Comparez les billets d'avion dans le monde entier, trouvez des offres de dernière minute et obtenez les meilleurs prix sans frais cachés.",
    ogl: 'fr_FR',
  },
  it: {
    t: 'Airpiv | Prenota voli economici e confronta i biglietti aerei',
    d: 'Cerca e prenota voli economici su Airpiv. Confronta i biglietti aerei in tutto il mondo, trova offerte last minute e ottieni i prezzi migliori senza costi nascosti.',
    ogl: 'it_IT',
  },
  nl: {
    t: 'Airpiv | Boek goedkope vluchten & vergelijk vliegtickets',
    d: 'Zoek en boek goedkope vluchten op Airpiv. Vergelijk vliegtickets wereldwijd, vind last-minute aanbiedingen en krijg de beste prijzen zonder verborgen kosten.',
    ogl: 'nl_NL',
  },
  tr: {
    t: 'Airpiv | Ucuz uçak bileti bul ve fiyatları karşılaştır',
    d: "Airpiv'de ucuz uçuşları arayın ve rezervasyon yapın. Dünya genelinde uçak biletlerini karşılaştırın, son dakika fırsatlarını bulun ve gizli ücret ödemeden en iyi fiyatları yakalayın.",
    ogl: 'tr_TR',
  },
};

// Escape a value for insertion inside a double-quoted HTML attribute.
export function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Replace the content="" of a <meta name="NAME"> tag, if present. Returns html
// unchanged when the tag is absent (best-effort — never throws).
function setMetaName(html, name, value) {
  const re = new RegExp('(<meta\\s+name="' + name + '"\\s+content=")[^"]*(")', 'i');
  return html.replace(re, (_m, a, b) => a + escAttr(value) + b);
}

// Replace the content="" of a <meta property="PROP"> tag (Open Graph), if present.
function setMetaProp(html, prop, value) {
  const re = new RegExp('(<meta\\s+property="' + prop + '"\\s+content=")[^"]*(")', 'i');
  return html.replace(re, (_m, a, b) => a + escAttr(value) + b);
}

// Turn the verbatim German home HTML into the <lang> variant: self canonical,
// correct <html lang>, and localized title/description/OG/Twitter. The <body>
// (the SPA) is untouched, so the file stays 1:1 with the German home visually.
// `dir` is intentionally left as-is (LTR) to preserve the verified 0px visual
// parity — matching canonical-fix.js, which localizes lang but never dir.
export function localizeHomeHtml(html, lang) {
  const m = HOME_META[lang];
  if (!m) throw new Error(`unknown home language: ${lang}`);
  const url = `${SITE}/${lang}`;
  let out = html;

  // <html lang="de" …> → <html lang="<lang>" …> (keep dir + any other attrs).
  out = out.replace(/(<html\s+lang=")[^"]*(")/i, (_m, a, b) => a + lang + b);

  // <title>…</title>
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escAttr(m.t)}</title>`);

  // <link rel="canonical" href="…" id="canonical-url"> → self URL.
  out = out.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*("\s+id="canonical-url")/i,
    (_m, a, b) => a + url + b,
  );

  out = setMetaName(out, 'description', m.d);
  out = setMetaProp(out, 'og:title', m.t);
  out = setMetaProp(out, 'og:description', m.d);
  out = setMetaProp(out, 'og:locale', m.ogl);
  out = setMetaProp(out, 'og:url', url);
  out = setMetaName(out, 'twitter:title', m.t);
  out = setMetaName(out, 'twitter:description', m.d);
  out = setMetaName(out, 'twitter:url', url);

  return out;
}
