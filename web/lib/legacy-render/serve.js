// Shared helper for the verbatim SEO Route Handlers: wrap a rendered HTML
// string (or null → 404) in the right Response.
export function htmlResponse(html) {
  if (!html) return new Response('Not found', { status: 404 });

  // [SEO-TRUTHFULNESS] Final response-boundary guard for legacy entity pages.
  // Unsupported global airline-count claims, unverified realtime wording, and
  // generic advice/benefit blocks are removed rather than replaced with guesses.
  let safeHtml = String(html);
  const isCityPage = /<main[^>]+id=["']city-main["']/i.test(safeHtml);

  safeHtml = safeHtml
    .replace(/<p class="fdes">[^<]*(?:600\+?|600|hundreds|hunderte|centenas|centaines|centinaia|honderden|yüzlerce)[^<]*<\/p>/gi, '')
    .replace(/<section class="city-why">[\s\S]*?<\/section>/gi, '')
    .replace(/<section class="city-tips">[\s\S]*?<\/section>/gi, '')
    .replace(/<li[^>]*>\s*(?:600\+?|600)\s*(?:airlines|Airlines)[^<]*<\/li>/gi, '')
    .replace(/\b(?:in Echtzeit|in real time|en tiempo real|en temps réel|in tempo reale|in realtime|gerçek zamanlı)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1');

  // City intro paragraphs can contain legacy admin copy such as “over 600
  // airlines”, “book directly”, or “no hidden fees”. Remove only the affected
  // sentence from the visible city body; route/fact sentences remain intact.
  if (isCityPage) {
    const unsupportedSentence = /[^.!?]*(?:600\+?\s*airlines|600\+?\s*fluggesellschaften|over\s+600\s+airlines|über\s+600\s+airlines|mehr als\s+600\s+airlines|book directly|buche direkt|no hidden fees|ohne versteckte kosten|ohne versteckte gebühren|without hidden fees|günstigsten\s+preis|cheapest\s+price|best\s+price|prix\s+le\s+moins\s+cher|prezzo\s+più\s+basso|goedkoopste\s+prijs|en\s+ucuz\s+fiyat)[^.!?]*[.!?]?/gi;
    safeHtml = safeHtml.replace(/<p>([\s\S]*?)<\/p>/gi, (full, inner) => {
      const detector = new RegExp(unsupportedSentence.source, 'i');
      if (!detector.test(inner)) return full;
      const cleaned = inner.replace(unsupportedSentence, ' ').replace(/\s{2,}/g, ' ').trim();
      return cleaned ? `<p>${cleaned}</p>` : '';
    });

    // Popularity and price-comparison claims are not part of the permitted
    // route-derived city evidence model. Remove their visible FAQ cards and
    // corresponding FAQPage JSON-LD entries together, so structured data cannot
    // retain a claim that was removed from the rendered page.
    const unsupportedFaqNames = [
      'Was ist die beliebteste Route ab',
      'Was sind die beliebtesten Ziele ab',
      'What is the most popular route from',
      'What are the most popular destinations from',
      '¿Cuál es la ruta más popular desde',
      '¿Cuáles son los destinos más populares desde',
      'Quelle est la route la plus populaire depuis',
      'Quels sont les destinations les plus populaires depuis',
      'Qual è la rotta più popolare da',
      'Quali sono le destinazioni più popolari da',
      'Wat is de populairste route vanaf',
      'Wat zijn de populairste bestemmingen vanaf',
      'En popüler rota',
      'En popüler destinasyonlar'
    ];
    for (const name of unsupportedFaqNames) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      safeHtml = safeHtml.replace(new RegExp(`<div class="city-faq-item">[\\s\\S]*?<div class="city-faq-q">${escaped}[^<]*<\\/div>[\\s\\S]*?<\\/div>`, 'gi'), '');
    }
    safeHtml = safeHtml.replace(/\{"@type":"Question","name":"(?:Was ist die beliebteste Route ab|Was sind die beliebtesten Ziele ab|What is the most popular route from|What are the most popular destinations from|¿Cuál es la ruta más popular desde|¿Cuáles son los destinos más populares desde|Quelle est la route la plus populaire depuis|Quels sont les destinations les plus populaires depuis|Qual è la rotta più popolare da|Quali sono le destinazioni più popolari da|Wat is de populairste route vanaf|Wat zijn de populairste bestemmingen vanaf|En popüler rota|En popüler destinasyonlar)[^"]*"[^}]*\},?/gi, '');
  }

  return new Response(safeHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// [ROUTE-CANONICAL-REDIRECT] F1 — a permanent (301) redirect from a consolidated
// duplicate URL to its canonical winner. Body-less, with an absolute-path
// Location; cacheable by the platform like the rendered pages next to it.
export function redirectResponse(location, status = 301) {
  return new Response(null, { status, headers: { location } });
}

// The six non-default languages that live under a /xx/ prefix. German is the
// unprefixed root, so it is intentionally NOT here — /de/city/… must 404 like
// production, as must any unknown prefix (/zz/…). Route Handlers aren't wrapped
// by [lang]/layout.js, so each localized handler validates the prefix itself.
export const PREFIXED_LANGS = new Set(['en', 'ar', 'es', 'fr', 'it', 'nl', 'tr']);

export function isPrefixedLang(lang) {
  return PREFIXED_LANGS.has(lang);
}
