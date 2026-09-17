const { escHtml } = require('./shell');
const { localizeCity } = require('./data');
const { getLanguage } = require('./languages');
const { buildRouteSnapshot } = require('./route-snapshot');

// The route page is the search-entry point for a known city pair. Keep this
// panel deliberately server-rendered: the existing /search/{PAIR}?depart=DATE
// contract already boots the production search SPA, so the route page does not
// need a second client-side search implementation.
const COPY = {
  en: {
    title: 'Search this route', from: 'From', to: 'To', date: 'Departure date',
    choose: 'Choose a date', submit: 'Search flights',
    price: 'Current reference fare', time: 'Average total time', direct: 'Direct flights', airlines: 'Airlines',
    directYes: 'Available', directAll: 'Nonstop options', directNo: 'Connections only',
  },
  de: {
    title: 'Diese Strecke durchsuchen', from: 'Von', to: 'Nach', date: 'Abflugdatum',
    choose: 'Datum wählen', submit: 'Flüge suchen',
    price: 'Aktueller Richtpreis', time: 'Durchschnittliche Gesamtdauer', direct: 'Direktflüge', airlines: 'Airlines',
    directYes: 'Verfügbar', directAll: 'Nonstop verfügbar', directNo: 'Nur mit Umstieg',
  },
  ar: {
    title: 'ابحث عن هذه الرحلة', from: 'من', to: 'إلى', date: 'تاريخ المغادرة',
    choose: 'اختر التاريخ', submit: 'ابحث عن الرحلات',
    price: 'السعر المرجعي الحالي', time: 'متوسط مدة الرحلة الكاملة', direct: 'الرحلات المباشرة', airlines: 'شركات الطيران',
    directYes: 'متاحة', directAll: 'بدون توقف', directNo: 'مع توقف فقط',
  },
  es: {
    title: 'Buscar esta ruta', from: 'Desde', to: 'Hasta', date: 'Fecha de salida',
    choose: 'Elige una fecha', submit: 'Buscar vuelos',
    price: 'Precio de referencia actual', time: 'Duración total media', direct: 'Vuelos directos', airlines: 'Aerolíneas',
    directYes: 'Disponibles', directAll: 'Sin escalas', directNo: 'Solo con escalas',
  },
  fr: {
    title: 'Rechercher cet itinéraire', from: 'Départ', to: 'Arrivée', date: 'Date de départ',
    choose: 'Choisir une date', submit: 'Rechercher des vols',
    price: 'Tarif de référence actuel', time: 'Durée totale moyenne', direct: 'Vols directs', airlines: 'Compagnies',
    directYes: 'Disponibles', directAll: 'Sans escale', directNo: 'Avec escale uniquement',
  },
  it: {
    title: 'Cerca questa rotta', from: 'Da', to: 'A', date: 'Data di partenza',
    choose: 'Scegli una data', submit: 'Cerca voli',
    price: 'Tariffa indicativa attuale', time: 'Durata totale media', direct: 'Voli diretti', airlines: 'Compagnie',
    directYes: 'Disponibili', directAll: 'Senza scalo', directNo: 'Solo con scalo',
  },
  nl: {
    title: 'Zoek op deze route', from: 'Van', to: 'Naar', date: 'Vertrekdatum',
    choose: 'Kies een datum', submit: 'Vluchten zoeken',
    price: 'Actueel richttarief', time: 'Gemiddelde totale reistijd', direct: 'Directe vluchten', airlines: 'Airlines',
    directYes: 'Beschikbaar', directAll: 'Zonder tussenstop', directNo: 'Alleen met overstap',
  },
  tr: {
    title: 'Bu rotayı ara', from: 'Nereden', to: 'Nereye', date: 'Kalkış tarihi',
    choose: 'Tarih seçin', submit: 'Uçuşları ara',
    price: 'Güncel referans fiyat', time: 'Ortalama toplam süre', direct: 'Direkt uçuşlar', airlines: 'Havayolları',
    directYes: 'Mevcut', directAll: 'Aktarmasız', directNo: 'Sadece aktarmalı',
  },
};

function copyFor(lang) {
  return COPY[lang] || COPY.en;
}

function formatPrice(price, lang) {
  if (!price || !Number.isFinite(Number(price.amount)) || Number(price.amount) <= 0) return null;
  const value = Math.round(Number(price.amount)).toLocaleString(getLanguage(lang).locale);
  if (price.currency === 'EUR') return `${value} €`;
  if (price.currency === 'USD') return `$${value}`;
  if (price.currency === 'GBP') return `£${value}`;
  return `${value} ${price.currency || 'EUR'}`;
}

function formatDuration(minutes) {
  if (!Number.isFinite(Number(minutes)) || Number(minutes) <= 0) return null;
  const min = Math.round(Number(minutes));
  const hours = Math.floor(min / 60);
  const remainder = min % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ''}` : `${remainder}m`;
}

function directLabel(route, copy) {
  if (route.all_direct === true) return copy.directAll;
  if (route.direct_flight_available === true) return copy.directYes;
  if (route.direct_flight_available === false) return copy.directNo;
  return null;
}

function statsHtml(route, snapshot, copy) {
  const stats = [];
  const price = formatPrice(snapshot && snapshot.price, route._lang);
  if (price) stats.push(`<div class="route-search-stat"><span class="route-search-stat-value">${escHtml(price)}</span><span class="route-search-stat-label">${escHtml(copy.price)}</span></div>`);

  const duration = formatDuration(snapshot && snapshot.avgDurationMin);
  if (duration) stats.push(`<div class="route-search-stat"><span class="route-search-stat-value">${escHtml(duration)}</span><span class="route-search-stat-label">${escHtml(copy.time)}</span></div>`);

  const direct = directLabel(route, copy);
  if (direct) stats.push(`<div class="route-search-stat"><span class="route-search-stat-value">${escHtml(direct)}</span><span class="route-search-stat-label">${escHtml(copy.direct)}</span></div>`);

  if (snapshot && snapshot.airlineCount != null && Number(snapshot.airlineCount) > 0) {
    stats.push(`<div class="route-search-stat"><span class="route-search-stat-value">${Number(snapshot.airlineCount).toLocaleString(getLanguage(route._lang).locale)}</span><span class="route-search-stat-label">${escHtml(copy.airlines)}</span></div>`);
  }
  return stats.length ? `<div class="route-search-stats" aria-label="Route summary">${stats.join('')}</div>` : '';
}

function styles() {
  return `
.route-search-panel{margin:18px auto 6px;max-width:980px;text-align:left;background:rgba(255,255,255,.98);border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:16px;box-shadow:0 12px 30px rgba(0,0,0,.18);color:#132338}
.route-search-title{font-size:13px;font-weight:800;letter-spacing:.02em;margin:0 0 11px;color:#132338}
.route-search-form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,.9fr) auto;gap:10px;align-items:end}
.route-search-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.route-search-field label{font-size:11px;font-weight:700;color:#617084}
.route-search-input{width:100%;height:48px;box-sizing:border-box;border:1px solid #d5dde6;border-radius:11px;background:#f8fafc;color:#132338;padding:0 13px;font:inherit;font-size:14px;font-weight:700;outline:none}
.route-search-input:focus{border-color:#00a991;box-shadow:0 0 0 3px rgba(0,169,145,.12)}
.route-search-route{display:flex;align-items:center;gap:8px}
.route-search-route-code{font-size:11px;font-weight:800;color:#00a991;letter-spacing:.04em;white-space:nowrap}
.route-search-route-city{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.route-search-submit{height:48px;border:0;border-radius:11px;padding:0 20px;background:#00a991;color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer;white-space:nowrap;box-shadow:0 7px 16px rgba(0,169,145,.23)}
.route-search-submit:hover{filter:brightness(.96);transform:translateY(-1px)}
.route-search-hint{margin:10px 2px 0;font-size:11.5px;color:#6d7b8c}
.route-search-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:11px 0 2px}
.route-search-stat{padding:9px 10px;border-radius:10px;background:#f5f8fb;border:1px solid #e4eaf0;min-width:0}
.route-search-stat-value{display:block;font-size:14px;font-weight:800;color:#12304b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.route-search-stat-label{display:block;margin-top:2px;font-size:10.5px;color:#738092;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:760px){.route-search-form{grid-template-columns:1fr 1fr}.route-search-submit{grid-column:1/-1;width:100%}.route-search-stats{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.route-search-panel{margin-left:0;margin-right:0;padding:13px}.route-search-form{grid-template-columns:1fr}.route-search-submit{grid-column:auto}.route-search-input{height:46px}.route-search-stats{grid-template-columns:1fr 1fr}.route-search-hint{line-height:1.45}}
`;
}

function renderPanel(route, lang) {
  const copy = copyFor(lang);
  const snapshot = buildRouteSnapshot(route);
  const localizedOrigin = localizeCity(route.origin_city, route.origin_iata, lang);
  const localizedDestination = localizeCity(route.destination_city, route.destination_iata, lang);
  const pair = `${route.origin_iata}-${route.destination_iata}`;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const today = new Date().toISOString().slice(0, 10);

  const enrichedRoute = Object.assign({}, route, { _lang: lang });
  return `<div class="route-search-panel" dir="${dir}">
  <div class="route-search-title">${escHtml(copy.title)}</div>
  <form class="route-search-form" method="get" action="/search/${encodeURIComponent(pair)}">
    <div class="route-search-field">
      <label>${escHtml(copy.from)}</label>
      <div class="route-search-input route-search-route" aria-label="${escHtml(copy.from)}: ${escHtml(localizedOrigin)} (${escHtml(route.origin_iata)})">
        <span class="route-search-route-code">${escHtml(route.origin_iata)}</span>
        <span class="route-search-route-city">${escHtml(localizedOrigin)}</span>
      </div>
    </div>
    <div class="route-search-field">
      <label>${escHtml(copy.to)}</label>
      <div class="route-search-input route-search-route" aria-label="${escHtml(copy.to)}: ${escHtml(localizedDestination)} (${escHtml(route.destination_iata)})">
        <span class="route-search-route-code">${escHtml(route.destination_iata)}</span>
        <span class="route-search-route-city">${escHtml(localizedDestination)}</span>
      </div>
    </div>
    <div class="route-search-field">
      <label for="route-search-date-${escHtml(route.slug)}">${escHtml(copy.date)}</label>
      <input class="route-search-input" id="route-search-date-${escHtml(route.slug)}" name="depart" type="date" min="${today}" required aria-label="${escHtml(copy.date)}" />
    </div>
    <button class="route-search-submit" type="submit">${escHtml(copy.submit)}</button>
  </form>
  ${statsHtml(enrichedRoute, snapshot, copy)}
  <div class="route-search-hint">${escHtml(copy.choose)}</div>
</div>`;
}

function renderRouteSearchPanelHtml(html, route, lang) {
  if (typeof html !== 'string' || !html || !route || !lang) return html;
  // The injection marker is intentionally the stable, dedicated hero price box.
  // If the renderer changes its markup later, fail closed and preserve the
  // original route page instead of emitting a malformed document.
  const marker = '<div class="route-price-box" id="route-price-box">';
  if (!html.includes(marker)) return html;
  const panel = renderPanel(route, lang);
  const withPanel = html.replace(marker, `${panel}\n  ${marker}`);
  if (withPanel.includes('id="route-search-panel-styles"')) return withPanel;
  return withPanel.replace('</head>', `<style id="route-search-panel-styles">${styles()}</style></head>`);
}

module.exports = { renderRouteSearchPanelHtml, renderPanel, styles };