const { escHtml, renderShell } = require('./shell');
const { germanizeCity, anglicizeCity, getAlternativeAirports } = require('./data');

// [BUG-FIX] The original flight-route.html wrote its JSON-LD schema TWICE —
// a second, dead write unconditionally clobbered the first with a generic
// hardcoded 2-question FAQ, discarding the real dynamic FAQ/custom_faq data.
// This generator writes it once, correctly, with the real FAQ items.

function buildDynamicIntro(r, de) {
  const hasDistance = r.distance_km != null;
  const isLongHaul = r.haul_type === 'long-haul';
  const distanceStr = hasDistance ? r.distance_km.toLocaleString(de ? 'de-DE' : 'en-US') : null;
  if (de) {
    const distancePhrase = hasDistance
      ? ` Die Strecke ist rund ${distanceStr} km lang${isLongHaul ? ' und zählt damit zu den Langstreckenflügen.' : ' — ein typischer Kurzstreckenflug innerhalb weniger Flugstunden.'}`
      : '';
    const opening = isLongHaul
      ? `Auf der Suche nach einem Flug von ${r.origin_city} nach ${r.destination_city}?`
      : `Du planst eine Reise von ${r.origin_city} nach ${r.destination_city}?`;
    const closing = isLongHaul
      ? ' Airpiv vergleicht für diese Langstrecke hunderte Airlines in Echtzeit, damit du den besten Gesamtpreis inklusive aller Gebühren siehst — transparent und ohne versteckte Kosten.'
      : ' Mit Airpiv vergleichst du in Sekunden hunderte Airlines für diese Strecke und findest den besten Preis für deinen Flug — transparent, ohne versteckte Kosten und mit Bestpreisgarantie.';
    return opening + distancePhrase + closing;
  }
  const distancePhrase = hasDistance
    ? ` The route covers roughly ${distanceStr} km${isLongHaul ? ', making it a long-haul flight.' : ' — a short-haul hop of just a few flying hours.'}`
    : '';
  const opening = isLongHaul
    ? `Looking for a flight from ${r.origin_city} to ${r.destination_city}?`
    : `Planning a trip from ${r.origin_city} to ${r.destination_city}?`;
  const closing = isLongHaul
    ? ' Airpiv compares hundreds of airlines in real time for this long-haul route, so you see the true total price including all fees — transparent, with no hidden costs.'
    : ' Airpiv compares hundreds of airlines for this route in seconds, so you find the best price for your flight — transparent, with no hidden costs and a best-price guarantee.';
  return opening + distancePhrase + closing;
}

function buildFaqItems(route, de) {
  const haulQuestion = route.distance_km != null
    ? {
      question: de ? `Wie weit ist es von ${route.origin_city} nach ${route.destination_city}?` : `How far is it from ${route.origin_city} to ${route.destination_city}?`,
      answer: de
        ? `Die Entfernung beträgt rund ${route.distance_km.toLocaleString('de-DE')} km — ${route.haul_type === 'long-haul' ? 'ein Langstreckenflug.' : 'ein Kurzstreckenflug.'}`
        : `The distance is roughly ${route.distance_km.toLocaleString('en-US')} km — ${route.haul_type === 'long-haul' ? 'a long-haul flight.' : 'a short-haul flight.'}`,
    }
    : {
      question: de ? `Welcher Flughafen wird in ${route.destination_city} angeflogen?` : `Which airport serves ${route.destination_city}?`,
      answer: de
        ? `Die Strecke nutzt den Flughafen ${route.destination_iata}. Genaue Flugzeiten und Airlines siehst du in den Suchergebnissen.`
        : `This route uses ${route.destination_iata} airport. Exact flight times and airlines are shown in the search results.`,
    };
  const bestTimeFaqItem = route.distance_km != null
    ? {
      question: de ? `Wann ist die beste Reisezeit von ${route.origin_city} nach ${route.destination_city}?` : `What is the best time to fly from ${route.origin_city} to ${route.destination_city}?`,
      answer: route.haul_type === 'long-haul'
        ? (de ? 'Am günstigsten ist diese Langstrecke meist 2–3 Monate im Voraus gebucht, außerhalb der Schulferien sowie der Weihnachts- und Osterzeit.' : 'This long-haul route is usually cheapest when booked 2–3 months ahead, outside school holidays and the Christmas/Easter periods.')
        : (de ? 'Am günstigsten ist diese Kurzstrecke meist in der Nebensaison (April–Mai, September–Oktober) sowie bei Flügen unter der Woche, besonders dienstags und mittwochs.' : 'This short-haul route is usually cheapest in the shoulder season (April–May, September–October) and on weekday flights, especially Tuesdays and Wednesdays.'),
    }
    : {
      question: de ? `Wie finde ich den günstigsten Flug von ${route.origin_city} nach ${route.destination_city}?` : `How do I find the cheapest flight from ${route.origin_city} to ${route.destination_city}?`,
      answer: de
        ? 'Airpiv vergleicht in Echtzeit hunderte Airlines für diese Strecke. Je flexibler dein Reisedatum, desto größer die Chance auf einen Spitzenpreis.'
        : 'Airpiv compares hundreds of airlines for this route in real time. The more flexible your travel dates, the better your chance of a great price.',
    };
  if (route.custom_faq && route.custom_faq.length) return route.custom_faq;
  return de ? [bestTimeFaqItem, haulQuestion] : [bestTimeFaqItem, haulQuestion];
}

function buildBestTimeHtml(route, de) {
  if (route.distance_km == null) return '';
  const isLongHaul = route.haul_type === 'long-haul';
  const body = de
    ? (isLongHaul
      ? `Für Langstreckenflüge wie ${escHtml(route.origin_city)} → ${escHtml(route.destination_city)} lohnt es sich meist, 2–3 Monate im Voraus zu buchen — die Preise steigen auf dieser Distanz typischerweise deutlich in den letzten 3–4 Wochen vor Abflug. Reisen außerhalb der Schulferien sowie außerhalb der Weihnachts- und Osterzeit sind auf Langstrecken erfahrungsgemäß günstiger, da die Nachfrage in diesen Zeiträumen spürbar sinkt.`
      : `Für Kurzstreckenflüge wie ${escHtml(route.origin_city)} → ${escHtml(route.destination_city)} sind die sogenannten Nebensaison-Monate (meist April–Mai und September–Oktober) günstiger als Hochsommer oder Weihnachten. Flüge unter der Woche — besonders dienstags und mittwochs — sind auf Kurzstrecken erfahrungsgemäß günstiger als Wochenendflüge, da die Nachfrage von Geschäftsreisenden am Wochenende sinkt.`)
    : (isLongHaul
      ? `For long-haul routes like ${escHtml(route.origin_city)} → ${escHtml(route.destination_city)}, it usually pays to book 2–3 months in advance — prices on this distance typically rise noticeably in the last 3–4 weeks before departure. Travelling outside school holidays and the Christmas/Easter periods tends to be cheaper on long-haul routes, as demand drops noticeably during those windows.`
      : `For short-haul routes like ${escHtml(route.origin_city)} → ${escHtml(route.destination_city)}, the shoulder-season months (typically April–May and September–October) are cheaper than peak summer or Christmas. Midweek flights — especially Tuesdays and Wednesdays — also tend to be cheaper than weekend flights, since business-traveller demand drops on weekends.`);
  const bookingWindow = de
    ? (isLongHaul ? '60–90 Tage vor Abflug' : '21–45 Tage vor Abflug')
    : (isLongHaul ? '60–90 days before departure' : '21–45 days before departure');
  return `<section class="route-besttime-section"><h2>${de ? 'Beste Reisezeit für diese Strecke' : 'Best time to fly this route'}</h2>` +
    `<div class="route-booking-window"><span class="route-booking-window-lbl">${de ? 'Beste Buchungszeit' : 'Best booking window'}</span><span class="route-booking-window-val">${bookingWindow}</span></div>` +
    `<p>${body}</p></section>`;
}

const ROUTE_HEAD_EXTRA_STATIC = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Airpiv","url":"https://airpiv.com","logo":"https://airpiv.com/apple-touch-icon.png"}</script>
<link rel="stylesheet" href="/flight-route.css">`;

// [LIVE-PRICE-WIDGET] The price box, "prices checked today" trust signal,
// and average-duration insights are genuinely live data from Duffel/Redis —
// baking a snapshot of these into a "static" page would go stale within
// minutes and actively mislead customers on price, which is worse than the
// current behavior. These stay as a small, isolated client-side enhancement
// — unlike the old anti-pattern, they never touch title/description/
// canonical/hreflang/JSON-LD; those are 100% real and complete before this
// script ever runs. The 4th (duration-derived) FAQ question appends
// visually only — it does not rewrite the already-valid JSON-LD written at
// build time, avoiding any runtime structured-data mutation.
function buildLiveScript(route, de) {
  const relatedHrefBase = de ? '/flights/' : '/en/flights/';
  return `<script>
(function(){
var PROXY = 'https://api.airpiv.com';
function escHtml(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
${de ? '' : `var ENGLISH_CITY_NAMES = ${JSON.stringify(require('./data').ENGLISH_CITY_NAMES)};
function localizeCityLive(name, iata){ return (iata && ENGLISH_CITY_NAMES[iata]) || name; }`}
fetch(PROXY + '/route-pages/' + encodeURIComponent(${JSON.stringify(route.slug)}) + '/related')
  .then(function(r){ return r.json(); })
  .then(function(j){
    if (!j.ok || !j.related || !j.related.length) return;
    var section = document.getElementById('related-routes-section');
    section.innerHTML = '<h2>${de ? 'Ähnliche Flugrouten' : 'Similar flight routes'}</h2><div class="related-routes-grid">' +
      j.related.map(function(r) {
        ${de ? 'var oCity = r.origin_city, dCity = r.destination_city;' : 'var oCity = localizeCityLive(r.origin_city, r.origin_iata), dCity = localizeCityLive(r.destination_city, r.destination_iata);'}
        return '<a class="related-route-card" href="${relatedHrefBase}' + encodeURIComponent(r.slug) + '">' + escHtml(oCity) + ' → ' + escHtml(dCity) + '</a>';
      }).join('') +
    '</div>';
  })
  .catch(function(){});

fetch(PROXY + '/route-price?from=' + encodeURIComponent(${JSON.stringify(route.origin_iata)}) + '&to=' + encodeURIComponent(${JSON.stringify(route.destination_iata)}))
  .then(function(r){ return r.json(); })
  .then(function(j){
    var box = document.getElementById('route-price-box');
    if (j.ok && j.price != null) {
      box.innerHTML = '<div class="route-price-val">${de ? 'ab' : 'from €'} ' + j.price.toFixed(0) + '${de ? ' €' : ''}</div><div class="route-price-lbl">${de ? 'Indikativer Preis · Economy · 1 Erwachsener' : 'Indicative price · Economy · 1 adult'}</div>';
      if (j.departure_date) {
        var ctaLink = document.querySelector('.route-cta');
        if (ctaLink) ctaLink.href = ctaLink.getAttribute('href') + '&depart=' + encodeURIComponent(j.departure_date);
      }
    } else {
      box.innerHTML = '<div style="color:rgba(255,255,255,.5);font-size:13px">${de ? 'Aktuelle Preise direkt in der Suche verfügbar' : 'Current prices available directly in search'}</div>';
    }
    var trustEl = document.getElementById('route-trust-signal');
    if (trustEl && j.ok && j.checksToday != null && j.checkedAt) {
      var minutesAgo = Math.max(0, Math.round((Date.now() - new Date(j.checkedAt).getTime()) / 60000));
      var agoText = minutesAgo < 1 ? '${de ? 'gerade eben' : 'just now'}' : (minutesAgo === 1 ? '${de ? 'vor 1 Minute' : 'updated 1 minute ago'}' : '${de ? 'vor ' : 'updated '}' + minutesAgo + '${de ? ' Minuten' : ' minutes ago'}');
      trustEl.innerHTML = '<span>✓ ' + j.checksToday + ' ${de ? 'Preise heute geprüft' : 'prices checked today'}</span><span>· ${de ? 'Zuletzt aktualisiert' : 'Last'} ' + agoText + '</span>';
      trustEl.style.display = '';
    }
    if (j.ok && j.insights) {
      var ins = j.insights;
      function fmtHrsMin(min) { var h = Math.floor(min / 60), m = min % 60; return h + '${de ? ' Std' : 'h'}' + (m > 0 ? ' ' + m + '${de ? ' Min' : 'm'}' : ''); }
      var directLine = ins.allDirect
        ? '${de ? 'Alle gefundenen Flüge sind Direktflüge.' : 'All flights found are direct flights.'}'
        : (ins.directAvailable ? '${de ? 'Direktflüge sind auf dieser Strecke verfügbar.' : 'Direct flights are available on this route.'}' : '${de ? 'Auf dieser Strecke gibt es aktuell keine Direktflüge — mit Zwischenstopp.' : 'There are currently no direct flights on this route — connections only.'}');
      var airlinesLine = ins.airlines.length ? ('${de ? 'Fliegende Airlines: ' : 'Airlines flying this route: '}' + ins.airlines.join(', ') + '.') : '';
      var insightsHtml = '<section class="route-insights-section"><h2>${de ? 'Flugdaten für diese Strecke' : 'Flight data for this route'}</h2><div class="route-insights-grid">' +
        '<div class="route-insight-card"><div class="route-insight-val">' + fmtHrsMin(ins.avgDurationMin) + '</div><div class="route-insight-lbl">${de ? 'Durchschnittliche Gesamtreisezeit (inkl. Umstieg)' : 'Average total travel time (incl. connections)'}</div></div>' +
        '<div class="route-insight-card"><div class="route-insight-val">' + fmtHrsMin(ins.minDurationMin) + '</div><div class="route-insight-lbl">${de ? 'Kürzeste gefundene Flugzeit' : 'Shortest flight time found'}</div></div>' +
      '</div><p style="margin-top:10px">' + directLine + (airlinesLine ? ' ' + airlinesLine : '') + '</p></section>';
      var insightsTarget = document.getElementById('route-insights-section');
      if (insightsTarget) insightsTarget.outerHTML = insightsHtml;
      var faqSection = document.querySelector('.route-faq');
      if (faqSection && !faqSection.dataset.durationFaqAdded) {
        var durationFaqHtml = '<div class="route-faq-item"><div class="route-faq-q">${de ? 'Wie lange dauert der Flug von' : 'How long does the flight from'} ${escHtml(route.origin_city)} ${de ? 'nach' : 'to'} ${escHtml(route.destination_city)} ${de ? 'dauern?' : 'take?'}</div><div class="route-faq-a">${de ? 'Die durchschnittliche Flugzeit liegt bei' : 'The average flight time is'} ' + fmtHrsMin(ins.avgDurationMin) + '. ' + directLine + '</div></div>';
        faqSection.insertAdjacentHTML('beforeend', durationFaqHtml);
        faqSection.dataset.durationFaqAdded = '1';
      }
    }
  })
  .catch(function(){
    document.getElementById('route-price-box').innerHTML = '<div style="color:rgba(255,255,255,.5);font-size:13px">${de ? 'Aktuelle Preise direkt in der Suche verfügbar' : 'Current prices available directly in search'}</div>';
  });
try { if (typeof gtag === 'function') gtag('event', 'route_page_view', { origin: ${JSON.stringify(route.origin_iata)}, destination: ${JSON.stringify(route.destination_iata)}, slug: ${JSON.stringify(route.slug)} }); } catch (e) {}
})();
</script>`;
}

function renderFlightRoutePage(routeRaw, lang) {
  const de = lang !== 'en';
  const localize = de ? germanizeCity : anglicizeCity;
  const route = Object.assign({}, routeRaw, {
    origin_city: localize(routeRaw.origin_city, routeRaw.origin_iata),
    destination_city: localize(routeRaw.destination_city, routeRaw.destination_iata),
  });

  const title = de
    ? (route.custom_title || `Flüge von ${route.origin_city} nach ${route.destination_city}`)
    : `Flights from ${route.origin_city} to ${route.destination_city}`;
  const description = de
    ? (route.custom_meta_description || `Günstige Flüge von ${route.origin_city} (${route.origin_iata}) nach ${route.destination_city} (${route.destination_iata}) finden und buchen — Preise vergleichen mit Airpiv.`)
    : `Find and book cheap flights from ${route.origin_city} (${route.origin_iata}) to ${route.destination_city} (${route.destination_iata}) — compare prices with Airpiv.`;

  const deUrl = `https://airpiv.com/flights/${encodeURIComponent(route.slug)}`;
  const enUrl = `https://airpiv.com/en/flights/${encodeURIComponent(route.slug)}`;
  const url = de ? deUrl : enUrl;
  const introText = de ? (route.intro_text || buildDynamicIntro(route, true)) : buildDynamicIntro(route, false);
  const bookingUrl = `/?from=${encodeURIComponent(route.origin_iata)}&to=${encodeURIComponent(route.destination_iata)}`;

  const countryHrefBase = de ? '/country/' : '/en/country/';
  const cityHrefBase = de ? '/city/' : '/en/city/';
  let breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${de ? '/' : '/en/'}">${de ? 'Startseite' : 'Home'}</a><span>›</span>`;
  if (route.destination_country) breadcrumbHtml += `<a href="${countryHrefBase}${encodeURIComponent(route.destination_country)}">${escHtml(route.destination_country)}</a><span>›</span>`;
  if (route.destination_city_slug) breadcrumbHtml += `<a href="${cityHrefBase}${encodeURIComponent(route.destination_city_slug)}">${escHtml(route.destination_city)}</a><span>›</span>`;
  breadcrumbHtml += `<span>${escHtml(route.origin_city)} → ${escHtml(route.destination_city)}</span></nav>`;

  const breadcrumbItems = [{ '@type': 'ListItem', position: 1, name: de ? 'Startseite' : 'Home', item: de ? 'https://airpiv.com/' : 'https://airpiv.com/en/' }];
  let bcPos = 2;
  if (route.destination_country) breadcrumbItems.push({ '@type': 'ListItem', position: bcPos++, name: route.destination_country, item: `${de ? 'https://airpiv.com/country/' : 'https://airpiv.com/en/country/'}${encodeURIComponent(route.destination_country)}` });
  if (route.destination_city_slug) breadcrumbItems.push({ '@type': 'ListItem', position: bcPos++, name: route.destination_city, item: `${de ? 'https://airpiv.com/city/' : 'https://airpiv.com/en/city/'}${encodeURIComponent(route.destination_city_slug)}` });
  breadcrumbItems.push({ '@type': 'ListItem', position: bcPos, name: `${route.origin_city} → ${route.destination_city}`, item: url });

  const airportHrefBase = de ? '/airport/' : '/en/airport/';
  const airportInfoHtml = `<section class="airport-info-section"><h2>${de ? 'Flughafeninformationen' : 'Airport information'}</h2><div class="airport-info-grid">` +
    `<a class="airport-info-card" href="${airportHrefBase}${encodeURIComponent(route.origin_iata)}"><span class="airport-info-code">${escHtml(route.origin_iata)}</span><span class="airport-info-city">${escHtml(route.origin_city)}</span></a>` +
    `<a class="airport-info-card" href="${airportHrefBase}${encodeURIComponent(route.destination_iata)}"><span class="airport-info-code">${escHtml(route.destination_iata)}</span><span class="airport-info-city">${escHtml(route.destination_city)}</span></a>` +
    `</div></section>`;

  const altAirports = getAlternativeAirports(route.destination_city, route.destination_iata, lang);
  const altAirportsHtml = altAirports.length
    ? `<section class="airport-info-section"><h2>${de ? 'Alternative Flughäfen in' : 'Alternative airports in'} ${escHtml(route.destination_city)}</h2><div class="airport-info-grid">${altAirports.map((code) => `<a class="airport-info-card" href="${airportHrefBase}${encodeURIComponent(code)}"><span class="airport-info-code">${escHtml(code)}</span><span class="airport-info-city">${escHtml(route.destination_city)}</span></a>`).join('')}</div></section>`
    : '';

  let distanceHtml = '';
  if (route.distance_km != null) {
    const haulLabel = de
      ? (route.haul_type === 'long-haul' ? 'Langstreckenflug' : 'Kurzstreckenflug')
      : (route.haul_type === 'long-haul' ? 'Long-haul flight' : 'Short-haul flight');
    distanceHtml = `<div style="color:rgba(255,255,255,.5);font-size:12px;margin-top:6px">📏 ${route.distance_km.toLocaleString(de ? 'de-DE' : 'en-US')} km · ${haulLabel}</div>`;
  }

  const bestTimeHtml = buildBestTimeHtml(route, de);
  const faqItems = buildFaqItems(route, de);
  const faqHtml = faqItems.map((f) => `<div class="route-faq-item"><div class="route-faq-q">${escHtml(f.question)}</div><div class="route-faq-a">${escHtml(f.answer)}</div></div>`).join('');

  const mainContent = `<main id="route-main">
  <div id="route-content">
${breadcrumbHtml}
<h1>${escHtml(title)}</h1>
<div class="route-hero">
  <div class="route-hero-cities">
    <span>${escHtml(route.origin_city)}</span>
    <span class="route-hero-arrow">✈</span>
    <span>${escHtml(route.destination_city)}</span>
  </div>
  ${distanceHtml}
  <div class="route-price-box" id="route-price-box">
    <div style="color:rgba(255,255,255,.5);font-size:13px">${de ? 'Preis wird geladen…' : 'Loading price…'}</div>
  </div>
  <div class="route-trust-signal" id="route-trust-signal" style="display:none"></div>
  <a href="${bookingUrl}" class="route-cta">${de ? 'Jetzt Flüge suchen →' : 'Search flights now →'}</a>
</div>
<section><p>${escHtml(introText)}</p></section>
${bestTimeHtml}
${airportInfoHtml}
${altAirportsHtml}
<section id="route-insights-section"></section>
<section class="route-faq">
  <h2>${de ? 'Häufige Fragen' : 'Frequently asked questions'}</h2>
  ${faqHtml}
</section>
<section id="related-routes-section"></section>
  </div>
</main>`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    mainEntity: {
      '@type': 'FAQPage',
      mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    },
  };
  if (!de) schema.inLanguage = 'en';

  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbItems };

  const headExtra = `<script type="application/ld+json">${JSON.stringify(schema)}</script>\n` +
    `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>\n` +
    `${ROUTE_HEAD_EXTRA_STATIC}`;

  const html = renderShell({
    lang: de ? 'de' : 'en',
    title: `${title} | Airpiv`,
    description,
    canonicalUrl: url,
    deUrl, enUrl,
    headExtra,
    mainContent,
    scripts: buildLiveScript(route, de),
  });

  return { html, seo: { title: `${title} | Airpiv`, description, canonicalUrl: url, schema } };
}

module.exports = { renderFlightRoutePage };
