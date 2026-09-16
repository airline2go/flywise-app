// Shared helper for the verbatim SEO Route Handlers: wrap a rendered HTML
// string (or null → 404) in the right Response.
export function htmlResponse(html) {
  if (!html) return new Response('Not found', { status: 404 });

  // [SEO-TRUTHFULNESS] Final response-boundary guard for legacy entity pages.
  // Unsupported global airline-count claims, unverified realtime wording, and
  // generic advice/benefit blocks are removed rather than replaced with guesses.
  let safeHtml = String(html);
  const isCityPage = /<main[^>]+id=["']city-main["']/i.test(safeHtml);
  const isRoutePage = /<main[^>]+id=["']route-main["']/i.test(safeHtml);
  const isLegacyRoute = isRoutePage && /(?:Preisanalyse|Reisezeit-Tipps|Wochenendtrip|weekend trip|price analysis|travel tips)/i.test(safeHtml);

  safeHtml = safeHtml
    .replace(/<p class="fdes">[^<]*(?:600\+?|600|hundreds|hunderte|centenas|centaines|centinaia|honderden|yüzlerce)[^<]*<\/p>/gi, '')
    .replace(/<section class="city-why">[\s\S]*?<\/section>/gi, '')
    .replace(/<section class="city-tips">[\s\S]*?<\/section>/gi, '')
    .replace(/<li[^>]*>\s*(?:600\+?|600)\s*(?:airlines|Airlines)[^<]*<\/li>/gi, '')
    .replace(/\b(?:in Echtzeit|in real time|en tiempo real|en temps réel|in tempo reale|in realtime|gerçek zamanlı)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1');

  if (isCityPage) {
    const unsupportedSentence = /[^.!?]*(?:600\+?\s*airlines|600\+?\s*fluggesellschaften|over\s+600\s+airlines|über\s+600\s+airlines|mehr als\s+600\s+airlines|book directly|buche direkt|no hidden fees|ohne versteckte kosten|ohne versteckte gebühren|without hidden fees|günstigsten\s+preis|cheapest\s+price|best\s+price|prix\s+le\s+moins\s+cher|prezzo\s+più\s+basso|goedkoopste\s+prijs|en\s+ucuz\s+fiyat|gefragtesten|beliebtesten|most popular|most demanded|más populares|plus populaires|più popolari|populairste|en popüler)[^.!?]*[.!?]?/gi;
    safeHtml = safeHtml.replace(/<p>([\s\S]*?)<\/p>/gi, (full, inner) => {
      const detector = new RegExp(unsupportedSentence.source, 'i');
      if (!detector.test(inner)) return full;
      const cleaned = inner.replace(unsupportedSentence, ' ').replace(/\s{2,}/g, ' ').trim();
      return cleaned ? `<p>${cleaned}</p>` : '';
    });
    safeHtml = safeHtml.replace(/<section class="city-faq">[\s\S]*?<\/section>/gi, '');
    safeHtml = safeHtml.replace(/<script type=["']application\/ld\+json["']>\s*\{\s*["']@context["']\s*:\s*["']https:\/\/schema\.org["']\s*,\s*["']@type["']\s*:\s*["']FAQPage["'][\s\S]*?<\/script>/gi, '');
    safeHtml = safeHtml.replace(/<script type=["']application\/ld\+json["']>\s*\{[\s\S]*?["']@type["']\s*:\s*["']ItemList["'][\s\S]*?["']name["']\s*:\s*["'][^"']*(?:popular|beliebte|beliebtesten|populares|populaires|popolari|populairste|popüler)[^"']*["'][\s\S]*?<\/script>/gi, '');
  }

  // Route pages must not publish generic booking-window, best-time, or
  // cheapest-days advice unless route evidence explicitly supports it. Older
  // templates can still emit those blocks, so remove them at the final HTML
  // boundary and fail closed in FAQPage JSON-LD as well.
  if (isRoutePage) {
    const unsupportedRouteFaq = /(?:best\s+time(?:\s+to\s+fly)?|booking\s+window|cheapest\s+days?|cheapest\s+day|when\s+should\s+i\s+book|beste\s+reisezeit|beste\s+buchungszeit|günstigsten\s+tage|günstigster\s+tag|wann\s+soll(?:te)?\s+ich\s+buchen|mejor\s+momento(?:\s+para\s+volar)?|ventana\s+de\s+reserva|días\s+más\s+baratos|meilleur\s+moment(?:\s+pour\s+voler)?|fenêtre\s+de\s+réservation|jours\s+les\s+moins\s+chers|miglior\s+momento(?:\s+per\s+volare)?|finestra\s+di\s+prenotazione|giorni\s+più\s+economici|beste\s+moment(?:\s+om\s+te\s+vliegen)?|boekingsvenster|goedkoopste\s+dagen|en\s+iyi\s+zaman(?:\s+uçmak\s+için)?|rezervasyon\s+aralığı|en\s+ucuz\s+günler)/i;
    safeHtml = safeHtml
      .replace(/<section[^>]*class=["'][^"']*route-besttime-section[^"']*["'][^>]*>[\s\S]*?<\/section>/gi, '')
      .replace(/<(?:article|div|li)[^>]*class=["'][^"']*(?:route-)?faq-item[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div|li)>/gi, (full, inner) => unsupportedRouteFaq.test(inner) ? '' : full);

    const sanitizeFaqSchema = (node) => {
      if (!node || typeof node !== 'object') return node;
      if (Array.isArray(node)) return node.map(sanitizeFaqSchema).filter(Boolean);
      const type = node['@type'];
      if (type === 'FAQPage' && Array.isArray(node.mainEntity)) {
        node.mainEntity = node.mainEntity.filter((item) => !unsupportedRouteFaq.test(JSON.stringify(item)));
        if (!node.mainEntity.length) return null;
      }
      for (const [key, value] of Object.entries(node)) {
        if (key !== 'mainEntity') node[key] = sanitizeFaqSchema(value);
      }
      return node;
    };

    safeHtml = safeHtml.replace(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi, (full, json) => {
      try {
        const data = JSON.parse(json.trim());
        const sanitized = sanitizeFaqSchema(data);
        if (!sanitized) return '';
        return `<script type="application/ld+json">${JSON.stringify(sanitized)}</script>`;
      } catch {
        return full;
      }
    });
  }

  // Some older route records still render the pre-hardening marketing FAQ
  // template. Fail closed rather than serving unsupported booking/advice claims.
  if (isLegacyRoute) {
    safeHtml = safeHtml
      .replace(/<section class="route-faq">[\s\S]*?<\/section>/gi, '')
      // The legacy FAQ is nested inside WebPage.mainEntity, so remove the whole
      // WebPage JSON-LD block when it contains FAQPage rather than risking broken JSON.
      .replace(/<script type=["']application\/ld\+json["']>\s*\{[\s\S]*?["']@type["']\s*:\s*["']WebPage["'][\s\S]*?["']mainEntity["']\s*:\s*\{\s*["']@type["']\s*:\s*["']FAQPage["'][\s\S]*?<\/script>/gi, '')
      .replace(/<script type=["']application\/ld\+json["']>\s*\{\s*["']@context["']\s*:\s*["']https:\/\/schema\.org["']\s*,\s*["']@type["']\s*:\s*["']FAQPage["'][\s\S]*?<\/script>/gi, '')
      .replace(/(?:Preisanalyse\s*(?:und|,)\s*Reisezeit-Tipps|price analysis\s*(?:and|,)\s*travel tips)/gi, '')
      .replace(/\s*—\s*mehr Auswahl zum Vergleichen für dich\./gi, '.')
      .replace(/\s*—\s*more choice for comparison\./gi, '.')
      .replace(/\s*;\s*daneben gibt es meist günstigere Verbindungen mit Umstieg\./gi, '.')
      .replace(/\s*;\s*there are usually cheaper connecting options as well\./gi, '.')
      .replace(/(Flugzeit|flight time)\s*,\s*["']?\s*[.]/gi, '$1.')
      .replace(/,\s*\.(["'>])/g, '.$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.!?;:])/g, '$1');
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
