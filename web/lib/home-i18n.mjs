// [P2-4] Single source of truth for localizing the homepage per language at
// BUILD TIME — head <meta>/<title>/<html lang>/canonical AND the visible body.
//
// The customer home is ONE verbatim public/index.html served under every
// language prefix (/en, /ar, …, /de) via next.config.mjs rewrites. Historically
// the per-language head AND body text were fixed up only CLIENT-SIDE
// (canonical-fix.js for the head; app.js applyTranslations() for the body), so
// the RAW HTML Googlebot parses first was entirely German AND canonicalised /en
// → the German root. This module reproduces BOTH client mechanisms statically so
// the first byte a crawler sees is fully localized:
//   • the head is localized here (mirrors canonical-fix.js META), and
//   • the body is localized by re-applying the EXACT same TRANSLATIONS dictionary
//     and the same rule app.js uses (each [data-i18n] element's textContent = the
//     translation; each [data-i18n-placeholder] element's placeholder = the
//     translation). No parallel i18n system — the dictionary is extracted from
//     public/app.js so it can never drift from the client.
//
// scripts/prerender-localized-homes.mjs writes one public/<lang>.html per
// language; next.config.mjs rewrites /<lang> → /<lang>.html. URLs are unchanged.
// The German root (/) keeps serving index.html verbatim (canonical /); /de is a
// distinct self-canonical German page (canonical /de). canonical-fix.js stays as
// a redundant client-side safety net that now re-applies identical values.

import { parse } from 'node-html-parser';

export const SITE = 'https://airpiv.com';

// Every language that gets its own build-time public/<lang>.html. German IS
// included here (served at /de, self-canonical /de) — but the bare root / still
// serves index.html verbatim (canonical /), so both German URLs exist by design.
export const HOME_LANGS = ['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr', 'de'];

// title (t), description (d), og:locale (ogl) per language — mirrors
// public/canonical-fix.js META, plus a `de` entry (the values already static in
// the German index.html head) so /de is generated the same way as the rest.
export const HOME_META = {
  de: {
    t: 'Airpiv | Günstige Flüge buchen & Flugtickets vergleichen',
    d: 'Suchen und buchen Sie günstige Flüge auf Airpiv. Vergleichen Sie Flugtickets weltweit, finden Sie Last-Minute-Angebote und sichern Sie sich die besten Preise ohne versteckte Kosten!',
    ogl: 'de_DE',
  },
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

// Escape for text content (textContent semantics — no HTML interpretation).
export function escText(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// Escape for a double-quoted HTML attribute value.
export function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── TRANSLATIONS extraction ────────────────────────────────────────────────
// Pull the `TRANSLATIONS={…}` object literal out of public/app.js by brace-
// matching (string-aware, so braces inside string values don't fool it) and
// evaluate it as pure data. Reusing app.js's own dictionary guarantees the
// static body can never drift from what the client renders.
export function extractTranslations(appJsSource) {
  const marker = 'TRANSLATIONS=';
  const at = appJsSource.indexOf(marker);
  if (at === -1) throw new Error('TRANSLATIONS= not found in app.js');
  let i = appJsSource.indexOf('{', at);
  if (i === -1) throw new Error('TRANSLATIONS object opening brace not found');
  const start = i;
  let depth = 0, inStr = false, quote = '', esc = false;
  for (; i < appJsSource.length; i++) {
    const c = appJsSource[i];
    if (inStr) {
      if (esc) { esc = false; }
      else if (c === '\\') { esc = true; }
      else if (c === quote) { inStr = false; }
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  if (depth !== 0) throw new Error('TRANSLATIONS object braces unbalanced');
  const literal = appJsSource.slice(start, i);
  // Pure data literal (strings only) — Function-eval is safe and tolerates JS
  // object syntax that strict JSON.parse would reject.
  // eslint-disable-next-line no-new-func
  const obj = Function(`"use strict";return (${literal});`)();
  if (!obj || typeof obj !== 'object') throw new Error('TRANSLATIONS did not evaluate to an object');
  return obj;
}

// Same lookup rule as app.js t(): lang → German fallback → raw key.
export function translate(translations, lang, key) {
  const l = translations[lang];
  if (l && l[key] != null) return l[key];
  if (translations.de && translations.de[key] != null) return translations.de[key];
  return key;
}

// ── head localization (targeted regex — never touches the CSP-hashed inline
// scripts, which all live in <head> and are left byte-identical) ────────────
function localizeHead(html, lang) {
  const m = HOME_META[lang];
  if (!m) throw new Error(`unknown home language: ${lang}`);
  const url = `${SITE}/${lang}`;
  let out = html;
  out = out.replace(/(<html\s+lang=")[^"]*(")/i, (_x, a, b) => a + lang + b);
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escText(m.t)}</title>`);
  out = out.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*("\s+id="canonical-url")/i,
    (_x, a, b) => a + url + b,
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

function setMetaName(html, name, value) {
  const re = new RegExp('(<meta\\s+name="' + name + '"\\s+content=")[^"]*(")', 'i');
  return html.replace(re, (_x, a, b) => a + escAttr(value) + b);
}
function setMetaProp(html, prop, value) {
  const re = new RegExp('(<meta\\s+property="' + prop + '"\\s+content=")[^"]*(")', 'i');
  return html.replace(re, (_x, a, b) => a + escAttr(value) + b);
}

// [P2-4] The <de> alternate must point at the real German page /de (a distinct
// self-canonical URL) instead of the root, so the hreflang cluster and every
// page's self-canonical agree. x-default stays on the root (/). Idempotent, and
// applied to the root index.html too so the whole cluster is consistent.
export function fixHreflangCluster(html) {
  return html.replace(
    /(<link\s+rel="alternate"\s+hreflang="de"\s+href="https:\/\/airpiv\.com)\/(">)/i,
    (_x, a, b) => `${a}/de${b}`,
  );
}

// ── body localization (range-splice — reserializes nothing, so SVG flags,
// inline handlers and every non-i18n byte are preserved exactly) ────────────
// Mirrors app.js applyTranslations(): [data-i18n] → inner textContent = t(key);
// [data-i18n-placeholder] → placeholder attribute = t(key).
export function localizeBody(html, lang, translations) {
  const root = parse(html);
  const edits = []; // {start, end, replacement}

  for (const el of root.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    if (!key) continue;
    const [s, e] = el.range;
    const outer = html.slice(s, e);
    const openEnd = outer.indexOf('>') + 1;          // end of the opening tag
    const closeTag = `</${el.rawTagName}>`;
    if (openEnd <= 0 || !outer.endsWith(closeTag)) continue; // void/odd — skip
    const innerStart = s + openEnd;
    const innerEnd = e - closeTag.length;
    edits.push({ start: innerStart, end: innerEnd, replacement: escText(translate(translations, lang, key)) });
  }

  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key) continue;
    const [s, e] = el.range;
    const outer = html.slice(s, e);
    const openEnd = outer.indexOf('>') + 1;
    if (openEnd <= 0) continue;
    const openTag = outer.slice(0, openEnd);
    const value = escAttr(translate(translations, lang, key));
    let newOpen;
    if (/\splaceholder="[^"]*"/i.test(openTag)) {
      newOpen = openTag.replace(/(\splaceholder=")[^"]*(")/i, (_x, a, b) => a + value + b);
    } else {
      // insert placeholder right after the tag name
      newOpen = openTag.replace(/^(<[a-zA-Z0-9]+)/, (_x, a) => `${a} placeholder="${value}"`);
    }
    edits.push({ start: s, end: s + openEnd, replacement: newOpen });
  }

  // Apply from the end backwards so earlier offsets stay valid.
  edits.sort((a, b) => b.start - a.start);
  let out = html;
  for (const { start, end, replacement } of edits) {
    out = out.slice(0, start) + replacement + out.slice(end);
  }
  return out;
}

// Full transform: head + hreflang + body. `translations` is the object returned
// by extractTranslations(appJs).
export function localizeHomeHtml(html, lang, translations) {
  if (!HOME_META[lang]) throw new Error(`unknown home language: ${lang}`);
  let out = localizeHead(html, lang);
  out = fixHreflangCluster(out);
  out = localizeBody(out, lang, translations);
  return out;
}
