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
    title: 'Search this exact route', subtitle: 'Compare available fares for your travel date', from: 'From', to: 'To', date: 'Departure date',
    choose: 'Choose your date to see the current options', submit: 'Search flights →',
    price: 'Reference fare', time: 'Avg. total time', distance: 'Distance', direct: 'Direct flights', airlines: 'Airlines', nonstop: 'Nonstop share',
    directYes: 'Available', directAll: 'All nonstop', directNo: 'Connections only',
    fareNote: 'Reference fare is indicative; exact prices are checked in search.',
  },
  de: {
    title: 'Diese genaue Strecke suchen', subtitle: 'Vergleiche verfügbare Preise für dein Reisedatum', from: 'Von', to: 'Nach', date: 'Abflugdatum',
    choose: 'Wähle dein Datum für die aktuellen Optionen', submit: 'Flüge suchen →',
    price: 'Richtpreis', time: 'Ø Gesamtdauer', distance: 'Entfernung', direct: 'Direktflüge', airlines: 'Airlines', nonstop: 'Nonstop-Anteil',
    directYes: 'Verfügbar', directAll: 'Nur nonstop', directNo: 'Nur mit Umstieg',
    fareNote: 'Der Richtpreis ist indikativ; exakte Preise werden in der Suche geprüft.',
  },
  ar: {
    title: 'ابحث عن هذا المسار بالتحديد', subtitle: 'قارن الأسعار المتاحة لتاريخ سفرك', from: 'من', to: 'إلى', date: 'تاريخ المغادرة',
    choose: 'اختر التاريخ لرؤية الخيارات الحالية', submit: 'ابحث عن الرحلات ←',
    price: 'السعر المرجعي', time: 'متوسط المدة الكاملة', distance: 'المسافة', direct: 'الرحلات المباشرة', airlines: 'شركات الطيران', nonstop: 'نسبة المباشر',
    directYes: 'متاحة', directAll: 'كلها مباشرة', directNo: 'مع توقف فقط',
    fareNote: 'السعر المرجعي تقريبي؛ يتم التحقق من السعر الدقيق داخل البحث.',
  },
  es: {
    title: 'Buscar esta ruta exacta', subtitle: 'Compara las tarifas disponibles para tu fecha', from: 'Desde', to: 'Hasta', date: 'Fecha de salida',
    choose: 'Elige una fecha para ver las opciones actuales', submit: 'Buscar vuelos →',
    price: 'Precio de referencia', time: 'Duración total media', distance: 'Distancia', direct: 'Vuelos directos', airlines: 'Aerolíneas', nonstop: 'Cuota sin escalas',
    directYes: 'Disponibles', directAll: 'Todos sin escalas', directNo: 'Solo con escalas',
    fareNote: 'El precio de referencia es indicativo; el precio exacto se comprueba en la búsqueda.',
  },
  fr: {
    title: 'Rechercher cet itinéraire exact', subtitle: 'Comparez les tarifs disponibles pour votre date', from: 'Départ', to: 'Arrivée', date: 'Date de départ',
    choose: 'Choisissez une date pour voir les options actuelles', submit: 'Rechercher des vols →',
    price: 'Tarif de référence', time: 'Durée totale moyenne', distance: 'Distance', direct: 'Vols directs', airlines: 'Compagnies', nonstop: 'Part sans escale',
    directYes: 'Disponibles', directAll: 'Tous sans escale', directNo: 'Avec escale uniquement',
    fareNote: 'Le tarif de référence est indicatif ; le prix exact est vérifié dans la recherche.',
  },
  it: {
    title: 'Cerca questa rotta esatta', subtitle: 'Confronta le tariffe disponibili per la tua data', from: 'Da', to: 'A', date: 'Data di partenza',
    choose: 'Scegli una data per vedere le opzioni attuali', submit: 'Cerca voli →',
    price: 'Tariffa indicativa', time: 'Durata totale media', distance: 'Distanza', direct: 'Voli diretti', airlines: 'Compagnie', nonstop: 'Quota nonstop',
    directYes: 'Disponibili', directAll: 'Tutti nonstop', directNo: 'Solo con scalo',
    fareNote: 'La tariffa indicativa è approssimativa; il prezzo esatto viene verificato nella ricerca.',
  },
  nl: {
    title: 'Deze exacte route zoeken', subtitle: 'Vergelijk beschikbare tarieven voor je reisdatum', from: 'Van', to: 'Naar', date: 'Vertrekdatum',
    choose: 'Kies een datum voor de huidige opties', submit: 'Vluchten zoeken →',
    price: 'Richttarief', time: 'Gemiddelde totale reistijd', distance: 'Afstand', direct: 'Directe vluchten', airlines: 'Airlines', nonstop: 'Nonstop-aandeel',
    directYes: 'Beschikbaar', directAll: 'Allemaal nonstop', directNo: 'Alleen met overstap',
    fareNote: 'Het richttarief is indicatief; de exacte prijs wordt in de zoekresultaten gecontroleerd.',
  },
  tr: {
    title: 'Bu rotayı tam olarak ara', subtitle: 'Seyahat tarihin için mevcut fiyatları karşılaştır', from: 'Nereden', to: 'Nereye', date: 'Kalkış tarihi',
    choose: 'Güncel seçenekleri görmek için tarih seç', submit: 'Uçuşları ara →',
    price: 'Referans fiyat', time: 'Ortalama toplam süre', distance: 'Mesafe', direct: 'Direkt uçuşlar', airlines: 'Havayolları', nonstop: 'Aktarmasız oranı',
    directYes: 'Mevcut', directAll: 'Hepsi aktarmasız', directNo: 'Sadece aktarmalı',
    fareNote: 'Referans fiyat gösterge niteliğindedir; kesin fiyat aramada kontrol edilir.',
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

function formatDistance(distanceKm, lang) {
  if (!Number.isFinite(Number(distanceKm)) || Number(distanceKm) <= 0) return null;
  return `${Math.round(Number(distanceKm)).toLocaleString(getLanguage(lang).locale)} km`;
}

function directLabel(route, copy) {
  if (route.all_direct === true) return copy.directAll;
  if (route.direct_flight_available === true) return copy.directYes;
  if (route.direct_flight_available === false) return copy.directNo;
  return null;
}

function stat(label, value) {
  if (!value) return '';
  return `<div class="route-search-stat"><span class="route-search-stat-value">${escHtml(value)}</span><span class="route-search-stat-label">${escHtml(label)}</span></div>`;
}

function statsHtml(route, snapshot, copy) {
  const stats = [];
  const price = formatPrice(snapshot && snapshot.price, route._lang);
  const duration = formatDuration(snapshot && snapshot.avgDurationMin);
  const distance = formatDistance(snapshot && snapshot.distanceKm, route._lang);
  const direct = directLabel(route, copy);

  if (price) stats.push(stat(copy.price, price));
  if (duration) stats.push(stat(copy.time, duration));
  if (distance) stats.push(stat(copy.distance, distance));
  if (direct) stats.push(stat(copy.direct, direct));
  if (snapshot && snapshot.stops && snapshot.stops.total > 0) {
    stats.push(stat(copy.nonstop, `${snapshot.stops.nonstopShare}%`));
  } else if (snapshot && snapshot.airlineCount != null && Number(snapshot.airlineCount) > 0) {
    stats.push(stat(copy.airlines, Number(snapshot.airlineCount).toLocaleString(getLanguage(route._lang).locale)));
  }

  return stats.length ? `<div class="route-search-stats" aria-label="Route summary">${stats.join('')}</div>` : '';
}

function styles() {
  return `
.route-search-panel{margin:20px auto 8px;max-width:980px;text-align:left;background:linear-gradient(180deg,#fff 0%,#f8fbfd 100%);border:1px solid #dce5ec;border-radius:18px;padding:18px;box-shadow:0 18px 38px rgba(9,31,52,.18);color:#132338}
.route-search-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
.route-search-title{font-size:15px;font-weight:800;letter-spacing:-.01em;margin:0;color:#10253b}
.route-search-subtitle{margin:3px 0 0;font-size:11.5px;color:#6b7988;line-height:1.45}
.route-search-badge{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:#e7f8f5;color:#087d6d;border:1px solid #cbeee8;font-size:10.5px;font-weight:800;white-space:nowrap}
.route-search-form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,.9fr) auto;gap:10px;align-items:end}
.route-search-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.route-search-field label{font-size:10.5px;font-weight:800;color:#617084;letter-spacing:.01em}
.route-search-input{width:100%;height:48px;box-sizing:border-box;border:1px solid #d2dce5;border-radius:11px;background:#fff;color:#132338;padding:0 13px;font:inherit;font-size:14px;font-weight:700;outline:none;transition:border-color .15s ease,box-shadow .15s ease}
.route-search-input:focus{border-color:#00a991;box-shadow:0 0 0 3px rgba(0,169,145,.12)}
.route-search-route{display:flex;align-items:center;gap:8px}
.route-search-route-code{font-size:11px;font-weight:900;color:#008f7c;letter-spacing:.05em;white-space:nowrap}
.route-search-route-city{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.route-search-submit{height:48px;border:0;border-radius:11px;padding:0 20px;background:#00a991;color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer;white-space:nowrap;box-shadow:0 9px 18px rgba(0,169,145,.24);transition:transform .15s ease,filter .15s ease}
.route-search-submit:hover{filter:brightness(.96);transform:translateY(-1px)}
.route-search-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:12px 0 0}
.route-search-stat{padding:10px 11px;border-radius:11px;background:#fff;border:1px solid #e1e8ee;min-width:0}
.route-search-stat-value{display:block;font-size:14px;font-weight:900;color:#12304b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.route-search-stat-label{display:block;margin-top:3px;font-size:10.5px;color:#738092;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.route-search-foot{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:11px}
.route-search-hint{font-size:11.5px;color:#6d7b8c;line-height:1.45}
.route-search-note{font-size:10.5px;color:#7a8794;line-height:1.45;text-align:right;max-width:48%}
@media (max-width:900px){.route-search-form{grid-template-columns:1fr 1fr}.route-search-submit{grid-column:1/-1;width:100%}.route-search-stats{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:560px){.route-search-panel{margin-left:0;margin-right:0;padding:14px;border-radius:15px}.route-search-heading{gap:8px}.route-search-badge{display:none}.route-search-form{grid-template-columns:1fr}.route-search-submit{grid-column:auto}.route-search-input{height:46px}.route-search-stats{grid-template-columns:1fr 1fr}.route-search-foot{flex-direction:column}.route-search-note{max-width:none;text-align:left}.route-search-subtitle{font-size:11px}}
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
  <div class="route-search-heading">
    <div><div class="route-search-title">${escHtml(copy.title)}</div><div class="route-search-subtitle">${escHtml(copy.subtitle)}</div></div>
    <span class="route-search-badge">✓ ${escHtml(copy.from)} ${escHtml(route.origin_iata)} · ${escHtml(route.destination_iata)}</span>
  </div>
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
  <div class="route-search-foot">
    <div class="route-search-hint">${escHtml(copy.choose)}</div>
    <div class="route-search-note">${escHtml(copy.fareNote)}</div>
  </div>
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