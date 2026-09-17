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
    snapshotTitle: 'Route snapshot',
    snapshotLead: 'This page summarizes the route using the latest stored route evidence. Values shown here describe the route; exact fares are checked after you choose a travel date.',
    factFare: 'a reference fare of', factDuration: 'an average total time of', factDistance: 'a distance of', factDirect: 'direct-flight availability', factAirlines: 'airline coverage', factNonstop: 'a nonstop share of',
    limited: 'The route has limited stored evidence right now. Use the date selector above to check the current search options for this city pair.',
  },
  de: {
    title: 'Diese genaue Strecke suchen', subtitle: 'Vergleiche verfügbare Preise für dein Reisedatum', from: 'Von', to: 'Nach', date: 'Abflugdatum',
    choose: 'Wähle dein Datum für die aktuellen Optionen', submit: 'Flüge suchen →',
    price: 'Richtpreis', time: 'Ø Gesamtdauer', distance: 'Entfernung', direct: 'Direktflüge', airlines: 'Airlines', nonstop: 'Nonstop-Anteil',
    directYes: 'Verfügbar', directAll: 'Nur nonstop', directNo: 'Nur mit Umstieg',
    fareNote: 'Der Richtpreis ist indikativ; exakte Preise werden in der Suche geprüft.',
    snapshotTitle: 'Streckenüberblick',
    snapshotLead: 'Diese Seite fasst die Strecke anhand der aktuell gespeicherten Routendaten zusammen. Die Werte beschreiben die Strecke; exakte Preise werden nach Auswahl des Reisedatums in der Suche geprüft.',
    factFare: 'einen Richtpreis von', factDuration: 'eine durchschnittliche Gesamtdauer von', factDistance: 'eine Entfernung von', factDirect: 'die Verfügbarkeit von Direktflügen', factAirlines: 'Airline-Abdeckung', factNonstop: 'einen Nonstop-Anteil von',
    limited: 'Für diese Strecke sind derzeit nur begrenzte Routendaten gespeichert. Nutze die Datumsauswahl oben, um die aktuellen Suchoptionen für dieses Städtepaar zu prüfen.',
  },
  ar: {
    title: 'ابحث عن هذا المسار بالتحديد', subtitle: 'قارن الأسعار المتاحة لتاريخ سفرك', from: 'من', to: 'إلى', date: 'تاريخ المغادرة',
    choose: 'اختر التاريخ لرؤية الخيارات الحالية', submit: 'ابحث عن الرحلات ←',
    price: 'السعر المرجعي', time: 'متوسط المدة الكاملة', distance: 'المسافة', direct: 'الرحلات المباشرة', airlines: 'شركات الطيران', nonstop: 'نسبة المباشر',
    directYes: 'متاحة', directAll: 'كلها مباشرة', directNo: 'مع توقف فقط',
    fareNote: 'السعر المرجعي تقريبي؛ يتم التحقق من السعر الدقيق داخل البحث.',
    snapshotTitle: 'ملخص المسار',
    snapshotLead: 'تلخص هذه الصفحة المسار اعتمادًا على أحدث بيانات المسار المخزنة. القيم المعروضة تصف المسار، بينما يتم التحقق من الأسعار الدقيقة بعد اختيار تاريخ السفر.',
    factFare: 'سعر مرجعي قدره', factDuration: 'متوسط مدة كاملة قدرها', factDistance: 'مسافة قدرها', factDirect: 'توفر الرحلات المباشرة', factAirlines: 'تغطية شركات الطيران', factNonstop: 'نسبة رحلات بدون توقف قدرها',
    limited: 'البيانات المخزنة لهذا المسار محدودة حاليًا. استخدم اختيار التاريخ أعلاه للتحقق من خيارات البحث الحالية لهذا الزوج من المدن.',
  },
  es: {
    title: 'Buscar esta ruta exacta', subtitle: 'Compara las tarifas disponibles para tu fecha', from: 'Desde', to: 'Hasta', date: 'Fecha de salida',
    choose: 'Elige una fecha para ver las opciones actuales', submit: 'Buscar vuelos →',
    price: 'Precio de referencia', time: 'Duración total media', distance: 'Distancia', direct: 'Vuelos directos', airlines: 'Aerolíneas', nonstop: 'Cuota sin escalas',
    directYes: 'Disponibles', directAll: 'Todos sin escalas', directNo: 'Solo con escalas',
    fareNote: 'El precio de referencia es indicativo; el precio exacto se comprueba en la búsqueda.',
    snapshotTitle: 'Resumen de la ruta',
    snapshotLead: 'Esta página resume la ruta con los datos almacenados más recientes. Los valores describen la ruta; el precio exacto se comprueba al seleccionar la fecha de viaje.',
    factFare: 'un precio de referencia de', factDuration: 'una duración total media de', factDistance: 'una distancia de', factDirect: 'disponibilidad de vuelos directos', factAirlines: 'cobertura de aerolíneas', factNonstop: 'una cuota sin escalas de',
    limited: 'Los datos almacenados de esta ruta son actualmente limitados. Usa el selector de fecha para comprobar las opciones actuales de búsqueda para este par de ciudades.',
  },
  fr: {
    title: 'Rechercher cet itinéraire exact', subtitle: 'Comparez les tarifs disponibles pour votre date', from: 'Départ', to: 'Arrivée', date: 'Date de départ',
    choose: 'Choisissez une date pour voir les options actuelles', submit: 'Rechercher des vols →',
    price: 'Tarif de référence', time: 'Durée totale moyenne', distance: 'Distance', direct: 'Vols directs', airlines: 'Compagnies', nonstop: 'Part sans escale',
    directYes: 'Disponibles', directAll: 'Tous sans escale', directNo: 'Avec escale uniquement',
    fareNote: 'Le tarif de référence est indicatif ; le prix exact est vérifié dans la recherche.',
    snapshotTitle: 'Aperçu de l’itinéraire',
    snapshotLead: 'Cette page résume l’itinéraire à partir des dernières données enregistrées. Les valeurs décrivent la route ; le prix exact est vérifié après le choix de votre date.',
    factFare: 'un tarif de référence de', factDuration: 'une durée totale moyenne de', factDistance: 'une distance de', factDirect: 'la disponibilité de vols directs', factAirlines: 'la couverture des compagnies', factNonstop: 'une part sans escale de',
    limited: 'Les données enregistrées pour cet itinéraire sont actuellement limitées. Utilisez le sélecteur de date pour vérifier les options actuelles de recherche pour cette paire de villes.',
  },
  it: {
    title: 'Cerca questa rotta esatta', subtitle: 'Confronta le tariffe disponibili per la tua data', from: 'Da', to: 'A', date: 'Data di partenza',
    choose: 'Scegli una data per vedere le opzioni attuali', submit: 'Cerca voli →',
    price: 'Tariffa indicativa', time: 'Durata totale media', distance: 'Distanza', direct: 'Voli diretti', airlines: 'Compagnie', nonstop: 'Quota nonstop',
    directYes: 'Disponibili', directAll: 'Tutti nonstop', directNo: 'Solo con scalo',
    fareNote: 'La tariffa indicativa è approssimativa; il prezzo esatto viene verificato nella ricerca.',
    snapshotTitle: 'Riepilogo della rotta',
    snapshotLead: 'Questa pagina riassume la rotta usando i dati più recenti memorizzati. I valori descrivono la rotta; il prezzo esatto viene verificato dopo aver scelto la data di viaggio.',
    factFare: 'una tariffa indicativa di', factDuration: 'una durata totale media di', factDistance: 'una distanza di', factDirect: 'la disponibilità di voli diretti', factAirlines: 'la copertura delle compagnie', factNonstop: 'una quota nonstop del',
    limited: 'I dati memorizzati per questa rotta sono attualmente limitati. Usa il selettore di data per verificare le opzioni di ricerca attuali per questa coppia di città.',
  },
  nl: {
    title: 'Deze exacte route zoeken', subtitle: 'Vergelijk beschikbare tarieven voor je reisdatum', from: 'Van', to: 'Naar', date: 'Vertrekdatum',
    choose: 'Kies een datum voor de huidige opties', submit: 'Vluchten zoeken →',
    price: 'Richttarief', time: 'Gemiddelde totale reistijd', distance: 'Afstand', direct: 'Directe vluchten', airlines: 'Airlines', nonstop: 'Nonstop-aandeel',
    directYes: 'Beschikbaar', directAll: 'Allemaal nonstop', directNo: 'Alleen met overstap',
    fareNote: 'Het richttarief is indicatief; de exacte prijs wordt in de zoekresultaten gecontroleerd.',
    snapshotTitle: 'Routeoverzicht',
    snapshotLead: 'Deze pagina vat de route samen op basis van de meest recente opgeslagen routegegevens. De waarden beschrijven de route; exacte tarieven worden na je reisdatumkeuze in de zoekresultaten gecontroleerd.',
    factFare: 'een richttarief van', factDuration: 'een gemiddelde totale reistijd van', factDistance: 'een afstand van', factDirect: 'beschikbaarheid van directe vluchten', factAirlines: 'dekking van airlines', factNonstop: 'een nonstop-aandeel van',
    limited: 'De opgeslagen gegevens voor deze route zijn momenteel beperkt. Gebruik de datumkeuze om de actuele zoekopties voor dit stads-paar te controleren.',
  },
  tr: {
    title: 'Bu rotayı tam olarak ara', subtitle: 'Seyahat tarihin için mevcut fiyatları karşılaştır', from: 'Nereden', to: 'Nereye', date: 'Kalkış tarihi',
    choose: 'Güncel seçenekleri görmek için tarih seç', submit: 'Uçuşları ara →',
    price: 'Referans fiyat', time: 'Ortalama toplam süre', distance: 'Mesafe', direct: 'Direkt uçuşlar', airlines: 'Havayolları', nonstop: 'Aktarmasız oranı',
    directYes: 'Mevcut', directAll: 'Hepsi aktarmasız', directNo: 'Sadece aktarmalı',
    fareNote: 'Referans fiyat gösterge niteliğindedir; kesin fiyat aramada kontrol edilir.',
    snapshotTitle: 'Rota özeti',
    snapshotLead: 'Bu sayfa, kaydedilmiş en güncel rota verilerine göre bu rotayı özetler. Gösterilen değerler rotayı açıklar; kesin fiyatlar seyahat tarihin seçildikten sonra aramada kontrol edilir.',
    factFare: 'referans fiyat', factDuration: 'ortalama toplam süre', factDistance: 'mesafe', factDirect: 'direkt uçuş durumu', factAirlines: 'havayolu kapsamı', factNonstop: 'aktarmasız oranı',
    limited: 'Bu rota için kaydedilmiş veriler şu anda sınırlı. Bu şehir çifti için güncel arama seçeneklerini kontrol etmek üzere yukarıdaki tarih seçiciyi kullan.',
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

function valueOrNull(primary, fallback) {
  return primary != null ? primary : fallback;
}

function stat(label, value) {
  if (!value) return '';
  return `<div class="route-search-stat"><span class="route-search-stat-value">${escHtml(value)}</span><span class="route-search-stat-label">${escHtml(label)}</span></div>`;
}

function statsHtml(route, snapshot, copy) {
  const stats = [];
  const price = formatPrice(valueOrNull(snapshot && snapshot.price, route.price_min ? { amount: route.price_min, currency: route.price_currency || 'EUR' } : null), route._lang);
  const duration = formatDuration(valueOrNull(snapshot && snapshot.avgDurationMin, route.avg_duration_min));
  const distance = formatDistance(valueOrNull(snapshot && snapshot.distanceKm, route.distance_km), route._lang);
  const direct = directLabel(route, copy);
  const airlineCount = valueOrNull(snapshot && snapshot.airlineCount, route.airline_count);

  if (price) stats.push(stat(copy.price, price));
  if (duration) stats.push(stat(copy.time, duration));
  if (distance) stats.push(stat(copy.distance, distance));
  if (direct) stats.push(stat(copy.direct, direct));
  if (snapshot && snapshot.stops && snapshot.stops.total > 0) {
    stats.push(stat(copy.nonstop, `${snapshot.stops.nonstopShare}%`));
  } else if (airlineCount != null && Number(airlineCount) > 0) {
    stats.push(stat(copy.airlines, Number(airlineCount).toLocaleString(getLanguage(route._lang).locale)));
  }

  return stats.length ? `<div class="route-search-stats" aria-label="Route summary">${stats.join('')}</div>` : '';
}

function snapshotHtml(route, snapshot, copy, lang) {
  const price = formatPrice(valueOrNull(snapshot && snapshot.price, route.price_min ? { amount: route.price_min, currency: route.price_currency || 'EUR' } : null), lang);
  const duration = formatDuration(valueOrNull(snapshot && snapshot.avgDurationMin, route.avg_duration_min));
  const distance = formatDistance(valueOrNull(snapshot && snapshot.distanceKm, route.distance_km), lang);
  const direct = directLabel(route, copy);
  const airlineCount = valueOrNull(snapshot && snapshot.airlineCount, route.airline_count);
  const nonstop = snapshot && snapshot.stops && snapshot.stops.total > 0 ? `${snapshot.stops.nonstopShare}%` : null;
  const facts = [
    price ? `${copy.factFare} ${price}` : null,
    duration ? `${copy.factDuration} ${duration}` : null,
    distance ? `${copy.factDistance} ${distance}` : null,
    direct ? `${copy.factDirect}: ${direct}` : null,
    airlineCount != null && Number(airlineCount) > 0 ? `${copy.factAirlines}: ${Number(airlineCount).toLocaleString(getLanguage(lang).locale)}` : null,
    nonstop ? `${copy.factNonstop} ${nonstop}` : null,
  ].filter(Boolean);
  const localizedOrigin = localizeCity(route.origin_city, route.origin_iata, lang);
  const localizedDestination = localizeCity(route.destination_city, route.destination_iata, lang);
  const summary = facts.length
    ? `${localizedOrigin} → ${localizedDestination}: ${facts.join('; ')}.`
    : copy.limited;

  return `<section class="route-search-snapshot" aria-labelledby="route-search-snapshot-title">
    <div class="route-search-snapshot-head"><span class="route-search-kicker">${escHtml(copy.snapshotTitle)}</span><span class="route-search-snapshot-route">${escHtml(route.origin_iata)} → ${escHtml(route.destination_iata)}</span></div>
    <p class="route-search-snapshot-lead">${escHtml(copy.snapshotLead)}</p>
    <p id="route-search-snapshot-title" class="route-search-snapshot-copy">${escHtml(summary)}</p>
  </section>`;
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
.route-search-snapshot{margin-top:12px;padding:14px 15px;border-radius:13px;border:1px solid #dfe8ee;background:#f5fafc}
.route-search-snapshot-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.route-search-kicker{font-size:12px;font-weight:900;color:#12304b}
.route-search-snapshot-route{font-size:10.5px;font-weight:900;color:#008f7c;letter-spacing:.06em;white-space:nowrap}
.route-search-snapshot-lead{margin:5px 0 0;font-size:11px;line-height:1.55;color:#667587}
.route-search-snapshot-copy{margin:8px 0 0;font-size:12px;line-height:1.62;color:#25384d}
.route-search-foot{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:11px}
.route-search-hint{font-size:11.5px;color:#6d7b8c;line-height:1.45}
.route-search-note{font-size:10.5px;color:#7a8794;line-height:1.45;text-align:right;max-width:48%}
@media (max-width:900px){.route-search-form{grid-template-columns:1fr 1fr}.route-search-submit{grid-column:1/-1;width:100%}.route-search-stats{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:560px){.route-search-panel{margin-left:0;margin-right:0;padding:14px;border-radius:15px}.route-search-heading{gap:8px}.route-search-badge{display:none}.route-search-form{grid-template-columns:1fr}.route-search-submit{grid-column:auto}.route-search-input{height:46px}.route-search-stats{grid-template-columns:1fr 1fr}.route-search-foot{flex-direction:column}.route-search-note{max-width:none;text-align:left}.route-search-subtitle{font-size:11px}.route-search-snapshot-head{align-items:flex-start;flex-direction:column;gap:4px}}
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
      <label for="route-search-depart">${escHtml(copy.date)}</label>
      <input class="route-search-input" id="route-search-depart" name="depart" type="date" min="${today}" aria-label="${escHtml(copy.date)}">
    </div>
    <button class="route-search-submit" type="submit">${escHtml(copy.submit)}</button>
  </form>
  ${statsHtml(enrichedRoute, snapshot, copy)}
  ${snapshotHtml(enrichedRoute, snapshot, copy, lang)}
  <div class="route-search-foot">
    <div class="route-search-hint">${escHtml(copy.choose)}</div>
    <div class="route-search-note">${escHtml(copy.fareNote)}</div>
  </div>
</div>`;
}

function renderRouteSearchPanelHtml(source, route, lang) {
  if (!source || !route || !source.includes('route-price-box') || !source.includes('id="route-price-box"')) return source;
  const panel = renderPanel(route, lang);
  const styleTag = `<style id="route-search-panel-styles">${styles()}</style>`;
  const withStyles = source.includes('</head>') ? source.replace('</head>', `${styleTag}</head>`) : source;
  const marker = '<div class="route-price-box" id="route-price-box">';
  if (!withStyles.includes(marker)) return source;
  return withStyles.replace(marker, `${panel}${marker}`);
}

module.exports = { renderRouteSearchPanelHtml, renderPanel, styles };
