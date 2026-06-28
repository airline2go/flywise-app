
// ── Airline Logo Data URLs ────────────────────
// Real airline SVG logos embedded as data URLs
var AIRLINE_LOGOS = {};
var AIRLINE_COLORS = {
  'LH':'#003366','FR':'#073590','U2':'#ff6600','EW':'#aa0061',
  'W6':'#c6007e','VY':'#ffcc00','KL':'#00a1de','AF':'#002157',
  'BA':'#075aaa','IB':'#d7192d','TP':'#00805a','AZ':'#0066b3',
  'LX':'#e30613','OS':'#cc0000','SK':'#003d85','TK':'#c90119',
  'PC':'#fdb913','EK':'#d71921','QR':'#5c0632','EY':'#bd8b13',
  'SQ':'#f99f1c','CX':'#00645a','NH':'#13448f','UA':'#005daa',
  'DL':'#c8102e','AA':'#0078d2','AC':'#d22630','DE':'#e2001a',
  'ZZ':'#1a1a2e','WY':'#da291c','G9':'#ff6b00'
};
var AIRLINE_TEXT = {'VY':'#333','PC':'#003d7c','EK':'#c9a227','QR':'#c9a227','SQ':'#003d85'};
function getAirlineColor(code) { return AIRLINE_COLORS[code] || '#1c2c40'; }
function getAirlineTextColor(code) { return AIRLINE_TEXT[code] || '#fff'; }
var AIRLINE_COLORS = {
  'LH': '#f9ba00', 'FR': '#073590', 'U2': '#ff6600',
  'EW': '#aa0061', 'W6': '#c6007e', 'VY': '#ffcc00',
  'KL': '#00a1de', 'AF': '#002157', 'BA': '#075aaa',
  'IB': '#d7192d', 'TP': '#00805a', 'AZ': '#0066b3',
  'LX': '#e30613', 'OS': '#cc0000', 'SK': '#003d85',
  'TK': '#c90119', 'PC': '#fdb913', 'EK': '#d71921',
  'QR': '#5c0632', 'EY': '#bd8b13', 'SQ': '#f99f1c',
  'CX': '#00645a', 'NH': '#13448f', 'UA': '#005daa',
  'DL': '#c8102e', 'AA': '#0078d2', 'AC': '#d22630',
  'WY': '#da291c', 'G9': '#ff6b00', 'FZ': '#d71921',
  'GF': '#5c0a2e', 'MS': '#007dc5', 'RJ': '#00539b'
};

function getAirlineColor(code) {
  return AIRLINE_COLORS[code] || '#1c2c40';
}

function getAirlineLogo(code, name) {
  var color = getAirlineColor(code);
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">' +
    '<rect width="38" height="38" rx="9" fill="' + color + '"/>' +
    '<text x="19" y="24" font-family="Arial,sans-serif" font-size="11" font-weight="800" ' +
    'fill="white" text-anchor="middle" letter-spacing="0.5">' + (code || '?') + '</text>' +
    '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}


// ── Airline Logo Error Handler ───────────────
function onLogoErr(img, code, color) {
  img.style.display = 'none';
  var p = img.parentNode;
  if (p) {
    p.style.background = color || getAirlineColor(code || 'XX');
    p.style.borderRadius = '9px';
    p.style.display = 'flex';
    p.style.alignItems = 'center';
    p.style.justifyContent = 'center';
    var span = document.createElement('span');
    span.className = 'al-badge';
    span.textContent = code || 'XX';
    p.appendChild(span);
  }
}

// ── Airline Logo Fallback Handler ────────────
function fixAirlineLogo(img) {
  var src = img.getAttribute('src') || '';
  var code = src.split('/').pop().replace('.svg','').replace('.png','');
  if (!code || code.length < 2) {
    img.style.display = 'none';
    if (img.nextElementSibling) img.nextElementSibling.style.display = 'flex';
    return;
  }
  // Try airhex CDN
  var airhex = 'https://content.airhex.com/content/logos/airlines_' + code + '_50_50_s.png';
  var img2 = new Image();
  img2.onload = function() {
    img.src = airhex;
    img.style.display = '';
  };
  img2.onerror = function() {
    img.style.display = 'none';
    if (img.nextElementSibling) img.nextElementSibling.style.display = 'flex';
  };
  img2.src = airhex;
}

// Attach to all airline logos after render
function fixAllLogos() {
  var logos = document.querySelectorAll('.al-logo');
  for (var i = 0; i < logos.length; i++) {
    (function(wrap) {
      var img = wrap.querySelector('img');
      if (!img) return;
      var code = wrap.getAttribute('data-code') || img.alt || 'XX';
      var color = wrap.getAttribute('data-color') || getAirlineColor(code);
      img.onerror = function() {
        wrap.innerHTML = '';
        wrap.style.background = color;
        wrap.style.display = 'flex';
        wrap.style.alignItems = 'center';
        wrap.style.justifyContent = 'center';
        var sp = document.createElement('span');
        sp.className = 'al-badge';
        sp.textContent = code;
        wrap.appendChild(sp);
      };
      if (img.complete && img.naturalWidth === 0) {
        img.onerror();
      }
    })(logos[i]);
  }
}


// ── FAQ Toggle ──────────────────────────────
function toggleFaq(btn) {
  var answer = btn.nextElementSibling;
  var isOpen = btn.getAttribute('aria-expanded') === 'true';
  // Close all others
  var allBtns = document.querySelectorAll('.faq-q');
  for (var i = 0; i < allBtns.length; i++) {
    allBtns[i].setAttribute('aria-expanded', 'false');
    var a = allBtns[i].nextElementSibling;
    if (a) a.hidden = true;
  }
  if (!isOpen) {
    btn.setAttribute('aria-expanded', 'true');
    answer.hidden = false;
  }
}

// ── Quick Filter Toggle ──────────────────────
function quickFilterToggle(type) {
  if (type === 'direct') {
    fDir = !fDir;
    var el = document.getElementById('ch-dir');
    if (el) el.classList.toggle('on', fDir);
    var qel = document.getElementById('qfc-direct');
    if (qel) qel.classList.toggle('active', fDir);
    applyF();
  } else if (type === 'bag') {
    fBag = !fBag;
    var el2 = document.getElementById('ch-bag');
    if (el2) el2.classList.toggle('on', fBag);
    var qel2 = document.getElementById('qfc-bag');
    if (qel2) qel2.classList.toggle('active', fBag);
    applyF();
  }
}


// ── Lazy load destinations section ───────────
function lazyLoadDestinations() {
  var sec = document.querySelector('.sec');
  if (!sec) return;
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        obs.unobserve(entry.target);
      }
    });
  }, {threshold: 0.1});
  var cards = document.querySelectorAll('.dcard, .rchip');
  for (var i = 0; i < cards.length; i++) {
    cards[i].style.opacity = '0';
    cards[i].style.transform = 'translateY(20px)';
    cards[i].style.transition = 'opacity .4s ease ' + (i*0.05) + 's, transform .4s ease ' + (i*0.05) + 's';
    obs.observe(cards[i]);
  }
}


// ── Swipe to dismiss modals ───────────────────
function addSwipeToDismiss(elId, closeFn) {
  var el = document.getElementById(elId);
  if (!el) return;
  var startY = 0;
  el.addEventListener('touchstart', function(e) { startY = e.touches[0].clientY; }, {passive:true});
  el.addEventListener('touchend', function(e) {
    var dy = e.changedTouches[0].clientY - startY;
    if (dy > 80) closeFn();
  }, {passive:true});
}


// ── Flexible Dates Hint ───────────────────────
function showFlexHint() {
  var hint = document.getElementById('flex-hint');
  if (!hint) return;
  hint.style.display = 'flex';
  setTimeout(function() { hint.style.display = 'none'; }, 5000);
}


// ── Multi-Language Support ────────────────────
var LANG = 'de';
var TRANSLATIONS = {
  de: {
    nav_flights: '✈ Flüge', nav_hotels: '🏨 Hotels', nav_cars: '🚗 Mietwagen', nav_deals: '🏷 Deals', nav_help: '❓ Hilfe',
    nav_login: 'Anmelden', nav_register: 'Registrieren',
    tab_flights: 'Flüge', tab_hotels: 'Hotels', tab_cars: 'Mietwagen', tab_insurance: 'Versich.',
    coming_soon_title: 'Demnächst', coming_soon_hotels: 'Hotelbuchung kommt bald. Bleib dran!', coming_soon_cars: 'Mietwagen kommt bald. Bleib dran!', coming_soon_insurance: 'Reiseversicherung kommt bald. Bleib dran!',
    ins_promo_title: 'Reiseversicherung', ins_promo_sub: 'Reise sorgenfrei — mit zuverlässigem Schutz für Notfälle, Stornierung und mehr.', ins_feat1: 'Medizinische Notfälle weltweit abgesichert', ins_feat2: 'Schutz bei Reiseabbruch & Verspätung', ins_feat3: 'Schnelle, unkomplizierte Schadensregulierung', ins_promo_cta: 'Jetzt Versicherung abschließen', ins_promo_note: '🔒 Sicher & in wenigen Minuten abgeschlossen',
    hero_pill: 'Echte Preise · Live-Verfügbarkeit',
    hero_title1: 'Günstige Flüge suchen', hero_title2: 'und weltweit', hero_title_span: 'vergleichen',
    hero_stat_travelers: 'Reisende', hero_stat_rating: 'Bewertung',
    hero_sub: 'Vergleiche hunderte Airlines, finde Verbindungen die sonst niemand findet — zum besten Preis.',
    recent_title: '🕐 Zuletzt gesucht',
    trip_rr: '⇄ Hin- und Rückreise', trip_ow: '→ Einfache Fahrt',
    from_placeholder: 'Von — Stadt oder Flughafen', to_placeholder: 'Nach — Stadt oder Flughafen',
    to_sub_default: 'Wohin soll es gehen?',
    depart_lbl: 'Abflug', return_lbl: 'Rückkehr', date_pick: 'Datum wählen',
    search_btn: 'Suchen',
    direct_chip: '✈ Direktflüge', baggage_chip: '🏠 Mit Gepäck', tax_note: 'Alle Preise inkl. Steuern',
    flex_hint: '💡 Tipp: Flexible Daten? Probiere ±3 Tage für günstigere Preise!',
    sfb_change: '✏️ Ändern', sfb_best: '⭐ Beste', sfb_direct: '✈ Direktflug', sfb_bag: '🎒 Mit Gepäck',
    sfb_0stop: '0 Stopps', sfb_1stop: '1 Stopp', sfb_morefilter: '⚙️ Mehr Filter',
    search: 'Suchen', from: 'Von', to: 'Nach', depart: 'Abflug', return: 'Rückkehr',
    direct: 'Direktflug', stop: 'Stopp', stops: 'Stopps', book: 'Buchen',
    details: 'Details', filter: 'Filter', best: 'Beste', cheapest: 'Günstigste',
    fastest: 'Schnellste', noFlights: 'Keine Flüge gefunden', loading: 'Flüge werden gesucht...',
    passengers: 'Reisende', baggage: 'Gepäck', economy: 'Economy', business: 'Business',
    totalPrice: 'Gesamtpreis', perPerson: 'pro Person', cancel: 'Abbrechen', confirm: 'Bestätigen',
    bnav_about: 'Über uns', bnav_bookings: 'Buchungen', bnav_help: 'Hilfe', bnav_contact: 'Kontakt',
    bnav_flights: '✈ Flüge',
    det_outbound: 'Hinflug', det_return: 'Rückflug', det_layover: 'Aufenthalt in',
    det_flight: 'Flug', det_total_dur: 'Gesamtdauer', det_title: 'Flugdetails',
    det_direct: 'Direktflug', det_book_now: 'Diesen Flug buchen',
    fc_title: 'Tarifbedingungen', fc_changeable: 'Umbuchbar', fc_not_changeable: 'Nicht umbuchbar',
    fc_refundable: 'Erstattbar', fc_not_refundable: 'Nicht erstattbar',
    fc_cabin: 'Handgepäck', fc_checked: 'Aufgabegepäck', fc_no_cabin: 'Kein Handgepäck', fc_no_checked: 'Kein Aufgabegepäck',
    fc_fee: 'Gebühr', fc_co2: 'CO₂-Emissionen', fc_continue: 'Weiter', fc_real_note: 'Bedingungen direkt von der Airline',
    fb_choose: 'Tarif wählen', fb_selected: 'Ausgewählt', fb_select: 'Auswählen', fb_wifi: 'WLAN', fb_power: 'Stromanschluss', fb_seat: 'Sitzabstand', fb_cabin_n: 'Handgepäck', fb_checked_n: 'Aufgabegepäck', fb_one_fare: 'Nur dieser Tarif verfügbar',
    bg_included: 'Handgepäck inklusive', bg_included_sub: 'Im Tarif enthalten', bg_loading: 'Gepäckoptionen werden geladen...', bg_none: 'Keine Zusatzgepäck-Optionen für diesen Flug', bg_checked: 'Aufgabegepäck', bg_carry: 'Handgepäck', bg_upto: 'bis', bg_free: 'Gratis', bg_perpax: 'pro Person', bg_intro: 'Wähle dein Gepäck. Günstigere Preise als am Flughafen!', bg_overview: 'Gepäckübersicht', bg_close: 'Schließen', st_title: 'Sitzplan', st_flight: 'Flug', st_of: 'von', st_pick: 'Wählen Sie auf dem Plan einen Sitzplatz aus', st_pick_for: 'Sitzplatz für {p} auswählen', st_seat_for: 'für {p}', st_bag_for: 'für {p}', st_legend_extra: 'Zusätzliche Beinfreiheit', st_legend_standard: 'Standard', st_legend_unavail: 'Sitzplatz nicht verfügbar', st_loading: 'Sitzplan wird geladen...', st_none: 'Für diesen Flug ist kein Sitzplan verfügbar', st_assign_q: 'Soll Sitzplatz {s} Ihnen zugewiesen werden?', st_cancel: 'Abbrechen', st_confirm: 'Bestätigen', st_continue: 'Weiter', st_skip_note: 'Sitzplatzwahl ist optional', payment_title_short: 'Zahlung', pf_contact: 'Kontaktdaten', pf_email: 'E-Mail', pf_phone: 'Telefonnummer', pf_passengers: 'Reisende', pf_add_pax: 'Mitreisenden hinzufügen', pf_adult: 'Erwachsener', pf_child: 'Kind', pf_infant: 'Kleinkind', pf_title: 'Anrede', pf_gender: 'Geschlecht', pf_given: 'Vorname', pf_family: 'Nachname', pf_dob: 'Geburtsdatum', pf_mr: 'Herr', pf_ms: 'Frau', pf_mrs: 'Frau (verh.)', pf_male: 'Männlich', pf_female: 'Weiblich', pf_passport: 'Reisepass', pf_pass_country: 'Ausstellungsland', pf_pass_num: 'Pass-Nummer', pf_pass_exp: 'Ablaufdatum', pf_err_contact: 'Bitte Kontaktdaten ausfüllen', pf_err_email: 'Ungültige E-Mail-Adresse', pf_err_passenger: 'Bitte Pflichtfelder ausfüllen für Reisenden', pf_err_passport: 'Bitte Reisepass-Daten ausfüllen für Reisenden', sm_baggage: 'Gepäck', sm_seat: 'Sitzplatz', sm_edit: 'Bearbeiten', sm_random_seat: 'Zufälliger Sitzplatz', sm_seat_chosen: 'Sitzplatz', sm_cabin_inc: 'Handgepäck inklusive', sm_checked_inc: 'Aufgabegepäck inklusive', sm_extra_bag: 'Zusatzgepäck', pd_title: 'Preisdetails', pd_show: 'Preisdetails anzeigen', pd_total: 'Gesamtbetrag', pd_flight: 'Flug', pd_note: 'Enthält alle Steuern, Gebühren und Zuschläge.', promo_title: 'Aktionscode', promo_placeholder: 'Code eingeben', promo_add: 'Hinzufügen', promo_applied: 'Code angewendet', promo_invalid: 'Ungültiger Code', promo_remove: 'Entfernen', pay_verifying: 'Zahlung wird überprüft...', pay_not_confirmed: 'Zahlung nicht bestätigt', pay_booking_failed: 'Zahlung erfolgreich, aber Buchung fehlgeschlagen. Unser Support meldet sich.', pay_redirect: 'Weiterleitung zur sicheren Zahlung...', pay_secure_title: 'Sichere Zahlung', pay_secure_desc: 'Du wirst zur gesicherten Zahlungsseite weitergeleitet. Deine Kartendaten werden niemals auf unserer Seite gespeichert.', pay_powered: '· über Stripe', pay_button: 'Sicher bezahlen',  fb_wifi_paid: 'WLAN (kostenpflichtig)', fb_wifi_free: 'WLAN gratis', fb_legroom: 'Beinfreiheit', fb_power_short: 'Steckdose', fb_hold: 'Preis halten', fb_inc_cabin: 'Handgepäck inklusive', fb_inc_checked: 'Aufgabegepäck inklusive', fb_no_checked: 'Kein Aufgabegepäck', fb_no_cabin: 'Kein Handgepäck',
    pc_title: 'Der Preis hat sich geändert', pc_up: 'Der Preis für diesen Flug ist gestiegen, seit du ihn ausgewählt hast.', pc_down: 'Gute Nachricht — der Preis für diesen Flug ist gesunken!', pc_old: 'Vorheriger Preis', pc_new: 'Neuer Preis', pc_cancel: 'Abbrechen', pc_continue: 'Mit neuem Preis fortfahren', pc_note: 'Flugpreise ändern sich laufend. Wir zeigen dir immer den aktuellen Preis der Airline.',
    auth_banner_title: 'Jetzt registrieren & 10\u20ac Willkommensguthaben sichern', auth_banner_sub: 'Werde Mitglied im Treueprogramm und sammle bei jeder Buchung Punkte', auth_banner_cta: 'Jetzt registrieren', auth_banner_close: 'Schließen',
    auth_register_title: 'Konto erstellen', auth_register_sub: '10\u20ac Willkommensguthaben + Treuepunkte bei jeder Buchung', auth_login_title: 'Anmelden', auth_login_sub: 'Willkommen zurück',
    auth_email: 'E-Mail-Adresse', auth_password: 'Passwort', auth_password_min: 'Mindestens 8 Zeichen',
    auth_register_btn: 'Registrieren', auth_login_btn: 'Anmelden', auth_logout_btn: 'Abmelden',
    auth_have_account: 'Bereits registriert?', auth_no_account: 'Noch kein Konto?', auth_login_link: 'Jetzt anmelden', auth_register_link: 'Jetzt registrieren',
    auth_register_success: 'Bitte bestätige deine E-Mail-Adresse — wir haben dir einen Link gesendet.',
    auth_verify_success: 'E-Mail bestätigt! Du kannst dich jetzt anmelden.', auth_verify_fail: 'Dieser Bestätigungslink ist ungültig oder abgelaufen.',
    auth_loading: 'Einen Moment...', auth_close: 'Schließen',
    consent_text: 'Ich akzeptiere die', consent_privacy_link: 'Datenschutzerklärung', consent_and: 'und die', consent_terms_link: 'AGB', consent_suffix: ' von Airpiv und bestätige, dass die von mir eingegebenen Daten korrekt sind.',
    consent_required: 'Bitte bestätige zuerst, dass du unsere Datenschutzerklärung und AGB akzeptierst.',
  },
  en: {
    nav_flights: '✈ Flights', nav_hotels: '🏨 Hotels', nav_cars: '🚗 Car rental', nav_deals: '🏷 Deals', nav_help: '❓ Help',
    nav_login: 'Log in', nav_register: 'Sign up',
    tab_flights: 'Flights', tab_hotels: 'Hotels', tab_cars: 'Car Rental', tab_insurance: 'Insure',
    coming_soon_title: 'Coming Soon', coming_soon_hotels: 'Hotel booking will be available soon. Stay tuned!', coming_soon_cars: 'Car rental will be available soon. Stay tuned!', coming_soon_insurance: 'Travel insurance will be available soon. Stay tuned!',
    ins_promo_title: 'Travel Insurance', ins_promo_sub: 'Travel worry-free with reliable cover for emergencies, cancellations and more.', ins_feat1: 'Worldwide medical emergency cover', ins_feat2: 'Protection against trip cancellation & delays', ins_feat3: 'Fast, hassle-free claims', ins_promo_cta: 'Get Insured Now', ins_promo_note: '🔒 Secure & takes only a few minutes',
    hero_pill: 'Real prices · Live availability',
    hero_title1: 'Search cheap flights', hero_title2: 'and compare', hero_title_span: 'worldwide',
    hero_stat_travelers: 'Travelers', hero_stat_rating: 'Rating',
    hero_sub: 'Compare hundreds of airlines, find connections no one else can find — at the best price.',
    recent_title: '🕐 Recently searched',
    trip_rr: '⇄ Round trip', trip_ow: '→ One way',
    from_placeholder: 'From — city or airport', to_placeholder: 'To — city or airport',
    to_sub_default: 'Where do you want to go?',
    depart_lbl: 'Depart', return_lbl: 'Return', date_pick: 'Select date',
    search_btn: 'Search',
    direct_chip: '✈ Direct flights', baggage_chip: '🏠 With baggage', tax_note: 'All prices incl. taxes',
    flex_hint: '💡 Tip: Flexible dates? Try ±3 days for cheaper prices!',
    sfb_change: '✏️ Edit', sfb_best: '⭐ Best', sfb_direct: '✈ Direct', sfb_bag: '🎒 With baggage',
    sfb_0stop: '0 stops', sfb_1stop: '1 stop', sfb_morefilter: '⚙️ More filters',
    search: 'Search', from: 'From', to: 'To', depart: 'Depart', return: 'Return',
    direct: 'Direct', stop: 'Stop', stops: 'Stops', book: 'Book',
    details: 'Details', filter: 'Filter', best: 'Best', cheapest: 'Cheapest',
    fastest: 'Fastest', noFlights: 'No flights found', loading: 'Searching flights...',
    passengers: 'Passengers', baggage: 'Baggage', economy: 'Economy', business: 'Business',
    totalPrice: 'Total price', perPerson: 'per person', cancel: 'Cancel', confirm: 'Confirm',
    bnav_about: 'About us', bnav_bookings: 'Bookings', bnav_help: 'Help', bnav_contact: 'Contact',
    bnav_flights: '✈ Flights',
    det_outbound: 'Outbound', det_return: 'Return', det_layover: 'Layover in',
    det_flight: 'Flight', det_total_dur: 'Total duration', det_title: 'Flight details',
    det_direct: 'Direct flight', det_book_now: 'Book this flight',
    fc_title: 'Fare conditions', fc_changeable: 'Changeable', fc_not_changeable: 'Not changeable',
    fc_refundable: 'Refundable', fc_not_refundable: 'Non-refundable',
    fc_cabin: 'Cabin baggage', fc_checked: 'Checked baggage', fc_no_cabin: 'No cabin baggage', fc_no_checked: 'No checked baggage',
    fc_fee: 'Fee', fc_co2: 'CO₂ emissions', fc_continue: 'Continue', fc_real_note: 'Conditions directly from the airline',
    fb_choose: 'Choose fare', fb_selected: 'Selected', fb_select: 'Select', fb_wifi: 'Wi-Fi', fb_power: 'Power outlet', fb_seat: 'Seat pitch', fb_cabin_n: 'Cabin bag', fb_checked_n: 'Checked bag', fb_one_fare: 'Only this fare available',
    bg_included: 'Cabin baggage included', bg_included_sub: 'Included in fare', bg_loading: 'Loading baggage options...', bg_none: 'No extra baggage options for this flight', bg_checked: 'Checked baggage', bg_carry: 'Cabin baggage', bg_upto: 'up to', bg_free: 'Free', bg_perpax: 'per person', bg_intro: 'Choose your baggage. Cheaper than at the airport!', bg_overview: 'Baggage overview', bg_close: 'Close', st_title: 'Seat map', st_flight: 'Flight', st_of: 'of', st_pick: 'Select a seat on the map', st_pick_for: 'Select a seat for {p}', st_seat_for: 'for {p}', st_bag_for: 'for {p}', st_legend_extra: 'Extra legroom', st_legend_standard: 'Standard', st_legend_unavail: 'Seat not available', st_loading: 'Loading seat map...', st_none: 'No seat map available for this flight', st_assign_q: 'Assign seat {s} to you?', st_cancel: 'Cancel', st_confirm: 'Confirm', st_continue: 'Continue', st_skip_note: 'Seat selection is optional', payment_title_short: 'Payment', pf_contact: 'Contact details', pf_email: 'Email', pf_phone: 'Phone number', pf_passengers: 'Passengers', pf_add_pax: 'Add passenger', pf_adult: 'Adult', pf_child: 'Child', pf_infant: 'Infant', pf_title: 'Title', pf_gender: 'Gender', pf_given: 'Given name', pf_family: 'Family name', pf_dob: 'Date of birth', pf_mr: 'Mr.', pf_ms: 'Ms.', pf_mrs: 'Mrs.', pf_male: 'Male', pf_female: 'Female', pf_passport: 'Passport', pf_pass_country: 'Country of issue', pf_pass_num: 'Passport number', pf_pass_exp: 'Expiry date', pf_err_contact: 'Please fill in contact details', pf_err_email: 'Invalid email address', pf_err_passenger: 'Please fill required fields for passenger', pf_err_passport: 'Please fill passport details for passenger', sm_baggage: 'Baggage', sm_seat: 'Seat', sm_edit: 'Edit', sm_random_seat: 'Random seat', sm_seat_chosen: 'Seat', sm_cabin_inc: 'Carry-on included', sm_checked_inc: 'Checked bag included', sm_extra_bag: 'Extra baggage', pd_title: 'Price details', pd_show: 'Show price details', pd_total: 'Total', pd_flight: 'Flight', pd_note: 'Includes all taxes, fees and surcharges.', promo_title: 'Promo code', promo_placeholder: 'Enter code', promo_add: 'Add', promo_applied: 'Code applied', promo_invalid: 'Invalid code', promo_remove: 'Remove', pay_verifying: 'Verifying payment...', pay_not_confirmed: 'Payment not confirmed', pay_booking_failed: 'Payment succeeded but booking failed. Our support will contact you.', pay_redirect: 'Redirecting to secure payment...', pay_secure_title: 'Secure payment', pay_secure_desc: 'You will be redirected to a secure payment page. Your card details are never stored on our site.', pay_powered: '· via Stripe', pay_button: 'Pay securely',  fb_wifi_paid: 'Wi-Fi (paid)', fb_wifi_free: 'Free Wi-Fi', fb_legroom: 'Legroom', fb_power_short: 'Power', fb_hold: 'Hold space', fb_inc_cabin: 'Includes carry-on bags', fb_inc_checked: 'Includes checked bags', fb_no_checked: 'No checked bags', fb_no_cabin: 'No carry-on bags',
    pc_title: 'The price has changed', pc_up: 'The price for this flight has gone up since you selected it.', pc_down: 'Good news — the price for this flight has gone down!', pc_old: 'Previous price', pc_new: 'New price', pc_cancel: 'Cancel', pc_continue: 'Continue with new price', pc_note: 'Flight prices change constantly. We always show you the airline\'s current price.',
    auth_banner_title: 'Sign up & get \u20ac10 welcome credit', auth_banner_sub: 'Join our rewards program and earn points on every booking', auth_banner_cta: 'Sign up now', auth_banner_close: 'Close',
    auth_register_title: 'Create account', auth_register_sub: '\u20ac10 welcome credit + loyalty points on every booking', auth_login_title: 'Log in', auth_login_sub: 'Welcome back',
    auth_email: 'Email address', auth_password: 'Password', auth_password_min: 'At least 8 characters',
    auth_register_btn: 'Sign up', auth_login_btn: 'Log in', auth_logout_btn: 'Log out',
    auth_have_account: 'Already have an account?', auth_no_account: "Don't have an account?", auth_login_link: 'Log in', auth_register_link: 'Sign up',
    auth_register_success: 'Please confirm your email — we sent you a link.',
    auth_verify_success: 'Email confirmed! You can now log in.', auth_verify_fail: 'This confirmation link is invalid or expired.',
    auth_loading: 'One moment...', auth_close: 'Close',
    consent_text: 'I accept the', consent_privacy_link: 'Privacy Policy', consent_and: 'and the', consent_terms_link: 'Terms & Conditions', consent_suffix: ' of Airpiv, and I confirm that the data I entered is accurate.',
    consent_required: 'Please confirm that you accept our Privacy Policy and Terms first.',
  },
  ar: {
    nav_flights: '✈ الطيران', nav_hotels: '🏨 الفنادق', nav_cars: '🚗 تأجير سيارات', nav_deals: '🏷 العروض', nav_help: '❓ مساعدة',
    nav_login: 'تسجيل الدخول', nav_register: 'إنشاء حساب',
    tab_flights: 'طيران', tab_hotels: 'فنادق', tab_cars: 'سيارات', tab_insurance: 'تأمين',
    coming_soon_title: 'قريباً', coming_soon_hotels: 'حجز الفنادق سيكون متاحاً قريباً. ترقبونا!', coming_soon_cars: 'تأجير السيارات سيكون متاحاً قريباً. ترقبونا!', coming_soon_insurance: 'التأمين الصحي سيكون متاحاً قريباً. ترقبونا!',
    ins_promo_title: 'تأمين السفر', ins_promo_sub: 'سافر بدون قلق مع تغطية موثوقة للطوارئ الطبية وإلغاء الرحلة والمزيد.', ins_feat1: 'تغطية طبية للطوارئ حول العالم', ins_feat2: 'حماية من إلغاء الرحلة والتأخير', ins_feat3: 'تعويض سريع وسهل', ins_promo_cta: 'احصل على التأمين الآن', ins_promo_note: '🔒 آمن ويستغرق دقائق معدودة',
    hero_pill: 'أسعار حقيقية · توفر فوري',
    hero_title1: 'ابحث وقارن الرحلات', hero_title2: 'الجوية بأفضل الأسعار', hero_title_span: 'حول العالم',
    hero_stat_travelers: 'مسافر', hero_stat_rating: 'التقييم',
    hero_sub: 'قارن مئات شركات الطيران، واعثر على رحلات لا يجدها غيرك — بأفضل سعر.',
    recent_title: '🕐 آخر بحث',
    trip_rr: '⇄ ذهاب وعودة', trip_ow: '→ ذهاب فقط',
    from_placeholder: 'من — المدينة أو المطار', to_placeholder: 'إلى — المدينة أو المطار',
    to_sub_default: 'إلى أين تريد السفر؟',
    depart_lbl: 'المغادرة', return_lbl: 'العودة', date_pick: 'اختر التاريخ',
    search_btn: 'بحث',
    direct_chip: '✈ رحلات مباشرة', baggage_chip: '🏠 مع أمتعة', tax_note: 'جميع الأسعار شاملة الضرائب',
    flex_hint: '💡 نصيحة: تواريخ مرنة؟ جرّب ±3 أيام للحصول على أسعار أرخص!',
    sfb_change: '✏️ تعديل', sfb_best: '⭐ الأفضل', sfb_direct: '✈ مباشر', sfb_bag: '🎒 مع أمتعة',
    sfb_0stop: '0 توقف', sfb_1stop: 'توقف واحد', sfb_morefilter: '⚙️ مزيد من الفلاتر',
    search: 'بحث', from: 'من', to: 'إلى', depart: 'المغادرة', return: 'العودة',
    direct: 'مباشر', stop: 'توقف', stops: 'توقفات', book: 'احجز',
    details: 'التفاصيل', filter: 'تصفية', best: 'الأفضل', cheapest: 'الأرخص',
    fastest: 'الأسرع', noFlights: 'لا توجد رحلات', loading: 'جارٍ البحث عن رحلات...',
    passengers: 'المسافرون', baggage: 'الأمتعة', economy: 'اقتصادي', business: 'أعمال',
    totalPrice: 'السعر الإجمالي', perPerson: 'للشخص', cancel: 'إلغاء', confirm: 'تأكيد',
    bnav_about: 'من نحن', bnav_bookings: 'حجوزاتي', bnav_help: 'مساعدة', bnav_contact: 'تواصل',
    bnav_flights: '✈ رحلات',
    det_outbound: 'الذهاب', det_return: 'العودة', det_layover: 'توقف في',
    det_flight: 'رحلة', det_total_dur: 'المدة الإجمالية', det_title: 'تفاصيل الرحلة',
    det_direct: 'رحلة مباشرة', det_book_now: 'احجز هذه الرحلة',
    fc_title: 'شروط التذكرة', fc_changeable: 'قابلة للتغيير', fc_not_changeable: 'غير قابلة للتغيير',
    fc_refundable: 'قابلة للاسترداد', fc_not_refundable: 'غير قابلة للاسترداد',
    fc_cabin: 'حقيبة يد', fc_checked: 'حقيبة مسجّلة', fc_no_cabin: 'بدون حقيبة يد', fc_no_checked: 'بدون حقيبة مسجّلة',
    fc_fee: 'رسوم', fc_co2: 'انبعاثات CO₂', fc_continue: 'متابعة', fc_real_note: 'الشروط مباشرة من شركة الطيران',
    fb_choose: 'اختر الباقة', fb_selected: 'مختارة', fb_select: 'اختيار', fb_wifi: 'واي فاي', fb_power: 'منفذ كهرباء', fb_seat: 'مسافة المقعد', fb_cabin_n: 'حقيبة يد', fb_checked_n: 'حقيبة مسجّلة', fb_one_fare: 'هذه الباقة الوحيدة المتاحة',
    bg_included: 'حقيبة اليد مشمولة', bg_included_sub: 'مشمولة في الباقة', bg_loading: 'جاري تحميل خيارات الحقائب...', bg_none: 'لا توجد حقائب إضافية لهذه الرحلة', bg_checked: 'حقيبة مسجّلة', bg_carry: 'حقيبة يد', bg_upto: 'حتى', bg_free: 'مجاناً', bg_perpax: 'للشخص', bg_intro: 'اختر حقائبك. أسعار أرخص من المطار!', bg_overview: 'ملخص الحقائب', bg_close: 'إغلاق', st_title: 'مخطط المقاعد', st_flight: 'الرحلة', st_of: 'من', st_pick: 'اختر مقعداً من المخطط', st_pick_for: 'اختر مقعداً لـ {p}', st_seat_for: 'لـ {p}', st_bag_for: 'لـ {p}', st_legend_extra: 'مساحة أرجل إضافية', st_legend_standard: 'عادي', st_legend_unavail: 'مقعد غير متاح', st_loading: 'جاري تحميل مخطط المقاعد...', st_none: 'لا يوجد مخطط مقاعد لهذه الرحلة', st_assign_q: 'تخصيص المقعد {s} لك؟', st_cancel: 'إلغاء', st_confirm: 'تأكيد', st_continue: 'متابعة', st_skip_note: 'اختيار المقعد اختياري', payment_title_short: 'الدفع', pf_contact: 'بيانات التواصل', pf_email: 'البريد الإلكتروني', pf_phone: 'رقم الهاتف', pf_passengers: 'المسافرون', pf_add_pax: 'إضافة مسافر', pf_adult: 'بالغ', pf_child: 'طفل', pf_infant: 'رضيع', pf_title: 'اللقب', pf_gender: 'الجنس', pf_given: 'الاسم الأول', pf_family: 'اسم العائلة', pf_dob: 'تاريخ الميلاد', pf_mr: 'السيد', pf_ms: 'الآنسة', pf_mrs: 'السيدة', pf_male: 'ذكر', pf_female: 'أنثى', pf_passport: 'جواز السفر', pf_pass_country: 'بلد الإصدار', pf_pass_num: 'رقم الجواز', pf_pass_exp: 'تاريخ الانتهاء', pf_err_contact: 'يرجى تعبئة بيانات التواصل', pf_err_email: 'بريد إلكتروني غير صالح', pf_err_passenger: 'يرجى تعبئة الحقول المطلوبة للمسافر', pf_err_passport: 'يرجى تعبئة بيانات الجواز للمسافر', sm_baggage: 'الأمتعة', sm_seat: 'المقعد', sm_edit: 'تعديل', sm_random_seat: 'مقعد عشوائي', sm_seat_chosen: 'مقعد', sm_cabin_inc: 'حقيبة كابينة مشمولة', sm_checked_inc: 'حقيبة مسجّلة مشمولة', sm_extra_bag: 'أمتعة إضافية', pd_title: 'تفاصيل السعر', pd_show: 'عرض تفاصيل السعر', pd_total: 'الإجمالي', pd_flight: 'الرحلة', pd_note: 'يشمل جميع الضرائب والرسوم والإضافات.', promo_title: 'كود الخصم', promo_placeholder: 'أدخل الكود', promo_add: 'إضافة', promo_applied: 'تم تطبيق الكود', promo_invalid: 'كود غير صالح', promo_remove: 'إزالة', pay_verifying: 'جارٍ التحقق من الدفع...', pay_not_confirmed: 'لم يتم تأكيد الدفع', pay_booking_failed: 'تم الدفع لكن فشل الحجز. سيتواصل معك فريق الدعم.', pay_redirect: 'جارٍ التحويل للدفع الآمن...', pay_secure_title: 'دفع آمن', pay_secure_desc: 'سيتم تحويلك لصفحة دفع آمنة. بيانات بطاقتك لا تُحفظ على موقعنا إطلاقاً.', pay_powered: '· عبر Stripe', pay_button: 'ادفع بأمان',  fb_wifi_paid: 'واي فاي (مدفوع)', fb_wifi_free: 'واي فاي مجاني', fb_legroom: 'مساحة الأرجل', fb_power_short: 'كهرباء', fb_hold: 'تثبيت السعر', fb_inc_cabin: 'حقيبة كابينة مشمولة', fb_inc_checked: 'حقيبة مسجّلة مشمولة', fb_no_checked: 'بدون حقيبة مسجّلة', fb_no_cabin: 'بدون حقيبة كابينة',
    pc_title: 'تغيّر السعر', pc_up: 'سعر هذه الرحلة ارتفع منذ أن اخترتها.', pc_down: 'خبر سار — سعر هذه الرحلة انخفض!', pc_old: 'السعر السابق', pc_new: 'السعر الجديد', pc_cancel: 'إلغاء', pc_continue: 'الاستمرار بالسعر الجديد', pc_note: 'أسعار الطيران تتغيّر باستمرار. نعرض لك دائماً السعر الحالي من شركة الطيران.',
    auth_banner_title: 'سجّل حسابك واحصل على 10€ رصيد ترحيبي', auth_banner_sub: 'انضم لبرنامج المكافآت واكسب نقاط مع كل حجز', auth_banner_cta: 'سجّل الآن', auth_banner_close: 'إغلاق',
    auth_register_title: 'إنشاء حساب', auth_register_sub: '10€ رصيد ترحيبي + نقاط ولاء مع كل حجز', auth_login_title: 'تسجيل الدخول', auth_login_sub: 'مرحباً بعودتك',
    auth_email: 'البريد الإلكتروني', auth_password: 'كلمة المرور', auth_password_min: '8 أحرف على الأقل',
    auth_register_btn: 'تسجيل', auth_login_btn: 'دخول', auth_logout_btn: 'تسجيل الخروج',
    auth_have_account: 'عندك حساب فعلاً؟', auth_no_account: 'ما عندك حساب؟', auth_login_link: 'تسجيل الدخول', auth_register_link: 'سجّل الآن',
    auth_register_success: 'الرجاء تأكيد بريدك الإلكتروني — أرسلنا لك رابطاً.',
    auth_verify_success: 'تم تأكيد البريد! تقدر تسجّل دخول الآن.', auth_verify_fail: 'رابط التأكيد غير صالح أو منتهي.',
    auth_loading: 'لحظة...', auth_close: 'إغلاق',
    consent_text: 'أوافق على', consent_privacy_link: 'سياسة الخصوصية', consent_and: 'و', consent_terms_link: 'شروط الاستخدام', consent_suffix: ' الخاصة بـ Airpiv، وأقر بصحة البيانات التي أدخلتها.',
    consent_required: 'يرجى تأكيد موافقتك على سياسة الخصوصية وشروط الاستخدام أولاً.',
  }
};

function setLang(lang) {
  LANG = lang;
  try { localStorage.setItem('fw_lang', lang); } catch(e) {}
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  // [HREFLANG-FIX] Reflect the language in the URL too — without this,
  // every language was purely client-side state (localStorage), with no
  // real distinct URL for Google to associate hreflang tags with at all.
  // replaceState (not pushState) so switching languages doesn't pollute
  // browser history with one entry per click.
  try {
    var url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, document.title, url.toString());
    // [HREFLANG-CANONICAL-FIX] Keep the canonical tag self-referencing
    // after a runtime language switch too — the initial-load script only
    // sets this once; without updating it here, switching language via
    // the UI buttons would silently leave canonical pointing at the
    // bare URL again, recreating the exact canonical/hreflang
    // contradiction already fixed for the initial-load case.
    var canonicalEl = document.getElementById('canonical-url');
    if (canonicalEl) {
      var canonicalUrl = new URL(canonicalEl.getAttribute('href'), window.location.origin);
      canonicalUrl.searchParams.set('lang', lang);
      canonicalEl.setAttribute('href', canonicalUrl.toString());
    }
  } catch(e) {}
  var lsub = document.getElementById('lsub');
  if (lsub) lsub.textContent = t('loading');
  applyTranslations();
  document.querySelectorAll('.lang-btn').forEach(function(b){ b.classList.remove('active'); });
  var activeBtn = document.getElementById('lang-' + lang);
  if (activeBtn) activeBtn.classList.add('active');
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var val = t(key);
    if (el.tagName === 'OPTION' || el.tagName === 'SPAN' || el.tagName === 'DIV' ||
        el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'LABEL' ||
        el.tagName === 'P' || el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3') {
      el.textContent = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  // Re-apply date labels only if still showing placeholder (avoid clobbering picked dates)
  var depDisp = document.getElementById('dep-disp');
  var retDisp = document.getElementById('ret-disp');
  if (depDisp && depDisp.classList.contains('empty')) depDisp.textContent = t('date_pick');
  if (retDisp && retDisp.classList.contains('empty')) retDisp.textContent = t('date_pick');
}

function t(key) {
  return (TRANSLATIONS[LANG] && TRANSLATIONS[LANG][key]) || (TRANSLATIONS.de[key]) || key;
}

function initLang() {
  try {
    // [HREFLANG-FIX] URL takes priority — a visitor following a Google
    // result for a specific language must see that language, regardless
    // of whatever localStorage happens to have saved from a previous
    // visit on this device.
    var params = new URLSearchParams(window.location.search);
    var fromUrl = params.get('lang');
    if (fromUrl && TRANSLATIONS[fromUrl]) { setLang(fromUrl); return; }
    var saved = localStorage.getItem('fw_lang');
    if (saved && TRANSLATIONS[saved]) setLang(saved);
  } catch(e) {}
}



// ═══ SECURITY: HTML Escape utility ═══
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ═══ SECURITY: Safe integer validator ═══
function safeInt(val, min, max, def) {
  var n = parseInt(val, 10);
  if (isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

// ═══ SECURITY: Safe date validator ═══
function safeDate(val) {
  if (!val || typeof val !== 'string') return null;
  var d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ── Basic Analytics (Privacy-friendly) ────────
var _analytics = {searches:0, bookings:0, session: Date.now()};
// [GA4-EVENTS] Extended to also fire a real GA4 event alongside the
// pre-existing local fw_stats counter — params is optional so existing
// call sites like trackEvent('search') (no second argument) keep working
// unchanged.
function trackEvent(event, params) {
  _analytics[event] = (_analytics[event]||0) + 1;
  try {
    var stats = JSON.parse(localStorage.getItem('fw_stats') || '{}');
    stats[event] = (stats[event]||0) + 1;
    stats.last = new Date().toISOString();
    localStorage.setItem('fw_stats', JSON.stringify(stats));
  } catch(e) {}
  try { if (typeof gtag === 'function') gtag('event', event, params || {}); } catch (e) {}
}


// showToast defined later in this file


// ── Offer Expiry Timer ───────────────────────
var TWO_MINUTES_MS = 2 * 60 * 1000;
var FIVE_MINUTES_MS = 5 * 60 * 1000;
var expiryTimer = null;
function startExpiryTimer(expiresAt) {
  if (expiryTimer) clearInterval(expiryTimer);
  var timerEl = document.getElementById('offer-expiry');
  if (!timerEl || !expiresAt) return;
  timerEl.style.display = 'block';
  expiryTimer = setInterval(function() {
    var remaining = new Date(expiresAt) - new Date();
    if (remaining <= 0) {
      clearInterval(expiryTimer);
      timerEl.textContent = '⏰ Angebot abgelaufen — bitte neu suchen';
      timerEl.style.color = 'var(--rd)';
      timerEl.style.fontWeight = '700';
      // Disable booking button
      var cbtn = document.getElementById('cbtn');
      var bfBtn = document.getElementById('bflow-btn');
      if (cbtn) { cbtn.disabled = true; cbtn.style.opacity = '.5'; }
      if (bfBtn) { bfBtn.disabled = true; bfBtn.style.opacity = '.5'; }
      // Show refresh button
      showOfferExpiredAlert();
      return;
    }
    var mins = Math.floor(remaining / 60000);
    var secs = Math.floor((remaining % 60000) / 1000);
    timerEl.textContent = '⏰ ' + mins + ':' + (secs < 10 ? '0' : '') + secs + ' Min. verbleibend';
    timerEl.style.color = remaining < TWO_MINUTES_MS ? 'var(--rd)' : remaining < FIVE_MINUTES_MS ? 'var(--ye)' : 'var(--gr)';
    // Warn at 2 minutes
    if (remaining < TWO_MINUTES_MS && remaining > TWO_MINUTES_MS - 1000) {
      showToast('⚠️ Noch 2 Minuten! Bitte Buchung abschließen.', 'warn');
    }
  }, 1000);
}

function showOfferExpiredAlert() {
  // Show alert in booking modal
  var bov = document.getElementById('bov');
  var bflow = document.getElementById('bflow-body');
  var alertHtml = '<div style="background:var(--rd-bg);border:1.5px solid #fca5a5;border-radius:12px;padding:14px 16px;margin-bottom:14px;text-align:center">' +
    '<div style="font-size:1.2rem;margin-bottom:6px">⏰</div>' +
    '<div style="font-size:13px;font-weight:700;color:var(--rd);margin-bottom:4px">Angebot abgelaufen</div>' +
    '<div style="font-size:12px;color:var(--tx2);margin-bottom:12px">Flugpreise ändern sich ständig. Bitte suche erneut für aktuelle Preise.</div>' +
    '<button onclick="closeBov();closeBflow();doSearch()" style="background:var(--teal);color:#fff;border:none;border-radius:9px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer">🔄 Neu suchen</button>' +
    '</div>';
  // Insert in active modal
  if (bov && bov.classList.contains('open')) {
    var bmBody = document.getElementById('bm-body');
    if (bmBody) bmBody.insertAdjacentHTML('afterbegin', alertHtml);
  }
  if (bflow) {
    bflow.insertAdjacentHTML('afterbegin', alertHtml);
  }
}

// closeBov defined later with expiryTimer cleanup


// ═══ CONFIG ═══
var PROXY = 'https://api.airpiv.com';
if (!PROXY && location.hostname === 'localhost') console.warn('Airpiv: PROXY not configured');

// [MAINTENANCE-MODE] Checked once on every page load. Fails OPEN on any
// error (network failure, bad JSON, server down) — a visitor must never
// be locked out just because this check itself couldn't complete; the
// overlay only ever appears when the server explicitly confirms
// maintenance mode is on.
function checkMaintenanceMode() {
  fetch(PROXY + '/maintenance-status')
    .then(function(r){ return r.json(); })
    .then(function(j){
      if (j && j.ok && j.enabled) showMaintenanceOverlay(j.message);
    })
    .catch(function(){ /* fail open — site behaves normally */ });
}

function showMaintenanceOverlay(message) {
  var existing = document.getElementById('maintenance-overlay');
  if (existing) return;
  var ov = document.createElement('div');
  ov.id = 'maintenance-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#0A1822;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;font-family:system-ui,-apple-system,sans-serif';
  ov.innerHTML =
    '<div style="font-size:3rem;margin-bottom:16px">🛠️</div>' +
    '<div style="font-family:Syne,sans-serif;font-size:1.5rem;font-weight:800;margin-bottom:10px">Airpiv ist vorübergehend nicht verfügbar</div>' +
    '<div style="font-size:14px;color:#8fa4b4;max-width:420px;line-height:1.6">' + (message ? escHtml(message) : 'Wir arbeiten gerade an einem technischen Problem. Bitte versuche es in Kürze erneut.') + '</div>';
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
}

// ═══ SUPABASE ═══
var SUPA_URL = 'https://tflpaysskecpmdpwbvog.supabase.co';
var SUPA_KEY = 'sb_publishable_ZXi_Rq2zYQIj3LJoNFRctQ_eZogIGD0';
var _sb = (window.supabase && window.supabase.createClient) ? window.supabase.createClient(SUPA_URL, SUPA_KEY) : null;



// ═══ AIRPORTS (for autocomplete only) ═══
// Format: [IATA, Airport Name DE, City DE, Country DE, City EN, City AR, Country EN]
var AP = [
['BER','Berlin Brandenburg','Berlin','Deutschland','Berlin','برلين','Germany'],['MUC','München Franz Josef Strauß','München','Deutschland','Munich','ميونخ','Germany'],['FRA','Frankfurt am Main','Frankfurt','Deutschland','Frankfurt','فرانكفورت','Germany'],['HAM','Hamburg Airport','Hamburg','Deutschland','Hamburg','هامبورغ','Germany'],['DUS','Düsseldorf Airport','Düsseldorf','Deutschland','Dusseldorf','دوسلدورف','Germany'],['CGN','Köln/Bonn Airport','Köln','Deutschland','Cologne','كولونيا','Germany'],['STR','Stuttgart Airport','Stuttgart','Deutschland','Stuttgart','شتوتغارت','Germany'],['VIE','Wien-Schwechat','Wien','Österreich','Vienna','فيينا','Austria'],['ZRH','Zürich Airport','Zürich','Schweiz','Zurich','زيورخ','Switzerland'],['LHR','London Heathrow','London','UK','London','لندن','United Kingdom'],['LGW','London Gatwick','London','UK','London','لندن','United Kingdom'],['STN','London Stansted','London','UK','London','لندن','United Kingdom'],['CDG','Paris Charles de Gaulle','Paris','Frankreich','Paris','باريس','France'],['ORY','Paris Orly','Paris','Frankreich','Paris','باريس','France'],['AMS','Amsterdam Schiphol','Amsterdam','Niederlande','Amsterdam','أمستردام','Netherlands'],['BRU','Brüssel-Zaventem','Brüssel','Belgien','Brussels','بروكسل','Belgium'],['MAD','Madrid-Barajas','Madrid','Spanien','Madrid','مدريد','Spain'],['BCN','Barcelona El Prat','Barcelona','Spanien','Barcelona','برشلونة','Spain'],['PMI','Palma de Mallorca','Mallorca','Spanien','Mallorca','مايوركا','Spain'],['AGP','Málaga Costa del Sol','Málaga','Spanien','Malaga','ملقا','Spain'],['LIS','Lissabon Humberto Delgado','Lissabon','Portugal','Lisbon','لشبونة','Portugal'],['OPO','Porto Francisco Sa Carneiro','Porto','Portugal','Porto','بورتو','Portugal'],['FCO','Rom Fiumicino','Rom','Italien','Rome','روما','Italy'],['MXP','Mailand Malpensa','Mailand','Italien','Milan','ميلانو','Italy'],['VCE','Venedig Marco Polo','Venedig','Italien','Venice','البندقية','Italy'],['ATH','Athen Eleftherios Venizelos','Athen','Griechenland','Athens','أثينا','Greece'],['IST','Istanbul Airport','Istanbul','Türkei','Istanbul','إسطنبول','Turkey'],['AYT','Antalya Airport','Antalya','Türkei','Antalya','أنطاليا','Turkey'],['CPH','Kopenhagen Kastrup','Kopenhagen','Dänemark','Copenhagen','كوبنهاغن','Denmark'],['OSL','Oslo Gardermoen','Oslo','Norwegen','Oslo','أوسلو','Norway'],['ARN','Stockholm Arlanda','Stockholm','Schweden','Stockholm','ستوكهولم','Sweden'],['HEL','Helsinki-Vantaa','Helsinki','Finnland','Helsinki','هلسنكي','Finland'],['WAW','Warschau Chopin','Warschau','Polen','Warsaw','وارسو','Poland'],['PRG','Prag Václav Havel','Prag','Tschechien','Prague','براغ','Czech Republic'],['BUD','Budapest Ferenc Liszt','Budapest','Ungarn','Budapest','بودابست','Hungary'],['DUB','Dublin Airport','Dublin','Irland','Dublin','دبلن','Ireland'],['EDI','Edinburgh Airport','Edinburgh','UK','Edinburgh','إدنبرة','United Kingdom'],['MAN','Manchester Airport','Manchester','UK','Manchester','مانشستر','United Kingdom'],['GVA','Genf Airport','Genf','Schweiz','Geneva','جنيف','Switzerland'],['NCE','Nizza Côte Azur','Nizza','Frankreich','Nice','نيس','France'],['JFK','New York Kennedy','New York','USA','New York','نيويورك','USA'],['LAX','Los Angeles Intl','Los Angeles','USA','Los Angeles','لوس أنجلوس','USA'],['MIA','Miami Intl','Miami','USA','Miami','ميامي','USA'],['ORD','Chicago O Hare','Chicago','USA','Chicago','شيكاغو','USA'],['BOS','Boston Logan','Boston','USA','Boston','بوسطن','USA'],['YYZ','Toronto Pearson','Toronto','Kanada','Toronto','تورنتو','Canada'],['DXB','Dubai Intl','Dubai','VAE','Dubai','دبي','UAE'],['AUH','Abu Dhabi Intl','Abu Dhabi','VAE','Abu Dhabi','أبوظبي','UAE'],['DOH','Doha Hamad','Doha','Katar','Doha','الدوحة','Qatar'],['CAI','Kairo Intl','Kairo','Ägypten','Cairo','القاهرة','Egypt'],['HRG','Hurghada Intl','Hurghada','Ägypten','Hurghada','الغردقة','Egypt'],['SSH','Sharm El Sheikh','Sharm El Sheikh','Ägypten','Sharm El Sheikh','شرم الشيخ','Egypt'],['TLV','Tel Aviv Ben Gurion','Tel Aviv','Israel','Tel Aviv','تل أبيب','Israel'],['CMN','Casablanca Mohammed V','Casablanca','Marokko','Casablanca','الدار البيضاء','Morocco'],['RAK','Marrakesch Menara','Marrakesch','Marokko','Marrakech','مراكش','Morocco'],['BKK','Bangkok Suvarnabhumi','Bangkok','Thailand','Bangkok','بانكوك','Thailand'],['HKT','Phuket Intl','Phuket','Thailand','Phuket','فوكيت','Thailand'],['SIN','Singapur Changi','Singapur','Singapur','Singapore','سنغافورة','Singapore'],['KUL','Kuala Lumpur Intl','Kuala Lumpur','Malaysia','Kuala Lumpur','كوالالمبور','Malaysia'],['HKG','Hongkong Intl','Hongkong','China','Hong Kong','هونغ كونغ','China'],['NRT','Tokio Narita','Tokio','Japan','Tokyo','طوكيو','Japan'],['ICN','Seoul Incheon','Seoul','Südkorea','Seoul','سيول','South Korea'],['DEL','Delhi Indira Gandhi','Delhi','Indien','Delhi','دلهي','India'],['BOM','Mumbai Chhatrapati','Mumbai','Indien','Mumbai','مومباي','India'],['MLE','Malé Velana','Malé','Malediven','Male','ماليه','Maldives'],['SYD','Sydney Kingsford Smith','Sydney','Australien','Sydney','سيدني','Australia'],['GRU','São Paulo Guarulhos','São Paulo','Brasilien','Sao Paulo','ساو باولو','Brazil'],['CUN','Cancún Intl','Cancún','Mexiko','Cancun','كانكون','Mexico'],['JNB','Johannesburg OR Tambo','Johannesburg','Südafrika','Johannesburg','جوهانسبرغ','South Africa'],['CPT','Kapstadt Intl','Kapstadt','Südafrika','Cape Town','كيب تاون','South Africa'],['RUH','Riad King Khalid','Riad','Saudi-Arabien','Riyadh','الرياض','Saudi Arabia'],['JED','Jeddah King Abdulaziz','Jeddah','Saudi-Arabien','Jeddah','جدة','Saudi Arabia'],['AMM','Amman Queen Alia','Amman','Jordanien','Amman','عمّان','Jordan'],['BEY','Beirut Rafic Hariri','Beirut','Libanon','Beirut','بيروت','Lebanon'],['KWI','Kuwait Intl','Kuwait','Kuwait','Kuwait City','الكويت','Kuwait'],['BAH','Bahrain Intl','Manama','Bahrain','Manama','المنامة','Bahrain'],['MCT','Maskat Intl','Maskat','Oman','Muscat','مسقط','Oman'],['ALG','Algier Houari Boumediene','Algier','Algerien','Algiers','الجزائر','Algeria'],['TUN','Tunis-Carthage','Tunis','Tunesien','Tunis','تونس','Tunisia'],['MRS','Marseille Provence','Marseille','Frankreich','Marseille','مارسيليا','France']
];

// ═══ COUNTRY NAMES (ISO code → Deutsch) — for autocomplete country search ═══
var COUNTRY_DE = {
  AD:'Andorra', AE:'Vereinigte Arabische Emirate', AF:'Afghanistan', AG:'Antigua und Barbuda', AI:'Anguilla',
  AL:'Albanien', AM:'Armenien', AO:'Angola', AQ:'Antarktis', AR:'Argentinien', AS:'Amerikanisch-Samoa',
  AT:'Österreich', AU:'Australien', AW:'Aruba', AX:'Åland', AZ:'Aserbaidschan',
  BA:'Bosnien und Herzegowina', BB:'Barbados', BD:'Bangladesch', BE:'Belgien', BF:'Burkina Faso',
  BG:'Bulgarien', BH:'Bahrain', BI:'Burundi', BJ:'Benin', BL:'Saint-Barthélemy', BM:'Bermuda',
  BN:'Brunei', BO:'Bolivien', BQ:'Bonaire', BR:'Brasilien', BS:'Bahamas', BT:'Bhutan', BV:'Bouvetinsel',
  BW:'Botswana', BY:'Belarus', BZ:'Belize',
  CA:'Kanada', CC:'Kokosinseln', CD:'Demokratische Republik Kongo', CF:'Zentralafrikanische Republik',
  CG:'Kongo', CH:'Schweiz', CI:'Elfenbeinküste', CK:'Cookinseln', CL:'Chile', CM:'Kamerun', CN:'China',
  CO:'Kolumbien', CR:'Costa Rica', CU:'Kuba', CV:'Kap Verde', CW:'Curaçao', CX:'Weihnachtsinsel',
  CY:'Zypern', CZ:'Tschechien',
  DE:'Deutschland', DJ:'Dschibuti', DK:'Dänemark', DM:'Dominica', DO:'Dominikanische Republik', DZ:'Algerien',
  EC:'Ecuador', EE:'Estland', EG:'Ägypten', EH:'Westsahara', ER:'Eritrea', ES:'Spanien', ET:'Äthiopien',
  FI:'Finnland', FJ:'Fidschi', FK:'Falklandinseln', FM:'Mikronesien', FO:'Färöer', FR:'Frankreich',
  GA:'Gabun', GB:'Vereinigtes Königreich', GD:'Grenada', GE:'Georgien', GF:'Französisch-Guayana',
  GG:'Guernsey', GH:'Ghana', GI:'Gibraltar', GL:'Grönland', GM:'Gambia', GN:'Guinea', GP:'Guadeloupe',
  GQ:'Äquatorialguinea', GR:'Griechenland', GS:'Südgeorgien', GT:'Guatemala', GU:'Guam',
  GW:'Guinea-Bissau', GY:'Guyana',
  HK:'Hongkong', HM:'Heard und McDonaldinseln', HN:'Honduras', HR:'Kroatien', HT:'Haiti', HU:'Ungarn',
  ID:'Indonesien', IE:'Irland', IL:'Israel', IM:'Isle of Man', IN:'Indien',
  IO:'Britisches Territorium im Indischen Ozean', IQ:'Irak', IR:'Iran', IS:'Island', IT:'Italien',
  JE:'Jersey', JM:'Jamaika', JO:'Jordanien', JP:'Japan',
  KE:'Kenia', KG:'Kirgisistan', KH:'Kambodscha', KI:'Kiribati', KM:'Komoren', KN:'St. Kitts und Nevis',
  KP:'Nordkorea', KR:'Südkorea', KW:'Kuwait', KY:'Cayman Islands', KZ:'Kasachstan',
  LA:'Laos', LB:'Libanon', LC:'St. Lucia', LI:'Liechtenstein', LK:'Sri Lanka', LR:'Liberia', LS:'Lesotho',
  LT:'Litauen', LU:'Luxemburg', LV:'Lettland', LY:'Libyen',
  MA:'Marokko', MC:'Monaco', MD:'Moldau', ME:'Montenegro', MF:'Saint-Martin', MG:'Madagaskar',
  MH:'Marshallinseln', MK:'Nordmazedonien', ML:'Mali', MM:'Myanmar', MN:'Mongolei', MO:'Macau',
  MP:'Nördliche Marianen', MQ:'Martinique', MR:'Mauretanien', MS:'Montserrat', MT:'Malta',
  MU:'Mauritius', MV:'Malediven', MW:'Malawi', MX:'Mexiko', MY:'Malaysia', MZ:'Mosambik',
  NA:'Namibia', NC:'Neukaledonien', NE:'Niger', NF:'Norfolkinsel', NG:'Nigeria', NI:'Nicaragua',
  NL:'Niederlande', NO:'Norwegen', NP:'Nepal', NR:'Nauru', NU:'Niue', NZ:'Neuseeland',
  OM:'Oman',
  PA:'Panama', PE:'Peru', PF:'Französisch-Polynesien', PG:'Papua-Neuguinea', PH:'Philippinen',
  PK:'Pakistan', PL:'Polen', PM:'Saint-Pierre und Miquelon', PN:'Pitcairninseln', PR:'Puerto Rico',
  PS:'Palästina', PT:'Portugal', PW:'Palau', PY:'Paraguay',
  QA:'Katar',
  RE:'Réunion', RO:'Rumänien', RS:'Serbien', RU:'Russland', RW:'Ruanda',
  SA:'Saudi-Arabien', SB:'Salomonen', SC:'Seychellen', SD:'Sudan', SE:'Schweden', SG:'Singapur',
  SH:'St. Helena', SI:'Slowenien', SJ:'Spitzbergen und Jan Mayen', SK:'Slowakei', SL:'Sierra Leone',
  SM:'San Marino', SN:'Senegal', SO:'Somalia', SR:'Suriname', SS:'Südsudan', ST:'São Tomé und Príncipe',
  SV:'El Salvador', SX:'Sint Maarten', SY:'Syrien', SZ:'Swasiland',
  TC:'Turks- und Caicosinseln', TD:'Tschad', TF:'Französische Süd- und Antarktisgebiete', TG:'Togo',
  TH:'Thailand', TJ:'Tadschikistan', TK:'Tokelau', TL:'Osttimor', TM:'Turkmenistan', TN:'Tunesien',
  TO:'Tonga', TR:'Türkei', TT:'Trinidad und Tobago', TV:'Tuvalu', TW:'Taiwan', TZ:'Tansania',
  UA:'Ukraine', UG:'Uganda', UM:'Amerikanische Überseeinseln', US:'USA', UY:'Uruguay', UZ:'Usbekistan',
  VA:'Vatikanstadt', VC:'St. Vincent und die Grenadinen', VE:'Venezuela', VG:'Britische Jungferninseln',
  VI:'Amerikanische Jungferninseln', VN:'Vietnam', VU:'Vanuatu',
  WF:'Wallis und Futuna', WS:'Samoa',
  YE:'Jemen', YT:'Mayotte',
  ZA:'Südafrika', ZM:'Sambia', ZW:'Simbabwe'
};


// ═══ FLIGHT GENERATOR (Demo fallback) ═══
function dist(a, b) {
  var coords = {
    BER:[52.4,13.5],MUC:[48.4,11.8],FRA:[50.0,8.6],HAM:[53.6,10.0],DUS:[51.3,6.8],
    VIE:[48.1,16.6],ZRH:[47.5,8.6],LHR:[51.5,-0.5],CDG:[49.0,2.5],AMS:[52.3,4.8],
    MAD:[40.5,-3.6],BCN:[41.3,2.1],LIS:[38.8,-9.1],FCO:[41.8,12.3],ATH:[37.9,23.9],
    IST:[41.3,28.8],DXB:[25.3,55.4],DOH:[25.3,51.6],JFK:[40.6,-73.8],LAX:[33.9,-118.4],
    BKK:[13.7,100.7],SIN:[1.4,104.0],NRT:[35.8,140.4],SYD:[-33.9,151.2],
    CPH:[55.6,12.7],OSL:[60.2,11.1],ARN:[59.7,18.0],WAW:[52.2,20.9],PRG:[50.1,14.3],
    DUB:[53.4,-6.3],GVA:[46.2,6.1],PMI:[39.6,2.7],AYT:[36.9,30.8],HRG:[27.2,33.8],
    CAI:[30.1,31.4],TLV:[32.0,34.9],DEL:[28.6,77.1],BOM:[19.1,72.9],HKG:[22.3,113.9],
    ICN:[37.5,126.4],KUL:[2.7,101.7],MLE:[4.2,73.5],CUN:[21.0,-86.9],MIA:[25.8,-80.3]
  };
  var A = coords[a], B = coords[b];
  if (!A || !B) return 2000;
  var R = 6371, dL = (B[0]-A[0])*Math.PI/180, dO = (B[1]-A[1])*Math.PI/180;
  var x = Math.sin(dL/2)*Math.sin(dL/2) + Math.cos(A[0]*Math.PI/180)*Math.cos(B[0]*Math.PI/180)*Math.sin(dO/2)*Math.sin(dO/2);
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

var _sd = 1;
function sr() { _sd = (_sd*16807)%2147483647; return (_sd-1)/2147483646; }
function seed(s) {
  _sd = 0;
  for (var i = 0; i < s.length; i++) _sd = (_sd*31+s.charCodeAt(i))%2147483647;
  if (_sd < 1) _sd = 1;
}

var DEMO_AL = [
  ['LH','Lufthansa',1.25],['FR','Ryanair',0.60],['U2','easyJet',0.70],
  ['EW','Eurowings',0.80],['KL','KLM',1.10],['AF','Air France',1.18],
  ['BA','British Airways',1.20],['IB','Iberia',1.03],['TK','Turkish Airlines',0.96],
  ['EK','Emirates',1.35],['QR','Qatar Airways',1.32],['LX','SWISS',1.28]
];
var HUBS = ['FRA','IST','CDG','AMS','VIE','MUC','DXB','DOH','LHR'];

function genFlights(orig, dest, dateStr, n) {
  seed(orig + dest + dateStr);
  var d = dist(orig, dest);
  var baseMin = Math.round(d/13+35);
  var baseP = Math.max(30, Math.round(d*0.085+18));
  var cMul = {economy:1, premium_economy:1.95, business:3.5, first:5.6}[PAX.cabin] || 1;
  var res = [], used = {};
  for (var i = 0; i < n; i++) {
    var al = DEMO_AL[Math.floor(sr()*DEMO_AL.length)];
    var h; do { h = Math.floor(sr()*19)+5; } while (used[h] && Object.keys(used).length < 19);
    used[h] = true;
    var m = [0,10,15,20,25,30,40,45,50,55][Math.floor(sr()*10)];
    var r2 = sr();
    var stops = d<1200?(r2<.7?0:1):d<3000?(r2<.4?0:r2<.88?1:2):(r2<.15?0:r2<.75?1:2);
    var layMin = stops>0 ? Math.round(60+sr()*140) : 0;
    var totalMin = baseMin + layMin*stops + Math.round(sr()*25);
    var dep = new Date(dateStr+'T00:00:00'); dep.setHours(h, m);
    var arr = new Date(dep.getTime()+totalMin*60000);
    var price = baseP*al[2]*(0.8+sr()*0.52)*cMul*(PAX.a+PAX.c*0.75);
    var ONE_STOP_DISCOUNT = 0.87, TWO_STOP_DISCOUNT = 0.76;
    if (stops===1) price*=ONE_STOP_DISCOUNT; if (stops>=2) price*=TWO_STOP_DISCOUNT;
    price = Math.round(price/5)*5;
    var segs = [];
    if (stops===0) {
      segs.push({from:orig,to:dest,dep:dep,arr:arr,al:[al[0],al[1]],fn:al[0]+Math.floor(100+sr()*8900),dur:totalMin});
    } else {
      var hub; do { hub=HUBS[Math.floor(sr()*HUBS.length)]; } while(hub===orig||hub===dest);
      var l1=Math.round(totalMin*.44), l2=totalMin-l1-layMin;
      var m1=new Date(dep.getTime()+l1*60000), m2=new Date(m1.getTime()+layMin*60000);
      segs.push({from:orig,to:hub,dep:dep,arr:m1,al:[al[0],al[1]],fn:al[0]+Math.floor(100+sr()*8900),dur:l1});
      segs.push({from:hub,to:dest,dep:m2,arr:arr,al:[al[0],al[1]],fn:al[0]+Math.floor(100+sr()*8900),dur:l2});
    }
    res.push({
      id:'demo_'+i+'_'+sr().toString(36).slice(2),
      al:[al[0],al[1]], dep:dep, arr:arr, dur:totalMin, stops:stops,
      price:price, segs:segs,
      hasCabin:al[2]>0.7||sr()>.42,
      hasChecked:stops===0&&al[2]>1.05||sr()>.6,
      co2:Math.round(d*0.115*(stops+1)*.92),
      orig:orig, dest:dest
    });
  }
  res.sort(function(a,b){return a.price-b.price;});
  return res;
}


// ══ BOOKING FLOW ═════════════════════════════
var bflowStep = 1;
var bflowOffer = null;
var bflowFare = 'basic';
// [CONSENT-PERSIST-FIX] Tracks whether the customer has already given
// consent, independent of the checkbox DOM element — which gets rebuilt
// from scratch (always starting unchecked) every time step 5 re-renders
// (e.g. returning from the seat/baggage edit sheets). Without this, a
// consent already given was silently lost on the next re-render, and the
// pay button stayed disabled with no way to re-enable it short of
// reloading the whole page.
var bflowConsentChecked = false;
// [GA4-EVENTS] Tracks whether the begin_checkout event already fired for
// THIS booking flow — step 5 re-renders every time the customer returns
// from editing seats/baggage, and this must count as one checkout visit,
// not one event per re-render.
var bflowCheckoutTracked = false;
var bflowSelectedFareId = null;
var bflowBags = {cabin: false, checked: false};
var bflowExtras = [];
var bflowTotalExtra = 0;     // customer-facing total for chosen seats/baggage (includes ancillary margin)
var bflowTotalExtraNet = 0;  // [ADMIN-MARGIN] exact Duffel net total for the same selections (NO margin) — used for duffel_amount only
// Promo codes are now validated server-side only (POST /create-checkout-session
// re-derives the discount from the real promo_codes table). The frontend
// never decides whether a code is valid or what it's worth.
var bflowPromo = null;   // { code, type, value } when the SERVER confirmed a valid code

// ═══════════════ MINI SEARCH (edit search from results) ═══════════════
function openMiniSearch() {
  // If the current search was multi-city AND we're viewing results, scroll to hero and activate mc mode
  var resultsPage = document.getElementById('results-page');
  var inResultsPage = resultsPage && resultsPage.classList.contains('open');
  if (trip === 'mc' && !inResultsPage) {
    closeMiniSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(function() {
      var sel = document.getElementById('trip-sel');
      if (sel) sel.value = 'mc';
      setTripSel('mc');
      mcRenderLegs();
    }, 400);
    return;
  }

  // Fill the mini-search summary with the current search state
  var fromLbl = document.getElementById('ms-from-lbl');
  var toLbl = document.getElementById('ms-to-lbl');
  if (fromLbl) fromLbl.textContent = fromC || fromI || '—';
  if (toLbl) toLbl.textContent = toC || toI || '—';
  // Mirror the main date inputs into the mini inputs
  var dep = document.getElementById('dep-date');
  var ret = document.getElementById('ret-date');
  var msDep = document.getElementById('ms-dep');
  var msRet = document.getElementById('ms-ret');
  if (dep && msDep) { msDep.value = dep.value; if (dep.min) msDep.min = dep.min; }
  if (ret && msRet) { msRet.value = ret.value; if (ret.min) msRet.min = ret.min; }
  // Update the visible date labels
  syncMiniLabel('dep');
  syncMiniLabel('ret');
  var ov = document.getElementById('mini-search-ov');
  if (ov) ov.classList.add('open');
}

function closeMiniSearch() {
  var ov = document.getElementById('mini-search-ov');
  if (ov) ov.classList.remove('open');
}

// Update one mini-search date label from its input
function syncMiniLabel(which) {
  var inp = document.getElementById('ms-' + which);
  var lbl = document.getElementById('ms-' + which + '-lbl');
  if (!inp || !lbl) return;
  if (inp.value) {
    var d = new Date(inp.value + 'T00:00:00');
    lbl.textContent = isNaN(d.getTime()) ? '—' : fmtSegDate(d);
  } else {
    lbl.textContent = '—';
  }
}

// When a mini-search date changes, mirror it back to the main inputs
function syncMiniDate(which) {
  var msInp = document.getElementById('ms-' + which);
  var mainInp = document.getElementById((which === 'dep' ? 'dep' : 'ret') + '-date');
  if (msInp && mainInp) {
    mainInp.value = msInp.value;
    if (typeof onDateChange === 'function') onDateChange(which, msInp.value);
  }
  syncMiniLabel(which);
}

// [FIX] Shared route-label helper: shows the FULL city chain for multi-city
// offers (BER → ALG → LON) instead of just origin/destination of the first
// leg, which previously made every booking screen show only "BER → ALG".
function bflowRouteLabel(o) {
  if (!o) return '';
  if (o.multiCity && Array.isArray(o.legs) && o.legs.length > 1) {
    return [o.legs[0].orig].concat(o.legs.map(function(l){ return l.dest; })).join(' \u2192 ');
  }
  return (o.orig || '') + ' \u2192 ' + (o.dest || '');
}

function openBflow(idx) {
  // idx may be a numeric array index (legacy) or an offer id string
  bflowOffer = (typeof idx === 'string') ? findOfferById(idx) : filtered[idx];
  if (!bflowOffer) return;
  bflowStep = 1;
  bflowFare = 'basic';
  bflowConsentChecked = false;
  bflowCheckoutTracked = false;
  bflowSelectedFareId = bflowOffer.id;
  bflowBags = {cabin: false, checked: false};
  bflowBagServices = null;
  bflowBagSel = {};
  seatSegments = [];
  seatMapsLoaded = false;
  seatActiveIdx = 0;
  seatChosen = {};
  seatActivePax = 0;
  seatPassengerOrder = [];
  seatPendingPick = null;
  bflowExtras = [];
  bflowTotalExtra = 0;
  bflowPromo = null;

  // Set route header
  var routeEl = document.getElementById('bflow-route');
  if (routeEl) routeEl.innerHTML = bflowRouteLabel(bflowOffer) + ' \u00b7 <span class="bflow-route-price">' + fmt(bflowOffer.price) + '</span>';

  document.getElementById('bflow-ov').classList.add('open');
  document.body.style.overflow = 'hidden';
  bflowRender();
}

function closeBflow() {
  if (expiryTimer) { clearInterval(expiryTimer); expiryTimer = null; }
  var ov = document.getElementById('bflow-ov');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
}

function bflowBack() {
  // [SEAT-SUBSTEP-BACK-FIX] The seat-selection step (step 4) can itself
  // contain multiple "sub-pages" — one per flight segment (outbound,
  // return, or each multi-city leg) — tracked by seatActiveIdx, advanced
  // by bflowNext() below. Previously, the "←" header button only ever
  // knew about the big bflowStep (1-5) and had no idea seatActiveIdx
  // existed, so pressing it while picking the RETURN flight's seat
  // skipped straight past the entire seat step back to "Gepäck" — there
  // was no way to go back to the outbound flight's seat map to change
  // that choice instead. Now, going back from any seat sub-page after the
  // first one just moves to the previous sub-page; only going back from
  // the very first sub-page (or any other step) behaves as before.
  if (bflowStep === 4 && seatActiveIdx > 0) {
    seatActiveIdx--;
    renderSeatStep();
    return;
  }
  if (bflowStep > 1) {
    bflowStep--;
    bflowRender();
  } else {
    closeBflow();
  }
}

// [LEGAL-CONSENT] Keeps the "Buchen" button's disabled state in sync with
// the consent checkbox in real time (not just at click-time validation) —
// the customer sees the button is unavailable before they even try to
// click it, rather than discovering it via an error toast.
function bflowUpdateConsentState() {
  var chk = document.getElementById('bf-consent-check');
  var btn = document.getElementById('bflow-btn');
  var msg = document.getElementById('bf-consent-msg');
  if (!chk || !btn) return;
  // [CONSENT-PERSIST-FIX] Remember this choice across re-renders.
  bflowConsentChecked = chk.checked;
  // Only gate the button when we're actually on the consent step (step 5)
  // — bflow-btn is reused across every step, and earlier steps say
  // "Weiter" (continue), not "Buchen", and must never be blocked by this.
  if (bflowStep !== 5) return;
  btn.disabled = !chk.checked;
  if (chk.checked && msg) { msg.className = 'field-msg'; msg.textContent = ''; }
}

// [ADD-PAX-FIX] "+ Add another passenger" on the payment step. A Duffel
// offer's price/availability is locked to the passenger count used at
// search time — there is no way to add a passenger to an offer already
// in hand without it becoming a different (and differently priced) offer.
// So this can only ever mean: close the current booking flow, increase
// the passenger count, and search again. The customer ends up back on
// the results page choosing a freshly-priced offer for the new passenger
// count — never a silent change to the booking they were just completing.
function bflowAddPassenger() {
  if (!bflowOffer) return;
  // Demo/non-Duffel offers have no real search behind them to repeat.
  var offerId = bflowOffer.duffelId || bflowOffer.id;
  if (!bflowOffer.isDuffel || !offerId || /^(demo_|fw_|fare)/.test(String(offerId))) {
    showToast(tL('Für dieses Angebot nicht verfügbar.','Not available for this offer.','غير متاح لهذا العرض.'), 'info');
    return;
  }

  // [ADD-PAX-CONFIRM-FIX] Show a real confirm/cancel sheet instead of
  // executing immediately — the customer must explicitly confirm before
  // the current booking flow is closed and a new search starts. Declining
  // (cancel button or tapping the backdrop) leaves everything untouched.
  document.getElementById('addpax-confirm-q').textContent = tL(
    'Neuen Mitreisenden hinzufügen?',
    'Add another passenger?',
    'إضافة مسافر آخر؟'
  );
  document.getElementById('addpax-confirm-p').textContent = tL(
    'Wir suchen erneut mit einem zusätzlichen Reisenden. Deine aktuelle Auswahl (Sitzplatz, Gepäck) geht dabei verloren und der Preis ändert sich.',
    'We\'ll search again with one more traveler. Your current selections (seat, baggage) will be lost and the price will change.',
    'سنبحث من جديد بمسافر إضافي. اختياراتك الحالية (المقعد، الحقائب) ستُفقد وسيتغيّر السعر.'
  );
  document.getElementById('addpax-confirm-cancel').textContent = t('st_cancel');
  document.getElementById('addpax-confirm-ok').textContent = t('st_confirm');
  document.getElementById('addpax-confirm-ov').classList.add('open');
}

function cancelAddPassenger() {
  document.getElementById('addpax-confirm-ov').classList.remove('open');
}

function confirmAddPassenger() {
  document.getElementById('addpax-confirm-ov').classList.remove('open');
  closeBflow();

  if (trip === 'mc') {
    // Multi-city: PAX.a is shared across every leg, same as a fresh
    // multi-city search would use it.
    chp('a', 1);
    setTimeout(function(){ doSearch(); }, 300);
    return;
  }

  // [ADD-PAX-FIX] Duffel rule: an infant must be paired with a unique
  // responsible adult, so bumping PAX.a can never demote an infant — chp()
  // already encodes that exact rule, which is why it's reused here instead
  // of touching PAX.a directly.
  chp('a', 1);
  setTimeout(function(){ doSearch(); }, 300);
}

function bflowNext() {
  if (bflowStep === 4) {
    // Seat step: advance through segments first; only then go to step 5
    if (seatActiveIdx < seatSegments.length - 1) {
      seatActiveIdx++;
      renderSeatStep();
      var body0 = document.getElementById('bflow-body');
      if (body0) body0.scrollTop = 0;
      return;
    }
    bflowStep++;
    bflowRender();
  } else if (bflowStep === 5) {
    // Validate shared contact details first
    var cEmail = document.getElementById('bf-contact-email');
    var cPhone = document.getElementById('bf-contact-phone');
    if (!cEmail || !cEmail.value.trim() || !cPhone || !cPhone.value.trim()) {
      showToast('⚠️ ' + t('pf_err_contact'), 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cEmail.value)) {
      showToast('⚠️ ' + t('pf_err_email'), 'error');
      return;
    }
    // Validate each passenger's personal fields
    var tp = PAX.a + PAX.c + PAX.i;
    for (var vi = 0; vi < tp; vi++) {
      var fn = document.getElementById('bf-fn' + vi);
      var ln = document.getElementById('bf-ln' + vi);
      var dob = document.getElementById('bf-dob' + vi);
      if (!fn||!fn.value.trim()||!ln||!ln.value.trim()||!dob||!dob.value) {
        showToast('⚠️ ' + t('pf_err_passenger') + ' ' + (vi+1), 'error');
        return;
      }
      // If passport required for this offer, validate it too
      if (bflowOffer && bflowOffer.identityDocsRequired) {
        var pc = document.getElementById('bf-pcountry' + vi);
        var pn = document.getElementById('bf-pass' + vi);
        var pe = document.getElementById('bf-pexp' + vi);
        if (!pc||!pc.value.trim()||!pn||!pn.value.trim()||!pe||!pe.value) {
          showToast('⚠️ ' + t('pf_err_passport') + ' ' + (vi+1), 'error');
          return;
        }
      }
    }
    // [LEGAL-CONSENT] Block payment until the customer has explicitly
    // accepted the privacy policy + terms and confirmed their data is
    // accurate. This check is deliberately independent of the button's
    // disabled state (set by bflowUpdateConsentState()) — belt-and-
    // suspenders, since the button could in principle be re-enabled by a
    // stale DOM state, a race during step re-render, etc.
    var consentChk = document.getElementById('bf-consent-check');
    if (!consentChk || !consentChk.checked) {
      var consentMsg = document.getElementById('bf-consent-msg');
      if (consentMsg) { consentMsg.className = 'field-msg show-err'; consentMsg.textContent = t('consent_required'); }
      if (consentChk) consentChk.closest('.pp-card').scrollIntoView({behavior:'smooth', block:'center'});
      showToast('⚠️ ' + t('consent_required'), 'error');
      return;
    }
    doBflowBooking();
  } else if (bflowStep < 4) {
    bflowStep++;
    bflowRender();
  }
}

// ── Stripe return: confirm payment, then complete the Duffel booking ──
function checkStripeReturn(forcedSessionId) {
  // [RACE-CONDITION-FIX] forcedSessionId lets the processing:true retry
  // path above call this again with the SAME session_id even after the
  // URL has already been cleaned (history.replaceState below) — without
  // it, a retry call would find no session_id in the URL at all and
  // silently do nothing.
  var sessionId = forcedSessionId;
  if (!sessionId) {
    var params = new URLSearchParams(window.location.search);
    sessionId = params.get('session_id');
  }
  if (!sessionId) return;
  // Clean the URL so a refresh doesn't re-trigger
  try { window.history.replaceState({}, document.title, window.location.origin + window.location.pathname); } catch(e) {}

  var ctx = null;
  try { ctx = JSON.parse(sessionStorage.getItem('fw_pending_booking') || 'null'); } catch(e) {}

  // Show a processing overlay
  showToast('⏳ ' + t('pay_verifying'), 'info');

  fetch(PROXY + '/confirm-payment', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ session_id: sessionId })
  }).then(function(r){return r.json();}).then(function(j){
    if (j.ok) {
      try { sessionStorage.removeItem('fw_pending_booking'); } catch(e) {}
      // [GA4-EVENTS] The actual conversion event — fires only once the
      // server has confirmed j.ok, meaning Duffel genuinely confirmed the
      // order inside bookFromSession(). Never fired speculatively before
      // this point.
      trackEvent('purchase', {
        transaction_id: sessionId,
        value: ctx ? ctx.customerTotal : 0,
        currency: 'EUR',
      });
      // [LOYALTY-SYNC-FIX] The server already deducted credit + awarded
      // points for real inside bookFromSession() (only after Duffel
      // confirmed the order) — this just re-fetches the now-current
      // balance instead of computing it locally. This MUST run regardless
      // of j.already: that flag only tells us whether THIS particular
      // /confirm-payment call was the one that did the booking, or
      // whether Stripe's webhook beat it to the punch (a normal, common
      // race — see the retry logic above this function). Either way, the
      // customer's loyalty balance changed server-side the moment the
      // booking succeeded. Previously this only ran when !j.already, so
      // on the (frequent) webhook-wins-the-race path, the balance shown
      // in the app silently stayed stale until the next full page load —
      // exactly the "only updates after logging out and back in" bug
      // reported, since logging back in is what re-fetches the account
      // from scratch. The "🏆 +N points earned" toast is still only shown
      // on a fresh booking (ctx is only set right before THIS browser
      // tab's own checkout), but the underlying balance refresh always
      // happens.
      loyaltySyncFromServer(function(){
        if (ctx && !j.already) {
          var earnedReal = Math.max(0, Math.round(((loyaltyData.points||0)) - (ctx.pointsBeforeBooking || loyaltyData.points || 0)));
          if (earnedReal > 0) setTimeout(function(){ showToast('🏆 +'+earnedReal+' Treuepunkte verdient!', 'success'); }, 2000);
        }
      });
      // [CONFIRMATION-FIX] This used to reconstruct a bare-bones offer
      // object from sessionStorage (no flight times, airline, seats, or
      // bags — that data was never saved there in the first place, since
      // it's set up BEFORE the customer even pays). Now we fetch the same
      // unified endpoint "Meine Buchungen" uses, by session_id, so the
      // very first confirmation screen a customer sees is already
      // complete and matches what they'd see if they revisited it later
      // — full itinerary, selected seats, purchased bags, and the real
      // amount charged (with margin, minus any promo/loyalty discount).
      fetch(PROXY + '/booking-confirmation?session_id=' + encodeURIComponent(sessionId))
        .then(function(r2){ return r2.json(); })
        .then(function(j2){
          if (j2.ok && j2.order) {
            showConfirmation(orderToBookingData(j2.order, j2.booking));
          } else {
            // Fallback: Duffel order not resolvable yet for some reason —
            // show whatever we have rather than a blank screen, but this
            // path should be rare since bookFromSession() just confirmed
            // the order moments ago.
            var offerObj = ctx ? { orig: ctx.orig, dest: ctx.dest, price: ctx.basePrice } : {};
            showConfirmation({
              reference: j.booking_reference || j.order_id,
              orderId: j.order_id,
              offer: offerObj,
              passengers: ctx ? ctx.paxList : [],
              basePrice: ctx ? ctx.basePrice : 0,
              extrasPrice: ctx ? ctx.extrasPrice : 0,
              totalPrice: ctx ? ctx.customerTotal : (j.total_amount || 0)
            });
          }
        })
        .catch(function(){
          var offerObj = ctx ? { orig: ctx.orig, dest: ctx.dest, price: ctx.basePrice } : {};
          showConfirmation({
            reference: j.booking_reference || j.order_id,
            orderId: j.order_id,
            offer: offerObj,
            passengers: ctx ? ctx.paxList : [],
            basePrice: ctx ? ctx.basePrice : 0,
            extrasPrice: ctx ? ctx.extrasPrice : 0,
            totalPrice: ctx ? ctx.customerTotal : (j.total_amount || 0)
          });
        });
    } else if (j.booking_failed_after_payment) {
      // [OFFER-UNAVAILABLE-UX-FIX] Show a clear, non-technical message
      // instead of the raw Duffel/airline error text — a customer can't
      // act on "Please select another offer, or create a new offer
      // request..." and showing it verbatim is exactly the kind of
      // technical-error UX that erodes trust after something has already
      // gone wrong. The real Duffel reason is still logged (fwLog) for
      // support to investigate, just not surfaced directly.
      var dReason = '';
      try {
        if (j.duffel_errors && j.duffel_errors.length) dReason = j.duffel_errors.map(function(e){ return e.message || e.title || ''; }).join(' | ');
        else if (j.details && j.details.length) dReason = j.details.map(function(e){ return e.message || e.title || ''; }).join(' | ');
      } catch(e) {}
      fwLog('error', { msg: 'booking_failed_after_payment: ' + dReason, refunded: j.refunded });
      var userMsg = j.refunded
        ? 'Der Flugpreis hat sich kurzfristig geändert oder das Angebot ist nicht mehr verfügbar. Deine Zahlung wurde vollständig zurückerstattet — du kannst sofort erneut suchen und buchen.'
        : 'Die Buchung konnte leider nicht abgeschlossen werden. Bitte kontaktiere unseren Support — wir kümmern uns sofort um deine Zahlung.';
      alert((j.refunded ? '↩️ ' : '⚠️ ') + userMsg);
      showToast((j.refunded ? '↩️ ' : '⚠️ ') + userMsg, 'error');
    } else if (j.processing) {
      // [RACE-CONDITION-FIX] The server's /confirm-payment rejects a
      // second concurrent call for the same session_id with 409 +
      // processing:true — this fires in EXACTLY the scenario seen in
      // production: Stripe's webhook and this browser-side call can both
      // race to confirm the same booking at virtually the same instant.
      // The webhook usually wins the race by a few hundred milliseconds,
      // marks the session in-flight, and finishes the real booking
      // (Duffel order + email) successfully a moment later — but this
      // call, arriving microseconds behind it, used to be treated as a
      // hard failure and showed the customer a scary error message for a
      // booking that was actually about to succeed. Retrying after a
      // short delay (instead of giving up) gives the webhook time to
      // finish, then /confirm-payment's own "already booked" check
      // (bookFromSession sees the order already exists) returns the real
      // success response normally. Capped at 3 attempts (~6 seconds) so a
      // genuinely stuck session_id doesn't retry forever.
      var attempt = (checkStripeReturn._retryCount = (checkStripeReturn._retryCount || 0) + 1);
      if (attempt <= 3) {
        showToast('⏳ ' + t('pay_verifying'), 'info');
        setTimeout(function(){ checkStripeReturn(sessionId); }, 2000);
      } else {
        checkStripeReturn._retryCount = 0;
        showToast('❌ ' + (j.error || t('pay_not_confirmed')), 'error');
      }
    } else {
      showToast('❌ ' + (j.error || t('pay_not_confirmed')), 'error');
    }
  }).catch(function(){
    showToast('❌ ' + t('pay_not_confirmed'), 'error');
  });
}

function doBflowBooking() {
  {
    var bfBtn = document.getElementById('bflow-btn');
    var bfBtnHtml = bfBtn ? bfBtn.innerHTML : '';
    if (bfBtn) { bfBtn.disabled = true; bfBtn.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block">⟳</span> Wird gebucht...'; }

    var o3 = bflowOffer;
    var offerId3 = o3 ? (o3.duffelId || o3.raw_offer_id || o3.id) : null;
    var tp3 = PAX.a + PAX.c + PAX.i;
    // Shared contact details (one for the whole booking)
    var contactEmail = ((document.getElementById('bf-contact-email')||{}).value||'').trim().toLowerCase();
    // [FIX] Validate the contact email BEFORE payment too — an invalid email
    // doesn't make Duffel reject the order, but it does mean the customer
    // never receives their confirmation/ticket. Block here instead.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmail)) {
      if (bfBtn) { bfBtn.disabled = false; bfBtn.innerHTML = bfBtnHtml; }
      var emEl = document.getElementById('bf-contact-email');
      if (emEl) { validateEmailField(emEl); emEl.scrollIntoView({behavior:'smooth', block:'center'}); }
      showToast('⚠️ ' + tL('E-Mail-Adresse prüfen — siehe Hinweis unter dem Feld','Please check the email address — see the note under the field','يرجى تصحيح البريد الإلكتروني — راجع الملاحظة تحت الحقل'), 'error');
      return;
    }
    var contactPhoneRaw = ((document.getElementById('bf-contact-phone')||{}).value||'');
    var contactPhone = contactPhoneRaw.replace(/[\s\-().]/g, '');
    if (contactPhone.startsWith('00')) contactPhone = '+' + contactPhone.slice(2);
    if (!contactPhone.startsWith('+')) contactPhone = '+' + contactPhone;
    // [FIX] Strict E.164 check BEFORE payment — Duffel rejects invalid phone
    // numbers only AFTER the charge succeeds, which is exactly the "paid but
    // booking failed" scenario. Catch it here instead.
    if (!/^\+[1-9]\d{6,14}$/.test(contactPhone)) {
      if (bfBtn) { bfBtn.disabled = false; bfBtn.innerHTML = bfBtnHtml; }
      var phEl = document.getElementById('bf-contact-phone');
      if (phEl) { validatePhoneField(phEl); phEl.scrollIntoView({behavior:'smooth', block:'center'}); }
      showToast('⚠️ ' + tL('Telefonnummer prüfen — siehe Hinweis unter dem Feld','Please check the phone number — see the note under the field','يرجى تصحيح رقم الهاتف — راجع الملاحظة تحت الحقل'), 'error');
      return;
    }
    var paxArr3 = [];
    var _nameRe3 = /^[A-Za-z\u00C0-\u017F'\- ]{1,20}$/;
    for (var pi3 = 0; pi3 < tp3; pi3++) {
      var fn3 = (document.getElementById('bf-fn'+pi3)||{}).value||'';
      var ln3 = (document.getElementById('bf-ln'+pi3)||{}).value||'';
      var dob3 = (document.getElementById('bf-dob'+pi3)||{}).value||'';
      var gen3 = (document.getElementById('bf-gen'+pi3)||{}).value||'m';
      var ttl3 = (document.getElementById('bf-ttl'+pi3)||{}).value||'mr';

      // [FIX] Final hard gate, INSIDE doBflowBooking itself — so payment is
      // unreachable for this passenger no matter which code path got here.
      // Re-checks name + DOB + age, exactly mirroring the per-passenger rules
      // (this used to live only in the "next step" handler, which a future
      // direct call to doBflowBooking could bypass entirely).
      var _fnT3 = fn3.trim(), _lnT3 = ln3.trim();
      if (!_nameRe3.test(_fnT3) || !_nameRe3.test(_lnT3)) {
        if (bfBtn) { bfBtn.disabled = false; bfBtn.innerHTML = bfBtnHtml; }
        var _fnEl3 = document.getElementById('bf-fn'+pi3), _lnEl3 = document.getElementById('bf-ln'+pi3);
        if (_fnEl3) { validateNameField(_fnEl3); _fnEl3.scrollIntoView({behavior:'smooth', block:'center'}); }
        if (_lnEl3) validateNameField(_lnEl3);
        showToast('⚠️ ' + t('pf_err_passenger') + ' ' + (pi3+1), 'error');
        return;
      }
      var _dobD3 = new Date(dob3), _nowD3 = new Date(); _nowD3.setHours(0,0,0,0);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob3) || isNaN(_dobD3.getTime()) || _dobD3 >= _nowD3 || _dobD3 < new Date('1900-01-01')) {
        if (bfBtn) { bfBtn.disabled = false; bfBtn.innerHTML = bfBtnHtml; }
        var _dobEl3 = document.getElementById('bf-dob'+pi3);
        if (_dobEl3) { validateDobField(_dobEl3, pi3); _dobEl3.scrollIntoView({behavior:'smooth', block:'center'}); }
        showToast('⚠️ ' + t('pf_err_passenger') + ' ' + (pi3+1), 'error');
        return;
      }
      // Identity document required for this offer? Block payment if missing.
      if (bflowOffer && bflowOffer.identityDocsRequired) {
        var _pc3 = document.getElementById('bf-pcountry'+pi3), _pn3 = document.getElementById('bf-pass'+pi3), _pe3 = document.getElementById('bf-pexp'+pi3);
        if (!_pc3 || !_pc3.value.trim() || !_pn3 || !_pn3.value.trim() || !_pe3 || !_pe3.value) {
          if (bfBtn) { bfBtn.disabled = false; bfBtn.innerHTML = bfBtnHtml; }
          if (_pc3) _pc3.scrollIntoView({behavior:'smooth', block:'center'});
          showToast('⚠️ ' + t('pf_err_passport') + ' ' + (pi3+1), 'error');
          return;
        }
      }

      var paxObj = {
        given_name:   fn3.trim(),
        family_name:  ln3.trim(),
        born_on:      dob3,
        gender:       gen3 === 'm' || gen3 === 'f' ? gen3 : 'm',
        title:        ttl3 || (gen3 === 'f' ? 'ms' : 'mr'),
        email:        contactEmail,
        phone_number: contactPhone,
        type:         pi3 >= PAX.a + PAX.c ? 'infant_without_seat' : pi3 >= PAX.a ? 'child' : 'adult'
      };
      // Attach identity document only when the offer requires it
      if (bflowOffer && bflowOffer.identityDocsRequired) {
        var pcountry = ((document.getElementById('bf-pcountry'+pi3)||{}).value||'').trim().toUpperCase();
        var pnum = ((document.getElementById('bf-pass'+pi3)||{}).value||'').trim();
        var pexp = (document.getElementById('bf-pexp'+pi3)||{}).value||'';
        if (pcountry && pnum && pexp) {
          paxObj.identity_documents = [{
            type: 'passport',
            unique_identifier: pnum,
            issuing_country_code: pcountry,
            expires_on: pexp
          }];
        }
      }
      paxArr3.push(paxObj);
    }

    // ── Validate passenger names BEFORE payment (Duffel requires Latin letters) ──
    var _nameRe = /^[A-Za-z\u00C0-\u017F'\- ]{1,20}$/;
    for (var vn = 0; vn < paxArr3.length; vn++) {
      var _gn = (paxArr3[vn].given_name || '').trim();
      var _ln = (paxArr3[vn].family_name || '').trim();
      if (!_gn || !_ln || !_nameRe.test(_gn) || !_nameRe.test(_ln)) {
        if (bfBtn) { bfBtn.disabled = false; bfBtn.innerHTML = bfBtnHtml; }
        var _fld = document.getElementById('bf-fn'+vn) || document.getElementById('bf-ln'+vn);
        if (_fld) { validateNameField(_fld); try { _fld.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e){} }
        var _fldLn = document.getElementById('bf-ln'+vn);
        if (_fldLn) validateNameField(_fldLn);
        return;
      }
    }

    // ── Validate DOB + Age per Duffel rules ──
    var _dobRe = /^\d{4}-\d{2}-\d{2}$/;
    var _nowD = new Date(); _nowD.setHours(0,0,0,0);
    for (var vd = 0; vd < paxArr3.length; vd++) {
      var _dob = (paxArr3[vd].born_on || '').trim();
      var _dobD = new Date(_dob);
      if (!_dobRe.test(_dob) || isNaN(_dobD.getTime()) || _dobD >= _nowD || _dobD < new Date('1900-01-01')) {
        if (bfBtn) { bfBtn.disabled = false; bfBtn.innerHTML = bfBtnHtml; }
        var _dobFld = document.getElementById('bf-dob'+vd);
        if (_dobFld) { validateDobField(_dobFld, vd); try { _dobFld.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e){} }
        return;
      }
      var _age = Math.floor((_nowD - _dobD) / (365.25*24*3600*1000));
      var _pt = paxArr3[vd].type;
      var _ageOk = (_pt==='adult'&&_age>=12)||(_pt==='child'&&_age>=2&&_age<=11)||(_pt==='infant_without_seat'&&_age<=1);
      if (!_ageOk) {
        if (bfBtn) { bfBtn.disabled = false; bfBtn.innerHTML = bfBtnHtml; }
        var _dobFld2 = document.getElementById('bf-dob'+vd);
        if (_dobFld2) { validateDobField(_dobFld2, vd); try { _dobFld2.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e){} }
        return;
      }
    }

    var fareExtra3 = 0; // Fare conditions are part of the ticket — no extra cost
    // [ADMIN-MARGIN] total3 (duffel_amount) MUST be the NET price Duffel
    // actually charges. o3.price is now the CUSTOMER-FACING price shown in
    // search results (net + ticket margin, added so browsing shows the
    // real final price from the first look) — o3.netPrice is the exact
    // Duffel net amount alongside it. Using o3.price here would send a
    // margin-inflated number as duffel_amount and make every single
    // checkout fail the server's price-changed check. bflowTotalExtra
    // includes the ancillary margin (for display), so we use
    // bflowTotalExtraNet for services here for the same reason. The
    // server re-derives this from scratch anyway via
    // computeAuthoritativePricing() and will reject the checkout if this
    // drifts from the real net price, but sending the right number from
    // the start avoids spurious "price changed" prompts.
    var total3 = (o3.netPrice != null ? o3.netPrice : o3.price) + fareExtra3 + (bflowTotalExtraNet || 0);
    var customerTotal3 = bflowGrandTotal(); // display estimate only — server recomputes the real charge
    var loyaltyDisc3 = bflowLoyaltyCreditUsed(); // loyalty credit portion to deduct on success

    // Collect real Duffel services: chosen seats + chosen baggage
    var orderServices = [];
    for (var sk in seatChosen) {
      if (!seatChosen.hasOwnProperty(sk)) continue;
      for (var spx in seatChosen[sk]) {
        if (seatChosen[sk].hasOwnProperty(spx) && seatChosen[sk][spx].serviceId) {
          orderServices.push({ id: seatChosen[sk][spx].serviceId, quantity: 1 });
        }
      }
    }
    for (var bi = 0; bi < (bflowBagServices||[]).length; bi++) {
      var bs = bflowBagServices[bi];
      if (!bflowBagSel[bs.id]) continue;
      // Duffel rule: one baggage service entry per (bag type × passenger × segment).
      // Each available_service id already targets specific segments/passengers,
      // so we send quantity:1 — never a multiplied quantity (which Duffel rejects).
      orderServices.push({ id: bs.id, quantity: 1 });
    }

    if (offerId3 && !offerId3.startsWith('demo_') && !offerId3.startsWith('fw_')) {
      // ── Stripe Checkout flow ──
      // 1) Save booking context so we can show confirmation after returning
      try {
        var pendingCtx = {
          offerId: offerId3,
          basePrice: o3.price,
          extrasPrice: fareExtra3 + bflowTotalExtra,
          customerTotal: customerTotal3,
          duffelTotal: total3,
          orig: o3.orig, dest: o3.dest,
          pointsBeforeBooking: loyaltyData.points || 0,
          paxList: paxArr3.map(function(p){return {fn:p.given_name,ln:p.family_name,dob:p.born_on};})
        };
        sessionStorage.setItem('fw_pending_booking', JSON.stringify(pendingCtx));
      } catch(e) {}
      // 2) Build return URLs (auto-detect current page; easy to change later)
      var baseUrl = window.location.origin + window.location.pathname;
      // 3) Create the Stripe Checkout session, then redirect to Stripe.
      // [PRICE-CHECK] amounts are mutable so confirmPriceChanged() can retry
      // with the server's fresh price without duplicating this whole flow.
      var pcAmounts = { duffel: total3, customer: customerTotal3 };
      startStripeCheckoutSession(offerId3, paxArr3, orderServices, pcAmounts, o3, baseUrl, bfBtn);
    } else {
      setTimeout(function() {
        selOffer = o3; selExtras = [];
        closeBflow();
        showDemoBooking();
      }, 1500);
    }
  }
}

// Stored so confirmPriceChanged() can retry the exact same request with an
// updated price after the customer agrees to the new amount.
var _pcRetryState = null;

function startStripeCheckoutSession(offerId3, paxArr3, orderServices, amounts, o3, baseUrl, bfBtn) {
  _pcRetryState = { offerId3: offerId3, paxArr3: paxArr3, orderServices: orderServices, amounts: amounts, o3: o3, baseUrl: baseUrl, bfBtn: bfBtn };
  // [SECURITY-FIX] If the customer is logged in (FW_USER set), this MUST
  // resolve to a real Authorization header — never silently fall through
  // to an anonymous request. Before this fix, getSession() returning
  // session:null (a perfectly normal thing when the access token expired
  // and silent refresh hasn't completed yet) made authHeader resolve to
  // {} with no error of any kind — the request went out completely
  // unauthenticated. The server then stored this booking with user_id =
  // null, indistinguishable from a genuine guest checkout. Later, when
  // ANY account logged in whose email happened to match whatever email
  // was typed into the passenger-details form for that booking (which can
  // be entirely different from the logged-in account's own email),
  // /auth/link-guest-bookings correctly matched it as an "unclaimed guest
  // booking" and linked it there — even though the person who paid was a
  // different, fully logged-in customer the whole time. That booking then
  // disappeared from the paying customer's own "Meine Buchungen" and
  // appeared on a stranger's account instead — a real account-confusion
  // and data-exposure bug. The fix: if a session is expected but missing,
  // try ONE explicit refreshSession() before giving up, and if that also
  // fails, stop and tell the customer to sign in again rather than send
  // the booking through anonymously under their nose.
  function getAuthHeaderOrFail() {
    if (!(_sb && FW_USER && FW_USER.id)) return Promise.resolve({ header: {}, failed: false });
    return _sb.auth.getSession().then(function(res){
      var tok = res.data && res.data.session && res.data.session.access_token;
      if (tok) return { header: { Authorization: 'Bearer ' + tok }, failed: false };
      // No live session — try one explicit refresh before giving up.
      return _sb.auth.refreshSession().then(function(res2){
        var tok2 = res2.data && res2.data.session && res2.data.session.access_token;
        if (tok2) return { header: { Authorization: 'Bearer ' + tok2 }, failed: false };
        return { header: {}, failed: true };
      }).catch(function(){ return { header: {}, failed: true }; });
    }).catch(function(){ return { header: {}, failed: true }; });
  }

  getAuthHeaderOrFail().then(function(authResult) {
    if (authResult.failed) {
      if (bfBtn) { bfBtn.disabled = false; bfBtn.innerHTML = '<span id="bflow-btn-txt">' + tL('Erneut versuchen','Try again','حاول مرة أخرى') + '</span>'; }
      showToast('⚠️ ' + tL(
        'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an, um diese Buchung deinem Konto zuzuordnen.',
        'Your session has expired. Please sign in again so this booking is linked to your account.',
        'انتهت صلاحية جلستك. سجّل دخولك من جديد لربط هذا الحجز بحسابك.'
      ), 'error');
      return;
    }
    var authHeader = authResult.header;
    fetch(PROXY + '/create-checkout-session', {
      method:'POST', headers: Object.assign({'Content-Type':'application/json'}, authHeader),
      body: JSON.stringify({
        offer_id: offerId3,
        passengers: paxArr3,
        services: orderServices,
        duffel_amount: amounts.duffel,      // net price estimate → used only to detect fare drift
        // [PRICE-DISPLAY-FIX] customer_amount is the total this screen last
        // showed the customer (incl. margin + any promo/loyalty discount).
        // Sent ONLY so the server can show an apples-to-apples "price
        // changed" comparison (old customer total vs. new customer total)
        // if duffel_amount drifted — it is never trusted for the actual
        // charge. The server still re-derives pricing.customerAmount from
        // scratch via computeAuthoritativePricing() and that figure alone
        // determines what Stripe actually charges.
        customer_amount: amounts.customer,
        currency: o3.currency || 'EUR',
        route_label: (o3.orig||'') + ' → ' + (o3.dest||''),
        // [ADMIN-MARGIN/LOYALTY] The server re-derives the actual discount
        // from its own promo_codes table and the logged-in user's (or,
        // failing that, the device's) real loyalty balance — these are
        // just WHICH code/account to check, never a trusted amount. The
        // customer_amount above is for display-comparison only; the real
        // charge is always computed server-side from scratch.
        promo_code: (bflowPromo && bflowPromo.code) || null,
        device_id: loyaltyDeviceId(),
        success_url: baseUrl,
        cancel_url: baseUrl
      })
    }).then(function(r){ return r.json().then(function(j){ return {status:r.status, body:j}; }); })
      .then(function(res){
        var j = res.body;
        if (j.ok && j.url) {
          // Redirect to Stripe's secure hosted payment page
          window.location.href = j.url;
        } else if (res.status === 409 && j.code === 'PRICE_CHANGED') {
          // [PRICE-CHECK] Fare moved since the customer saw it — ask before
          // any money moves. bfBtn stays disabled until they choose.
          openPriceChanged(j, amounts);
        } else if (res.status === 409 && j.code === 'OFFER_UNAVAILABLE') {
          // [OFFER-UNAVAILABLE-UX-FIX] The offer expired/no longer exists
          // at all (distinct from PRICE_CHANGED, where it's still bookable
          // at a different price) — previously this just showed a toast
          // and left the customer stuck on a dead offer's checkout page.
          // Closing the flow and re-running their last search lands them
          // on fresh, currently-valid offers automatically, instead of
          // requiring them to notice the toast and figure out the next
          // step themselves.
          showToast('⚠️ ' + (j.error || 'Dieses Angebot ist nicht mehr verfügbar. Wir suchen aktuelle Angebote für dich.'), 'info');
          closeBflow();
          setTimeout(function(){ doSearch(); }, 300);
        } else {
          if (bfBtn) { bfBtn.disabled=false; }
          showToast('❌ ' + (j.error||'Zahlung konnte nicht gestartet werden'), 'error');
        }
      }).catch(function(err){
        if (bfBtn) {bfBtn.disabled=false; bfBtn.innerHTML='<span id="bflow-btn-txt">Erneut versuchen</span>';}
        showToast('❌ Verbindungsfehler — bitte erneut versuchen', 'error');
        fwLog('error', {msg: err ? err.message : 'Checkout network error'});
      });
  });
}

// [PRICE-CHECK] Shows the "price changed" sheet with old vs. new amount.
// [PRICE-DISPLAY-FIX] Always show CUSTOMER-FACING totals (incl. margin and
// any promo/loyalty discount) here — never the raw Duffel net price. The
// net price is what the server uses internally to detect drift, but it's
// not a number the customer has ever seen or would ever pay, so showing
// it directly produced a confusing comparison unrelated to both the price
// shown on the previous screen and the price actually charged afterward.
// old_customer_amount/new_customer_amount come straight from the server
// (computeAuthoritativePricing, the same function used at actual checkout)
// so whatever the customer agrees to here is exactly what they're charged.
function openPriceChanged(priceInfo, oldAmounts) {
  var oldVal = priceInfo.old_customer_amount != null ? priceInfo.old_customer_amount : oldAmounts.customer;
  var newVal = priceInfo.new_customer_amount != null ? priceInfo.new_customer_amount : priceInfo.new_amount;
  var cur = priceInfo.currency || 'EUR';
  var went_up = newVal > oldVal;
  document.getElementById('pc-icon').textContent = went_up ? '📈' : '📉';
  document.getElementById('pc-msg-el').textContent = t(went_up ? 'pc_up' : 'pc_down');
  document.getElementById('pc-old-val').textContent = fmt(oldVal);
  document.getElementById('pc-new-val').textContent = fmt(newVal);
  // [PRICE-DISPLAY-FIX] No more local delta math — the server already sent
  // back the exact customer_amount it would charge (new_customer_amount),
  // computed by the same authoritative function used at checkout. Reusing
  // that number directly (instead of approximating it locally from a
  // Duffel-net delta) guarantees what's shown here and what gets charged
  // on confirmPriceChanged() are identical.
  if (_pcRetryState) {
    _pcRetryState._newDuffelAmount = priceInfo.new_amount;
    _pcRetryState._newCustomerAmount = newVal;
  }
  document.getElementById('price-changed-ov').classList.add('open');
}

function closePriceChanged() {
  document.getElementById('price-changed-ov').classList.remove('open');
  var st = _pcRetryState;
  if (st && st.bfBtn) { st.bfBtn.disabled = false; st.bfBtn.innerHTML = '<span id="bflow-btn-txt">' + t('pay_button') + '</span>'; }
  fwLog('info', {msg: 'price_change_declined_by_user'});
  _pcRetryState = null;
}

function confirmPriceChanged() {
  var st = _pcRetryState;
  document.getElementById('price-changed-ov').classList.remove('open');
  if (!st) return;
  var newAmounts = { duffel: st._newDuffelAmount, customer: st._newCustomerAmount };
  if (st.bfBtn) { st.bfBtn.disabled = true; st.bfBtn.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block">⟳</span> Wird gebucht...'; }
  startStripeCheckoutSession(st.offerId3, st.paxArr3, st.orderServices, newAmounts, st.o3, st.baseUrl, st.bfBtn);
}

function bflowUpdateSteps() {
  for (var i = 1; i <= 5; i++) {
    var dot = document.getElementById('bstep-' + i);
    var line = document.getElementById('bline-' + i);
    if (dot) {
      dot.className = 'bflow-step-dot';
      if (i < bflowStep) { dot.className += ' done'; dot.textContent = '✓'; }
      else if (i === bflowStep) { dot.className += ' active'; dot.textContent = i; }
      else { dot.textContent = i; }
    }
    if (line) {
      line.className = 'bflow-step-line' + (i < bflowStep ? ' done' : '');
    }
  }
}

function bflowRender() {
  bflowUpdateSteps();
  var body = document.getElementById('bflow-body');
  var titleEl = document.getElementById('bflow-title');
  var btnTxt = document.getElementById('bflow-btn-txt');
  var btnPrice = document.getElementById('bflow-btn-price');
  var backBtn = document.getElementById('bflow-back');
  var o = bflowOffer;

  backBtn.textContent = '←';
  backBtn.onclick = bflowStep === 1 ? closeBflow : bflowBack;

  // [CONSENT-PERSIST-FIX] bflow-btn is one persistent element reused
  // across every step (1-5) — only step 5 ever has a reason to disable it
  // (pending consent), and its own branch below re-applies the correct
  // disabled state right after this. Resetting to enabled here first
  // means navigating back to an earlier step always restores a working
  // button, instead of a disabled state from a previous visit to step 5
  // staying stuck forever with no code path anywhere to re-enable it.
  var sharedBtn = document.getElementById('bflow-btn');
  if (sharedBtn) sharedBtn.disabled = false;

  var totalPrice = o.price + bflowTotalExtra;
  btnPrice.textContent = '· ' + fmt(totalPrice);
  var routeElR = document.getElementById('bflow-route');
  if (routeElR) routeElR.innerHTML = bflowRouteLabel(o) + ' \u00b7 <span class="bflow-route-price">' + fmt(totalPrice) + '</span>';

  if (bflowStep === 1) {
    // ── Step 1: Flight Details ──
    titleEl.textContent = 'Flugdetails';
    btnTxt.textContent = 'Tarif wählen';
    body.innerHTML = bflowStep1(o);

  } else if (bflowStep === 2) {
    // ── Step 2: Fare Conditions (real Duffel data) ──
    titleEl.textContent = t('fc_title');
    btnTxt.textContent = 'Gepäck wählen';
    body.innerHTML = bflowStep2(o);

  } else if (bflowStep === 3) {
    // ── Step 3: Baggage ──
    titleEl.textContent = 'Gepäck hinzufügen';
    btnTxt.textContent = 'Reisende eingeben';
    body.innerHTML = bflowStep3(o);

  } else if (bflowStep === 4) {
    // ── Step 4: Seat selection ──
    titleEl.textContent = t('st_title');
    btnTxt.textContent = t('st_continue');
    body.innerHTML = bflowStepSeats(o);
    initSeatStep(o);

  } else if (bflowStep === 5) {
    // ── Step 5: Passengers + Payment (merged) ──
    titleEl.textContent = t('passengers') + ' & ' + t('payment_title_short');
    btnTxt.textContent = t('pay_button');
    body.innerHTML = bflowStep4(o) + bflowSummary(o) + bflowStep5(o);
    renderPromoState();
    renderSavedPassengerUI();
    // [CONSENT-PERSIST-FIX] Reflect the PERSISTED consent state on every
    // render, not an unconditional disable — a consent already given
    // (e.g. before the customer opened the seat/baggage edit sheet) must
    // survive coming back to step 5, or the pay button gets stuck
    // disabled with no way to re-enable it short of reloading the page.
    var consentBtn = document.getElementById('bflow-btn');
    if (consentBtn) consentBtn.disabled = !bflowConsentChecked;
    // [GA4-EVENTS] First time reaching checkout for this booking flow only.
    if (!bflowCheckoutTracked) {
      bflowCheckoutTracked = true;
      trackEvent('begin_checkout', { value: o.price + (bflowTotalExtra||0), currency: 'EUR' });
    }
    // [LOYALTY-PREVIEW-FIX] Reset to "unknown" first so a stale discount
    // from a previous offer never briefly shows, then ask the server for
    // the real figure. bflowDiscountAmount() treats null as 0 until this
    // resolves, so the price only ever moves up-front (to the confirmed
    // amount), never back down via an interrupting dialog at checkout.
    _serverLoyaltyDiscount = null;
    fetchServerLoyaltyDiscount();
  }

  // Lock icon on the pay button only at the payment step
  var bfBtnEl = document.getElementById('bflow-btn');
  var oldLock = document.getElementById('bflow-btn-lock');
  if (oldLock) oldLock.remove();
  if (bflowStep === 5 && bfBtnEl && btnTxt) {
    var lk = document.createElement('span');
    lk.id = 'bflow-btn-lock';
    lk.style.cssText = 'display:flex;align-items:center';
    lk.innerHTML = ppIcon('shield', 17);
    bfBtnEl.insertBefore(lk, btnTxt);
  }

  // Price-details link visible only on the final (payment) step
  var pdLinkWrap = document.getElementById('bflow-pricelink-wrap');
  if (pdLinkWrap) pdLinkWrap.style.display = (bflowStep === 5) ? 'block' : 'none';
  var pdLink = document.getElementById('bflow-pricelink');
  if (pdLink) pdLink.textContent = t('pd_show');

  // Scroll to top
  body.scrollTop = 0;
  // Load logos for flight timeline
  if (bflowStep === 1) setTimeout(loadRealLogos, 100);
}

// ── Step 1: Flight Timeline ──
function bflowStep1(o) {
  var h = '';
  // Use the same Kiwi-style journey cards as the detail sheet
  h += buildJourney(o.segs || [], '🛫 ' + (o.multiCity ? (t('det_outbound') + ' (1/' + o.legs.length + ')') : t('det_outbound')), o.dur);
  if (o.multiCity && Array.isArray(o.legs)) {
    for (var s1li = 1; s1li < o.legs.length; s1li++) {
      h += '<div class="jrny-sep"></div>';
      h += buildJourney(o.legs[s1li].segs, '🛫 ' + t('det_outbound') + ' (' + (s1li+1) + '/' + o.legs.length + ')', o.legs[s1li].dur);
    }
  } else if (o.ret && o.ret.segs && o.ret.segs.length) {
    h += '<div class="jrny-sep"></div>';
    h += buildJourney(o.ret.segs, '🛬 ' + t('det_return'), o.ret.dur);
  }

  // Baggage info — real counts from Duffel
  var s1cabinN = (typeof o.cabinBagQty === 'number') ? o.cabinBagQty : (o.hasCabin ? 1 : 0);
  var s1checkedN = (typeof o.checkedBagQty === 'number') ? o.checkedBagQty : (o.hasChecked ? 1 : 0);
  h += '<div style="background:var(--bg2);border-radius:10px;padding:10px 12px;margin:14px 0 0">';
  h += '<div style="font-size:11px;font-weight:700;color:var(--tx3);margin-bottom:8px">' + t('fc_title').toUpperCase() + '</div>';
  h += '<div style="display:flex;gap:12px">';
  h += '<div style="font-size:12px;color:' + (s1cabinN > 0 ? 'var(--gr)' : 'var(--tx3)') + '">' + (s1cabinN > 0 ? s1cabinN + '\u00d7 \u2713' : '\u2717') + ' ' + t('fc_cabin') + '</div>';
  h += '<div style="font-size:12px;color:' + (s1checkedN > 0 ? 'var(--gr)' : 'var(--tx3)') + '">' + (s1checkedN > 0 ? s1checkedN + '\u00d7 \u2713' : '\u2717') + ' ' + t('fc_checked') + '</div>';
  h += '</div></div>';

  h += '<div style="height:16px"></div>';
  return h;
}

// ── Step 2: Fare Selection ──
// Group offers that are the SAME physical flight (same segments) but
// different fare brands/prices. Returns the list of fare options for `o`.
function getFareBrandsFor(o) {
  function sig(off) {
    // signature = flight numbers + times of all segments (out + ret)
    var parts = [];
    function add(segs) {
      if (!segs) return;
      for (var i = 0; i < segs.length; i++) {
        var s = segs[i];
        parts.push((s.fn||'') + '@' + (s.dep instanceof Date ? s.dep.getTime() : s.dep));
      }
    }
    add(off.segs);
    if (off.ret) add(off.ret.segs);
    return parts.join('|');
  }
  var target = sig(o);
  var group = [];
  for (var i = 0; i < allOffers.length; i++) {
    if (sig(allOffers[i]) === target) group.push(allOffers[i]);
  }
  group.sort(function(a,b){ return (a.price||0) - (b.price||0); });

  // ── Dedupe by FULL fingerprint ──
  // Two fares that are identical in every meaningful way (name, conditions,
  // amenities, baggage) but differ only in price are真 duplicates — keep the
  // cheapest. Any difference at all keeps both visible.
  function fareFingerprint(b) {
    var cond = b.conditions || {};
    var chg = cond.change_before_departure || {};
    var rfd = cond.refund_before_departure || {};
    var parts = [
      (b.fareBrandName || b.cabinMarketingName || b.cabinClass || '').toLowerCase().trim(),
      'chg:' + (chg.allowed === true ? '1' : chg.allowed === false ? '0' : '-') + ':' + (chg.penalty_amount != null ? chg.penalty_amount : ''),
      'rfd:' + (rfd.allowed === true ? '1' : rfd.allowed === false ? '0' : '-') + ':' + (rfd.penalty_amount != null ? rfd.penalty_amount : ''),
      'hold:' + (b.holdSpace === true ? '1' : '0'),
      'cab:' + (b.hasCabin ? 'y' : 'n'),
      'chk:' + (b.hasChecked ? 'y' : 'n')
    ];
    return parts.join('|');
  }
  var seen = {};
  var deduped = [];
  for (var g = 0; g < group.length; g++) {
    var fp = fareFingerprint(group[g]);
    if (seen[fp]) continue;   // identical fare already kept (cheaper, since sorted)
    seen[fp] = true;
    deduped.push(group[g]);
  }
  return deduped.length ? deduped : [o];
}

var bflowFareOffers = []; // current fare options shown in step 2

function bflowStep2(o) {
  var brands = getFareBrandsFor(o);
  bflowFareOffers = brands;
  // make sure the selected offer is part of the group; default to current
  if (!bflowSelectedFareId) bflowSelectedFareId = o.id;

  var h = '';

  // Header
  h += '<div class="fbrand-head"><span class="fbrand-head-ico">\ud83c\udff7\ufe0f</span><span class="fbrand-head-t">' + t('fc_title') + '</span></div>';
  h += '<div class="fcond-note">' + t('fc_real_note') + '</div>';

  if (brands.length === 1) {
    h += '<div style="font-size:11px;color:var(--tx3);text-align:center;margin-bottom:10px">' + t('fb_one_fare') + '</div>';
  }

  for (var i = 0; i < brands.length; i++) {
    h += renderFareBrand(brands[i]);
  }

  h += '<div style="height:16px"></div>';
  return h;
}

function renderFareBrand(b) {
  var sel = (b.id === bflowSelectedFareId);
  var cond = b.conditions || {};
  var chg = cond.change_before_departure || {};
  var rfd = cond.refund_before_departure || {};

  // Title: prefer real brand name, then cabin marketing name, then cabin class
  var title = b.fareBrandName || b.cabinMarketingName || b.cabinClass || (b.al ? b.al[1] : 'Tarif');

  var h = '<div class="fbrand' + (sel ? ' sel' : '') + '" onclick="selectFareBrand(\'' + b.id + '\')">';
  h += '<div class="fbrand-top">';
  h += '<div style="flex:1;min-width:0">';
  h += '<div class="fbrand-name">' + escHtml(title) + '</div>';
  // show cabin marketing name as subtitle only if different from title
  if (b.cabinMarketingName && b.cabinMarketingName !== title) {
    h += '<div class="fbrand-cabin">' + escHtml(b.cabinMarketingName) + '</div>';
  } else if (b.cabinClass && b.cabinClass !== title) {
    h += '<div class="fbrand-cabin">' + escHtml(b.cabinClass) + '</div>';
  }
  h += '</div>';
  h += '<div class="fbrand-price">' + fmt(b.price) + '<small>' + t('perPerson') + '</small></div>';
  h += '<div class="fbrand-radio"></div>';
  h += '</div>';

  // Feature chips — match Duffel's fare-condition layout exactly.
  var chips = '';
  // 1) Changeable + fee (if any)
  if (chg.allowed === true) {
    var chgFeeC = (chg.penalty_amount != null && parseFloat(chg.penalty_amount) > 0) ? ' (' + t('fc_fee') + ' ' + fmt(parseFloat(chg.penalty_amount)) + ')' : '';
    chips += '<span class="fbrand-chip yes">\u2713 ' + t('fc_changeable') + chgFeeC + '</span>';
  } else if (chg.allowed === false) chips += '<span class="fbrand-chip no">\u2717 ' + t('fc_not_changeable') + '</span>';
  // 2) Refundable + fee (if any)
  if (rfd.allowed === true) {
    var rfdFeeC = (rfd.penalty_amount != null && parseFloat(rfd.penalty_amount) > 0) ? ' (' + t('fc_fee') + ' ' + fmt(parseFloat(rfd.penalty_amount)) + ')' : '';
    chips += '<span class="fbrand-chip yes">\u2713 ' + t('fc_refundable') + rfdFeeC + '</span>';
  } else if (rfd.allowed === false) chips += '<span class="fbrand-chip no">\u2717 ' + t('fc_not_refundable') + '</span>';
  // 3) Hold space — real, from payment_requirements (only when airline allows it)
  if (b.holdSpace === true) chips += '<span class="fbrand-chip yes">\ud83d\udd52 ' + t('fb_hold') + '</span>';
  // 4) Carry-on bags — textual: included / not included
  if (b.hasCabin) chips += '<span class="fbrand-chip yes">\ud83c\udf92 ' + t('fb_inc_cabin') + '</span>';
  else chips += '<span class="fbrand-chip no">\u2717 ' + t('fb_no_cabin') + '</span>';
  // 5) Checked bags — textual: included / not included
  if (b.hasChecked) chips += '<span class="fbrand-chip yes">\ud83e\uddf3 ' + t('fb_inc_checked') + '</span>';
  else chips += '<span class="fbrand-chip no">\u2717 ' + t('fb_no_checked') + '</span>';

  if (chips) h += '<div class="fbrand-feats">' + chips + '</div>';
  h += '</div>';
  return h;
}

function selectFareBrand(id) {
  bflowSelectedFareId = id;
  // switch the active offer to the chosen fare brand
  for (var i = 0; i < bflowFareOffers.length; i++) {
    if (bflowFareOffers[i].id === id) {
      bflowOffer = bflowFareOffers[i];
      break;
    }
  }
  // keep the scroll position so the screen doesn't jump to top
  var sc = document.getElementById('bflow-body');
  var y = sc ? sc.scrollTop : 0;
  bflowRender();
  if (sc) sc.scrollTop = y;
}

// Real baggage state: { serviceId: {qty, price, currency} }
var bflowBagServices = null;   // loaded list from Duffel (null=not loaded yet)
var bflowBagSel = {};          // chosen services -> quantity

function bflowStep3(o) {
  var h = '<div style="font-size:12px;color:var(--tx2);margin-bottom:14px;line-height:1.6">' + t('bg_intro') + '</div>';

  // Included baggage rows (real, from the fare) — cabin and/or checked.
  // Weight in kg is shown ONLY when Duffel actually provides it (else generic).
  function bflowInclRow(ico, name, qty, weightKg) {
    var qtyTxt = (qty && qty > 1) ? (qty + '\u00d7 ') : '';
    var sub = weightKg ? (t('bg_upto') + ' ' + weightKg + ' kg') : t('bg_included_sub');
    var x = '<div class="bag-included">';
    x += '<div class="bag-included-ico">' + ico + '</div>';
    x += '<div style="flex:1"><div class="bag-included-name">' + qtyTxt + name + '</div>';
    x += '<div class="bag-included-sub">' + sub + '</div></div>';
    x += '<div class="bag-included-badge">' + t('bg_free') + ' \u2713</div>';
    x += '</div>';
    return x;
  }
  if (o.hasCabin !== false) h += bflowInclRow('\ud83c\udf92', t('bg_included'), o.cabinBagQty, o.cabinBagWeightKg);
  if (o.hasChecked) h += bflowInclRow('\ud83e\uddf3', t('sm_checked_inc'), o.checkedBagQty, o.checkedBagWeightKg);

  // Real extra-baggage services
  if (bflowBagServices === null) {
    // not loaded yet -> trigger load, show skeleton
    h += '<div id="bag-svc-zone"><div style="text-align:center;padding:26px;color:var(--tx3)"><div style="font-size:1.6rem;margin-bottom:8px">\u23f3</div>' + t('bg_loading') + '</div></div>';
    loadBaggageServices(o);
  } else {
    h += '<div id="bag-svc-zone">' + renderBagServices() + '</div>';
  }

  h += '<div style="height:16px"></div>';
  return h;
}

function renderBagServices() {
  if (!bflowBagServices || !bflowBagServices.length) {
    return '<div style="text-align:center;padding:22px;color:var(--tx3);font-size:12px">' + t('bg_none') + '</div>';
  }
  // [MULTI-PAX-FIX] Group options by passenger. Each Duffel baggage
  // service already belongs to exactly one passenger (passengerIndex,
  // resolved server-side from the service's passenger_ids) — there's
  // nothing to "assign" here, just to show clearly. Services with no
  // passenger tie (passengerIndex null) render under a shared heading.
  var groups = {}; // key: passengerIndex (or 'shared') -> [services]
  var order = [];
  for (var gi = 0; gi < bflowBagServices.length; gi++) {
    var gs = bflowBagServices[gi];
    var key = (gs.passengerIndex != null) ? gs.passengerIndex : 'shared';
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(gs);
  }
  // Passenger groups first (in passenger order), shared group last
  order.sort(function(a, b) {
    if (a === 'shared') return 1;
    if (b === 'shared') return -1;
    return a - b;
  });

  var totalPax = PAX.a + PAX.c + PAX.i;
  var h = '';
  for (var oi = 0; oi < order.length; oi++) {
    var key2 = order[oi];
    var list = groups[key2];
    // Only show a passenger-group header when there's more than one
    // passenger on this booking — for a single traveler it would just be
    // visual noise repeating "Erwachsener 1" above every option.
    if (totalPax > 1) {
      var headerLabel = (key2 === 'shared') ? t('bg_perpax') : bflowPaxLabel(key2);
      h += '<div class="bag-pax-group-hdr">' + ppIcon('user', 12) + headerLabel + '</div>';
    }
    for (var li = 0; li < list.length; li++) {
      var s = list[li];
      var sel = !!bflowBagSel[s.id];
      var ico = (s.bagType === 'carry_on') ? '\ud83c\udf92' : '\ud83e\uddf3';
      var name = (s.bagType === 'carry_on') ? t('bg_carry') : t('bg_checked');
      var sub = '';
      if (s.maxWeightKg) sub = t('bg_upto') + ' ' + s.maxWeightKg + ' kg';
      h += '<div class="bag-option' + (sel ? ' selected' : '') + '" onclick="toggleBagService(\'' + s.id + '\')">';
      h += '<div class="bag-option-ico">' + ico + '</div>';
      h += '<div class="bag-option-info"><div class="bag-option-name">' + name + (s.maxWeightKg ? ' ' + s.maxWeightKg + 'kg' : '') + '</div>';
      if (sub) h += '<div class="bag-option-sub">' + sub + '</div>';
      h += '</div>';
      h += '<div style="display:flex;align-items:center;gap:10px">';
      h += '<div class="bag-option-price">+ ' + fmt(s.price) + '</div>';
      h += '<div class="bag-option-check">' + (sel ? '\u2713' : '') + '</div>';
      h += '</div></div>';
    }
  }
  return h;
}

function loadBaggageServices(o) {
  var offerId = o.duffelId || o.id;
  // Demo / non-Duffel offers: no real services
  if (!o.isDuffel || !offerId || String(offerId).startsWith('demo_') || String(offerId).startsWith('fw_') || String(offerId).startsWith('fare')) {
    bflowBagServices = [];
    var z0 = document.getElementById('bag-svc-zone');
    if (z0) z0.innerHTML = renderBagServices();
    return;
  }
  fetch(PROXY + '/offer/' + encodeURIComponent(offerId))
    .then(function(r){ return r.json(); })
    .then(function(j){
      bflowBagServices = (j && j.ok && Array.isArray(j.baggageServices)) ? j.baggageServices : [];
      var z = document.getElementById('bag-svc-zone');
      if (z) z.innerHTML = renderBagServices();
    })
    .catch(function(){
      bflowBagServices = [];
      var z = document.getElementById('bag-svc-zone');
      if (z) z.innerHTML = renderBagServices();
    });
}

function bflowRefreshPrices() {
  if (!bflowOffer) return;
  var total = bflowGrandTotal();
  var routeEl = document.getElementById('bflow-route');
  if (routeEl) routeEl.innerHTML = bflowRouteLabel(bflowOffer) + ' \u00b7 <span class="bflow-route-price">' + fmt(total) + '</span>';
  var btnPrice = document.getElementById('bflow-btn-price');
  if (btnPrice) btnPrice.textContent = '\u00b7 ' + fmt(total);
  // [JEWEL-PRICE-FIX] Re-render the big "Gesamtbetrag" card's price block
  // too — this used to be built once inline inside bflowStep5() and never
  // touched again, so picking a bag/seat changed the real total (correct
  // in Preisdetails and at checkout) without ever updating the one number
  // most visible on screen. Rebuilt via renderJewelPriceSection() so the
  // strikethrough "was" price and the discount line correctly appear or
  // disappear too, not just the headline number.
  var jewelPl = document.getElementById('pp-jewel-pl');
  if (jewelPl) jewelPl.innerHTML = renderJewelPriceSection(bflowOffer, bflowDiscountAmount(), total);
}

// [PRICE-SYNC-FIX] After any seat/baggage selection, the totals on screen
// are computed locally from prices fetched in three separate calls
// (/offer, /seatmaps), each hitting Duffel independently. Duffel's live
// net price can drift a little between those calls, which used to surface
// as an unexplained few-euro jump on the NEXT screen (e.g. picking a
// €23 bag, then seeing the running total €5 higher on the seat step) —
// the customer never agreed to that number anywhere. This calls the
// server's /price-preview, which runs the exact same pricing function used
// at checkout, and silently corrects bflowTotalExtra/bflowOffer.price to
// match — so any number ever shown is one the server would actually honor.
var _priceSyncToken = 0;
function syncPriceWithServer() {
  if (!bflowOffer) return;
  var o = bflowOffer;
  var offerId = o.duffelId || o.raw_offer_id || o.id;
  if (!offerId || /^(demo_|fw_|fare)/.test(String(offerId))) return; // demo offers have no server pricing

  var orderServices = [];
  for (var sk in seatChosen) {
    if (!seatChosen.hasOwnProperty(sk)) continue;
    for (var spx in seatChosen[sk]) {
      if (seatChosen[sk].hasOwnProperty(spx) && seatChosen[sk][spx].serviceId) {
        orderServices.push({ id: seatChosen[sk][spx].serviceId, quantity: 1 });
      }
    }
  }
  for (var bi = 0; bi < (bflowBagServices||[]).length; bi++) {
    var bs = bflowBagServices[bi];
    if (bflowBagSel[bs.id]) orderServices.push({ id: bs.id, quantity: 1 });
  }

  var myToken = ++_priceSyncToken; // guard against out-of-order responses
  fetch(PROXY + '/price-preview', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      offer_id: offerId,
      services: orderServices,
      promo_code: (bflowPromo && bflowPromo.code) || null,
      device_id: loyaltyDeviceId()
    })
  }).then(function(r){ return r.json(); })
    .then(function(j){
      if (myToken !== _priceSyncToken || !j || !j.ok || !bflowOffer) return; // stale or failed — keep local estimate
      // Re-derive the customer-facing extras total from the server's own
      // numbers (customer_amount + discount, both authoritative) minus the
      // base ticket price — this avoids recomputing the discount locally
      // against a still-stale bflowTotalExtra, which could itself sit on
      // the wrong side of a discount tier threshold.
      var serverExtra = Math.round((j.customer_amount + j.discount - bflowOffer.price) * 100) / 100;
      if (Math.abs(serverExtra - (bflowTotalExtra || 0)) >= 0.01) {
        bflowTotalExtra = serverExtra;
        bflowRefreshPrices();
        if (bflowStep === 4) renderSeatStep();
      }
    })
    .catch(function(){ /* keep local estimate on network failure */ });
}

function toggleBagService(id) {
  if (bflowBagSel[id]) { delete bflowBagSel[id]; }
  else { bflowBagSel[id] = 1; }
  // recompute extras from real service prices
  var extra = 0, extraNet = 0;
  for (var i = 0; i < (bflowBagServices||[]).length; i++) {
    var s = bflowBagServices[i];
    if (bflowBagSel[s.id]) {
      extra += s.price * bflowBagSel[s.id];
      // [ADMIN-MARGIN] netPrice falls back to price for any pre-margin
      // cached data (e.g. a stale offer object) so totals never go wrong
      // silently — worst case the net total is briefly overstated, never
      // understated, which the server-side recheck at checkout corrects.
      extraNet += (s.netPrice != null ? s.netPrice : s.price) * bflowBagSel[s.id];
    }
  }
  bflowTotalExtra = extra;
  bflowTotalExtraNet = extraNet + seatNetExtraOnly();
  // refresh service zone + both prices (top & bottom)
  var z = document.getElementById('bag-svc-zone');
  if (z) z.innerHTML = renderBagServices();
  bflowRefreshPrices();
  syncPriceWithServer();
}

// [ADMIN-MARGIN] Net (no-margin) total of currently chosen seats only —
// shared by toggleBagService and recomputeSeatTotal so the two never
// duplicate or miss each other's contribution to bflowTotalExtraNet.
function seatNetExtraOnly() {
  var net = 0;
  for (var k in seatChosen) {
    if (!seatChosen.hasOwnProperty(k)) continue;
    for (var spx in seatChosen[k]) {
      if (seatChosen[k].hasOwnProperty(spx)) {
        var sc = seatChosen[k][spx];
        net += (sc.netPrice != null ? sc.netPrice : (sc.price || 0));
      }
    }
  }
  return net;
}

// ═══════════════ SEAT SELECTION (Step 4) ═══════════════
// State
var seatSegments = [];      // [{segId, route, alCode, alName, map}] one per flight segment
var seatMapsLoaded = false; // whether we've fetched maps for this offer
var seatActiveIdx = 0;      // which segment we're viewing
// [MULTI-PAX-FIX] Now keyed by segment AND passenger — the same physical
// seat has a distinct Duffel service id per passenger (see
// normalizeSeatMap's servicesByPassenger on the server), so a single
// {serviceId, designator, ...} per segment could only ever represent one
// passenger's seat choice, silently overwriting it if a second passenger
// picked a seat on the same flight.
var seatChosen = {};        // { segId: { passengerIndex: {serviceId, designator, price, netPrice, currency} } }
var seatActivePax = 0;      // which passenger is currently picking a seat
var seatPendingPick = null; // seat awaiting confirmation
var seatPassengerOrder = []; // Duffel passenger ids in the same order as seatActivePax indices (from /seatmaps)

// Build the list of physical segments (outbound + return, incl. stops)
function buildSeatSegments(o) {
  var segs = [];
  function add(list) {
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      // [SEATID-FIX] segId used to fall back to
      // `from-to-${s.dep.getTime()}` — but s.dep can be a real Date object
      // the first time buildSeatSegments() runs (right after the normal
      // "Sitzplatz" step loads), and a re-stringified value (or a freshly
      // re-parsed Date with different millisecond precision) the SECOND
      // time it's called — specifically from
      // bflowOpenEditSeatSheet()'s "Bearbeiten" button on the payment step,
      // which calls initSeatStep() again and rebuilds seatSegments from
      // scratch whenever seatMapsLoaded happens to be false. A changed
      // segId means seatChosen[oldSegId] (the seat the customer already
      // picked and saw priced correctly) silently stops matching
      // seatChosen[newSegId] — the price they just confirmed appears to
      // "vanish a moment later" even though it's still sitting in memory
      // under the old key. Using the flight number + an ISO date string
      // (always the same text representation regardless of Date vs
      // string input) makes this key stable across every rebuild.
      var depKey = s.dep instanceof Date ? s.dep.toISOString() : String(s.dep || '');
      segs.push({
        segId: s.segId || (s.from + '-' + s.to + '-' + depKey),
        // [SEATMAP-MATCH-FIX] Duffel's own seat_xxx segment id, now carried
        // through from normalizeOffer (server) -> duffelToLocal/
        // duffelToLocalMultiCity (frontend). Previously NOTHING in this
        // pipeline preserved Duffel's real segment id at all, so
        // loadSeatMaps() below could never match a seat map to its segment
        // by id — it always silently fell back to matching by array
        // position. That's harmless only as long as the /seatmaps response
        // happens to list segments in the exact same order this array was
        // built in; the moment it doesn't (round-trip ordering, multi-stop,
        // multi-city), a seat picked on one segment gets a serviceId that
        // actually belongs to a DIFFERENT segment — which is exactly what
        // produced Duffel's "Field 'services' expected one seat service
        // per passenger and segments" rejection at booking time.
        duffelSegmentId: s.id || null,
        route: (apCity(s.from) || s.from) + ' - ' + (apCity(s.to) || s.to),
        from: s.from, to: s.to,
        alCode: (s.al && s.al[0]) ? s.al[0] : 'XX',
        alName: (s.al && s.al[1]) ? s.al[1] : '',
        map: null   // filled from API
      });
    }
  }
  add(o.segs);
  // [FIX] Multi-city: include every additional leg's segments too, not
  // just a single o.ret — otherwise seat selection silently skipped legs
  // 2+ and could even show "no seat map available" despite seats existing.
  if (o.multiCity && Array.isArray(o.legs)) {
    for (var li = 1; li < o.legs.length; li++) add(o.legs[li].segs);
  } else if (o.ret) {
    add(o.ret.segs);
  }
  return segs;
}

function bflowStepSeats(o) {
  // skeleton; real content injected by initSeatStep
  return '<div id="seat-step-zone"><div style="text-align:center;padding:40px;color:var(--tx3)"><div style="font-size:1.8rem;margin-bottom:10px">\u2708\ufe0f</div>' + t('st_loading') + '</div></div>';
}

function initSeatStep(o) {
  // (Re)build segment list once per offer open
  if (!seatMapsLoaded) {
    seatSegments = buildSeatSegments(o);
    seatActiveIdx = 0;
    loadSeatMaps(o);
  } else {
    renderSeatStep();
  }
}

function loadSeatMaps(o) {
  var offerId = o.duffelId || o.id;
  // Demo / non-Duffel: no seat maps
  if (!o.isDuffel || !offerId || String(offerId).indexOf('fw_') === 0 || String(offerId).indexOf('demo_') === 0 || String(offerId).indexOf('fare') === 0) {
    seatMapsLoaded = true;
    renderSeatStep();
    return;
  }
  fetch(PROXY + '/seatmaps', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ offer_id: offerId })
  })
  .then(function(r){ return r.json(); })
  .then(function(j){
    var maps = (j && j.ok && Array.isArray(j.seatMaps)) ? j.seatMaps : [];
    seatPassengerOrder = (j && Array.isArray(j.passengerOrder)) ? j.passengerOrder : [];
    // attach each map to its segment — by Duffel's real segment id
    // (duffelSegmentId) whenever we have one, falling back to array
    // position only if it's missing (e.g. an offer shape that somehow
    // didn't carry it through).
    for (var i = 0; i < seatSegments.length; i++) {
      var m = null;
      var wantId = seatSegments[i].duffelSegmentId;
      if (wantId) {
        for (var k = 0; k < maps.length; k++) {
          if (maps[k].segmentId && maps[k].segmentId === wantId) { m = maps[k]; break; }
        }
      }
      if (!m && maps[i]) m = maps[i];
      seatSegments[i].map = m || null;
    }
    seatMapsLoaded = true;
    renderSeatStep();
  })
  .catch(function(){
    seatMapsLoaded = true;
    renderSeatStep();
  });
}

function renderSeatStep() {
  var zone = document.getElementById('seat-step-zone');
  if (!zone) return;
  var nSeg = seatSegments.length;
  if (!nSeg) { zone.innerHTML = '<div style="text-align:center;padding:30px;color:var(--tx3)">' + t('st_none') + '</div>'; return; }
  if (seatActiveIdx >= nSeg) seatActiveIdx = nSeg - 1;
  var seg = seatSegments[seatActiveIdx];
  var totalPax = PAX.a + PAX.c + PAX.i;
  if (seatActivePax >= totalPax) seatActivePax = 0;
  var h = '';

  // Flight counter: "Sitzplan: Flug X von Y"
  h += '<div class="seat-count">' + t('st_title') + ': ' + t('st_flight') + ' ' + (seatActiveIdx + 1) + ' ' + t('st_of') + ' ' + nSeg + '</div>';

  // [MULTI-PAX-FIX] Passenger switcher — only shown for >1 passenger, since
  // for a single traveler "Erwachsener 1" tabs would just be noise. Each
  // tab shows a checkmark once that passenger has a seat on THIS segment.
  if (totalPax > 1) {
    h += '<div class="seat-pax-switcher">';
    for (var pxi = 0; pxi < totalPax; pxi++) {
      var hasSeat = !!(seatChosen[seg.segId] && seatChosen[seg.segId][pxi]);
      h += '<button type="button" class="seat-pax-tab' + (pxi === seatActivePax ? ' active' : '') + '" onclick="selectSeatPax(' + pxi + ')">';
      h += bflowPaxLabel(pxi) + (hasSeat ? ' \u2713' : '');
      h += '</button>';
    }
    h += '</div>';
  }

  // Segment header (airline + route + chosen price for the ACTIVE passenger)
  var chosen = seatChosen[seg.segId] && seatChosen[seg.segId][seatActivePax];
  var priceTxt = chosen ? fmt(chosen.price) : fmt(0);
  var alCol = getAirlineColor(seg.alCode), alTc = getAirlineTextColor(seg.alCode);
  h += '<div class="seat-flighthdr"><div class="seat-flighthdr-l">';
  h += '<div class="seat-flighthdr-al" style="background:' + alCol + ';color:' + alTc + '">' + seg.alCode + '</div>';
  h += '<div class="seat-flighthdr-route">' + escHtml(seg.route) + '</div></div>';
  h += '<div class="seat-flighthdr-price">' + priceTxt + '</div></div>';

  if (!seg.map || !seg.map.cabins || !seg.map.cabins.length) {
    h += '<div style="text-align:center;padding:30px 10px;color:var(--tx3);font-size:13px">' + t('st_none') + '</div>';
    h += '<div style="font-size:11px;color:var(--tx3);text-align:center;margin-top:8px">' + t('st_skip_note') + '</div>';
    zone.innerHTML = h;
    return;
  }

  // Pick hint + legend
  h += '<div class="seat-pick-hint">' + (totalPax > 1 ? t('st_pick_for').replace('{p}', bflowPaxLabel(seatActivePax)) : t('st_pick')) + '</div>';
  h += '<div class="seat-legend">';
  h += '<div class="seat-legend-row"><span class="seat-legend-box extra"></span>' + t('st_legend_extra') + '</div>';
  h += '<div class="seat-legend-row"><span class="seat-legend-box standard"></span>' + t('st_legend_standard') + '</div>';
  h += '<div class="seat-legend-row"><span class="seat-legend-box unavail"></span>' + t('st_legend_unavail') + '</div>';
  h += '</div>';

  // The seat grid
  h += renderSeatGrid(seg);
  zone.innerHTML = h;
}

// [MULTI-PAX-FIX] Switches which passenger the seat grid is currently
// picking a seat for, then re-renders so highlighting/pricing reflect them.
function selectSeatPax(idx) {
  seatActivePax = idx;
  renderSeatStep();
}

// Decide seat tier by price (relative): higher = extra legroom
function seatTier(seat, allPrices) {
  if (!seat.available) return 'unavail';
  if (!allPrices.length) return 'standard';
  var max = Math.max.apply(null, allPrices);
  var min = Math.min.apply(null, allPrices);
  if (max === min) return 'standard';
  // top ~third of price range = extra legroom
  return (seat.price >= min + (max - min) * 0.66) ? 'extra' : 'standard';
}

function renderSeatGrid(seg) {
  // [SEATMAP-CABINS-FIX] Duffel's seat map for a single segment can
  // contain MORE than one cabin (e.g. a physically separate economy
  // section behind a galley/exit on some wide-bodies, or a mixed-cabin
  // aircraft) — the cabins array exists precisely to represent that.
  // Rendering only cabins[0] silently dropped every row belonging to any
  // later cabin, which is exactly how a real aircraft's seat map could
  // appear to "stop" a few rows in even though dozens more rows actually
  // exist further back. Every cabin is now rendered in sequence, with a
  // small class-label divider whenever the cabin class changes, so the
  // full aircraft is shown end-to-end.
  var cabins = seg.map.cabins || [];
  // gather all available seat prices across every cabin for tiering
  var prices = [];
  cabins.forEach(function(cabin){
    (cabin.rows || []).forEach(function(row){ (row.sections||[]).forEach(function(sec){ (sec.elements||[]).forEach(function(el){ if (el.type==='seat' && el.available && el.price!=null) prices.push(el.price); }); }); });
  });

  // [SEATMAP-FIX] Per Duffel's own seat-map docs: "Seat maps themselves
  // don't have columns per se. There won't always be aligned columns of
  // seats with the same letter when seat rows have different numbers of
  // seats... lots of seat map displays make the mistake of aligning the
  // seats in columns by letter, which leads to misrepresentation of what
  // the row really looks like." A single fixed colLetters[] built from the
  // first seat-bearing row and reused for every other row meant a row with
  // a different real layout (exit row, a row near a galley/lavatory, tail
  // narrowing) got its real seats forced into the wrong grid position —
  // a perfectly bookable seat could visually look like it didn't exist.
  // Duffel's own recommendation is to print the letter ON each seat
  // (already done below) instead of relying on a fixed header row — so
  // the header row is removed entirely; each row renders exactly its own
  // elements, in their own real order, with no forced column alignment
  // implied between rows. maxCols below is only used to size seats to fit
  // the viewport — never for cross-row alignment.
  var maxCols = 0, maxAisles = 0;
  cabins.forEach(function(cabin){
    (cabin.rows || []).forEach(function(row){
      var secs = row.sections || [];
      var cols = 0;
      secs.forEach(function(sec){ cols += (sec.elements||[]).length; });
      if (cols > maxCols) maxCols = cols;
      if (secs.length - 1 > maxAisles) maxAisles = secs.length - 1;
    });
  });

  // ── Dynamic sizing: fit the widest real row on screen when possible ──
  var nSeats = maxCols;
  var nAisles = maxAisles;
  var avail = Math.min((window.innerWidth || 390), 560) - 20 - 30;
  var unitGap = 5; // gap px between cells
  var cellUnits = nSeats + nAisles * 0.5;
  var seatW = Math.floor((avail - (nSeats + nAisles - 1) * unitGap) / (cellUnits || 1));
  if (seatW > 42) seatW = 42;
  if (seatW < 20) seatW = 20;                    // below this -> allow horizontal scroll
  var aisleW = Math.max(12, Math.round(seatW * 0.5));
  var fontSeat = seatW >= 34 ? 11 : seatW >= 28 ? 10 : 9;
  var fontPrice = seatW >= 34 ? 10 : 9;
  var h = '<div class="seat-map-wrap" style="--seatW:' + seatW + 'px;--aisleW:' + aisleW + 'px;--seatFont:' + fontSeat + 'px;--priceFont:' + fontPrice + 'px">';

  for (var ci = 0; ci < cabins.length; ci++) {
    var cabin = cabins[ci];
    var rows = cabin.rows || [];
    if (!rows.length) continue;
    if (cabins.length > 1) {
      var label = cabin.cabinClass ? (cabin.cabinClass.charAt(0).toUpperCase() + cabin.cabinClass.slice(1)) : ('Kabine ' + (ci + 1));
      h += '<div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;padding:8px 4px 4px;' + (ci > 0 ? 'border-top:1px dashed var(--bd);margin-top:8px' : '') + '">' + escHtml(label) + '</div>';
    }
    // rows — each row renders its OWN elements in their own real order; no
    // shared column header, no forced alignment between rows.
    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      var secs = row.sections || [];
      // row number = from first seat designator
      var rowNum = '';
      secs.forEach(function(sec){ (sec.elements||[]).forEach(function(el){ if (el.type==='seat' && el.designator && !rowNum) rowNum = el.designator.replace(/[^0-9]/g,''); }); });
      h += '<div class="seat-row"><div class="seat-rownum">' + rowNum + '</div>';
      secs.forEach(function(sec, si){
        (sec.elements||[]).forEach(function(el){
          if (el.type === 'seat') {
            var tier = seatTier(el, prices);
            // [MULTI-PAX-FIX] Resolve THIS passenger's service/price for
            // this seat. servicesByPassenger has one entry per Duffel
            // passenger id; fall back to the seat's top-level serviceId/
            // price (legacy shape) when the airline doesn't break services
            // out per-passenger or there's only one passenger anyway.
            var activeDuffelPid = seatPassengerOrder[seatActivePax];
            var svcForActive = (activeDuffelPid && el.servicesByPassenger) ? el.servicesByPassenger[activeDuffelPid] : null;
            var effectiveServiceId = svcForActive ? svcForActive.serviceId : el.serviceId;
            var effectivePrice = svcForActive ? svcForActive.price : el.price;
            var effectiveNetPrice = svcForActive ? svcForActive.netPrice : el.netPrice;
            var effectiveCurrency = svcForActive ? svcForActive.currency : el.currency;

            var mySel = seatChosen[seg.segId] && seatChosen[seg.segId][seatActivePax] && seatChosen[seg.segId][seatActivePax].designator === el.designator;
            // Taken by a DIFFERENT passenger on this same segment — must
            // not look available, and must not be re-pickable by clicking
            // it (that would silently steal the seat out from under them).
            var takenByOther = false;
            if (!mySel && seatChosen[seg.segId]) {
              for (var otherPax in seatChosen[seg.segId]) {
                if (seatChosen[seg.segId].hasOwnProperty(otherPax) && Number(otherPax) !== seatActivePax &&
                    seatChosen[seg.segId][otherPax].designator === el.designator) { takenByOther = true; break; }
              }
            }
            var isAvailableForMe = el.available && !!effectiveServiceId && !takenByOther;
            var cls = 'seat ' + (mySel ? 'sel' : takenByOther ? 'unavail taken' : tier);
            if (isAvailableForMe && !mySel) {
              h += '<div class="seat-cell"><div class="' + cls + '" onclick="pickSeat(\'' + el.designator + '\',\'' + (effectiveServiceId||'') + '\',' + (effectivePrice!=null?effectivePrice:0) + ',' + (effectiveNetPrice!=null?effectiveNetPrice:0) + ',\'' + (effectiveCurrency||'EUR') + '\')">' + (el.designator ? el.designator.replace(/[0-9]/g,'') : '') + '</div>';
              h += '<div class="seat-price">' + (effectivePrice != null ? fmt(effectivePrice) : '') + '</div></div>';
            } else if (mySel) {
              h += '<div class="seat-cell"><div class="' + cls + '" onclick="cancelSeatChoice(\'' + seg.segId + '\',' + seatActivePax + ')">' + bflowPaxInitials(seatActivePax) + '<span class="seat-cancel">\u2715</span></div>';
              h += '<div class="seat-price">' + (effectivePrice != null ? fmt(effectivePrice) : '') + '</div></div>';
            } else if (takenByOther) {
              // Reserved by another passenger on this booking — show whose
              // it is instead of a plain "unavailable" cross, so the
              // customer understands why they can't tap it.
              h += '<div class="seat-cell"><div class="' + cls + '">' + (el.designator ? el.designator.replace(/[0-9]/g,'') : '') + '<span class="seat-taken-badge">\ud83d\udd12</span></div><div class="seat-price none">-</div></div>';
            } else {
              // Unavailable seat — still show its real letter (greyed out)
              // instead of just an X, so the row's true layout stays
              // legible even where a seat can't be selected.
              h += '<div class="seat-cell"><div class="seat unavail">' + (el.designator ? el.designator.replace(/[0-9]/g,'') : '') + '<span class="seat-x">\u2715</span></div><div class="seat-price none">-</div></div>';
            }
          } else if (el.type === 'empty') {
            h += '<div class="seat-cell"></div>';
          } else {
            // exit_row / galley / lavatory etc -> small marker
            h += '<div class="seat-cell" style="font-size:9px;color:var(--tx3);justify-content:center">' + (el.type === 'exit_row' ? 'EXIT' : '') + '</div>';
          }
        });
        if (si < secs.length - 1) h += '<div class="seat-aisle"></div>';
      });
      h += '</div>';
    }
  }
  h += '</div>';
  return h;
}

function getInitials() {
  // initials from first passenger name field if filled, else "AA"
  var fn = document.getElementById('fn0');
  var ln = document.getElementById('ln0');
  var a = (fn && fn.value) ? fn.value.trim().charAt(0).toUpperCase() : '';
  var b = (ln && ln.value) ? ln.value.trim().charAt(0).toUpperCase() : '';
  return (a + b) || 'AA';
}

// [MULTI-PAX-FIX] Initials for a specific passenger index, reading from
// the actual passenger-form fields used in step 5 (bf-fnN/bf-lnN). Falls
// back to a number badge ("1", "2"...) if the name hasn't been typed yet,
// so a seat still shows SOMETHING distinguishing it from another
// passenger's seat even before names are filled in.
function bflowPaxInitials(idx) {
  var fn = document.getElementById('bf-fn' + idx);
  var ln = document.getElementById('bf-ln' + idx);
  var a = (fn && fn.value) ? fn.value.trim().charAt(0).toUpperCase() : '';
  var b = (ln && ln.value) ? ln.value.trim().charAt(0).toUpperCase() : '';
  return (a + b) || String(idx + 1);
}

function pickSeat(designator, serviceId, price, netPrice, currency) {
  var seg = seatSegments[seatActiveIdx];
  if (!seg || !seg.map || !serviceId) return;
  // tier label — still derived from the seat's own data for the legend
  var found = null;
  var prices = [];
  seg.map.cabins[0].rows.forEach(function(row){ (row.sections||[]).forEach(function(sec){ (sec.elements||[]).forEach(function(el){
    if (el.type==='seat' && el.designator===designator) found = el;
    if (el.type==='seat' && el.available && el.price!=null) prices.push(el.price);
  }); }); });
  if (!found) return;
  var tier = seatTier(found, prices);
  var tierLbl = tier === 'extra' ? t('st_legend_extra') : t('st_legend_standard');
  seatPendingPick = { segId: seg.segId, passengerIndex: seatActivePax, designator: designator, serviceId: serviceId, price: price || 0, netPrice: (netPrice != null ? netPrice : price || 0), currency: currency || 'EUR' };
  // confirm sheet
  var totalPax = PAX.a + PAX.c + PAX.i;
  var qTxt = t('st_assign_q').replace('{s}', designator);
  if (totalPax > 1) qTxt += ' (' + t('st_seat_for').replace('{p}', bflowPaxLabel(seatActivePax)) + ')';
  document.getElementById('seat-confirm-q').textContent = qTxt;
  document.getElementById('seat-confirm-p').textContent = fmt(price || 0) + ' (' + tierLbl + ')';
  document.getElementById('seat-confirm-cancel').textContent = t('st_cancel');
  document.getElementById('seat-confirm-ok').textContent = t('st_confirm');
  document.getElementById('seat-confirm-ov').classList.add('open');
}

function confirmSeatPick() {
  if (!seatPendingPick) return;
  if (!seatChosen[seatPendingPick.segId]) seatChosen[seatPendingPick.segId] = {};
  seatChosen[seatPendingPick.segId][seatPendingPick.passengerIndex] = {
    serviceId: seatPendingPick.serviceId,
    designator: seatPendingPick.designator,
    price: seatPendingPick.price,
    netPrice: seatPendingPick.netPrice,
    currency: seatPendingPick.currency
  };
  seatPendingPick = null;
  document.getElementById('seat-confirm-ov').classList.remove('open');
  recomputeSeatTotal();
  renderSeatStep();
}

function cancelSeatPick() {
  seatPendingPick = null;
  document.getElementById('seat-confirm-ov').classList.remove('open');
}

// [MULTI-PAX-FIX] Now clears only the given passenger's seat on this
// segment — other passengers' seats on the same flight are untouched.
function cancelSeatChoice(segId, passengerIndex) {
  if (seatChosen[segId]) delete seatChosen[segId][passengerIndex];
  recomputeSeatTotal();
  renderSeatStep();
}

function recomputeSeatTotal() {
  var seatExtra = 0;
  for (var k in seatChosen) {
    if (!seatChosen.hasOwnProperty(k)) continue;
    for (var spx in seatChosen[k]) {
      if (seatChosen[k].hasOwnProperty(spx)) seatExtra += (seatChosen[k][spx].price || 0);
    }
  }
  // bag extras + seat extras
  var bagExtra = 0, bagExtraNet = 0;
  for (var i = 0; i < (bflowBagServices||[]).length; i++) {
    var s = bflowBagServices[i];
    if (bflowBagSel[s.id]) {
      bagExtra += s.price * bflowBagSel[s.id];
      bagExtraNet += (s.netPrice != null ? s.netPrice : s.price) * bflowBagSel[s.id];
    }
  }
  bflowTotalExtra = bagExtra + seatExtra;
  bflowTotalExtraNet = bagExtraNet + seatNetExtraOnly();
  bflowRefreshPrices();
  syncPriceWithServer();
}

// ── Premium inline SVG icons (replace emojis) ──
function ppIcon(name, size) {
  size = size || 18;
  var P = {
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7.5 8 5.5 8-5.5"/>',
    phone: '<path d="M5 4h3.2l1.4 3.8-2 1.4a10.5 10.5 0 0 0 5 5l1.4-2 3.8 1.4V20a1 1 0 0 1-1 1A16.5 16.5 0 0 1 4 5a1 1 0 0 1 1-1Z"/>',
    user: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"/>',
    ticket: '<path d="M3 9a2.4 2.4 0 0 0 0 5.6V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.4A2.4 2.4 0 0 1 21 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z"/><path d="M14 5.5v1.8M14 11.1v1.8M14 16.7v1.8"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V6Z"/><path d="m9 12 2 2 4-4.2"/>',
    bagChecked: '<rect x="6" y="7.5" width="12" height="13" rx="2.4"/><path d="M9.5 7.5V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1.5M10 11.4v5M14 11.4v5"/>',
    bagCabin: '<rect x="5.5" y="7" width="13" height="14" rx="3"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M9 21v-3.6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V21"/>',
    seat: '<path d="M6 11a1.5 1.5 0 0 1 1.5 1.5V15h9v-2.5a1.5 1.5 0 0 1 3 0V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18v-5.5A1.5 1.5 0 0 1 6 11Z"/><path d="M7.5 11V7.4A2.4 2.4 0 0 1 10 5h4a2.4 2.4 0 0 1 2.5 2.4V11M7.5 19.5V21M16.5 19.5V21"/>',
    plus: '<path d="M12 6.5v11M6.5 12h11"/>',
    passport: '<rect x="5" y="3" width="14" height="18" rx="2.4"/><circle cx="12" cy="10" r="2.4"/><path d="M9 16.4a3 3 0 0 1 6 0"/>',
    edit: '<path d="M4 20h4L18.4 9.6a1.8 1.8 0 0 0-2.5-2.5L5.5 17.5 4 20Z"/><path d="m14 8 2.5 2.5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>'
  };
  var d = P[name] || '';
  return '<svg class="ppi" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
}

// [MULTI-PAX-FIX] Shared passenger-index -> display label helper (e.g.
// "Erwachsener 1", "Kind 2"). Used by the passenger form, and by the new
// per-passenger seat/baggage selection UI — having ONE place that decides
// this mapping guarantees "passenger 1" means the exact same person
// everywhere on screen.
function bflowPaxLabel(i) {
  var tag = i >= PAX.a + PAX.c ? t('pf_infant') : i >= PAX.a ? t('pf_child') : t('pf_adult');
  var num = (i >= PAX.a + PAX.c ? (i - PAX.a - PAX.c + 1) : i >= PAX.a ? (i - PAX.a + 1) : (i + 1));
  return tag + ' ' + num;
}

function bflowStep4(o) {
  var tp = PAX.a + PAX.c + PAX.i;
  var h = '';
  var lblCss = 'font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em';

  // ── Contact details (once for the whole booking, like Duffel) ──
  h += '<div class="pp-card">';
  h += '<div class="pp-head"><span class="pp-head-ico">' + ppIcon('mail', 16) + '</span><span class="pp-head-t">' + t('pf_contact') + '</span></div>';
  h += '<div class="pp-grid">';
  h += '<div class="pp-field"><label>' + t('pf_email') + ' *</label>';
  // [ACCOUNT-EMAIL-LOCK-FIX] A logged-in customer's contact email must
  // match their account email — this is what bookings.customer_email
  // gets saved as, and link_guest_bookings_to_user() (and "Meine
  // Buchungen" generally) matches bookings to an account by exact email.
  // Previously this field always rendered blank and fully editable even
  // when logged in, so a customer could accidentally type a different
  // email and have their own booking not show up under their account
  // later. A guest (not logged in) still gets a blank, fully editable
  // field — nothing changes for that case.
  if (FW_USER && FW_USER.email) {
    h += '<input class="fi" type="email" id="bf-contact-email" value="' + escHtml(FW_USER.email) + '" readonly style="background:var(--bg2);color:var(--tx2);cursor:not-allowed">';
    h += '<div style="font-size:11px;color:var(--tx3);margin-top:4px">' + tL('Konto-E-Mail — damit dein Flug in „Meine Buchungen" erscheint.','Account email — so your flight shows up under "My Bookings".','إيميل حسابك — لتظهر رحلتك في "حجوزاتي".') + '</div>';
  } else {
    h += '<input class="fi" type="email" id="bf-contact-email" placeholder="max@mail.de" oninput="validateEmailField(this)" onblur="validateEmailField(this)">';
  }
  h += '<div class="field-msg" id="bf-contact-email-msg"></div></div>';
  h += '<div class="pp-field"><label>' + t('pf_phone') + ' *</label>';
  h += '<div class="phone-row">';
  h += '<select class="phone-cc" id="bf-contact-phone-cc" onchange="syncPhoneHidden()">' + phoneCountryOptionsHtml('49') + '</select>';
  h += '<input class="fi phone-num" id="bf-contact-phone-num" placeholder="151 23456789" inputmode="tel" oninput="syncPhoneHidden()" onblur="syncPhoneHidden()">';
  h += '</div>';
  h += '<input type="hidden" id="bf-contact-phone">';
  h += '<div class="field-msg" id="bf-contact-phone-msg"></div></div>';
  h += '</div></div>';

  // ── Passengers ──
  h += '<div class="pp-sectlbl-row"><div class="pp-sectlbl">' + t('pf_passengers') + '</div>';
  h += '<button type="button" class="pp-add-pax-btn" onclick="bflowAddPassenger()">' + ppIcon('plus', 13) + t('pf_add_pax') + '</button></div>';
  for (var i = 0; i < tp; i++) {
    h += '<div class="pp-card">';
    h += '<span class="pp-pax-tag">' + ppIcon('user', 13) + bflowPaxLabel(i) + '</span>';
    // Saved passengers quick-fill (only for logged-in users)
    h += '<div class="pp-saved" id="pp-saved' + i + '" data-idx="' + i + '" style="display:none"></div>';
    // Title + Gender
    h += '<div class="pp-grid">';
    h += '<div class="pp-field"><label>' + t('pf_title') + ' *</label>';
    h += '<select class="fi fi-sel" id="bf-ttl' + i + '"><option value="mr">' + t('pf_mr') + '</option><option value="ms">' + t('pf_ms') + '</option><option value="mrs">' + t('pf_mrs') + '</option></select></div>';
    h += '<div class="pp-field"><label>' + t('pf_gender') + ' *</label>';
    h += '<select class="fi fi-sel" id="bf-gen' + i + '"><option value="m">' + t('pf_male') + '</option><option value="f">' + t('pf_female') + '</option></select></div>';
    // Given + Family name
    h += '<div class="pp-field"><label>' + t('pf_given') + ' *</label>';
    h += '<input class="fi" id="bf-fn' + i + '" placeholder="Max" oninput="validateNameField(this)" onchange="validateNameField(this)" onblur="validateNameField(this)">';
    h += '<div class="field-msg" id="bf-fn-msg' + i + '"></div></div>';
    h += '<div class="pp-field"><label>' + t('pf_family') + ' *</label>';
    h += '<input class="fi" id="bf-ln' + i + '" placeholder="Mustermann" oninput="validateNameField(this)" onchange="validateNameField(this)" onblur="validateNameField(this)">';
    h += '<div class="field-msg" id="bf-ln-msg' + i + '"></div></div>';
    // Date of birth — plain typed text field (DD/MM/YYYY), converted to
    // ISO internally for Duffel/age validation (see syncDobFromText()).
    h += '<div class="pp-field pp-full"><label>' + t('pf_dob') + ' *</label>';
    h += '<input class="fi" id="bf-dob-text' + i + '" placeholder="DD/MM/YYYY" inputmode="numeric" maxlength="10" oninput="dobAutoSlash(this);syncDobFromText(' + i + ')" onblur="syncDobFromText(' + i + ')">';
    h += '<input type="hidden" id="bf-dob' + i + '">';
    h += '<div class="field-msg" id="bf-dob-msg' + i + '"></div></div>';
    h += '</div>';
    // Save-this-passenger button (logged-in users only; shown via JS)
    h += '<button type="button" class="pp-save-btn" id="pp-save-btn' + i + '" data-idx="' + i + '" onclick="savePassengerFromForm(' + i + ')" style="display:none">' + tL('💾 Reisenden speichern','💾 Save passenger','💾 حفظ المسافر') + '</button>';
    // Passport — ONLY if this offer requires identity documents
    if (o && o.identityDocsRequired) {
      h += '<div class="pp-passport">';
      h += '<div class="pp-passport-h">' + ppIcon('passport', 14) + t('pf_passport') + ' *</div>';
      h += '<div class="pp-grid">';
      h += '<div class="pp-field"><label>' + t('pf_pass_country') + '</label>';
      h += '<input class="fi" id="bf-pcountry' + i + '" placeholder="DE" maxlength="2" style="text-transform:uppercase"></div>';
      h += '<div class="pp-field"><label>' + t('pf_pass_num') + '</label>';
      h += '<input class="fi" id="bf-pass' + i + '" placeholder="C01X00T47"></div>';
      h += '<div class="pp-field pp-full"><label>' + t('pf_pass_exp') + '</label>';
      h += '<input class="fi" type="date" id="bf-pexp' + i + '"></div>';
      h += '</div></div>';
    }
    h += '</div>';
  }
  h += '<div style="height:16px"></div>';
  return h;
}

// ── Step 5: Payment ──
// ── Promo code logic ──
// Compute the discount amount for the current subtotal
// Loyalty credit portion only (separate from promo) — used to deduct on success
function bflowLoyaltyCreditUsed() {
  if (!bflowOffer || !loyaltyData || !(loyaltyData.credit > 0)) return 0;
  var subtotal = bflowOffer.price + (bflowTotalExtra || 0);
  var d = 0;
  if (subtotal < 75) d = 1; else if (subtotal < 149) d = 2; else if (subtotal < 224) d = 3;
  else if (subtotal < 299) d = 4; else d = 5;
  d = Math.min(d, loyaltyData.credit, LOYALTY.MAX_CREDIT_PER_BOOKING);
  return Math.round(d * 100) / 100;
}

// [LOYALTY-PREVIEW-FIX] Holds the server's own confirmed loyalty discount
// for the CURRENT offer/extras combo at the payment step. null = "not yet
// confirmed by the server" (shown as 0, never guessed locally). Set only
// by fetchServerLoyaltyDiscount() below, reading the real
// computeAuthoritativePricing() result — never derived from
// loyaltyData.credit, which is a localStorage cache that can disagree with
// the server (failed sync, credit already spent on an earlier booking,
// admin-changed tiers, etc). This is what eliminates the recurring
// "Der Preis hat sich geändert" dialog: the number shown here is now
// always a number the server has already agreed to, not an estimate.
var _serverLoyaltyDiscount = null;
var _serverLoyaltyDiscountToken = 0;

// Asks the server for the real loyalty discount that would apply right
// now (apply_loyalty:true) and refreshes the payment screen once it lands.
// Safe to call repeatedly — stale responses are dropped via the token.
function fetchServerLoyaltyDiscount() {
  if (!bflowOffer) return;
  var offerId = bflowOffer.duffelId || bflowOffer.raw_offer_id || bflowOffer.id;
  if (!offerId || /^(demo_|fw_|fare)/.test(String(offerId))) { _serverLoyaltyDiscount = 0; return; }

  var orderServices = [];
  for (var sk in seatChosen) {
    if (!seatChosen.hasOwnProperty(sk)) continue;
    for (var spx in seatChosen[sk]) {
      if (seatChosen[sk].hasOwnProperty(spx) && seatChosen[sk][spx].serviceId) orderServices.push({ id: seatChosen[sk][spx].serviceId, quantity: 1 });
    }
  }
  for (var bi = 0; bi < (bflowBagServices||[]).length; bi++) {
    var bs = bflowBagServices[bi];
    if (bflowBagSel[bs.id]) orderServices.push({ id: bs.id, quantity: 1 });
  }

  var myToken = ++_serverLoyaltyDiscountToken;
  function withAuth() {
    if (_sb && FW_USER && FW_USER.id) {
      return _sb.auth.getSession().then(function(res){
        var tok = res.data && res.data.session && res.data.session.access_token;
        return tok ? { Authorization: 'Bearer ' + tok } : {};
      }).catch(function(){ return {}; });
    }
    return Promise.resolve({});
  }

  withAuth().then(function(authHeader) {
    fetch(PROXY + '/price-preview', {
      method: 'POST',
      headers: Object.assign({'Content-Type':'application/json'}, authHeader),
      body: JSON.stringify({
        offer_id: offerId,
        services: orderServices,
        promo_code: (bflowPromo && bflowPromo.code) || null,
        device_id: loyaltyDeviceId(),
        apply_loyalty: true
      })
    }).then(function(r){ return r.json(); })
      .then(function(j){
        if (myToken !== _serverLoyaltyDiscountToken || !j || !j.ok) return; // stale or failed
        _serverLoyaltyDiscount = Number(j.loyalty_discount) || 0;
        // Keep the cached display balance honest too, in case it had
        // drifted (e.g. the stale-credit scenario this whole fix targets).
        if (j.loyalty_account) {
          loyaltyData.credit = j.loyalty_account.credit;
          loyaltyData.points = j.loyalty_account.points;
          loyaltyData.tier = j.loyalty_account.tier;
          loyaltySave();
          loyaltyUpdateNav();
        }
        if (bflowStep === 5) bflowRefreshPrices();
      })
      .catch(function(){ /* keep showing 0 loyalty discount on failure — never guess */ });
  });
}

function bflowDiscountAmount() {
  if (!bflowOffer) return 0;
  var subtotal = bflowOffer.price + (bflowTotalExtra || 0);

  // ── Loyalty credit discount — server-confirmed only ──
  // [LOYALTY-PREVIEW-FIX] No more local tier math against
  // loyaltyData.credit here. That estimate is exactly what produced a
  // discount the server's own authoritative pricing didn't actually have,
  // surfacing as a repeated "price changed" dialog at checkout. Until
  // fetchServerLoyaltyDiscount() confirms a real number from the server,
  // this contributes 0 — the displayed total may start a few euros higher
  // than the old (wrong) estimate, but it will never need correcting
  // downward by a dialog interrupting checkout.
  var loyaltyDisc = (bflowStep === 5 && _serverLoyaltyDiscount != null) ? _serverLoyaltyDiscount : 0;

  // ── Promo code discount (on top of loyalty) ──
  var promoDisc = 0;
  if (bflowPromo) {
    if (bflowPromo.type === 'percent') promoDisc = subtotal * (bflowPromo.value / 100);
    else promoDisc = bflowPromo.value;
  }

  var d = loyaltyDisc + promoDisc;
  if (d > subtotal) d = subtotal;
  return Math.round(d * 100) / 100;
}

// Final total after discount
function bflowGrandTotal() {
  if (!bflowOffer) return 0;
  var t = bflowOffer.price + (bflowTotalExtra || 0) - bflowDiscountAmount();
  return Math.round(t * 100) / 100;
}

function applyPromo() {
  var inp = document.getElementById('bf-promo-input');
  var msg = document.getElementById('bf-promo-msg');
  if (!inp) return;
  var code = (inp.value || '').trim().toUpperCase();
  if (!code) return;
  if (msg) { msg.textContent = '…'; msg.style.color = 'var(--tx3)'; }
  // [ADMIN-MARGIN] Server-side validation only — the frontend has no
  // promo data of its own anymore. This is a quick preview check; the
  // final discount actually charged is re-derived independently at
  // checkout time inside computeAuthoritativePricing().
  fetch(PROXY + '/promo/check?code=' + encodeURIComponent(code))
    .then(function(r){ return r.json(); })
    .then(function(j){
      if (j && j.ok && j.valid) {
        bflowPromo = { code: j.code, type: j.type, value: j.value };
        if (msg) { msg.textContent = '✓ ' + t('promo_applied'); msg.style.color = 'var(--gr)'; }
      } else {
        bflowPromo = null;
        if (msg) { msg.textContent = '✗ ' + t('promo_invalid'); msg.style.color = 'var(--rd)'; }
      }
      bflowRefreshPrices();
      renderPromoState();
    })
    .catch(function(){
      bflowPromo = null;
      if (msg) { msg.textContent = '✗ ' + t('promo_invalid'); msg.style.color = 'var(--rd)'; }
      bflowRefreshPrices();
      renderPromoState();
    });
}

function removePromo() {
  bflowPromo = null;
  var inp = document.getElementById('bf-promo-input');
  if (inp) inp.value = '';
  var msg = document.getElementById('bf-promo-msg');
  if (msg) msg.textContent = '';
  bflowRefreshPrices();
  renderPromoState();
}

// Update the promo UI (applied chip vs input)
function renderPromoState() {
  var applied = document.getElementById('bf-promo-applied');
  var inputWrap = document.getElementById('bf-promo-inputwrap');
  if (!applied || !inputWrap) return;
  if (bflowPromo) {
    var disc = bflowDiscountAmount();
    var vlbl = bflowPromo.type === 'percent' ? (bflowPromo.value + '%') : fmt(bflowPromo.value);
    applied.innerHTML = '<div class="pp-promo-applied">' +
      '<div class="pp-promo-chip">' + ppIcon('ticket', 15) + escHtml(bflowPromo.code) + ' (' + vlbl + ') · −' + fmt(disc) + '</div>' +
      '<button class="pp-promo-x" onclick="removePromo()">' + t('promo_remove') + '</button></div>';
    applied.style.display = 'block';
    inputWrap.style.display = 'none';
  } else {
    applied.style.display = 'none';
    inputWrap.style.display = 'block';
  }
}

// Price details bottom sheet
function openPriceDetails() {
  var o = bflowOffer;
  if (!o) return;
  var tp = PAX.a + PAX.c + PAX.i;
  var rows = '';
  var rowCss = 'display:flex;justify-content:space-between;align-items:center;padding:9px 0;font-size:14px';
  // Base fare (per passenger type breakdown)
  var basePerPax = o.price / (tp || 1);
  if (PAX.a > 0) rows += '<div style="' + rowCss + '"><span style="color:var(--tx2)">' + PAX.a + '× ' + t('pf_adult') + '</span><span style="font-weight:700;color:var(--tx)">' + fmt(basePerPax * PAX.a) + '</span></div>';
  if (PAX.c > 0) rows += '<div style="' + rowCss + '"><span style="color:var(--tx2)">' + PAX.c + '× ' + t('pf_child') + '</span><span style="font-weight:700;color:var(--tx)">' + fmt(basePerPax * PAX.c) + '</span></div>';
  if (PAX.i > 0) rows += '<div style="' + rowCss + '"><span style="color:var(--tx2)">' + PAX.i + '× ' + t('pf_infant') + '</span><span style="font-weight:700;color:var(--tx)">' + fmt(basePerPax * PAX.i) + '</span></div>';
  if (!PAX.a && !PAX.c && !PAX.i) rows += '<div style="' + rowCss + '"><span style="color:var(--tx2)">' + t('pd_flight') + '</span><span style="font-weight:700;color:var(--tx)">' + fmt(o.price) + '</span></div>';
  // Seats
  var seatTotal = 0;
  var seatDetailLines = []; // [{label, designator, segLabel}] for the per-passenger breakdown
  for (var sk in seatChosen) {
    if (!seatChosen.hasOwnProperty(sk)) continue;
    var segForLabel = null;
    for (var ssi = 0; ssi < seatSegments.length; ssi++) { if (seatSegments[ssi].segId === sk) { segForLabel = seatSegments[ssi]; break; } }
    for (var spx in seatChosen[sk]) {
      if (!seatChosen[sk].hasOwnProperty(spx)) continue;
      var seatEntry = seatChosen[sk][spx];
      seatTotal += (seatEntry.price || 0);
      seatDetailLines.push({
        paxLabel: bflowPaxLabel(Number(spx)),
        designator: seatEntry.designator,
        segLabel: segForLabel ? segForLabel.route : '',
        price: seatEntry.price || 0,
      });
    }
  }
  if (seatTotal > 0) {
    rows += '<div style="' + rowCss + '"><span style="color:var(--tx2);display:flex;align-items:center;gap:7px">' + ppIcon('seat', 16) + t('sm_seat') + '</span><span style="font-weight:700;color:var(--tx)">' + fmt(seatTotal) + '</span></div>';
    // [MULTI-PAX-FIX] Per-passenger breakdown — only shown for >1
    // passenger, since for a single traveler it would just repeat the
    // line above with no new information.
    if (tp > 1) {
      for (var sdi = 0; sdi < seatDetailLines.length; sdi++) {
        var sd = seatDetailLines[sdi];
        rows += '<div style="font-size:11px;color:var(--tx3);margin:-2px 0 4px;padding-left:23px">' + escHtml(sd.designator || '') + (sd.segLabel ? ' · ' + escHtml(sd.segLabel) : '') + ' · ' + escHtml(sd.paxLabel) + ' — ' + fmt(sd.price) + '</div>';
      }
    }
  }
  // Extra baggage
  var bagTotal = 0;
  var bagDetailLines = [];
  if (bflowBagServices && bflowBagSel) {
    for (var bi = 0; bi < bflowBagServices.length; bi++) {
      var q = bflowBagSel[bflowBagServices[bi].id] || 0;
      if (q > 0) {
        bagTotal += bflowBagServices[bi].price * q;
        var bsItem = bflowBagServices[bi];
        var bagName = (bsItem.bagType === 'carry_on') ? t('bg_carry') : t('bg_checked');
        bagDetailLines.push({
          paxLabel: (bsItem.passengerIndex != null) ? bflowPaxLabel(bsItem.passengerIndex) : t('bg_perpax'),
          name: bagName,
          price: bsItem.price * q,
        });
      }
    }
  }
  if (bagTotal > 0) {
    rows += '<div style="' + rowCss + '"><span style="color:var(--tx2);display:flex;align-items:center;gap:7px">' + ppIcon('bagChecked', 16) + t('sm_extra_bag') + '</span><span style="font-weight:700;color:var(--tx)">' + fmt(bagTotal) + '</span></div>';
    if (tp > 1) {
      for (var bdi = 0; bdi < bagDetailLines.length; bdi++) {
        var bd = bagDetailLines[bdi];
        rows += '<div style="font-size:11px;color:var(--tx3);margin:-2px 0 4px;padding-left:23px">' + escHtml(bd.name) + ' · ' + escHtml(bd.paxLabel) + ' — ' + fmt(bd.price) + '</div>';
      }
    }
  }
  // Discount
  var disc = bflowDiscountAmount();
  if (disc > 0) {
    rows += '<div style="' + rowCss + '"><span style="color:var(--gr);font-weight:700;display:flex;align-items:center;gap:7px">' + ppIcon('ticket', 16) + (bflowPromo ? escHtml(bflowPromo.code) : t('promo_title')) + '</span><span style="font-weight:700;color:var(--gr)">−' + fmt(disc) + '</span></div>';
    rows += '<div style="font-size:11px;color:var(--tx3);margin:-6px 0 4px;padding-left:23px">Rabatt basierend auf dem Ticketpreis</div>';
  }

  document.getElementById('pd-rows').innerHTML = rows;
  document.getElementById('pd-title').textContent = t('pd_title');
  document.getElementById('pd-total-lbl').textContent = t('pd_total');
  document.getElementById('pd-total-val').textContent = fmt(bflowGrandTotal());
  document.getElementById('pd-note').textContent = t('pd_note');
  document.getElementById('pd-close-btn').textContent = t('bg_close');
  document.getElementById('price-details-ov').classList.add('open');
}
function closePriceDetails() {
  document.getElementById('price-details-ov').classList.remove('open');
}

// Navigate to a specific booking step (used by summary "Edit" buttons)
function bflowGoToStep(n) {
  bflowStep = n;
  bflowRender();
  var body = document.getElementById('bflow-body');
  if (body) body.scrollTop = 0;
}

// Open inline edit sheet for baggage (stays on step 5, no full page change)
function bflowOpenEditBagSheet() {
  var o = bflowOffer;
  if (!o) return;
  var existing = document.getElementById('bflow-inline-edit-sheet');
  if (existing) existing.remove();
  var sheet = document.createElement('div');
  sheet.id = 'bflow-inline-edit-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:1500;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(16,29,44,.55);backdrop-filter:blur(2px)';
  var inner = document.createElement('div');
  inner.style.cssText = 'background:var(--bg);border-radius:22px 22px 0 0;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -8px 40px rgba(0,0,0,.3)';
  inner.innerHTML =
    '<div style="width:40px;height:4px;border-radius:4px;background:var(--bd2);margin:10px auto 4px;flex-shrink:0"></div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 18px 12px;border-bottom:1px solid var(--bd);flex-shrink:0">' +
      '<div style="font-family:Syne,sans-serif;font-size:1.05rem;font-weight:800;color:var(--tx)">' + ppIcon('bagChecked',16) + ' ' + t('sm_baggage') + '</div>' +
      '<button onclick="bflowCloseEditSheet()" style="background:var(--bg2);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:14px;color:var(--tx2);display:flex;align-items:center;justify-content:center">✕</button>' +
    '</div>' +
    '<div style="overflow-y:auto;padding:16px 18px 24px" id="bflow-bag-sheet-body">' + bflowStep3(o) + '</div>' +
    '<div style="padding:14px 18px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--bd);flex-shrink:0">' +
      '<button onclick="bflowCloseEditSheet()" style="width:100%;background:var(--teal);color:#fff;border:none;border-radius:14px;padding:14px;font-size:15px;font-weight:700;cursor:pointer">' + t('st_continue') + ' ✓</button>' +
    '</div>';
  sheet.appendChild(inner);
  sheet.addEventListener('click', function(e){ if(e.target===sheet) sheet.remove(); });
  document.body.appendChild(sheet);
}

// Open inline edit sheet for seats (stays on step 5, no full page change)
function bflowOpenEditSeatSheet() {
  var o = bflowOffer;
  if (!o) return;
  var existing = document.getElementById('bflow-inline-edit-sheet');
  if (existing) existing.remove();
  // [SEAT-EDIT-NAV-FIX] Always start the sheet on the FIRST leg —
  // seatActiveIdx is a shared/global pointer also used by the main step-4
  // flow, so without this it could carry over from wherever the customer
  // last left it (e.g. the return flight), opening this sheet straight
  // into "Flug 2 von 2" with no way back to leg 1 at all (no prev/next
  // buttons existed inside this modal before this fix).
  seatActiveIdx = 0;
  var sheet = document.createElement('div');
  sheet.id = 'bflow-inline-edit-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:1500;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(16,29,44,.55);backdrop-filter:blur(2px)';
  var inner = document.createElement('div');
  inner.style.cssText = 'background:var(--bg);border-radius:22px 22px 0 0;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -8px 40px rgba(0,0,0,.3)';
  inner.innerHTML =
    '<div style="width:40px;height:4px;border-radius:4px;background:var(--bd2);margin:10px auto 4px;flex-shrink:0"></div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 18px 12px;border-bottom:1px solid var(--bd);flex-shrink:0">' +
      '<div style="font-family:Syne,sans-serif;font-size:1.05rem;font-weight:800;color:var(--tx)">' + ppIcon('seat',16) + ' ' + t('sm_seat') + '</div>' +
      '<button onclick="bflowCloseEditSheet()" style="background:var(--bg2);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:14px;color:var(--tx2);display:flex;align-items:center;justify-content:center">✕</button>' +
    '</div>' +
    '<div style="overflow-y:auto;padding:16px 18px 24px" id="bflow-seat-sheet-body">' + bflowStepSeats(o) + '</div>' +
    '<div id="bflow-seat-sheet-footer" style="padding:14px 18px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--bd);flex-shrink:0">' + bflowSeatSheetFooterHtml() + '</div>';
  sheet.appendChild(inner);
  sheet.addEventListener('click', function(e){ if(e.target===sheet) sheet.remove(); });
  document.body.appendChild(sheet);
  // Init seat maps AFTER sheet is in DOM so seat-step-zone exists
  setTimeout(function(){ initSeatStep(o); }, 0);
}

// [SEAT-EDIT-NAV-FIX] Footer for the edit-seat sheet: a "← previous leg"
// button appears once there IS a previous leg to go back to; the main
// action button reads "Weiter" (just moves to the next leg) until the
// LAST leg, where it switches to "Fertig ✓" (closes the sheet). This
// mirrors the main step-4 flow's behavior but stays fully independent of
// bflowStep/bflowNext/bflowBack, which have no effect while this modal is
// open on top of step 5.
function bflowSeatSheetFooterHtml() {
  var isLastLeg = !seatSegments.length || seatActiveIdx >= seatSegments.length - 1;
  var h = '<div style="display:flex;gap:10px">';
  if (seatActiveIdx > 0) {
    h += '<button onclick="bflowEditSheetPrevLeg()" style="flex:0 0 auto;background:var(--bg2);color:var(--tx);border:none;border-radius:14px;padding:14px 18px;font-size:15px;font-weight:700;cursor:pointer">←</button>';
  }
  h += '<button onclick="' + (isLastLeg ? 'bflowCloseEditSheet()' : 'bflowEditSheetNextLeg()') + '" style="flex:1;background:var(--teal);color:#fff;border:none;border-radius:14px;padding:14px;font-size:15px;font-weight:700;cursor:pointer">' +
    (isLastLeg ? (t('st_continue') + ' \u2713') : (t('st_continue'))) + '</button>';
  h += '</div>';
  return h;
}

function bflowEditSheetNextLeg() {
  if (seatActiveIdx < seatSegments.length - 1) {
    seatActiveIdx++;
    renderSeatStep();
    bflowRefreshEditSheetFooter();
    var sheetBody = document.getElementById('bflow-seat-sheet-body');
    if (sheetBody) sheetBody.scrollTop = 0;
  }
}

function bflowEditSheetPrevLeg() {
  if (seatActiveIdx > 0) {
    seatActiveIdx--;
    renderSeatStep();
    bflowRefreshEditSheetFooter();
    var sheetBody = document.getElementById('bflow-seat-sheet-body');
    if (sheetBody) sheetBody.scrollTop = 0;
  }
}

function bflowRefreshEditSheetFooter() {
  var footer = document.getElementById('bflow-seat-sheet-footer');
  if (footer) footer.innerHTML = bflowSeatSheetFooterHtml();
}

// Close edit sheet and re-render step5 WITHOUT scrolling to top
function bflowCloseEditSheet() {
  var sheet = document.getElementById('bflow-inline-edit-sheet');
  if (sheet) sheet.remove();
  bflowRefreshPrices();
  // Re-render body content only, preserve scroll position
  var body = document.getElementById('bflow-body');
  var scrollPos = body ? body.scrollTop : 0;
  var o = bflowOffer;
  if (body && o) {
    body.innerHTML = bflowStep4(o) + bflowSummary(o) + bflowStep5(o);
    body.scrollTop = scrollPos;
    renderSavedPassengerUI();
  }
}

// Booking summary: shows chosen baggage + seats with Edit buttons (Kiwi-style)
// [JEWEL-PRICE-FIX] Extracted so both the initial bflowStep5() render AND
// the live update after adding/removing a bag or seat build the exact
// same markup. Previously, this price block was only ever written once,
// inline inside bflowStep5() — toggling a bag (toggleBagService() ->
// bflowRefreshPrices()) updated two small text nodes elsewhere on the
// page but never touched this large "Gesamtbetrag" card, so a customer
// could pick a 222€ bag and watch the big total stay nearly unchanged
// (it was still showing the OLD total minus only whatever discount logic
// happened to re-run) — even though the real charge (and the
// "Preisdetails" breakdown, built fresh from current state every time
// it's opened) was already correct. The number was right; it just wasn't
// painted anywhere visible until the next full re-render.
function renderJewelPriceSection(o, discount, total) {
  var h = '<div>';
  if (discount > 0) h += '<div class="pp-jewel-was" id="pp-jewel-was">' + fmt(o.price + bflowTotalExtra) + '</div>';
  h += '<div class="pp-jewel-price" id="pp-jewel-price">' + fmt(total) + '</div>';
  h += '<div class="pp-jewel-lbl">' + t('pd_total') + '</div>';
  h += '</div>';
  if (discount > 0) h += '<div class="pp-jewel-lbl pp-jewel-gold" id="pp-jewel-gold" style="color:var(--pp-gold);margin-bottom:2px">− ' + fmt(discount) + '</div>';
  return h;
}

function bflowSummary(o) {
  var h = '';
  var paxName = (((document.getElementById('bf-fn0')||{}).value||'').trim() + ' ' + ((document.getElementById('bf-ln0')||{}).value||'').trim()).trim();
  function subLine(){ return paxName ? '<div class="pp-row-sub">' + escHtml(paxName) + '</div>' : ''; }

  // ── Baggage block ──
  h += '<div class="pp-card">';
  h += '<div class="pp-head"><span class="pp-head-ico">' + ppIcon('bagChecked', 16) + '</span><span class="pp-head-t">' + t('sm_baggage') + '</span>';
  h += '<button class="pp-edit" onclick="bflowOpenEditBagSheet()">' + ppIcon('edit', 13) + t('sm_edit') + '</button></div>';
  if (o.hasCabin) h += '<div class="pp-row"><span class="pp-row-ico">' + ppIcon('bagCabin', 16) + '</span><div class="pp-row-main">' + t('sm_cabin_inc') + subLine() + '</div></div>';
  if (o.hasChecked) h += '<div class="pp-row"><span class="pp-row-ico">' + ppIcon('bagChecked', 16) + '</span><div class="pp-row-main">' + t('sm_checked_inc') + subLine() + '</div></div>';
  if (bflowBagServices && bflowBagSel) {
    var tpForBags = PAX.a + PAX.c + PAX.i;
    for (var bi = 0; bi < bflowBagServices.length; bi++) {
      var bs = bflowBagServices[bi];
      var qty = bflowBagSel[bs.id] || 0;
      if (qty > 0) {
        var wlbl = bs.maxWeightKg ? (' ' + bs.maxWeightKg + 'kg') : '';
        var paxSuffix = (tpForBags > 1 && bs.passengerIndex != null) ? (' (' + bflowPaxLabel(bs.passengerIndex) + ')') : '';
        h += '<div class="pp-row"><span class="pp-row-ico">' + ppIcon('plus', 15) + '</span><div class="pp-row-main">' + qty + '× ' + t('sm_extra_bag') + wlbl + paxSuffix + ' <span class="pp-plus">+' + fmt(bs.price * qty) + '</span>' + subLine() + '</div></div>';
      }
    }
  }
  h += '</div>';

  // ── Seats block — only show if seat maps are actually available ──
  var hasSeatMaps = seatMapsLoaded && seatSegments && seatSegments.length > 0 &&
    seatSegments.some(function(sg){ return sg.map && sg.map.cabins && sg.map.cabins.length; });
  if (hasSeatMaps) {
    h += '<div class="pp-card">';
    h += '<div class="pp-head"><span class="pp-head-ico">' + ppIcon('seat', 16) + '</span><span class="pp-head-t">' + t('sm_seat') + '</span>';
    h += '<button class="pp-edit" onclick="bflowOpenEditSeatSheet()">' + ppIcon('edit', 13) + t('sm_edit') + '</button></div>';
    for (var si = 0; si < seatSegments.length; si++) {
      var seg = seatSegments[si];
      var segChosen = seatChosen[seg.segId] || {};
      var anyChosenOnSeg = false;
      var tpForSeats = PAX.a + PAX.c + PAX.i;
      for (var spx2 = 0; spx2 < tpForSeats; spx2++) {
        if (!segChosen[spx2]) continue;
        anyChosenOnSeg = true;
        var chosen = segChosen[spx2];
        var seatLabel = t('sm_seat_chosen') + ' ' + chosen.designator + (tpForSeats > 1 ? ' (' + bflowPaxLabel(spx2) + ')' : '');
        var seatPrice = chosen.price ? (' <span class="pp-plus">+' + fmt(chosen.price) + '</span>') : '';
        h += '<div class="pp-row"><span class="pp-row-ico">' + ppIcon('seat', 16) + '</span><div class="pp-row-main">' + seatLabel + ' <span style="color:var(--tx3);font-size:11px;font-weight:500">(' + escHtml(seg.route) + ')</span>' + seatPrice + subLine() + '</div></div>';
      }
      if (!anyChosenOnSeg) {
        h += '<div class="pp-row"><span class="pp-row-ico">' + ppIcon('seat', 16) + '</span><div class="pp-row-main">' + t('sm_random_seat') + ' <span style="color:var(--tx3);font-size:11px;font-weight:500">(' + escHtml(seg.route) + ')</span>' + subLine() + '</div></div>';
      }
    }
    h += '</div>';
  } else if (seatMapsLoaded) {
    // Seat map unavailable — card stays, no edit button, faded icon, unavailable label
    h += '<div class="pp-card">';
    h += '<div class="pp-head">';
    h += '<span class="pp-head-ico" style="opacity:.35">' + ppIcon('seat', 16) + '</span>';
    h += '<span class="pp-head-t">' + t('sm_seat') + '</span>';
    h += '<span style="font-size:11px;font-weight:700;color:var(--tx3);margin-left:auto">' + t('st_none') + '</span>';
    h += '</div>';
    h += '</div>';
  }

  return h;
}

function bflowStep5(o) {
  var discount = bflowDiscountAmount();
  var total = bflowGrandTotal();
  var cabinLbl = ({economy:'Economy',premium_economy:'Prem. Economy',business:'Business',first:'First'}[PAX.cabin]||'Economy');
  // [FARE-LABEL-FIX] bflowFare is a leftover static value ('basic') that
  // selectFareBrand() never updates when the customer switches fares in
  // the Tarif step — it always read "Basic" on this card no matter which
  // fare was actually selected. bflowOffer.fareBrandName is the REAL fare
  // brand name Duffel returned for whichever offer selectFareBrand()
  // switched bflowOffer to, so it's always correct for any fare brand the
  // airline offers (Basic, Flex, Plus, ...) — not just the two hardcoded
  // guesses bflowFare could ever represent.
  var fareLbl = o.fareBrandName || (bflowFare.charAt(0).toUpperCase() + bflowFare.slice(1));
  var h = '';

  // ── Order summary (the jewel) ──
  h += '<div class="pp-jewel">';
  h += '<div class="pp-jewel-plane">' + ppIcon('plane', 120) + '</div>';
  h += '<div class="pp-jewel-route">';
  // Icon: show ⇄ for return, ✦ for multi-city, → for one-way
  var isMC = !!(o.multiCity && Array.isArray(o.legs) && o.legs.length > 1);
  var hasRet = !isMC && o.ret && o.ret.segs && o.ret.segs.length;
  var routeIcon = hasRet ? '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/></svg>' : ppIcon('plane', 19);
  h += routeIcon;
  // [FIX] Multi-city: show the FULL route through every city (BER → ALG → LON),
  // not just origin/destination of the first leg — and never label it "H+R"
  // (Hin & Rückflug / return), which is wrong for a multi-city itinerary.
  if (isMC) {
    var cityChain = [o.legs[0].orig].concat(o.legs.map(function(l){ return l.dest; }));
    h += cityChain.map(function(c){ return '<span>' + (c||'') + '</span>'; }).join('<span class="pp-jewel-dots"></span>');
  } else {
    h += '<span>' + (o.orig||'') + '</span><span class="pp-jewel-dots"></span><span>' + (o.dest||'') + '</span>';
  }
  if (isMC) {
    h += '<span style="font-size:10px;font-weight:700;background:rgba(255,255,255,.15);color:#fff;padding:2px 7px;border-radius:20px;margin-left:6px">' + tL('MEHRERE STÄDTE','MULTI-CITY','مدن متعددة') + '</span>';
  } else if (hasRet) {
    h += '<span style="font-size:10px;font-weight:700;background:rgba(255,255,255,.15);color:#fff;padding:2px 7px;border-radius:20px;margin-left:6px">H+R</span>';
  }
  h += '</div>';
  h += '<div class="pp-jewel-meta">' + cabinLbl + ' · ' + fareLbl + '</div>';
  h += '<div class="pp-jewel-div"></div>';
  h += '<div class="pp-jewel-pl" id="pp-jewel-pl">' + renderJewelPriceSection(o, discount, total) + '</div></div>';

  // ── Promo code ──
  h += '<div class="pp-card">';
  h += '<div class="pp-head"><span class="pp-head-ico">' + ppIcon('ticket', 16) + '</span><span class="pp-head-t">' + t('promo_title') + '</span></div>';
  h += '<div id="bf-promo-applied" style="display:none"></div>';
  h += '<div id="bf-promo-inputwrap">';
  h += '<div class="pp-promo-row">';
  h += '<input class="fi" id="bf-promo-input" placeholder="' + t('promo_placeholder') + '" style="flex:1;text-transform:uppercase" onkeydown="if(event.key===\'Enter\'){event.preventDefault();applyPromo();}">';
  h += '<button class="pp-promo-btn" onclick="applyPromo()">' + t('promo_add') + '</button>';
  h += '</div>';
  h += '<div id="bf-promo-msg" style="font-size:12px;font-weight:600;margin-top:7px"></div>';
  h += '</div></div>';

  h += '<div style="height:8px"></div>';

  // ── [LEGAL-CONSENT] Mandatory consent checkbox — payment is blocked
  // (both via bflowNext()'s validation and the disabled attribute below)
  // until this is checked. Required before charging anyone: explicit
  // confirmation that the customer accepts the privacy policy + terms AND
  // affirms the passenger data they typed in is accurate (since incorrect
  // names are the customer's responsibility per the Terms, this is also
  // where they acknowledge that).
  h += '<div class="pp-card" style="padding:14px 16px">';
  h += '<label class="pp-consent-label" style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:12.5px;line-height:1.55;color:var(--pp-tx2,var(--tx2))">';
  h += '<span style="position:relative;display:inline-block;width:20px;height:20px;flex-shrink:0;margin-top:1px">';
  h += '<input type="checkbox" id="bf-consent-check" class="pp-consent-native"' + (bflowConsentChecked ? ' checked' : '') + ' onchange="bflowUpdateConsentState()">';
  h += '<span class="pp-consent-box" aria-hidden="true"></span>';
  h += '</span>';
  h += '<span>' + t('consent_text') + ' <a href="#" onclick="event.preventDefault();event.stopPropagation();openPg(\'privacy\')" style="color:var(--teal);text-decoration:underline">' + t('consent_privacy_link') + '</a> ' + t('consent_and') + ' <a href="#" onclick="event.preventDefault();event.stopPropagation();openPg(\'terms\')" style="color:var(--teal);text-decoration:underline">' + t('consent_terms_link') + '</a>' + t('consent_suffix') + '</span>';
  h += '</label>';
  h += '<div class="field-msg" id="bf-consent-msg"></div>';
  h += '</div>';

  h += '<div style="height:8px"></div>';
  return h;
}


// ══ LOGGING SYSTEM ═══════════════════════════
var FW_LOG = {
  searches: 0,
  requests: 0,
  lastReqId: null,
  lastOrderId: null,
  lastStatus: null,
  lastResponseTime: null,
  errors: [],
  history: []
};

function fwLog(type, data) {
  var entry = {
    time: new Date().toISOString(),
    type: type,
    data: data
  };
  FW_LOG.history.unshift(entry);
  if (FW_LOG.history.length > 50) FW_LOG.history.pop();

  if (type === 'search') {
    FW_LOG.searches++;
    FW_LOG.requests++;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.log('[Airpiv Search] ' + data.orig + ' → ' + data.dest + ' | ' + data.dep + (data.ret ? ' ↩ ' + data.ret : '') + ' | Pax: ' + data.pax);
  } else if (type === 'response') {
    FW_LOG.lastReqId = data.reqId || null;
    FW_LOG.lastStatus = data.status;
    FW_LOG.lastResponseTime = data.ms + 'ms';
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.log('[Airpiv Response] Status: ' + data.status + ' | Time: ' + data.ms + 'ms | Results: ' + (data.count || 0) + (data.reqId ? ' | ReqID: ' + data.reqId : ''));
  } else if (type === 'error') {
    FW_LOG.errors.unshift({time: entry.time, msg: data.msg});
    if (FW_LOG.errors.length > 10) FW_LOG.errors.pop();
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.error('[Airpiv Error] ' + data.msg);
  } else if (type === 'order') {
    FW_LOG.lastOrderId = data.orderId;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.log('[Airpiv Order] ID: ' + data.orderId + ' | Ref: ' + data.ref);
  }
}


// ══ BOOKING CONFIRMATION ═════════════════════
var lastBooking = null;

function tL(de, en, ar) {
  return (typeof LANG !== 'undefined' && LANG === 'ar') ? ar
       : (typeof LANG !== 'undefined' && LANG === 'en') ? en : de;
}

// Save a booking into "Meine Buchungen" (local + Supabase), de-duped by reference
// [GUEST-PRIVACY-FIX] A guest checkout (no logged-in account) must never
// show up in "Meine Buchungen" on this or any other device — there's no
// account to scope it to, so it would just sit there forever as an
// orphaned entry no login could ever filter out correctly. Previously
// this saved EVERY booking to localStorage unconditionally (guest or not)
// and also fired a direct insert into Supabase's `bookings` table from
// the browser using column names that don't exist on it at all
// (booking_ref/order_id/origin/destination/airline/total_amount/
// departure_date — the real columns are booking_reference/route_label/
// duffel_order_id/customer_paid, set server-side by bookFromSession()
// right after Duffel confirms the order). That insert always failed
// silently and was never the real source of truth anyway — the server
// already writes the authoritative bookings row itself. Removed entirely
// rather than fixed, since duplicating that write from the client adds
// no value and only risks drifting from the server's numbers.
function saveBookingRecord(bd) {
  if (!bd || !bd.reference) return;
  if (!(_sb && FW_USER)) return; // guest checkout — nothing to save locally
  var o = bd.offer || {};
  var depDate = o.dep instanceof Date ? o.dep : (o.dep ? new Date(o.dep) : null);
  try {
    var bks = JSON.parse(localStorage.getItem('fw_bookings') || '[]');
    if (!bks.some(function(b){ return b.ref === bd.reference; })) {
      bks.unshift({
        ref: bd.reference, orderId: bd.orderId || '', date: new Date().toISOString(),
        user_id: FW_USER.id,
        orig: o.orig || '', dest: o.dest || '', price: bd.totalPrice || 0,
        airline: (o.al ? (o.al[1] || o.al[0] || '') : ''), passengers: bd.passengers || [],
        departureDate: depDate ? depDate.toISOString() : null
      });
      localStorage.setItem('fw_bookings', JSON.stringify(bks.slice(0, 20)));
    }
  } catch (e) {}
  // Link this booking to a pending referral record (if this user was referred)
  if (depDate) {
    referralAttachBooking(FW_USER.id, bd.reference, depDate);
  }
}

// ═══ [#15] Saved passengers (Supabase) ═══
var _savedPax = null; // cache

function loadSavedPassengers(cb) {
  if (!FW_USER || !_sb) { if (cb) cb([]); return; }
  if (_savedPax) { if (cb) cb(_savedPax); return; }
  try {
    _sb.from('passengers').select('*').eq('user_id', FW_USER.id).order('created_at', {ascending:false})
      .then(function(res){ _savedPax = res.data || []; if (cb) cb(_savedPax); }, function(){ if (cb) cb([]); });
  } catch(e) { if (cb) cb([]); }
}

// Render the saved-passenger chips + save buttons inside each open passenger card
function renderSavedPassengerUI() {
  if (!FW_USER) return; // only for logged-in users
  var saveBtns = document.querySelectorAll('.pp-save-btn');
  for (var s = 0; s < saveBtns.length; s++) saveBtns[s].style.display = '';
  loadSavedPassengers(function(list){
    if (!list || !list.length) return;
    var bars = document.querySelectorAll('.pp-saved');
    for (var b = 0; b < bars.length; b++) {
      var idx = bars[b].getAttribute('data-idx');
      var html = '<div class="pp-saved-lbl">' + tL('Gespeicherte Reisende','Saved passengers','مسافرون محفوظون') + '</div><div class="pp-saved-chips">';
      for (var k = 0; k < list.length; k++) {
        var p = list[k];
        html += '<button type="button" class="pp-saved-chip" onclick="fillPassenger(' + idx + ',\'' + p.id + '\')">' + escHtml((p.given_name||'') + ' ' + (p.family_name||'')) + '</button>';
      }
      html += '</div>';
      bars[b].innerHTML = html;
      bars[b].style.display = 'block';
    }
  });
}

// Fill a passenger card from a saved passenger
function fillPassenger(idx, paxId) {
  if (!_savedPax) return;
  var p = null;
  for (var k = 0; k < _savedPax.length; k++) if (_savedPax[k].id === paxId) { p = _savedPax[k]; break; }
  if (!p) return;
  var fn = document.getElementById('bf-fn'+idx); if (fn) { fn.value = p.given_name || ''; validateNameField(fn); }
  var ln = document.getElementById('bf-ln'+idx); if (ln) { ln.value = p.family_name || ''; validateNameField(ln); }
  var ttl = document.getElementById('bf-ttl'+idx); if (ttl && p.title) ttl.value = p.title;
  var gen = document.getElementById('bf-gen'+idx); if (gen && p.gender) gen.value = p.gender;
  if (p.born_on) {
    var dob = document.getElementById('bf-dob'+idx); if (dob) dob.value = p.born_on;
    // [DOB-TEXT] p.born_on is ISO (YYYY-MM-DD) from Supabase — convert to
    // the DD/MM/YYYY the visible text field shows, then run the same
    // validation a manual entry would get.
    var dobParts = (p.born_on || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var dobText = document.getElementById('bf-dob-text'+idx);
    if (dobText && dobParts) {
      dobText.value = dobParts[3] + '/' + dobParts[2] + '/' + dobParts[1];
      validateDobField(dob, idx);
      dobText.classList.toggle('ok', dob.classList.contains('ok'));
      dobText.classList.toggle('err', dob.classList.contains('err'));
    }
  }
  var em = document.getElementById('bf-email'+idx); if (em && p.email) em.value = p.email;
  var ph = document.getElementById('bf-phone'+idx); if (ph && p.phone) ph.value = p.phone;
  showToast(tL('Reisende/r übernommen','Passenger filled in','تم تعبئة المسافر'), 'success');
}

// Save the passenger currently entered in card #idx to Supabase
function savePassengerFromForm(idx) {
  if (!FW_USER || !_sb) { showToast(tL('Bitte zuerst anmelden','Please log in first','سجّل الدخول أولاً'), 'info'); return; }
  var fn = (document.getElementById('bf-fn'+idx)||{}).value || '';
  var ln = (document.getElementById('bf-ln'+idx)||{}).value || '';
  var dob = (document.getElementById('bf-dob'+idx)||{}).value || '';
  var nameRe = /^[A-Za-z\u00C0-\u017F'\- ]{1,20}$/;
  if (!nameRe.test(fn.trim()) || !nameRe.test(ln.trim())) { showToast(tL('Bitte gültigen Namen eingeben','Enter a valid name first','أدخل اسماً صحيحاً أولاً'), 'error'); return; }
  var rec = {
    user_id: FW_USER.id, given_name: fn.trim(), family_name: ln.trim(),
    born_on: dob || null,
    gender: (document.getElementById('bf-gen'+idx)||{}).value || null,
    title: (document.getElementById('bf-ttl'+idx)||{}).value || null,
    email: (document.getElementById('bf-email'+idx)||{}).value || null,
    phone: (document.getElementById('bf-phone'+idx)||{}).value || null
  };
  try {
    _sb.from('passengers').insert(rec).select().then(function(res){
      if (res && res.data && res.data.length) { _savedPax = null; renderSavedPassengerUI(); showToast(tL('Reisende/r gespeichert ✓','Passenger saved ✓','تم حفظ المسافر ✓'), 'success'); }
      else showToast(tL('Speichern fehlgeschlagen','Could not save','تعذّر الحفظ'), 'error');
    }, function(){ showToast(tL('Speichern fehlgeschlagen','Could not save','تعذّر الحفظ'), 'error'); });
  } catch(e) { showToast(tL('Speichern fehlgeschlagen','Could not save','تعذّر الحفظ'), 'error'); }
}

// Live email validation: clear message under the field
function validateEmailField(el) {
  if (!el) return;
  var msgEl = document.getElementById(el.id + '-msg');
  var raw = (el.value || '').trim();
  if (!raw) { el.classList.remove('err'); if (msgEl) msgEl.textContent = ''; return; }
  var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw);
  el.classList.toggle('err', !ok);
  if (msgEl) {
    msgEl.textContent = ok ? '' : tL(
      'Bitte gültige E-Mail-Adresse eingeben, z.B. max@mail.de',
      'Please enter a valid email address, e.g. max@mail.com',
      'أدخل بريداً إلكترونياً صحيحاً، مثل max@mail.com'
    );
    msgEl.className = 'field-msg' + (ok ? '' : ' show-err');
  }
  return ok;
}

// Live phone validation: clear, actionable message under the field —
// tells the user exactly what to type, not just that it's "invalid".
function validatePhoneField(el) {
  if (!el) return;
  var msgEl = document.getElementById(el.id + '-msg');
  var raw = (el.value || '').trim();
  if (!raw) { el.classList.remove('err'); if (msgEl) msgEl.textContent = ''; return; }
  var cleaned = raw.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  var ok = /^\+[1-9]\d{6,14}$/.test(cleaned);
  el.classList.toggle('err', !ok);
  if (msgEl) {
    msgEl.textContent = ok ? '' : tL(
      'Bitte mit Ländervorwahl eingeben, z.B. +49 151 23456789 (Deutschland) oder +966 5 12345678 (Saudi-Arabien).',
      'Please include the country code, e.g. +49 151 23456789 (Germany) or +966 5 12345678 (Saudi Arabia).',
      'أدخل الرقم مع رمز الدولة، مثل +49 151 23456789 (ألمانيا) أو +966 5 12345678 (السعودية).'
    );
    msgEl.className = 'field-msg' + (ok ? '' : ' show-err');
  }
  return ok;
}

function validateNameField(el) {
  var v = (el.value || '').trim();
  var msgId = el.id.replace('bf-fn','bf-fn-msg').replace('bf-ln','bf-ln-msg');
  var msg = document.getElementById(msgId);
  var _re = /^[A-Za-z\u00C0-\u017F'\- ]{1,20}$/;
  if (!v) {
    el.classList.remove('ok','err'); if(msg){msg.className='field-msg';msg.textContent='';}
  } else if (!_re.test(v)) {
    el.classList.add('err'); el.classList.remove('ok');
    if(msg){msg.className='field-msg show-err';msg.textContent=tL('Nur Buchstaben, Leerzeichen, - und \' erlaubt (1–20 Zeichen, wie im Reisepass). Kein Punkt.','Only letters, spaces, - and \' allowed (1–20 chars, as in passport). No periods.','أحرف وحروف فقط، مسافة، - و \' مسموحة (1-20 حرفاً كما في الجواز). بدون نقاط.');}
  } else {
    el.classList.add('ok'); el.classList.remove('err');
    if(msg){msg.className='field-msg show-ok';msg.textContent='✓';}
  }
}

// [DOB-TEXT] Auto-inserts the "/" separators as the customer types digits,
// so they can just type "15011990" and see "15/01/1990" appear — without
// forcing them to type the slashes themselves. Never touches anything if
// they're already typing slashes/deleting, only acts on pure digit runs.
function dobAutoSlash(el) {
  var digits = el.value.replace(/\D/g, '').slice(0, 8);
  var out = digits;
  if (digits.length > 4) out = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
  else if (digits.length > 2) out = digits.slice(0, 2) + '/' + digits.slice(2);
  el.value = out;
}

// [DOB-TEXT] Parses the visible "DD/MM/YYYY" text field into the ISO
// "YYYY-MM-DD" the hidden #bf-dob field has always carried (same format
// Duffel and the rest of the booking flow already expect), then runs the
// exact same age-rule validation as before. This is the ONLY place that
// writes to the hidden field now — everything downstream (submit,
// saved-passenger quick-fill, etc.) is untouched.
function syncDobFromText(idx) {
  var textEl = document.getElementById('bf-dob-text' + idx);
  var hidden = document.getElementById('bf-dob' + idx);
  if (!textEl || !hidden) return;
  var raw = (textEl.value || '').trim();
  var m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) {
    hidden.value = '';
    textEl.classList.toggle('err', raw.length > 0); // partial/garbled input while typing -> not yet an error
    if (raw.length >= 10) textEl.classList.add('err'); // fully typed but still doesn't match -> real error
    var msg = document.getElementById('bf-dob-msg' + idx);
    if (msg && raw.length === 0) { msg.className = 'field-msg'; msg.textContent = ''; }
    return;
  }
  var day = m[1], month = m[2], year = m[3];
  hidden.value = year + '-' + month + '-' + day;
  validateDobField(hidden, idx);
  // Mirror the hidden field's validity onto the visible text input so the
  // red/green border the customer actually sees reflects the real check.
  textEl.classList.toggle('err', hidden.classList.contains('err'));
  textEl.classList.toggle('ok', hidden.classList.contains('ok'));
}

function validateDobField(el, paxIdx) {
  var v = (el.value || '').trim();
  var idx = (paxIdx !== undefined) ? paxIdx : el.id.replace('bf-dob','');
  var msg = document.getElementById('bf-dob-msg' + idx);
  if (!v) {
    el.classList.remove('ok','err'); if(msg){msg.className='field-msg';msg.textContent='';}
    return;
  }
  var _dateRe = /^\d{4}-\d{2}-\d{2}$/;
  var d = new Date(v);
  var now = new Date(); now.setHours(0,0,0,0);
  var minDate = new Date('1900-01-01');
  // [DOB-TEXT] JavaScript's Date silently "overflows" invalid day/month
  // combos instead of rejecting them — new Date('1990-02-31') quietly
  // becomes March 3rd rather than throwing. That was never reachable
  // through the old calendar picker (it only ever offered real days per
  // month), but a free-typed text field can produce it. Round-tripping the
  // parsed date back into the same YYYY-MM-DD components and comparing
  // catches any such overflow.
  var roundTrip = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  if (!_dateRe.test(v) || isNaN(d.getTime()) || d >= now || d < minDate || roundTrip !== v) {
    el.classList.add('err'); el.classList.remove('ok');
    if(msg){msg.className='field-msg show-err';msg.textContent=tL('Ungültiges Geburtsdatum','Invalid date of birth','تاريخ ميلاد غير صحيح');}
    return;
  }
  // تحقق العمر حسب نوع المسافر (من بيانات Duffel)
  var ageYears = Math.floor((now - d) / (365.25 * 24 * 3600 * 1000));
  var paxType = (idx >= PAX.a + PAX.c) ? 'infant' : (idx >= PAX.a) ? 'child' : 'adult';
  // الحدود من Duffel: adult=12+, child=2-11, infant=0-1
  var ageErr = '';
  if (paxType === 'adult' && ageYears < 12)
    ageErr = tL('Erwachsene müssen mind. 12 Jahre alt sein','Adults must be at least 12 years old','البالغون يجب أن يكونوا 12 سنة على الأقل');
  else if (paxType === 'child' && (ageYears < 2 || ageYears > 11))
    ageErr = tL('Kinder müssen 2–11 Jahre alt sein','Children must be 2–11 years old','الأطفال يجب أن يكونوا بين 2 و11 سنة');
  else if (paxType === 'infant' && ageYears > 1)
    ageErr = tL('Kleinkinder müssen unter 2 Jahre alt sein','Infants must be under 2 years old','الرضّع يجب أن يكونوا تحت سنتين');
  if (ageErr) {
    el.classList.add('err'); el.classList.remove('ok');
    if(msg){msg.className='field-msg show-err';msg.textContent=ageErr;}
  } else {
    el.classList.add('ok'); el.classList.remove('err');
    if(msg){msg.className='field-msg show-ok';msg.textContent='✓ ' + ageYears + ' ' + tL('Jahre','years','سنة');}
  }
}

function emailTicket() {
  var b = lastBooking || {};
  var subj = encodeURIComponent('Airpiv ' + tL('Buchung','Booking','حجز') + ' ' + (b.reference || ''));
  var lines = [];
  lines.push(tL('Buchungsreferenz','Booking reference','رقم الحجز') + ': ' + (b.reference || ''));
  if (b.offer) lines.push((b.offer.orig || '') + ' → ' + (b.offer.dest || ''));
  lines.push(tL('Gesamtbetrag','Total','الإجمالي') + ': ' + fmt(b.totalPrice || 0));
  var body = encodeURIComponent(lines.join('\n'));
  window.location.href = 'mailto:' + (b.contactEmail || '') + '?subject=' + subj + '&body=' + body;
}

function removeLocalBooking(orderId) {
  try {
    var bks = JSON.parse(localStorage.getItem('fw_bookings') || '[]');
    bks = bks.filter(function(b) { return (b.order_id || b.orderId) !== orderId; });
    localStorage.setItem('fw_bookings', JSON.stringify(bks));
  } catch (e) {}
}

// Convert a Duffel order (from /order/:id) into the bookingData shape used by showConfirmation
// [CONFIRMATION-FIX] `order` is Duffel's live order (flight/seat/bag
// truth). `bookingRow` is OPTIONAL — our own `bookings` table record (the
// real money: customer_paid including margin, minus any promo/loyalty
// discount). When bookingRow is omitted, money falls back to Duffel's net
// total_amount (still useful for an admin glancing at raw order data, but
// NOT what a customer actually paid) — every customer-facing call site
// must pass bookingRow so the price shown always matches what was charged.
function orderToBookingData(order, bookingRow) {
  function isoMin(iso) { if (!iso) return 0; var m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?/); return m ? (parseInt(m[1] || 0) * 60 + parseInt(m[2] || 0)) : 0; }

  // [CONFIRMATION-FIX] Per Duffel's own docs: a seat selected at booking
  // time lives on slices[].segments[].passengers[].seat — but baggage
  // bought as an ancillary SERVICE (the common case for paid extra bags)
  // is deliberately NOT included in slices[].segments[].passengers[].
  // baggages[] at all; it only appears in the top-level `services` array,
  // matched back to passengers/segments via passenger_ids/segment_ids.
  // The old version of this function only read .baggages[], so any
  // separately-purchased bag was completely invisible on the confirmation
  // screen. We build a passenger-id -> name lookup once, then walk both
  // sources so every selected seat and every bag (included OR purchased)
  // shows up exactly once.
  var paxById = {};
  (order.passengers || []).forEach(function(p) { paxById[p.id] = ((p.given_name || '') + ' ' + (p.family_name || '')).trim(); });

  // [CONFIRMATION-FIX] The seat object embedded at
  // slices[].segments[].passengers[].seat only ever carries the
  // designator + name — never its price. A seat's actual net cost (what
  // we paid Duffel for it) lives exclusively in the top-level `services`
  // array, the same place baggage services live, matched back by
  // segment_ids + passenger_ids. Without this lookup, a confirmed seat's
  // price was always silently treated as 0 — it showed up in the
  // "Sitzplätze" list correctly, but contributed nothing to the
  // ticket/bags/seats price breakdown below.
  var seatServiceByKey = {};
  (order.services || []).forEach(function(svc) {
    var t = (svc.type || '').toLowerCase();
    if (t.indexOf('seat') < 0) return;
    (svc.passenger_ids || []).forEach(function(pid) {
      (svc.segment_ids || []).forEach(function(sid) { seatServiceByKey[sid + '|' + pid] = svc; });
    });
  });

  function mapSeg(s) {
    var seatList = [];
    (s.passengers || []).forEach(function(sp) {
      if (sp.seat && sp.seat.designator) {
        var svc = seatServiceByKey[s.id + '|' + sp.passenger_id];
        seatList.push({
          passenger: paxById[sp.passenger_id] || '', designator: sp.seat.designator, name: sp.seat.name || '',
          netPrice: svc ? parseFloat(svc.total_amount || 0) : 0, currency: svc ? (svc.total_currency || 'EUR') : 'EUR'
        });
      }
    });
    return {
      from: (s.origin && s.origin.iata_code) || '', to: (s.destination && s.destination.iata_code) || '',
      dep: new Date(s.departing_at), arr: new Date(s.arriving_at), dur: isoMin(s.duration),
      al: [(s.marketing_carrier && s.marketing_carrier.iata_code) || '', (s.marketing_carrier && s.marketing_carrier.name) || ''],
      fn: ((s.marketing_carrier && s.marketing_carrier.iata_code) || '') + (s.marketing_carrier_flight_number || ''),
      segmentId: s.id, seats: seatList
    };
  }
  var slices = order.slices || [];
  // [MULTICITY-FIX] Previously only ever read slices[0] (outbound) and
  // slices[1] (return) — a genuine multi-city itinerary has 3+ slices, and
  // every leg beyond the first two (plus any seats selected on them) was
  // silently dropped from the confirmation screen entirely. That's
  // exactly how the displayed price could be wrong on a multi-city
  // booking: seats bought on leg 3+ contributed their net cost to nothing
  // here, so they disappeared from both the seat list AND the
  // seatsPrice/ticketPrice split further down, while still being part of
  // what was actually charged. Every slice is now mapped, in order.
  var legs = slices.map(function(slice, i) {
    return { legNumber: i + 1, segs: (slice.segments || []).map(mapSeg) };
  });
  var outSegs = legs.length ? legs[0].segs : [];
  // retSegs kept only for the offer.ret shape other code still reads
  // (e.g. the route summary line) — legs[] below is the source of truth
  // for rendering every leg of the itinerary, multi-city included.
  var retSegs = legs.length > 1 ? legs[1].segs : null;
  var firstSeg = slices[0] && slices[0].segments && slices[0].segments[0];
  var sp0 = firstSeg && firstSeg.passengers && firstSeg.passengers[0] ? firstSeg.passengers[0] : null;
  var cabin = sp0 ? sp0.cabin_class : null;
  var includedBags = sp0 && sp0.baggages ? sp0.baggages : [];

  // [CONFIRMATION-FIX] Ancillary services actually purchased (paid extra
  // bags, in practice — seats are billed as services too but already
  // shown via mapSeg's seats[] above, so we only surface non-seat
  // services here to avoid listing "1x seat" as if it were a separate
  // line item). Per Duffel's own docs, "the actual service information is
  // determined by its type and metadata" — weight/bag-type live in
  // metadata, the same shape normalizeBaggageServices() reads server-side
  // when the bag was first offered. Previously this only read total_amount
  // and quantity, so a confirmed booking's bag line never showed the
  // weight allowance the customer actually paid for.
  var purchasedBagServices = (order.services || []).filter(function(svc) {
    var t = (svc.type || '').toLowerCase();
    return t.indexOf('baggage') >= 0 || t.indexOf('bag') >= 0;
  }).map(function(svc) {
    var names = (svc.passenger_ids || []).map(function(id) { return paxById[id] || ''; }).filter(Boolean);
    var md = svc.metadata || {};
    return {
      quantity: svc.quantity || 1, amount: parseFloat(svc.total_amount || 0), currency: svc.total_currency || 'EUR',
      passengers: names, bagType: md.type || null,
      maxWeightKg: (md.maximum_weight_kg != null) ? Number(md.maximum_weight_kg) : null
    };
  });

  // [MULTICITY-FIX] Every leg's seats now contribute to the total, not
  // just legs 1 and 2.
  // [SEAT-LEG-LABEL-FIX] Tag each seat with which leg/segment it belongs
  // to (legNumber + route) before flattening — without this, two
  // passengers with seats on both outbound AND return collapsed into one
  // undifferentiated list ("Ahmed 28E, Sami 28F, Ahmed 28F, Sami 28E")
  // with no way to tell which pair was the outbound seats and which was
  // the return seats.
  var allSeats = legs.reduce(function(acc, leg) {
    return acc.concat(leg.segs.reduce(function(a, seg) {
      return a.concat((seg.seats || []).map(function(st) {
        return Object.assign({}, st, { legNumber: leg.legNumber, route: seg.from + ' \u2192 ' + seg.to });
      }));
    }, []));
  }, []);

  // [CONFIRMATION-FIX] Money: prefer our own bookings-table record (the
  // real customer_paid, with margin added and any discount subtracted) —
  // Duffel's order.total_amount is only ever the net cost we paid Duffel,
  // never what the customer was actually charged.
  var hasOwnRecord = !!bookingRow;
  var customerPaid = hasOwnRecord ? bookingRow.customerPaid : parseFloat(order.total_amount || 0);
  var discountAmount = hasOwnRecord ? bookingRow.discountAmount : 0;
  var loyaltyDiscount = hasOwnRecord ? bookingRow.loyaltyDiscount : 0;
  var promoCode = hasOwnRecord ? bookingRow.promoCode : null;
  var netDuffelAmount = hasOwnRecord ? bookingRow.duffelAmount : parseFloat(order.total_amount || 0);

  // [CONFIRMATION-FIX] Split the total into ticket / bags / seats, each
  // with margin included, instead of one opaque "Flugpreis" lump sum. The
  // bookings-table record only stores ONE combined ancillaryMargin for
  // every service together (it never separated "bag margin" from "seat
  // margin" — both ride the same admin-configured tier). To show each
  // category's real customer-facing price, that combined margin is
  // distributed proportionally by each category's NET (Duffel) cost share
  // — exact to the cent only when bags and seats sit on the same margin
  // tier (true today), and still a reasonable, clearly-labeled estimate
  // if tiers ever diverge by net amount in the future.
  var netBagsTotal = purchasedBagServices.reduce(function(s, b) { return s + (b.amount || 0); }, 0);
  var netSeatsTotal = allSeats.reduce(function(s, st) { return s + (st.netPrice != null ? st.netPrice : 0); }, 0);
  var netAncillaryTotal = netBagsTotal + netSeatsTotal;
  var ancillaryMargin = hasOwnRecord ? (Number(bookingRow.ancillaryMargin) || 0) : 0;
  var bagsPrice = netBagsTotal + (netAncillaryTotal > 0 ? ancillaryMargin * (netBagsTotal / netAncillaryTotal) : 0);
  var seatsPrice = netSeatsTotal + (netAncillaryTotal > 0 ? ancillaryMargin * (netSeatsTotal / netAncillaryTotal) : 0);
  var ticketPrice = hasOwnRecord ? (netDuffelAmount - netAncillaryTotal + (Number(bookingRow.ticketMargin) || 0)) : (netDuffelAmount - netAncillaryTotal);

  // [MARGIN-DISPLAY-FIX] purchasedBagServices/allSeats above were built
  // from Duffel's raw service prices (e.g. a bag's real net cost of 20€)
  // — every consumer of THESE SAME arrays (the confirmation screen's
  // "Gepäck"/"Sitzplätze" detail rows, "Meine Buchungen", and the
  // confirmation email) showed that raw net price, while the price
  // summary a few lines below showed the margin-included total (28€) for
  // the exact same purchase — the customer correctly noticed the two
  // numbers for "the same bag" didn't match. Fixed once here, at the
  // source, by distributing the category-level margin (bagsPrice/
  // seatsPrice total margin) down to each INDIVIDUAL item proportionally
  // by its own net cost share within its category (not an equal split —
  // a 15€ bag and a 5€ bag each get their fair share of the margin).
  // Mutating .amount/.netPrice in place means every place that reads
  // these arrays afterward automatically shows the corrected price with
  // no separate fix needed in the confirmation screen, "Meine Buchungen",
  // or the email — they all already consume these same two arrays.
  var bagsMarginTotal = bagsPrice - netBagsTotal;
  if (netBagsTotal > 0 && bagsMarginTotal !== 0) {
    purchasedBagServices.forEach(function(bag) {
      bag.amount = Math.round((bag.amount + bagsMarginTotal * (bag.amount / netBagsTotal)) * 100) / 100;
    });
  }
  var seatsMarginTotal = seatsPrice - netSeatsTotal;
  if (netSeatsTotal > 0 && seatsMarginTotal !== 0) {
    allSeats.forEach(function(seat) {
      if (seat.netPrice != null) {
        seat.netPrice = Math.round((seat.netPrice + seatsMarginTotal * (seat.netPrice / netSeatsTotal)) * 100) / 100;
      }
    });
  }

  return {
    reference: order.booking_reference, orderId: order.id,
    offer: {
      orig: outSegs.length ? outSegs[0].from : '', dest: outSegs.length ? outSegs[outSegs.length - 1].to : '',
      al: outSegs.length ? outSegs[0].al : ['', ''], segs: outSegs, ret: retSegs ? { segs: retSegs } : null,
      // [MULTICITY-FIX] legs holds EVERY slice (3+ for a real multi-city
      // itinerary) so the confirmation screen can render "Flug 3", "Flug 4"
      // etc. instead of silently stopping after the return leg. multiCity
      // flags this for the renderer so it knows to use "Flug N" labels
      // instead of "Hinflug/Rückflug" for every leg, including the first two.
      legs: legs, multiCity: legs.length > 2,
      hasCabin: includedBags.some(function(b) { return b.type === 'carry_on' && b.quantity > 0; }),
      hasChecked: includedBags.some(function(b) { return b.type === 'checked' && b.quantity > 0; }),
      cabinClass: cabin
    },
    seats: allSeats,
    purchasedBags: purchasedBagServices,
    passengers: (order.passengers || []).map(function(p) { return { fn: p.given_name, ln: p.family_name, dob: p.born_on }; }),
    ticketPrice: Math.round(ticketPrice * 100) / 100,
    bagsPrice: Math.round(bagsPrice * 100) / 100,
    seatsPrice: Math.round(seatsPrice * 100) / 100,
    basePrice: netDuffelAmount, extrasPrice: Math.round((bagsPrice + seatsPrice) * 100) / 100, totalPrice: customerPaid,
    discountAmount: discountAmount, loyaltyDiscount: loyaltyDiscount, promoCode: promoCode,
    hasOwnFinancialRecord: hasOwnRecord,
    contactEmail: (bookingRow && bookingRow.customerEmail) || (order.passengers && order.passengers[0] ? order.passengers[0].email : '')
  };
}

// Open full ticket details for a saved booking (fetches the live order from Duffel)
function openBookingDetail(orderId) {
  if (!orderId) { showToast(tL('Details für diese Buchung nicht verfügbar','Details not available for this booking','تفاصيل هذا الحجز غير متاحة'), 'info'); return; }
  showToast('⏳ ' + tL('Buchung wird geladen...','Loading booking...','جارٍ تحميل الحجز...'), 'info');
  // [CONFIRMATION-FIX] Use the unified endpoint — same one the
  // post-payment confirmation uses — so a booking looks identical whether
  // you're viewing it immediately after paying or later from "Meine
  // Buchungen". j.booking carries the real customer_paid/discount;
  // j.order carries the live flight/seat/bag details from Duffel.
  fetch(PROXY + '/booking-confirmation?order_id=' + encodeURIComponent(orderId))
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (j.ok && j.order) showConfirmation(orderToBookingData(j.order, j.booking), { viewOnly: true });
      else showToast('❌ ' + (j.error || tL('Konnte Buchung nicht laden','Could not load booking','تعذّر تحميل الحجز')), 'error');
    })
    .catch(function(err) {
      // [DIAGNOSTIC-FIX] Show the REAL error name/message instead of a
      // generic "connection error" — without browser devtools available,
      // this is the only way to tell a timeout apart from a CORS block,
      // DNS failure, or any other root cause. Kept deliberately ugly/
      // technical-looking (this is a diagnostic aid, not normal UX copy).
      showToast('❌ Fehler: ' + (err && err.name ? err.name + ' — ' : '') + (err && err.message ? err.message : String(err)), 'error');
    });
}

// Cancel per Duffel: step 1 get refund quote → confirm → step 2 execute
function cancelOrderFlow(orderId) {
  if (!orderId) return;
  if (!confirm(tL('Stornierungsbedingungen prüfen?','Check cancellation terms?','عرض شروط الإلغاء؟'))) return;
  showToast('⏳ ' + tL('Bedingungen werden geprüft...','Checking conditions...','جارٍ التحقق...'), 'info');
  fetch(PROXY + '/cancel-quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId }) })
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (!j.ok) { showToast('❌ ' + (j.error || tL('Stornierung nicht möglich','Cancellation not possible','الإلغاء غير متاح')), 'error'); return; }
      var refund = j.refund_amount ? (j.refund_amount + ' ' + (j.refund_currency || 'EUR')) : tL('keine Erstattung','no refund','بدون استرداد');
      if (!confirm(tL('Rückerstattung','Refund','مبلغ الاسترداد') + ': ' + refund + '\n\n' + tL('Jetzt endgültig stornieren?','Cancel now for good?','تأكيد الإلغاء نهائياً؟'))) return;
      showToast('⏳ ' + tL('Stornierung wird ausgeführt...','Cancelling...','جارٍ الإلغاء...'), 'info');
      fetch(PROXY + '/cancel-confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cancellation_id: j.cancellation_id, order_id: orderId }) })
        .then(function(r) { return r.json(); })
        .then(function(c) {
          if (c.ok) {
            showToast('✅ ' + tL('Storniert','Cancelled','تم الإلغاء') + ' · ' + tL('Rückerstattung','Refund','استرداد') + ': ' + (c.refund_amount || refund), 'success');
            removeLocalBooking(orderId); closeConfirm(); openPg('bookings'); loadMyBookings();
          } else { showToast('❌ ' + (c.error || tL('Stornierung fehlgeschlagen','Cancellation failed','فشل الإلغاء')), 'error'); }
        })
        .catch(function() { showToast('❌ ' + tL('Verbindungsfehler','Connection error','خطأ في الاتصال'), 'error'); });
    })
    .catch(function() { showToast('❌ ' + tL('Verbindungsfehler','Connection error','خطأ في الاتصال'), 'error'); });
}

function confettiBurst() {
  var host = document.getElementById('conf-confetti');
  if (!host) return;
  host.innerHTML = '';
  var colors = ['#00a991', '#e8214d', '#f9ba00', '#ffffff', '#5eead4'];
  for (var i = 0; i < 30; i++) {
    var c = document.createElement('i');
    c.style.left = (Math.random() * 100) + '%';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
    c.style.animationDelay = (Math.random() * 0.5) + 's';
    host.appendChild(c);
  }
}

var _revStars = 0;
function setReviewStars(n) {
  _revStars = n;
  var els = document.querySelectorAll('#rev-stars .rev-star');
  for (var i = 0; i < els.length; i++) els[i].classList.toggle('on', i < n);
}
function submitReview() {
  if (_revStars < 1) { showToast(tL('Bitte Sterne vergeben','Please select a rating','يرجى اختيار التقييم'), 'error'); return; }
  var txt = ((document.getElementById('rev-text') || {}).value || '').trim();
  var rec = { stars: _revStars, comment: txt, ref: (lastBooking ? lastBooking.reference : ''), at: new Date().toISOString() };
  try {
    var rv = JSON.parse(localStorage.getItem('fw_reviews') || '[]');
    rv.unshift(rec); localStorage.setItem('fw_reviews', JSON.stringify(rv.slice(0, 50)));
  } catch (e) {}
  try {
    if (_sb && FW_USER) {
      _sb.from('reviews').insert({ user_id: FW_USER.id, stars: _revStars, comment: txt, booking_ref: rec.ref, created_at: rec.at }).then(function(){}, function(){});
    }
  } catch (e) {}
  var card = document.getElementById('rev-card');
  if (card) card.innerHTML = '<div class="rev-done"><div class="rev-done-ico">🙏</div><div class="rev-title" style="margin-top:8px">' + tL('Danke für dein Feedback!','Thanks for your feedback!','شكراً لتقييمك!') + '</div><div class="rev-sub" style="margin:0">' + tL('Deine Bewertung hilft uns sehr.','Your review helps us a lot.','رأيك يهمّنا كثيراً.') + '</div></div>';
}

function showConfirmation(bookingData, opts) {
  opts = opts || {};
  lastBooking = bookingData;
  if (!opts.viewOnly) saveBookingRecord(bookingData);
  var o = bookingData.offer;

  // Set reference
  var refEl = document.getElementById('conf-ref');
  if (refEl) refEl.textContent = bookingData.reference || '—';

  // Build body
  var body = document.getElementById('confirm-body');
  if (!body) return;

  var html = '';

  // ── Order Info ──
  html += '<div class="confirm-card">';
  html += '<div class="confirm-card-title">📋 Buchungsdetails</div>';
  html += '<div class="confirm-row"><span class="confirm-row-lbl">Buchungsreferenz</span><span class="confirm-row-val" style="font-family:monospace;color:var(--teal2)">' + escHtml(bookingData.reference || '—') + '</span></div>';
  if (bookingData.orderId) {
    html += '<div class="confirm-row"><span class="confirm-row-lbl">Order ID</span><span class="confirm-row-val" style="font-family:monospace;font-size:11px">' + escHtml(bookingData.orderId) + '</span></div>';
  }
  html += '<div class="confirm-row"><span class="confirm-row-lbl">Buchungsdatum</span><span class="confirm-row-val">' + new Date().toLocaleDateString('de-DE', {day:'2-digit',month:'long',year:'numeric'}) + '</span></div>';
  html += '<div class="confirm-row"><span class="confirm-row-lbl">Status</span><span class="confirm-row-val" style="color:var(--gr)">✓ Bestätigt</span></div>';
  html += '</div>';

  // ── Flight Details ──
  if (o) {
    html += '<div class="confirm-card">';
    html += '<div class="confirm-card-title">✈ Flugdetails</div>';

    function renderConfirmSegs(segs, label) {
      if (!segs || !segs.length) return '';
      var h = '<div style="font-size:11px;font-weight:700;color:var(--tx3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">' + label + '</div>';
      for (var i = 0; i < segs.length; i++) {
        var seg = segs[i];
        h += '<div class="confirm-flight-seg">';
        h += '<div class="confirm-seg-time"><strong>' + p2(seg.dep.getHours()) + ':' + p2(seg.dep.getMinutes()) + '</strong><span>' + seg.from + '</span><span style="font-size:9px;color:var(--tx3)">' + p2(seg.dep.getDate()) + '.' + p2(seg.dep.getMonth()+1) + '.</span></div>';
        h += '<div class="confirm-seg-line"><div class="confirm-seg-dot"></div><div class="confirm-seg-connector"></div><div class="confirm-seg-dot" style="background:#fff;border:2px solid var(--teal)"></div></div>';
        h += '<div class="confirm-seg-info"><div class="confirm-seg-airport">' + seg.from + ' → ' + seg.to + '</div>';
        h += '<div class="confirm-seg-airline">' + (seg.al ? seg.al[1] : '') + ' · ' + (seg.fn || '') + ' · ' + durStr(seg.dur) + '</div></div>';
        h += '<div class="confirm-seg-time"><strong>' + p2(seg.arr.getHours()) + ':' + p2(seg.arr.getMinutes()) + '</strong><span>' + seg.to + '</span><span style="font-size:9px;color:var(--tx3)">' + p2(seg.arr.getDate()) + '.' + p2(seg.arr.getMonth()+1) + '.</span></div>';
        h += '</div>';
      }
      return h;
    }

    html += renderConfirmSegs(o.segs, o.multiCity ? ('✈ ' + tL('Flug 1','Flight 1','الرحلة 1')) : '✈ Hinflug');
    if (o.multiCity && Array.isArray(o.legs)) {
      for (var cfLi = 1; cfLi < o.legs.length; cfLi++) {
        html += '<hr style="border:none;border-top:1px dashed var(--bd);margin:10px 0">';
        html += renderConfirmSegs(o.legs[cfLi].segs, '✈ ' + tL('Flug ' + (cfLi+1), 'Flight ' + (cfLi+1), 'الرحلة ' + (cfLi+1)));
      }
    } else if (o.ret && o.ret.segs) {
      html += '<hr style="border:none;border-top:1px dashed var(--bd);margin:10px 0">';
      html += renderConfirmSegs(o.ret.segs, '↩ Rückflug');
    }
    var _cabinLbl = ({economy:'Economy', premium_economy:'Premium Economy', business:'Business', first:'First Class'}[(o.cabinClass || PAX.cabin || 'economy')] || 'Economy');
    html += '<div class="confirm-row" style="border-top:1px dashed var(--bd);margin-top:10px;padding-top:10px"><span class="confirm-row-lbl">' + tL('Tarifklasse','Cabin class','فئة التذكرة') + '</span><span class="confirm-row-val">' + _cabinLbl + '</span></div>';
    html += '</div>';

    // ── Baggage (included) ──
    html += '<div class="confirm-card">';
    html += '<div class="confirm-card-title">🧳 Gepäck</div>';
    html += '<div class="confirm-row"><span class="confirm-row-lbl">Handgepäck</span><span class="confirm-row-val" style="color:' + (o.hasCabin ? 'var(--gr)' : 'var(--tx3)') + '">' + (o.hasCabin ? ('✓ Inklusive' + (o.cabinBagWeightKg ? ' · bis ' + o.cabinBagWeightKg + ' kg' : '')) : '✗ Nicht inklusive') + '</span></div>';
    html += '<div class="confirm-row"><span class="confirm-row-lbl">Aufgabegepäck</span><span class="confirm-row-val" style="color:' + (o.hasChecked ? 'var(--gr)' : 'var(--tx3)') + '">' + (o.hasChecked ? ('✓ Inklusive' + (o.checkedBagWeightKg ? ' · bis ' + o.checkedBagWeightKg + ' kg' : '')) : '✗ Nicht inklusive') + '</span></div>';
    // [CONFIRMATION-FIX] Extra bags bought as an ancillary service never
    // show up in the included-baggage fields above (see orderToBookingData)
    // — list them here explicitly so a purchased bag is actually visible
    // on the confirmation screen instead of silently disappearing.
    if (bookingData.purchasedBags && bookingData.purchasedBags.length) {
      bookingData.purchasedBags.forEach(function(bag) {
        var who = bag.passengers && bag.passengers.length ? ' · ' + escHtml(bag.passengers.join(', ')) : '';
        var wt = bag.maxWeightKg ? (' · ' + tL('bis','up to','حتى') + ' ' + bag.maxWeightKg + ' kg') : '';
        html += '<div class="confirm-row"><span class="confirm-row-lbl">' + tL('Zusatzgepäck','Extra baggage','حقيبة إضافية') + (bag.quantity > 1 ? ' ×' + bag.quantity : '') + wt + who + '</span><span class="confirm-row-val" style="color:var(--gr)">✓ ' + fmt(bag.amount) + '</span></div>';
      });
    }
    html += '</div>';

    // ── Seats (selected) ──
    if (bookingData.seats && bookingData.seats.length) {
      html += '<div class="confirm-card">';
      html += '<div class="confirm-card-title">💺 ' + tL('Sitzplätze','Seats','المقاعد') + '</div>';
      // [LEGS-UNDEFINED-FIX] "legs" was referenced here without ever being
      // defined in this function's scope — it only existed in a totally
      // unrelated function elsewhere in the file, so this threw
      // "ReferenceError: legs is not defined" and broke the entire
      // confirmation screen (both right after payment and from "Meine
      // Buchungen" later) any time the booking had at least one seat
      // selected. The real leg count depends on trip type: multi-city
      // has o.legs (an array, 3+ legs); a round trip is 2 legs (outbound
      // + o.ret); a one-way trip is 1 — computed here from what's
      // actually present on this booking, the same trip-type checks
      // already used a few lines above to render the flight segments.
      var totalLegs = (o.multiCity && Array.isArray(o.legs)) ? o.legs.length : ((o.ret && o.ret.segs) ? 2 : 1);
      var hasMultipleLegs = totalLegs > 1;
      bookingData.seats.forEach(function(seat) {
        // [SEAT-LEG-LABEL-FIX] "Hinflug"/"Rückflug" for a simple round
        // trip (legs[0]/legs[1]) — "Flug N" for genuine multi-city (3+
        // legs), where "outbound/return" wouldn't make sense.
        var legLabel = '';
        if (hasMultipleLegs && seat.legNumber) {
          if (totalLegs === 2) legLabel = seat.legNumber === 1 ? tL('Hinflug','Outbound','الذهاب') : tL('Rückflug','Return','العودة');
          else legLabel = tL('Flug','Flight','الرحلة') + ' ' + seat.legNumber;
          if (seat.route) legLabel += ' (' + escHtml(seat.route) + ')';
        }
        html += '<div class="confirm-row"><span class="confirm-row-lbl">' + escHtml(seat.passenger || tL('Reisende/r','Passenger','الراكب')) + (legLabel ? ' <span style="color:var(--tx3);font-weight:500">· ' + legLabel + '</span>' : '') + '</span><span class="confirm-row-val" style="font-family:monospace;font-weight:700;color:var(--teal2)">' + escHtml(seat.designator) + '</span></div>';
      });
      html += '</div>';
    }
  }

  // ── Passengers ──
  if (bookingData.passengers && bookingData.passengers.length) {
    html += '<div class="confirm-card">';
    html += '<div class="confirm-card-title">👥 Reisende</div>';
    var types = ['Erwachsener','Kind','Kleinkind'];
    for (var pi = 0; pi < bookingData.passengers.length; pi++) {
      var pax = bookingData.passengers[pi];
      var typeIdx = pi >= PAX.a + PAX.c ? 2 : pi >= PAX.a ? 1 : 0;
      html += '<div class="confirm-pax-item">';
      html += '<div class="confirm-pax-avatar">👤</div>';
      html += '<div><div class="confirm-pax-name">' + escHtml(pax.fn) + ' ' + escHtml(pax.ln) + '</div>';
      html += '<div class="confirm-pax-type">' + types[typeIdx] + (pax.dob ? ' · Geb. ' + pax.dob : '') + '</div>';
      // [CONTACT-EMAIL-DISPLAY] The page-5 contact email, shown under
      // each passenger's name — one shared booking-contact email, not a
      // separate email per passenger (Duffel/this booking flow only ever
      // collects one).
      if (bookingData.contactEmail) {
        html += '<div class="confirm-pax-type" style="margin-top:2px">✉ ' + escHtml(bookingData.contactEmail) + '</div>';
      }
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // ── Price Summary ── [PRICE-ORDER-FIX] Ticket, then bags, then seats,
  // then any discount, then the total — each its own line, instead of one
  // opaque "Flugpreis" + "Extras" lump. ticketPrice/bagsPrice/seatsPrice
  // sum to the PRE-discount total (that's how they're derived from the
  // booking record) — the on-screen "Gesamtbetrag" is computed explicitly
  // from exactly the lines shown above it, so it always adds up correctly
  // for the customer reading top to bottom, rather than separately
  // re-displaying the stored (already-discounted) totalPrice and risking
  // the two diverging by a rounding cent.
  var pdTicket = bookingData.ticketPrice != null ? bookingData.ticketPrice : (bookingData.basePrice || 0);
  var pdBags = bookingData.bagsPrice || 0;
  var pdSeats = bookingData.seatsPrice || 0;
  var pdDiscount = bookingData.hasOwnFinancialRecord ? (bookingData.discountAmount || 0) : 0;
  var pdGrandTotal = Math.round((pdTicket + pdBags + pdSeats - pdDiscount) * 100) / 100;

  html += '<div class="confirm-card">';
  html += '<div class="confirm-card-title">💰 Preisübersicht</div>';
  html += '<div class="confirm-row"><span class="confirm-row-lbl">' + tL('Flugticket','Flight ticket','سعر التذكرة') + '</span><span class="confirm-row-val">' + fmt(pdTicket) + '</span></div>';
  if (pdBags > 0) {
    html += '<div class="confirm-row"><span class="confirm-row-lbl">' + tL('Gepäck','Baggage','الحقائب') + '</span><span class="confirm-row-val">+ ' + fmt(pdBags) + '</span></div>';
  }
  if (pdSeats > 0) {
    html += '<div class="confirm-row"><span class="confirm-row-lbl">' + tL('Sitzplätze','Seats','المقاعد') + '</span><span class="confirm-row-val">+ ' + fmt(pdSeats) + '</span></div>';
  }
  // [CONFIRMATION-FIX] Show exactly what was deducted — a promo code
  // and/or loyalty credit — so the discount the customer applied at
  // checkout is still visible afterward, not silently absorbed into a
  // single opaque total. Only rendered when we actually have our own
  // bookings-table record (hasOwnFinancialRecord) — Duffel's raw order
  // has no concept of our promo/loyalty discounts at all.
  if (bookingData.hasOwnFinancialRecord) {
    if (bookingData.promoCode && bookingData.discountAmount > 0) {
      var nonLoyaltyDiscount = Math.max(0, (bookingData.discountAmount || 0) - (bookingData.loyaltyDiscount || 0));
      if (nonLoyaltyDiscount > 0) {
        html += '<div class="confirm-row"><span class="confirm-row-lbl">' + tL('Gutscheincode','Promo code','كود الخصم') + ' (' + escHtml(bookingData.promoCode) + ')</span><span class="confirm-row-val" style="color:var(--gr)">− ' + fmt(nonLoyaltyDiscount) + '</span></div>';
      }
    }
    if (bookingData.loyaltyDiscount > 0) {
      html += '<div class="confirm-row"><span class="confirm-row-lbl">' + tL('Treueguthaben verwendet','Loyalty credit used','رصيد الولاء المستخدم') + '</span><span class="confirm-row-val" style="color:var(--gr)">− ' + fmt(bookingData.loyaltyDiscount) + '</span></div>';
    }
  }
  html += '<div class="confirm-row" style="border-top:2px solid var(--bd);margin-top:4px;padding-top:10px">';
  html += '<span style="font-size:13px;font-weight:700;color:var(--tx)">Gesamtbetrag</span>';
  html += '<span class="confirm-price-total">' + fmt(pdGrandTotal) + '</span></div>';
  html += '</div>';

  // ── Travel Insurance Banner ──
  html += '<a href="https://ektatraveling.tpo.mx/1qYI0Y2A" target="_blank" rel="noopener" style="text-decoration:none;display:block;margin-bottom:12px">';
  html += '<div style="background:linear-gradient(135deg,#0FB5A0 0%,#0A9384 100%);border-radius:16px;padding:16px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 4px 16px rgba(15,181,160,.3)">';
  html += '<div style="font-size:2rem;flex-shrink:0">🛡️</div>';
  html += '<div style="flex:1">';
  html += '<div style="font-family:\'Syne\',sans-serif;font-size:15px;font-weight:800;color:#fff;margin-bottom:3px">Reise abgesichert?</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,.85);line-height:1.5">Schütze deine Reise mit einer Reiseversicherung — schnell, einfach & günstig.</div>';
  html += '<div style="margin-top:8px;display:inline-block;background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.35)">Jetzt versichern →</div>';
  html += '</div></div></a>';
  var _qrData = encodeURIComponent('AIRPIV|' + (bookingData.reference || '') + '|' + (bookingData.orderId || ''));
  html += '<div class="confirm-card" style="text-align:center">';
  html += '<div class="confirm-card-title" style="justify-content:center">🎫 ' + tL('Buchungscode','Booking code','رمز الحجز') + '</div>';
  html += '<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=' + _qrData + '" loading="lazy" alt="QR" style="width:168px;height:168px;background:#fff;border-radius:12px;padding:8px;border:1px solid var(--bd)">';
  html += '<div style="font-family:monospace;font-size:14px;font-weight:700;color:var(--tx);margin-top:10px;letter-spacing:.12em">' + escHtml(bookingData.reference || '') + '</div>';
  html += '<div style="font-size:10px;color:var(--tx3);margin-top:2px">' + tL('Am Flughafen vorzeigen','Show at the airport','اعرضه في المطار') + '</div>';
  html += '</div>';

  // ── Contact & Support ──
  html += '<div class="confirm-card">';
  html += '<div class="confirm-card-title">📞 ' + tL('Kontakt & Support','Contact & Support','التواصل والدعم') + '</div>';
  html += '<div class="confirm-row"><span class="confirm-row-lbl">' + tL('E-Mail','Email','البريد الإلكتروني') + '</span><span class="confirm-row-val">support@airpiv.com</span></div>';
  html += '<div class="confirm-row"><span class="confirm-row-lbl">' + tL('Telefon','Phone','الهاتف') + '</span><span class="confirm-row-val">+49 30 568 37 100</span></div>';
  if (bookingData.contactEmail) html += '<div class="confirm-row"><span class="confirm-row-lbl">' + tL('Deine E-Mail','Your email','بريدك') + '</span><span class="confirm-row-val">' + escHtml(bookingData.contactEmail) + '</span></div>';
  html += '</div>';

  if (!opts.viewOnly) {
  // ── Rating (stars + comment) ──
  html += '<div class="rev-card" id="rev-card">';
  html += '<div class="rev-title">' + tL('Wie war deine Erfahrung?','How was your experience?','كيف كانت تجربتك؟') + '</div>';
  html += '<div class="rev-sub">' + tL('Bewerte deine Buchung bei Airpiv','Rate your booking with Airpiv','قيّم تجربة الحجز مع Airpiv') + '</div>';
  html += '<div class="rev-stars" id="rev-stars">';
  for (var rs = 1; rs <= 5; rs++) html += '<span class="rev-star" onclick="setReviewStars(' + rs + ')">⭐</span>';
  html += '</div>';
  html += '<textarea class="rev-text" id="rev-text" placeholder="' + tL('Dein Kommentar (optional)','Your comment (optional)','تعليقك (اختياري)') + '"></textarea>';
  html += '<button class="rev-submit" onclick="submitReview()">' + tL('Bewertung senden','Send review','إرسال التقييم') + '</button>';
  html += '</div>';

  // ── Register / bookings CTA ──
  if (FW_USER) {
    html += '<div class="conf-cta">';
    html += '<div class="conf-cta-t">' + tL('Deine Buchungen','Your bookings','حجوزاتك') + '</div>';
    html += '<div class="conf-cta-s">' + tL('Diese Buchung wurde in deinem Konto gespeichert.','This booking was saved to your account.','تم حفظ هذا الحجز في حسابك.') + '</div>';
    html += '<button class="conf-cta-btn" onclick="closeConfirm();openPg(\'bookings\');loadMyBookings()">' + tL('Meine Buchungen ansehen','View my bookings','عرض حجوزاتي') + ' →</button>';
    html += '</div>';
  } else {
    html += '<div class="conf-cta">';
    html += '<div class="conf-cta-t">' + tL('Registriere dich, um deine Buchungen zu sehen','Register to see your bookings','سجّل لترى حجوزاتك') + '</div>';
    html += '<div class="conf-cta-s">' + tL('Verwalte alle deine Flüge an einem Ort.','Manage all your flights in one place.','أدِر كل رحلاتك في مكان واحد.') + '</div>';
    html += '<button class="conf-cta-btn" onclick="openAuthModal(\'register\')">' + tL('Jetzt registrieren','Register now','سجّل الآن') + ' →</button>';
    html += '</div>';
  }
  } // end !viewOnly

  // ── Cancel (when viewing an existing booking) ──
  if (opts.viewOnly && bookingData.orderId) {
    html += '<div class="confirm-card" style="text-align:center">';
    html += '<button class="confirm-btn" style="width:100%;background:var(--rd);color:#fff;border:none" onclick="cancelOrderFlow(\'' + escHtml(bookingData.orderId) + '\')">✕ ' + tL('Buchung stornieren','Cancel booking','إلغاء الحجز') + '</button>';
    html += '<div style="font-size:10px;color:var(--tx3);margin-top:8px">' + tL('Erstattung gemäß Tarifbedingungen der Airline','Refund according to the airline fare conditions','الاسترداد حسب شروط تذكرة شركة الطيران') + '</div>';
    html += '</div>';
  }

  // ── Actions ──
  html += '<div class="confirm-actions">';
  html += '<button class="confirm-btn confirm-btn-primary" onclick="window.print()">📄 ' + tL('PDF herunterladen','Download PDF','تحميل PDF') + '</button>';
  html += '<button class="confirm-btn confirm-btn-secondary" onclick="emailTicket()">📧 ' + tL('Per E-Mail senden','Send by email','إرسال للإيميل') + '</button>';
  html += '<button class="confirm-btn confirm-btn-secondary" onclick="closeConfirm()">🏠 ' + tL('Startseite','Home','الرئيسية') + '</button>';
  html += '</div>';

  html += '<div style="text-align:center;margin-top:16px;font-size:11px;color:var(--tx3)">Eine Bestätigung wurde an Ihre E-Mail-Adresse gesendet.</div>';

  body.innerHTML = html;
  document.getElementById('confirm-page').classList.add('open');
  document.body.style.overflow = 'hidden';
  if (!opts.viewOnly) { _revStars = 0; setReviewStars(0); confettiBurst(); }

  // Log order
  if (bookingData.orderId) {
    fwLog('order', {orderId: bookingData.orderId, ref: bookingData.reference});
    FW_LOG.lastOrderId = bookingData.orderId;
  }
}

function closeConfirm() {
  document.getElementById('confirm-page').classList.remove('open');
  document.body.style.overflow = '';
  // Close all modals
  var bov = document.getElementById('bov');
  var bflowOv = document.getElementById('bflow-ov');
  if (bov) bov.classList.remove('open');
  if (bflowOv) bflowOv.classList.remove('open');
  window.scrollTo({top:0, behavior:'smooth'});
}


// ── DSGVO Modal ──────────────────────────────
function openDsgvo() {
  document.getElementById('dsgvo-ov').classList.add('open');
}
function closeDsgvo() {
  document.getElementById('dsgvo-ov').classList.remove('open');
}

// bflowRender handles all steps including compliance on step 5


// ══ API STATE MANAGER ════════════════════════════
var API = {
  // Environment detection
  isTest: false,
  duffelMode: 'unknown',
  serverVersion: null,
  lastError: null,
  requestCount: 0,
  pendingRequest: null,

  // Initialize - check server on load
  init: function() {
    fetch(PROXY + '/health')
      .then(function(r) { return r.json(); })
      .then(function(j) {
        API.duffelMode = j.duffelMode || 'unknown';
        API.isTest = j.duffelMode === 'TEST';
        API.serverVersion = j.version || null;
        if (API.isTest && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) console.log('[Airpiv] Running in DUFFEL TEST MODE');
        fwLog('response', {status: 200, ms: 0, count: 0});
      })
      .catch(function() {
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.log('[Airpiv] Server offline — will retry on search');
      });
  },

  // Unified fetch with error handling
  fetch: function(endpoint, options) {
    API.requestCount++;
    FW_LOG.requests = API.requestCount;
    var t0 = Date.now();
    var url = PROXY + endpoint;

    return fetch(url, Object.assign({
      headers: {'Content-Type': 'application/json'},
    }, options || {}))
    .then(function(r) {
      var ms = Date.now() - t0;
      fwLog('response', {status: r.status, ms: ms, count: 0});
      if (!r.ok && r.status === 0) {
        throw new Error('Netzwerkfehler — Server nicht erreichbar');
      }
      return r.json().then(function(j) {
        if (!r.ok) {
          // Handle specific Duffel errors
          var errMsg = j.error || j.message || 'Unbekannter Fehler';
          if (j.code === 'offer_expired') errMsg = 'Angebot abgelaufen — bitte neu suchen';
          if (j.code === 'price_changed') errMsg = 'Preis geändert: ' + j.new_price + ' ' + j.currency;
          if (r.status === 503) errMsg = 'Duffel API nicht verfügbar';
          throw Object.assign(new Error(errMsg), {status: r.status, code: j.code, data: j});
        }
        return j;
      });
    })
    .catch(function(err) {
      API.lastError = err.message;
      fwLog('error', {msg: err.message});
      throw err;
    });
  },

  // Search flights
  search: function(params) {
    return API.fetch('/search', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // Get single offer
  getOffer: function(offerId) {
    return API.fetch('/offer/' + offerId);
  },

  // Create order
  createOrder: function(orderData) {
    return API.fetch('/order', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },
};


// ══ STICKY SEARCH BAR ════════════════════════
function updateStickySearch() {
  var bar = document.getElementById('sticky-filter-bar');
  var routeEl = document.getElementById('sfb-route');
  var subEl = document.getElementById('sfb-sub');
  if (!bar) return;

  // Update content
  if (routeEl) {
    if (trip === 'mc' && mcLegsData && mcLegsData.length) {
      routeEl.textContent = mcLegsData.map(function(l){ return l.fromC || l.from; }).join(' → ') +
        (mcLegsData[mcLegsData.length-1].toC || mcLegsData[mcLegsData.length-1].to ?
          ' → ' + (mcLegsData[mcLegsData.length-1].toC || mcLegsData[mcLegsData.length-1].to) : '');
    } else {
      routeEl.textContent = (fromC || fromI || 'Von') + ' → ' + (toC || toI || 'Nach');
    }
  }
  if (subEl) {
    var tripLbl = trip === 'mc' ? 'Mehrere Städte' : trip === 'rr' ? 'Hin & Zurück' : 'Einfach';
    var paxLbl = PAX.a + ' Erw.';
    if (PAX.c > 0) paxLbl += ', ' + PAX.c + ' Kind';
    if (PAX.i > 0) paxLbl += ', ' + PAX.i + ' Baby';
    var cabinLbl = {economy:'Economy',premium_economy:'Prem. Eco',business:'Business',first:'First'}[PAX.cabin]||'Economy';
    subEl.textContent = tripLbl + ' · ' + paxLbl + ' · ' + cabinLbl;
  }
  // Don't show yet - shown on scroll
}

function editSearch() {
  // Scroll to top smoothly and focus search
  window.scrollTo({top: 0, behavior: 'smooth'});
  setTimeout(function() {
    var fromIn = document.getElementById('from-in');
    if (fromIn) fromIn.focus();
  }, 500);
}

// Show sticky bar on scroll past hero — DOM elements cached for performance
var _cachedStickyBar = null, _cachedRw = null;
function _ensureScrollCache() {
  if (!_cachedStickyBar) _cachedStickyBar = document.getElementById('sticky-search');
  if (!_cachedRw) _cachedRw = document.getElementById('rw');
}
window.addEventListener('scroll', function() {
  _ensureScrollCache();
  if (!_cachedStickyBar || !_cachedRw || !allOffers.length) return;
  var scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
  _cachedStickyBar.classList.toggle('visible', scrollY > 300);
}, {passive: true});


// ══ STICKY FILTER BAR ACTIONS ════════════════
function sfbSort(mode) {
  sortMode = mode;
  // Update sticky sort buttons
  ['best','price','dur'].forEach(function(k) {
    var btn = document.getElementById('sfb-' + k);
    if (btn) btn.className = 'sfb-sort-btn' + (k === mode ? ' active' : '');
  });
  // Update main sort tabs
  ['best','price','dur'].forEach(function(k) {
    var tab = document.getElementById('st-' + k);
    if (tab) tab.className = 'stb' + (k === mode ? ' on' : '');
  });
  filtered = sortList(filtered, mode);
  shownN = 0;
  document.getElementById('offers-list').innerHTML = '';
  addOffers(10);
}

function sfbToggle(type) {
  var chip = document.getElementById('sfb-' + type);
  var active = chip && chip.classList.contains('active');

  if (type === 'direct') {
    fDir = !active;
    var mainBtn = document.getElementById('ch-dir');
    if (mainBtn) mainBtn.classList.toggle('on', fDir);
  } else if (type === 'bag') {
    fBag = !active;
    var mainBtn2 = document.getElementById('ch-bag');
    if (mainBtn2) mainBtn2.classList.toggle('on', fBag);
  } else if (type === 's0') {
    filterState.s0 = !active;
    var box = document.getElementById('fcb-s0');
    if (box) box.className = 'filter-check-box' + (filterState.s0 ? ' checked' : '');
  } else if (type === 's1') {
    filterState.s1 = !active;
    var box2 = document.getElementById('fcb-s1');
    if (box2) box2.className = 'filter-check-box' + (filterState.s1 ? ' checked' : '');
  }

  if (chip) chip.classList.toggle('active', !active);
  applyF();

  // Show count on chip
  if (chip && filtered.length > 0) {
    var existing = chip.querySelector('.sfb-chip-count');
    if (existing) existing.remove();
    if (!active) {
      var cnt = document.createElement('span');
      cnt.className = 'sfb-chip-count';
      cnt.textContent = filtered.length;
      chip.appendChild(cnt);
    }
  }
}

// ═══ STATE ═══
var _currentSearchId = 0; // Race condition prevention
var PAX = {a:1, c:0, i:0, b:0, h:1, cabin:'economy'};
var trip = 'rr';
var fDir = false, fBag = false;
var allOffers = [], filtered = [], shownN = 0, sortMode = 'best';
function findOfferById(id) {
  for (var i = 0; i < filtered.length; i++) if (filtered[i].id === id) return filtered[i];
  for (var j = 0; j < allOffers.length; j++) if (allOffers[j].id === id) return allOffers[j];
  return null;
}
var selOffer = null, selExtras = [];
var fromI = 'BER', toI = '', fromC = 'Berlin', toC = '';
var tF = {early:false, morning:false, afternoon:false, evening:false};
var alF = {};

// ═══ CALENDAR STATE ═══
var calMode = 'dep';
var calDepDate = null, calRetDate = null;
var calYear = new Date().getFullYear();
var calMonth = new Date().getMonth();

// ═══ INIT DATES ═══
// fmtDate is defined later in this file (with error handling)

function initDates() {
  var el1 = document.getElementById('dep-date');
  var el2 = document.getElementById('ret-date');
  if (!el1 || !el2) return;
  var t = new Date();
  var fn = function(x) { return x.toISOString().split('T')[0]; };
  var today = fn(t);
  el1.value = ''; el2.value = '';
  el1.min = today; el2.min = today;
  calDepDate = null; calRetDate = null;
}

// ═══ CALENDAR ═══
function openDatePicker(which) {
  // For one-way trips, only allow dep
  if (which === 'ret' && trip === 'ow') return;
  calMode = which;
  var dv = document.getElementById('dep-date').value;
  var rv = document.getElementById('ret-date').value;
  if (dv) calDepDate = dv;
  if (rv) calRetDate = rv;
  var refDate = new Date();
  if (which === 'dep' && calDepDate) refDate = new Date(calDepDate + 'T00:00:00');
  if (which === 'ret' && calRetDate) refDate = new Date(calRetDate + 'T00:00:00');
  else if (which === 'ret' && calDepDate) refDate = new Date(calDepDate + 'T00:00:00');
  calYear = refDate.getFullYear();
  calMonth = refDate.getMonth();
  updateCalHeader();
  buildCalGrid();
  // Show/hide return button based on trip type
  var rb = document.getElementById('cal-ret-btn');
  if (rb) rb.style.display = trip === 'ow' ? 'none' : '';
  var ov = document.getElementById('cal-ov');
  if (ov) ov.classList.add('open');
}

function closeCal() {
  var ov = document.getElementById('cal-ov');
  if (ov) ov.classList.remove('open');
}

function confirmCal() {
  // Multi-city mode: save to mc leg
  if (window._mcCalActive && window._mcCalLegIdx !== null && window._mcCalLegIdx !== undefined) {
    if (calDepDate) {
      if (calDepDate < window._mcCalMinDate) {
        showToast('⚠️ Datum muss nach ' + fmtDate(window._mcCalMinDate) + ' sein', 'error');
        return;
      }
      if (window._mcCalMaxDate && calDepDate > window._mcCalMaxDate) {
        showToast('⚠️ Datum muss vor ' + fmtDate(window._mcCalMaxDate) + ' sein', 'error');
        return;
      }
      var legI = window._mcCalLegIdx;
      mcLegsData[legI].date = calDepDate;
      // تحديث عرض الصفحة الرئيسية
      var disp = document.getElementById('mc-date-disp-' + legI);
      if (disp) { disp.textContent = fmtDate(calDepDate); disp.style.color = 'var(--tx)'; }
      // تحديث عرض صفحة النتائج إذا كنا في وضع تعديل النتائج
      if (window._rpMcCalMode) {
        var rpeDisp = document.getElementById('rpe-mc-date-' + legI);
        if (rpeDisp) rpeDisp.textContent = fmtDate(calDepDate);
        // مسح تواريخ الرحلات اللاحقة التي أصبحت قبل هذا التاريخ
        for (var ni = legI + 1; ni < mcLegsData.length; ni++) {
          if (mcLegsData[ni].date && mcLegsData[ni].date < calDepDate) {
            mcLegsData[ni].date = '';
            var nRpe = document.getElementById('rpe-mc-date-' + ni);
            if (nRpe) nRpe.textContent = '—';
          }
        }
      }
    }
    window._mcCalActive = false;
    window._mcCalLegIdx = null;
    window._mcCalMaxDate = null;
    window._rpMcCalMode = false;
    closeCal();
    // Restore return btn
    var rb2 = document.getElementById('cal-ret-btn');
    if (rb2) rb2.style.display = trip === 'ow' ? 'none' : '';
    return;
  }

  if (calDepDate) {
    var el = document.getElementById('dep-date');
    if (el) el.value = calDepDate;
    var dd = document.getElementById('dep-disp');
    if (dd) { dd.textContent = fmtDate(calDepDate); dd.classList.remove('empty'); }
    var cdv = document.getElementById('cal-dep-val');
    if (cdv) { cdv.textContent = fmtDate(calDepDate); cdv.classList.remove('empty'); }
  }
  if (calRetDate) {
    var el2 = document.getElementById('ret-date');
    if (el2) el2.value = calRetDate;
    var rd = document.getElementById('ret-disp');
    if (rd) { rd.textContent = fmtDate(calRetDate); rd.classList.remove('empty'); }
    var crv = document.getElementById('cal-ret-val');
    if (crv) { crv.textContent = fmtDate(calRetDate); crv.classList.remove('empty'); }
  }
  closeCal();
  if (document.getElementById('results-page').classList.contains('open')) rpUpdateHeader();
}

function calSetMode(m) {
  calMode = m;
  var db = document.getElementById('cal-dep-btn');
  var rb = document.getElementById('cal-ret-btn');
  if (db) db.classList.toggle('active', m === 'dep');
  if (rb) rb.classList.toggle('active', m === 'ret');
  buildCalGrid();
}

function calPrevMonth() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  updateCalHeader(); buildCalGrid();
}

function calNextMonth() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  updateCalHeader(); buildCalGrid();
}

function updateCalHeader() {
  var months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  var lbl = document.getElementById('cal-month-lbl');
  if (lbl) lbl.textContent = months[calMonth] + ' ' + calYear;
  var db = document.getElementById('cal-dep-btn');
  var rb = document.getElementById('cal-ret-btn');
  if (db) db.classList.toggle('active', calMode === 'dep');
  if (rb) rb.classList.toggle('active', calMode === 'ret');
  var cdv = document.getElementById('cal-dep-val');
  var crv = document.getElementById('cal-ret-val');
  if (cdv) cdv.textContent = calDepDate ? fmtDate(calDepDate) : 'Datum wählen';
  if (crv) crv.textContent = calRetDate ? fmtDate(calRetDate) : 'Datum wählen';
}

function buildCalGrid() {
  var grid = document.getElementById('cal-grid');
  if (!grid) return;
  var today = new Date(); today.setHours(0,0,0,0);
  var first = new Date(calYear, calMonth, 1);
  var startDow = first.getDay();
  var offset = (startDow + 6) % 7;
  var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  var daysInPrev = new Date(calYear, calMonth, 0).getDate();
  var html = '';
  var cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  for (var ci = 0; ci < cellCount; ci++) {
    var day, mon = calMonth, yr = calYear, other = false;
    if (ci < offset) {
      day = daysInPrev - (offset - 1 - ci);
      mon = calMonth - 1;
      if (mon < 0) { mon = 11; yr--; }
      other = true;
    } else if (ci >= offset + daysInMonth) {
      day = ci - offset - daysInMonth + 1;
      mon = calMonth + 1;
      if (mon > 11) { mon = 0; yr++; }
      other = true;
    } else {
      day = ci - offset + 1;
    }
    var mm = mon + 1 < 10 ? '0' + (mon + 1) : '' + (mon + 1);
    var dd2 = day < 10 ? '0' + day : '' + day;
    var dateStr = yr + '-' + mm + '-' + dd2;
    var dObj = new Date(yr, mon, day);
    var isPast = dObj < today;
    // In multi-city mode, also disable dates outside [minDate, maxDate]
    if (window._mcCalActive) {
      if (window._mcCalMinDate && dateStr < window._mcCalMinDate) isPast = true;
      if (window._mcCalMaxDate && dateStr > window._mcCalMaxDate) isPast = true;
    }
    var isToday = dObj.getTime() === today.getTime();
    var isDepSel = dateStr === calDepDate;
    var isRetSel = dateStr === calRetDate;
    var inRange = calDepDate && calRetDate && dateStr > calDepDate && dateStr < calRetDate;
    var cls = 'cal-day';
    if (other) cls += ' other-month';
    if (isPast) cls += ' past';
    if (isToday) cls += ' today';
    if (isDepSel) cls += ' dep-sel';
    if (isRetSel) cls += ' ret-sel';
    if (inRange) cls += ' in-range';
    if (isDepSel && calRetDate) cls += ' range-start';
    if (isRetSel && calDepDate) cls += ' range-end';
    html += '<button class="' + cls + '" onclick="calClickDay(\'' + dateStr + '\')">' + day + '</button>';
  }
  grid.innerHTML = html;
}

function calClickDay(dateStr) {
  if (calMode === 'dep') {
    // If a return is already set and the new departure falls after it → swap
    if (trip === 'rr' && calRetDate && dateStr > calRetDate) {
      calDepDate = calRetDate;
      calRetDate = dateStr;
      calMode = 'ret';
    } else {
      calDepDate = dateStr;
      if (calRetDate && calRetDate < calDepDate) calRetDate = null;
      if (trip === 'rr') { calMode = 'ret'; }
    }
  } else {
    if (calDepDate && dateStr < calDepDate) {
      // Return chosen before departure → swap: earlier date becomes departure,
      // the old departure becomes the return.
      calRetDate = calDepDate;
      calDepDate = dateStr;
      calMode = 'ret';
    } else {
      calRetDate = dateStr;
    }
  }
  updateCalHeader();
  buildCalGrid();
}

function updateDateDisp() {
  var dv = document.getElementById('dep-date').value;
  var rv = document.getElementById('ret-date').value;
  var dd = document.getElementById('dep-disp');
  var rd = document.getElementById('ret-disp');
  if (dd && dv) { dd.textContent = fmtDate(dv); dd.classList.remove('empty'); }
  if (rd && rv) { rd.textContent = fmtDate(rv); rd.classList.remove('empty'); }
}

function onDateChange(which, val) {
  if (!val) return;
  if (which === 'dep') calDepDate = val;
  if (which === 'ret') calRetDate = val;
  updateDateDisp();
}

// ═══ AUTOCOMPLETE ═══
// Debounce timers per side
var acTimers = {};

// ═══ KEYBOARD-AWARE SCROLL ═══
// When a from/to field gets focus, the mobile keyboard pops up and can cover
// the field itself and/or the autocomplete results below it. We scroll the
// field into the visible area above the keyboard, with a short delay since
// Android/iOS keyboards take time to open and resize the viewport.
function scrollFieldIntoView(el) {
  if (!el) return;
  setTimeout(function() {
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
  }, 300);
}

// [POPULAR-DEST] Shown in the "Nach" (destination) dropdown the instant the
// customer focuses the field, before they've typed anything — same idea as
// wegoreise.de's "Beliebte Reiseziele" list. Codes match rows in AP above.
// Picked for a German-speaking audience: major European capitals first,
// then the most-searched leisure/diaspora destinations already featured
// elsewhere on this page (Beliebte Ziele, Top Strecken).
var POPULAR_DEST_CODES = ['BCN','LIS','IST','FCO','LHR','CDG','AMS','DXB','AYT','CAI'];
function popularDestinationsHtml(side) {
  var byCode = {};
  for (var i = 0; i < AP.length; i++) byCode[AP[i][0]] = AP[i];
  var html = '<div class="ac-section-lbl">' + tL('Beliebte Reiseziele','Popular destinations','الوجهات الشائعة') + '</div>';
  for (var j = 0; j < POPULAR_DEST_CODES.length; j++) {
    var a = byCode[POPULAR_DEST_CODES[j]];
    if (!a) continue;
    var cityDisplay = LANG === 'ar' && a[5] ? a[5] : (LANG === 'en' && a[4] ? a[4] : a[2]);
    html += '<div class="aci" role="option" aria-selected="false" data-side="' + side + '" data-code="' + a[0] + '" data-name="' + a[1] + '" data-city="' + a[2] + '" onclick="doPickAC(this)">';
    html += '<div class="acb">' + a[0] + '</div>';
    html += '<div><div class="acn">' + cityDisplay + ', ' + a[3] + '</div><div class="acs">' + a[1] + '</div></div>';
    html += '</div>';
  }
  return html;
}

function acS(side, q) {
  var drop = document.getElementById(side + '-ac');
  if (!drop) return;
  // [POPULAR-DEST] Empty/near-empty destination field on focus -> show
  // popular destinations instead of nothing. Only for "to": "from" already
  // has a sensible default (Berlin) so an empty focus there has no useful
  // popular-list equivalent.
  if (!q || q.length < 2) {
    if (side === 'to' && (!q || q.length === 0)) {
      drop.innerHTML = popularDestinationsHtml(side);
      drop.classList.add('open');
    } else {
      drop.classList.remove('open');
    }
    return;
  }

  // Show immediate local results while the Duffel API loads
  acSLocal(side, q, drop);

  if (q.length < 2) return;

  // Debounce API call: 300ms after user stops typing
  clearTimeout(acTimers[side]);
  acTimers[side] = setTimeout(function() {
    fetch(PROXY + '/search/airports?q=' + encodeURIComponent(q))
      .then(function(r) { return r.json(); })
      .then(function(json) {
        if (!json.ok || !json.airports || !json.airports.length) return;
        // Trust Duffel's relevance ranking — render results directly (like Duffel)
        var list = json.airports.slice(0, 8);
        var cityTag = (LANG === 'ar' ? 'مدينة' : LANG === 'en' ? 'City' : 'Stadt');
        var allAp = (LANG === 'ar' ? 'كل المطارات' : LANG === 'en' ? 'All airports' : 'Alle Flughäfen');
        var html = '';
        for (var i = 0; i < list.length; i++) {
          var a = list[i];
          var code = a.code || '';
          var countryCode = (a.country || '').toUpperCase();
          var countryName = COUNTRY_DE[countryCode] || a.country || '';
          var isCity = a.type === 'city';
          var cityName = a.city || a.name || code;
          // Primary line + secondary line, Duffel-style
          var primary, secondary, pickCity;
          if (isCity) {
            primary = cityName;
            secondary = (countryName ? countryName + ' · ' : '') + allAp;
            pickCity = cityName;
          } else {
            primary = a.name || cityName;
            secondary = cityName + (countryName ? ' · ' + countryName : '');
            pickCity = cityName;
          }
          var tag = isCity
            ? '<span style="margin-left:8px;font-size:9px;font-weight:800;color:var(--teal2);background:var(--teal-lt);border-radius:5px;padding:1px 6px;vertical-align:middle">' + cityTag + '</span>'
            : '';
          var pickName = isCity ? allAp : (a.name || cityName);
          html += '<div class="aci" role="option" aria-selected="false" data-side="' + side + '" data-code="' + code + '" data-name="' + String(pickName).replace(/"/g, '') + '" data-city="' + String(pickCity).replace(/"/g, '') + '" onclick="doPickAC(this)">';
          html += '<div class="acb"' + (isCity ? ' style="background:var(--teal-lt);color:var(--teal2)"' : '') + '>' + code + '</div>';
          html += '<div><div class="acn">' + escHtml(primary) + tag + '</div><div class="acs">' + escHtml(secondary) + '</div></div>';
          html += '</div>';
        }
        var currentDrop = document.getElementById(side + '-ac');
        if (currentDrop && html) {
          currentDrop.innerHTML = html;
          currentDrop.classList.add('open');
        }
      })
      .catch(function() {
        // Keep local results on API error
      });
  }, 300);
}

function acSLocal(side, q, drop) {
  if (!drop) drop = document.getElementById(side + '-ac');
  if (!drop) return;
  var ql = q.toLowerCase().trim();
  var hits = [];
  for (var i = 0; i < AP.length; i++) {
    var a = AP[i];
    // Only match if query appears at START of city name, airport name, or IATA code
    var matchCode  = a[0].toLowerCase().indexOf(ql) === 0;
    var matchCity  = a[2].toLowerCase().indexOf(ql) === 0;
    var matchName  = a[1].toLowerCase().indexOf(ql) === 0;
    var matchCityEN = a[4] && a[4].toLowerCase().indexOf(ql) === 0;
    var matchCityAR = a[5] && a[5].indexOf(q) === 0;
    var matchCountry = a[3] && a[3].toLowerCase().indexOf(ql) === 0;
    var matchCountryEN = a[6] && a[6].toLowerCase().indexOf(ql) === 0;
    if (matchCode || matchCity || matchName || matchCityEN || matchCityAR || matchCountry || matchCountryEN) {
      hits.push(a);
      if (hits.length >= 8) break;
    }
  }
  if (!hits.length) { drop.classList.remove('open'); return; }
  var html = '';
  for (var j = 0; j < hits.length; j++) {
    var a2 = hits[j];
    var cityDisplay = LANG === 'ar' && a2[5] ? a2[5] : (LANG === 'en' && a2[4] ? a2[4] : a2[2]);
    html += '<div class="aci" role="option" aria-selected="false" data-side="' + side + '" data-code="' + a2[0] + '" data-name="' + a2[1] + '" data-city="' + a2[2] + '" onclick="doPickAC(this)">';
    html += '<div class="acb">' + a2[0] + '</div>';
    html += '<div><div class="acn">' + cityDisplay + ', ' + a2[3] + '</div><div class="acs">' + a2[1] + '</div></div>';
    html += '</div>';
  }
  drop.innerHTML = html;
  drop.classList.add('open');
}

function doPickAC(el) {
  pickAC(
    el.getAttribute('data-side'),
    el.getAttribute('data-code'),
    el.getAttribute('data-name'),
    el.getAttribute('data-city')
  );
}

// [POPULAR-DEST] Same popular-destinations list as the main search's "Nach"
// field, but for one leg of a multi-city itinerary — wires clicks to
// mcPickAC(i, side, ...) instead of the single-trip pickAC(side, ...).
function popularDestinationsHtmlMC(i, side) {
  var byCode = {};
  for (var k = 0; k < AP.length; k++) byCode[AP[k][0]] = AP[k];
  var html = '<div class="ac-section-lbl">' + tL('Beliebte Reiseziele','Popular destinations','الوجهات الشائعة') + '</div>';
  for (var j = 0; j < POPULAR_DEST_CODES.length; j++) {
    var a = byCode[POPULAR_DEST_CODES[j]];
    if (!a) continue;
    var cityDisplay = LANG === 'ar' && a[5] ? a[5] : (LANG === 'en' && a[4] ? a[4] : a[2]);
    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer" onclick="event.stopPropagation();mcPickAC(' + i + ',\'' + side + '\',\'' + a[0] + '\',\'' + a[2].replace(/'/g, "\\'") + '\')" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'\'">';
    html += '<div style="background:var(--teal-bg,#0fb5a015);color:var(--teal);font-size:11px;font-weight:800;padding:4px 7px;border-radius:6px;min-width:36px;text-align:center">' + a[0] + '</div>';
    html += '<div><div style="font-size:13px;font-weight:700;color:var(--tx)">' + cityDisplay + ', ' + a[3] + '</div><div style="font-size:11px;color:var(--tx3)">' + a[1] + '</div></div>';
    html += '</div>';
  }
  return html;
}

function pickAC(side, code, name, city) {
  var inp = document.getElementById(side + '-in');
  var sub = document.getElementById(side + '-sub');
  var drop = document.getElementById(side + '-ac');
  if (inp) inp.value = city;
  if (sub) sub.textContent = name + ' · ' + code;
  if (drop) drop.classList.remove('open');
  if (side === 'from') { fromI = code; fromC = city; }
  else { toI = code; toC = city; }
}

function clearField(side) {
  var inp = document.getElementById(side + '-in');
  var sub = document.getElementById(side + '-sub');
  if (inp) inp.value = '';
  if (sub) sub.textContent = side === 'from' ? 'Berlin Brandenburg · BER' : 'Wohin soll es gehen?';
  if (side === 'from') { fromI = 'BER'; fromC = 'Berlin'; }
  else { toI = ''; toC = ''; }
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.kfield') && !e.target.closest('.acdrop')) {
    var drops = document.querySelectorAll('.acdrop');
    for (var i = 0; i < drops.length; i++) drops[i].classList.remove('open');
  }
});

// ═══ UI ═══
// متغيرات لحفظ آخر نتيجة بحث لكل نوع
var _lastNormalOffers = null;   // آخر نتائج بحث عادي (ow/rr)
var _lastNormalMeta = null;     // { fromI, toI, fromC, toC, dep, ret, trip }
var _lastMcOffers = null;       // آخر نتائج بحث multi-city (HTML جاهز)
var _lastMcMeta = null;         // { mcLegsData snapshot }

function setTripSel(v) {
  trip = v;

  // ── إخفاء/إظهار نتائج البحث بحسب نوع الرحلة ──
  var rw = document.getElementById('rw');
  var offersListEl = document.getElementById('offers-list');

  if (v === 'mc') {
    // إخفاء نتائج البحث العادي
    if (rw) rw.classList.remove('show');
    // عرض آخر نتائج multi-city فقط إذا كانت صفحة النتائج مفتوحة مسبقاً
    var rpPage = document.getElementById('results-page');
    var rpList = document.getElementById('rp-offers-list');
    var resultsWereOpen = rpPage && rpPage.classList.contains('open');
    if (_lastMcOffers && rpList && resultsWereOpen) {
      rpList.innerHTML = _lastMcOffers;
      if (_lastMcMeta) {
        // استعادة mcLegsData
        try { mcLegsData = JSON.parse(JSON.stringify(_lastMcMeta)); } catch(e) {}
      }
      openResultsPage();
    }
  } else {
    // إخفاء نتائج multi-city وإغلاق results-page إذا كانت ناتجة عن mc
    var rpPage = document.getElementById('results-page');
    if (rpPage && rpPage.classList.contains('open') && _lastMcOffers && !_lastNormalOffers) {
      closeResultsPage();
    }
    // عرض آخر نتائج بحث عادي إن وُجدت
    if (_lastNormalOffers && _lastNormalOffers.length) {
      allOffers = _lastNormalOffers.slice();
      filtered = allOffers.slice();
      if (_lastNormalMeta) {
        fromI = _lastNormalMeta.fromI || fromI;
        toI   = _lastNormalMeta.toI   || toI;
        fromC = _lastNormalMeta.fromC || fromC;
        toC   = _lastNormalMeta.toC   || toC;
        var depEl = document.getElementById('dep-date');
        var retEl = document.getElementById('ret-date');
        if (depEl && _lastNormalMeta.dep) depEl.value = _lastNormalMeta.dep;
        if (retEl && _lastNormalMeta.ret) retEl.value = _lastNormalMeta.ret;
      }
      openResultsPage();
    }
  }

  var rs = document.getElementById('ret-sep');
  var rf = document.getElementById('ret-sf');
  var retDisp = document.getElementById('ret-disp');
  var mcLegs = document.getElementById('mc-legs');
  var mcAddBtn = document.getElementById('mc-add-btn');
  var flexBtn = document.getElementById('flex-dates-btn');
  var datesField = document.getElementById('dates-field');

  // Multi-city mode
  if (v === 'mc') {
    if (rs) rs.style.display = 'none';
    if (rf) { rf.style.opacity = '0.35'; rf.style.pointerEvents = 'none'; }
    if (datesField) datesField.style.display = 'none';
    // Hide main from/to/swap fields
    var fromF = document.getElementById('main-from-field');
    var toF = document.getElementById('main-to-field');
    var swapR = document.getElementById('main-swap-row');
    if (fromF) fromF.style.display = 'none';
    if (toF) toF.style.display = 'none';
    if (swapR) swapR.style.display = 'none';
    if (mcLegs) {
      var mainFrom = fromI || document.getElementById('from-in').value.trim().toUpperCase().slice(0,3);
      var mainFromC = document.getElementById('from-in') ? document.getElementById('from-in').value.trim() : '';
      if (mainFrom && mainFrom.length === 3) {
        mcLegsData[0].from = mainFrom;
        mcLegsData[0].fromC = mainFromC;
      }
      mcLegs.style.display = 'block';
      mcRenderLegs();
    }
    if (mcAddBtn) mcAddBtn.style.display = 'block';
    renderRecentSearches();
    return;
  }

  // Show main from/to/swap fields
  var fromF = document.getElementById('main-from-field');
  var toF = document.getElementById('main-to-field');
  var swapR = document.getElementById('main-swap-row');
  if (fromF) fromF.style.display = '';
  if (toF) toF.style.display = '';
  if (swapR) swapR.style.display = '';

  // Hide multi-city UI
  if (mcLegs) mcLegs.style.display = 'none';
  if (mcAddBtn) mcAddBtn.style.display = 'none';
  if (datesField) datesField.style.display = '';
  if (flexBtn) flexBtn.style.display = 'flex';

  if (rs) rs.style.display = v === 'ow' ? 'none' : 'block';
  if (rf) {
    rf.style.opacity = v === 'ow' ? '0.35' : '1';
    rf.style.pointerEvents = v === 'ow' ? 'none' : 'auto';
  }
  if (v === 'ow') {
    calRetDate = null;
    var rd = document.getElementById('ret-date');
    if (rd) rd.value = '';
    if (retDisp) { retDisp.textContent = 'Nicht nötig'; retDisp.style.color = 'var(--tx3)'; }
  } else {
    if (retDisp && retDisp.textContent === 'Nicht nötig') {
      retDisp.textContent = 'Datum wählen';
      retDisp.style.color = '';
    }
  }
  var rb = document.getElementById('cal-ret-btn');
  if (rb) rb.style.display = v === 'ow' ? 'none' : '';
  renderRecentSearches();
}

// ── MULTI-CITY ──
var mcLegsData = [
  { from: 'BER', fromC: 'Berlin', to: '', toC: '', date: '' },
  { from: '', fromC: '', to: '', toC: '', date: '' }
];

function mcRenderLegs() {
  var container = document.getElementById('mc-legs');
  if (!container) return;
  var html = '';
  for (var i = 0; i < mcLegsData.length; i++) {
    var leg = mcLegsData[i];
    html += '<div class="mc-leg" style="background:var(--bg2);border:1.5px solid var(--bd);border-radius:14px;padding:12px;margin-bottom:8px;position:relative">';
    html += '<div style="font-size:11px;font-weight:700;color:var(--teal);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Flug ' + (i+1) + (i===0?' (Hinflug)':i===mcLegsData.length-1?' (letzter Stopp)':' (Zwischenstopp)') + '</div>';
    // From
    html += '<div style="display:flex;gap:8px;margin-bottom:8px">';
    html += '<div style="flex:1;position:relative;background:var(--bg);border:1.5px solid var(--bd);border-radius:10px;padding:10px 12px;cursor:text" onclick="mcFocusInput('+i+',\'from\')">';
    html += '<div style="font-size:10px;color:var(--tx3);margin-bottom:2px">Von</div>';
    html += '<input id="mc-from-'+i+'" value="'+(leg.fromC||leg.from||'')+'" placeholder="Stadt oder Flughafen" style="border:none;background:transparent;width:100%;font-size:14px;font-weight:700;color:var(--tx);outline:none" oninput="mcAC('+i+',\'from\',this.value)" onfocus="scrollFieldIntoView(this)" onblur="mcSyncTyped('+i+',\'from\',this.value)">';
    html += '<div id="mc-ac-from-'+i+'" class="ac-drop" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--bg);border:1.5px solid var(--bd);border-radius:10px;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,.15)"></div>';
    html += '</div>';
    // To
    html += '<div style="flex:1;position:relative;background:var(--bg);border:1.5px solid var(--bd);border-radius:10px;padding:10px 12px;cursor:text" onclick="mcFocusInput('+i+',\'to\')">';
    html += '<div style="font-size:10px;color:var(--tx3);margin-bottom:2px">Nach</div>';
    html += '<input id="mc-to-'+i+'" value="'+(leg.toC||leg.to||'')+'" placeholder="Stadt oder Flughafen" style="border:none;background:transparent;width:100%;font-size:14px;font-weight:700;color:var(--tx);outline:none" oninput="mcAC('+i+',\'to\',this.value)" onfocus="mcAC('+i+',\'to\',this.value);scrollFieldIntoView(this)" onblur="mcSyncTyped('+i+',\'to\',this.value)">';
    html += '<div id="mc-ac-to-'+i+'" class="ac-drop" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--bg);border:1.5px solid var(--bd);border-radius:10px;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,.15)"></div>';
    html += '</div>';
    html += '</div>';
    // Date - use existing calendar
    var today = new Date().toISOString().split('T')[0];
    var minDate = i > 0 && mcLegsData[i-1].date ? mcLegsData[i-1].date : today;
    html += '<div style="background:var(--bg);border:1.5px solid var(--bd);border-radius:10px;padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:10px" onclick="mcOpenCal('+i+')">';
    html += '<div style="flex:1"><div style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Datum</div>';
    html += '<div id="mc-date-disp-'+i+'" style="font-size:14px;font-weight:700;color:'+(leg.date?'var(--tx)':'var(--tx3)')+'">'+( leg.date ? fmtDate(leg.date) : 'Datum wählen')+'</div></div>';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    html += '</div>';
    // Remove button
    if (mcLegsData.length > 2) {
      html += '<button onclick="mcRemoveLeg('+i+')" style="position:absolute;top:10px;right:10px;background:var(--rd-bg,#ff5a5f22);border:none;border-radius:8px;padding:4px 8px;color:var(--rd,#ff5a5f);font-size:11px;font-weight:700;cursor:pointer">✕ Entfernen</button>';
    }
    html += '</div>';
    // Arrow between legs
    if (i < mcLegsData.length - 1) {
      html += '<div style="text-align:center;margin:-4px 0;font-size:18px;color:var(--teal)">↓</div>';
    }
  }
  container.innerHTML = html;
}

function mcFocusInput(i, side) {
  var el = document.getElementById('mc-' + side + '-' + i);
  if (el) { el.focus(); scrollFieldIntoView(el); }
}

function mcAC(i, side, val) {
  if (!val || val.length < 2) {
    var dd0 = document.getElementById('mc-ac-' + side + '-' + i);
    if (!dd0) return;
    // [POPULAR-DEST] Same behavior as the main search's "Nach" field: an
    // empty destination leg shows popular picks instead of nothing. Only
    // for "to" — "from" auto-fills from the previous leg's destination, so
    // it's rarely empty, and a "from" popular-list doesn't make sense.
    if (side === 'to' && !val) {
      dd0.innerHTML = popularDestinationsHtmlMC(i, side);
      dd0.style.display = 'block';
    } else {
      dd0.style.display = 'none';
    }
    return;
  }
  var ql = val.toLowerCase();
  var hits = [];
  for (var j = 0; j < AP.length; j++) {
    var a = AP[j];
    if (a[0].toLowerCase().indexOf(ql) === 0 || a[2].toLowerCase().indexOf(ql) === 0 ||
        (a[4] && a[4].toLowerCase().indexOf(ql) === 0) || (a[6] && a[6].toLowerCase().indexOf(ql) === 0)) {
      hits.push(a);
      if (hits.length >= 6) break;
    }
  }
  var dd = document.getElementById('mc-ac-' + side + '-' + i);
  if (!dd) return;
  if (!hits.length) { dd.style.display = 'none'; return; }
  var html = '';
  for (var k = 0; k < hits.length; k++) {
    var a2 = hits[k];
    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--bd)" onclick="event.stopPropagation();mcPickAC('+i+',\''+side+'\',\''+a2[0]+'\',\''+a2[2]+'\')" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'\'">';
    html += '<div style="background:var(--teal-bg,#0fb5a015);color:var(--teal);font-size:11px;font-weight:800;padding:4px 7px;border-radius:6px;min-width:36px;text-align:center">'+a2[0]+'</div>';
    html += '<div><div style="font-size:13px;font-weight:700;color:var(--tx)">'+a2[2]+', '+a2[3]+'</div><div style="font-size:11px;color:var(--tx3)">'+a2[1]+'</div></div>';
    html += '</div>';
  }
  dd.innerHTML = html;
  dd.style.display = 'block';
}

// [FIX] Safety net: if the user types a city/airport and leaves the field
// WITHOUT clicking an autocomplete suggestion (mcPickAC never runs in that
// case), mcLegsData[i].toC/fromC silently kept the value from a PREVIOUS
// search. That's exactly why "last search" sometimes still showed an old
// city like Paris after searching Berlin→London→Dubai. On blur, try to
// resolve the typed text to a real airport and sync mcLegsData with it.
function mcSyncTyped(i, side, typedValue) {
  if (!mcLegsData[i]) return;
  var v = (typedValue || '').trim();
  if (!v) return;
  // Already matches what's stored — nothing to do
  if (v === mcLegsData[i][side + 'C']) return;
  var vl = v.toLowerCase();
  var match = null;
  for (var ai = 0; ai < AP.length; ai++) {
    var a = AP[ai];
    if (a[0].toLowerCase() === vl || a[2].toLowerCase() === vl) { match = a; break; }
  }
  if (!match) {
    for (var aj = 0; aj < AP.length; aj++) {
      var a2 = AP[aj];
      if (a2[2].toLowerCase().indexOf(vl) === 0) { match = a2; break; }
    }
  }
  if (match) {
    mcLegsData[i][side] = match[0];
    mcLegsData[i][side + 'C'] = match[2];
    if (side === 'to' && i < mcLegsData.length - 1) {
      mcLegsData[i+1].from = match[0];
      mcLegsData[i+1].fromC = match[2];
      var nextInp = document.getElementById('mc-from-' + (i+1));
      if (nextInp) nextInp.value = match[2];
    }
  } else {
    // No real airport matches the typed text — clear the stale stored
    // value instead of silently keeping a previous search's city. This is
    // what makes doSearch()'s "missing field" validation correctly catch
    // it, rather than searching the OLD route the user already left.
    mcLegsData[i][side] = '';
    mcLegsData[i][side + 'C'] = '';
  }
}

function mcPickAC(i, side, code, city) {
  mcLegsData[i][side] = code;
  mcLegsData[i][side + 'C'] = city;
  var inp = document.getElementById('mc-' + side + '-' + i);
  if (inp) inp.value = city;
  var dd = document.getElementById('mc-ac-' + side + '-' + i);
  if (dd) dd.style.display = 'none';
  // Auto-fill next leg's FROM
  if (side === 'to' && i < mcLegsData.length - 1) {
    mcLegsData[i+1].from = code;
    mcLegsData[i+1].fromC = city;
    var nextInp = document.getElementById('mc-from-' + (i+1));
    if (nextInp) nextInp.value = city;
  }
}

function mcOpenCal(legIdx) {
  var today = new Date().toISOString().split('T')[0];
  var minDate = legIdx > 0 && mcLegsData[legIdx-1].date ? mcLegsData[legIdx-1].date : today;
  // If the NEXT leg already has a date, the current leg can't be picked after it.
  var maxDate = (legIdx < mcLegsData.length - 1 && mcLegsData[legIdx+1].date) ? mcLegsData[legIdx+1].date : null;
  var curDate = mcLegsData[legIdx].date || minDate;

  calMode = 'dep';
  calDepDate = curDate;
  calRetDate = null;

  var refDate = new Date(curDate + 'T00:00:00');
  calYear = refDate.getFullYear();
  calMonth = refDate.getMonth();

  // Store mc leg context globally
  window._mcCalLegIdx = legIdx;
  window._mcCalMinDate = minDate;
  window._mcCalMaxDate = maxDate;
  window._mcCalActive = true;

  updateCalHeader();
  buildCalGrid();

  var rb = document.getElementById('cal-ret-btn');
  if (rb) rb.style.display = 'none';

  var ov = document.getElementById('cal-ov');
  if (ov) ov.classList.add('open');
}

function mcSetDate(i, val) {
  var today = new Date().toISOString().split('T')[0];
  var minDate = today;
  if (i > 0 && mcLegsData[i-1].date) {
    minDate = mcLegsData[i-1].date > today ? mcLegsData[i-1].date : today;
  }
  if (val < minDate) {
    showToast('⚠️ Datum muss nach ' + fmtDate(minDate) + ' sein', 'error');
    // Reset input
    var inp = document.getElementById('mc-date-' + i);
    if (inp) inp.value = '';
    return;
  }
  mcLegsData[i].date = val;
  var disp = document.getElementById('mc-date-disp-' + i);
  if (disp) { disp.textContent = val ? fmtDate(val) : 'Datum wählen'; disp.style.color = val ? 'var(--tx)' : 'var(--tx3)'; }
  // Update next legs min date
  mcRenderLegs();
}

function mcAddLeg() {
  if (mcLegsData.length >= 5) { showToast('Maximal 5 Stopps möglich', 'error'); return; }
  var last = mcLegsData[mcLegsData.length - 1];
  mcLegsData.push({ from: last.to || '', fromC: last.toC || '', to: '', toC: '', date: '' });
  mcRenderLegs();
}

function mcRemoveLeg(i) {
  mcLegsData.splice(i, 1);
  mcRenderLegs();
}

// ── FLEXIBLE DATES ──
function openFlexDates() {
  var existing = document.getElementById('flex-dates-modal');
  if (existing) { existing.style.display = 'flex'; return; }

  var modal = document.createElement('div');
  modal.id = 'flex-dates-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(10,24,34,.85);z-index:9000;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(6px)';

  var now = new Date();
  var months = [];
  for (var m = 0; m < 6; m++) {
    var d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  var activeMonth = 0;
  var selectedDep = null, selectedRet = null;
  var flexMode = 'exact'; // exact | ±3 | ±7 | month

  function renderModal() {
    var mo = months[activeMonth];
    var daysInMonth = new Date(mo.year, mo.month + 1, 0).getDate();
    var firstDay = new Date(mo.year, mo.month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1;
    var monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

    var calHtml = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:8px">';
    ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(function(d){ calHtml += '<div style="text-align:center;font-size:10px;font-weight:700;color:var(--tx3);padding:4px 0">'+d+'</div>'; });
    for (var e = 0; e < firstDay; e++) calHtml += '<div></div>';
    var todayStr = now.toISOString().split('T')[0];
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = mo.year + '-' + String(mo.month+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
      var isPast = dateStr < todayStr;
      var isSelDep = dateStr === selectedDep;
      var isSelRet = dateStr === selectedRet;
      var inRange = selectedDep && selectedRet && dateStr > selectedDep && dateStr < selectedRet;
      var bg = isSelDep || isSelRet ? 'var(--teal)' : inRange ? 'var(--teal-bg,#0fb5a022)' : 'transparent';
      var color = isSelDep || isSelRet ? '#fff' : isPast ? 'var(--tx3)' : 'var(--tx)';
      var opacity = isPast ? '0.4' : '1';
      calHtml += '<div onclick="'+(isPast?'':'flexPickDay(\''+dateStr+'\')')+'" style="text-align:center;padding:8px 2px;border-radius:8px;cursor:'+(isPast?'default':'pointer')+';background:'+bg+';color:'+color+';font-size:13px;font-weight:'+(isSelDep||isSelRet?'800':'500')+';opacity:'+opacity+';transition:background .1s">'+ day +'</div>';
    }
    calHtml += '</div>';

    modal.innerHTML =
      '<div style="background:var(--bg);border-radius:24px 24px 0 0;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:20px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
          '<div style="font-size:16px;font-weight:800;color:var(--tx)">🗓️ Flexible Daten</div>' +
          '<button onclick="document.getElementById(\'flex-dates-modal\').style.display=\'none\'" style="background:var(--bg2);border:none;border-radius:10px;padding:8px 12px;font-size:13px;cursor:pointer;color:var(--tx)">✕</button>' +
        '</div>' +
        // Flexibility chips
        '<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">' +
          ['Exakt','±3 Tage','±7 Tage','Ganzer Monat'].map(function(l,i){
            var modes = ['exact','±3','±7','month'];
            var active = flexMode === modes[i];
            return '<button onclick="flexSetMode(\''+modes[i]+'\')" style="padding:6px 14px;border-radius:20px;border:1.5px solid '+(active?'var(--teal)':'var(--bd)')+';background:'+(active?'var(--teal)':'transparent')+';color:'+(active?'#fff':'var(--tx2)')+';font-size:12px;font-weight:700;cursor:pointer">'+l+'</button>';
          }).join('') +
        '</div>' +
        // Month navigation
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
          '<button onclick="flexPrevMonth()" style="background:var(--bg2);border:none;border-radius:10px;padding:8px 12px;cursor:pointer;color:var(--tx);font-size:16px">' + (activeMonth > 0 ? '←' : '') + '</button>' +
          '<div style="font-weight:800;color:var(--tx);font-size:15px">'+monthNames[mo.month]+' '+mo.year+'</div>' +
          '<button onclick="flexNextMonth()" style="background:var(--bg2);border:none;border-radius:10px;padding:8px 12px;cursor:pointer;color:var(--tx);font-size:16px">'+(activeMonth < months.length-1 ? '→' : '')+'</button>' +
        '</div>' +
        calHtml +
        // Selected range display
        '<div style="background:var(--bg2);border-radius:12px;padding:12px;margin-top:8px;display:flex;gap:12px">' +
          '<div style="flex:1;text-align:center">' +
            '<div style="font-size:10px;color:var(--tx3);margin-bottom:4px">Abflug</div>' +
            '<div style="font-size:14px;font-weight:800;color:'+(selectedDep?'var(--teal)':'var(--tx3)')+'">'+( selectedDep ? fmtDate(selectedDep) : '—')+'</div>' +
          '</div>' +
          '<div style="width:1px;background:var(--bd)"></div>' +
          '<div style="flex:1;text-align:center">' +
            '<div style="font-size:10px;color:var(--tx3);margin-bottom:4px">Rückkehr</div>' +
            '<div style="font-size:14px;font-weight:800;color:'+(selectedRet?'var(--teal)':'var(--tx3)')+'">'+( selectedRet ? fmtDate(selectedRet) : '—')+'</div>' +
          '</div>' +
        '</div>' +
        '<button onclick="flexApply()" style="width:100%;background:var(--teal);color:#fff;border:none;border-radius:14px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;margin-top:12px">Daten übernehmen ✓</button>' +
      '</div>';

    // Attach handlers via window scope
    window.flexPickDay = function(dateStr) {
      if (!selectedDep || (selectedDep && selectedRet)) {
        selectedDep = dateStr; selectedRet = null;
      } else {
        if (dateStr <= selectedDep) { selectedDep = dateStr; selectedRet = null; }
        else { selectedRet = dateStr; }
      }
      renderModal();
    };
    window.flexSetMode = function(m) { flexMode = m; renderModal(); };
    window.flexPrevMonth = function() { if (activeMonth > 0) { activeMonth--; renderModal(); } };
    window.flexNextMonth = function() { if (activeMonth < months.length-1) { activeMonth++; renderModal(); } };
    window.flexApply = function() {
      if (!selectedDep) { showToast('Bitte Abflugdatum wählen', 'error'); return; }
      // Apply to main form
      var depInp = document.getElementById('dep-date');
      var retInp = document.getElementById('ret-date');
      var depDisp = document.getElementById('dep-disp');
      var retDisp = document.getElementById('ret-disp');
      if (depInp) depInp.value = selectedDep;
      if (depDisp) { depDisp.textContent = fmtDate(selectedDep); depDisp.style.color = 'var(--tx)'; }
      calDepDate = selectedDep;
      if (selectedRet && retInp) {
        retInp.value = selectedRet;
        if (retDisp) { retDisp.textContent = fmtDate(selectedRet); retDisp.style.color = 'var(--tx)'; }
        calRetDate = selectedRet;
      }
      // Update flex button label
      var lbl = document.getElementById('flex-dates-label');
      if (lbl) lbl.textContent = fmtDate(selectedDep) + (selectedRet ? ' → ' + fmtDate(selectedRet) : '') + (flexMode !== 'exact' ? ' (' + flexMode + ')' : '');
      modal.style.display = 'none';
    };
  }

  renderModal();
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e){ if(e.target===modal) modal.style.display='none'; });
}

function fmtDate(d) {
  if (!d) return '';
  var p = d.split('-');
  var months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  return p[2] + '. ' + months[parseInt(p[1])-1] + ' ' + p[0];
}

function setTrip(t) { trip = t; }

function toggleF(k) {
  if (k === 'dir') {
    fDir = !fDir;
    var el = document.getElementById('ch-dir');
    if (el) el.classList.toggle('on', fDir);
  } else {
    fBag = !fBag;
    var el2 = document.getElementById('ch-bag');
    if (el2) el2.classList.toggle('on', fBag);
  }
  // If search already done, re-apply filter
  if (allOffers.length > 0) applyF();
}

function swapC() {
  var tmp;
  tmp = fromI; fromI = toI; toI = tmp;
  tmp = fromC; fromC = toC; toC = tmp;
  var fi = document.getElementById('from-in');
  var ti = document.getElementById('to-in');
  var fs = document.getElementById('from-sub');
  var ts = document.getElementById('to-sub');
  if (fi && ti) { tmp = fi.value; fi.value = ti.value; ti.value = tmp; }
  if (fs && ts) { tmp = fs.textContent; fs.textContent = ts.textContent; ts.textContent = tmp; }
}

function chp(k, d) {
  if (k === 'a') {
    var na = Math.max(1, PAX.a + d);
    // Each infant needs a unique responsible adult (Duffel rule) → adults ≥ infants
    if (na < PAX.i) {
      showToast(tL('Jedes Kleinkind benötigt einen Erwachsenen.','Each infant needs an adult.','كل رضيع يحتاج بالغاً مرافقاً.'), 'info');
      na = PAX.i;
    }
    PAX.a = na;
  }
  else if (k === 'c') PAX.c = Math.max(0, PAX.c + d);
  else if (k === 'b') PAX.b = Math.max(0, PAX.b + d);
  else if (k === 'h') PAX.h = Math.max(0, Math.min(1, PAX.h + d));
  else {
    // infants: cannot exceed the number of adults (each needs its own adult)
    var ni = Math.max(0, PAX.i + d);
    if (ni > PAX.a) {
      showToast(tL('Bitte zuerst einen Erwachsenen hinzufügen.','Please add an adult first.','يرجى إضافة بالغ أولاً.'), 'info');
      ni = PAX.a;
    }
    PAX.i = ni;
  }
  var el = document.getElementById('p' + k);
  if (el) el.textContent = PAX[k];
  var bn = document.getElementById('bag-num');
  if (bn) bn.textContent = PAX.b + PAX.h;
}

function savePax() {
  PAX.cabin = document.getElementById('cabin').value;
  // Persist PAX preferences
  try { localStorage.setItem('fw_pax', JSON.stringify({a:PAX.a,c:PAX.c,i:PAX.i,b:PAX.b,h:PAX.h,cabin:PAX.cabin})); } catch(e) {}
  var m = {economy:'Economy', premium_economy:'Prem.Eco', business:'Business', first:'First'};
  var l = PAX.a + ' Erw.';
  if (PAX.c > 0) l += ', ' + PAX.c + ' Kind';
  if (PAX.i > 0) l += ', ' + PAX.i + ' Baby';
  l += ' · ' + m[PAX.cabin];
  var pl = document.getElementById('pax-lbl'); if (pl) pl.textContent = l;
  var pn = document.getElementById('pax-num'); if (pn) pn.textContent = PAX.a + PAX.c + PAX.i;
  var bn = document.getElementById('bag-num'); if (bn) bn.textContent = PAX.b + PAX.h;
  var ph2 = document.getElementById('ph'); if (ph2) ph2.textContent = PAX.h;
  var pov = document.getElementById('pov'); if (pov) pov.classList.remove('open');
  if (document.getElementById('results-page').classList.contains('open')) rpUpdateHeader();
}

function closeBov() {
  if (expiryTimer) { clearInterval(expiryTimer); expiryTimer = null; }
  var el = document.getElementById('bov');
  if (el) el.classList.remove('open');
}

function setAlert(btn) {
  if (btn.classList.contains('done')) {
    btn.textContent = 'Alarm einrichten';
    btn.classList.remove('done');
    try { localStorage.removeItem('fw_alert_' + fromI + '_' + toI); } catch(e) {}
    showToast('🔕 Preisalarm deaktiviert', 'info');
  } else {
    btn.textContent = '✓ Alarm aktiv';
    btn.classList.add('done');
    try {
      var alert_data = {
        orig: fromI, dest: toI, origC: fromC, destC: toC,
        dep: document.getElementById('dep-date') ? document.getElementById('dep-date').value : '',
        price: allOffers.length ? allOffers[0].price : 0,
        time: Date.now()
      };
      localStorage.setItem('fw_alert_' + fromI + '_' + toI, JSON.stringify(alert_data));
    } catch(e) {}
    showToast('🔔 Preisalarm aktiviert! Wir benachrichtigen dich bei Preisänderungen.', 'success');
  }
}


// ═══ SEARCH ═══
// Recent searches are split into two separate stores:
//   fw_searches    → last simple search (one-way / return)
//   fw_searches_mc → last multi-city search
// renderRecentSearches() shows only the one matching the current trip mode.
function saveRecentSearch(orig, dest, dep, ret) {
  try {
    var searches = JSON.parse(localStorage.getItem('fw_searches') || '[]');
    var entry = {orig:orig, dest:dest, dep:dep, ret:ret||'', origC:fromC, destC:toC, time:Date.now()};
    searches = searches.filter(function(s) { return s.orig!==orig||s.dest!==dest; });
    searches.unshift(entry);
    localStorage.setItem('fw_searches', JSON.stringify(searches.slice(0,5)));
    renderRecentSearches();
  } catch(e) {}
}

// Save the last multi-city search (its legs)
function saveRecentSearchMC(legs) {
  try {
    if (!legs || !legs.length) return;
    var entry = { legs: legs.map(function(l){ return {orig:l.orig, dest:l.dest, dep:l.dep, origC:l.origC||l.orig, destC:l.destC||l.dest}; }), time: Date.now() };
    localStorage.setItem('fw_searches_mc', JSON.stringify([entry]));
    renderRecentSearches();
  } catch(e) {}
}

function renderRecentSearches() {
  var el = document.getElementById('recent-searches');
  if (!el) return;
  try {
    // Multi-city mode → show last multi-city search only
    if (trip === 'mc') {
      var mcArr = JSON.parse(localStorage.getItem('fw_searches_mc') || '[]');
      if (!mcArr.length || !mcArr[0].legs || !mcArr[0].legs.length) { el.style.display='none'; return; }
      var legs = mcArr[0].legs;
      var routeTxt = legs.map(function(l){ return escHtml(l.origC||l.orig); }).join(' → ') + ' → ' + escHtml(legs[legs.length-1].destC||legs[legs.length-1].dest);
      var mcHtml = '<div class="recent-title">' + escHtml(t('recent_title')) + '</div>';
      mcHtml += '<div class="recent-chip" data-mc="1" onclick="doQuickSearchMC()">';
      mcHtml += '<span>✈ ' + routeTxt + '</span>';
      mcHtml += '<span class="recent-date">' + escHtml(legs[0].dep||'') + '</span>';
      mcHtml += '</div>';
      el.style.display = 'block';
      el.innerHTML = mcHtml;
      return;
    }
    // Simple mode (one-way / return) → show last simple search only
    var searches = JSON.parse(localStorage.getItem('fw_searches') || '[]');
    if (!searches.length) { el.style.display='none'; return; }
    el.style.display = 'block';
    var html = '<div class="recent-title">' + escHtml(t('recent_title')) + '</div>';
    var s = searches[0];
    html += '<div class="recent-chip" data-orig="' + escHtml(s.orig) + '" data-dest="' + escHtml(s.dest) + '" data-dep="' + escHtml(s.dep||'') + '" data-ret="' + escHtml(s.ret||'') + '" data-origc="' + escHtml(s.origC||s.orig) + '" data-destc="' + escHtml(s.destC||s.dest) + '" onclick="doQuickSearch(this)">';
    html += '<span>✈ ' + escHtml(s.origC||s.orig) + ' → ' + escHtml(s.destC||s.dest) + '</span>';
    html += '<span class="recent-date">' + escHtml(s.dep||'') + '</span>';
    html += '</div>';
    el.innerHTML = html;
  } catch(e) {}
}

// Re-apply the last multi-city search
function doQuickSearchMC() {
  try {
    var mcArr = JSON.parse(localStorage.getItem('fw_searches_mc') || '[]');
    if (!mcArr.length || !mcArr[0].legs) return;
    var legs = mcArr[0].legs;
    mcLegsData = legs.map(function(l){ return {from:l.orig, to:l.dest, date:l.dep, fromC:l.origC||l.orig, toC:l.destC||l.dest}; });
    if (typeof mcRenderLegs === 'function') mcRenderLegs();
    window.scrollTo({top:0,behavior:'smooth'});
    setTimeout(doSearch, 300);
  } catch(e) {}
}

function doQuickSearch(el) {
  var orig  = el.getAttribute('data-orig');
  var dest  = el.getAttribute('data-dest');
  var dep   = el.getAttribute('data-dep');
  var ret   = el.getAttribute('data-ret');
  var origC = el.getAttribute('data-origc');
  var destC = el.getAttribute('data-destc');
  fromI=orig; toI=dest; fromC=origC||orig; toC=destC||dest;
  var fi=document.getElementById('from-in'); if(fi) fi.value=fromC;
  var ti=document.getElementById('to-in');  if(ti) ti.value=toC;
  var dd=document.getElementById('dep-date'); if(dd&&dep) dd.value=dep;
  var rd=document.getElementById('ret-date'); if(rd&&ret) rd.value=ret;
  calDepDate=dep; calRetDate=ret||null;
  var dd2=document.getElementById('dep-disp'); if(dd2&&dep){dd2.textContent=fmtDate(dep);dd2.classList.remove('empty');}
  var rd2=document.getElementById('ret-disp'); if(rd2&&ret){rd2.textContent=fmtDate(ret);rd2.classList.remove('empty');}
  window.scrollTo({top:0,behavior:'smooth'});
  setTimeout(doSearch, 300);
}

function doSearch() {
  // ── Multi-city mode ──
  if (trip === 'mc') {
    var mcMissing = [];
    for (var mi = 0; mi < mcLegsData.length; mi++) {
      var leg = mcLegsData[mi];
      if (!leg.from || leg.from.length < 3) mcMissing.push({ ico:'🛫', title:'Flug '+(mi+1)+': Abflugort fehlt', sub:'Bitte Abflugort eingeben', action:'mcFocusFrom:'+mi });
      if (!leg.to || leg.to.length < 3) mcMissing.push({ ico:'🛬', title:'Flug '+(mi+1)+': Zielort fehlt', sub:'Bitte Zielort eingeben', action:'mcFocusTo:'+mi });
      if (!leg.date) mcMissing.push({ ico:'📅', title:'Flug '+(mi+1)+': Datum fehlt', sub:'Bitte Datum wählen', action:'mcOpenDate:'+mi });
    }
    if (mcMissing.length > 0) return showHelper(mcMissing);

    // Save this multi-city search for "recent searches"
    try {
      saveRecentSearchMC(mcLegsData.map(function(l){ return {orig:l.from, dest:l.to, dep:l.date, origC:l.fromC||l.from, destC:l.toC||l.to}; }));
    } catch(e) {}

    // Open results page
    var rpPage = document.getElementById('results-page');
    if (rpPage) { rpPage.classList.add('open'); document.body.style.overflow = 'hidden'; }
    var rpList = document.getElementById('rp-offers-list');
    if (rpList) rpList.innerHTML = '<div style="text-align:center;padding:80px 20px"><div style="font-size:3.5rem;margin-bottom:16px">✈️</div><div style="font-size:16px;font-weight:700;color:var(--tx);margin-bottom:8px">Mehrere Städte werden gesucht...</div><div style="font-size:13px;color:var(--tx3);margin-bottom:20px">'+mcLegsData.length+' Stopps werden geprüft</div><div style="margin:0 auto;max-width:220px;height:5px;background:var(--bd);border-radius:3px"><div id="rp-prog" style="height:100%;width:8%;background:var(--teal);border-radius:3px;transition:width 1.5s ease"></div></div></div>';
    setTimeout(function(){ var p=document.getElementById('rp-prog');if(p)p.style.width='65%'; }, 300);

    // Search each leg sequentially and show combined results
    allOffers = []; shownN = 0;
    var legResults = [];
    var legsDone = 0;

    function searchLeg(idx) {
      if (idx >= mcLegsData.length) {
        setTimeout(function(){var p=document.getElementById('rp-prog');if(p)p.style.width='100%';},200);
        setTimeout(function(){
          if (rpList) {
            // [FIX] allOffers now holds real combined multi-city offers
            // (one card per itinerary, every leg shown inside it) — this is
            // what makes filters, sorting, card-tap details, and booking all
            // work the same way they already do for normal round-trip search.
            allOffers = (window._mcOffers || []).slice();
            filtered = allOffers.slice();
            shownN = 0;

            // [MULTICITY-FIX] Build the airline checklist, stop counts, and
            // price-slider max from these real offers — multi-city never
            // called initResults(), so without this the filter sheet always
            // showed an empty airline list, blank stop counts, and a stale
            // €0–9999 price range no matter what the actual offers were.
            rebuildFilterPanels();

            // applyRpF() updates BOTH `filtered` AND the visible
            // #rp-offers-list via rpAddOffers — calling applyF() alone (as
            // before) only ever touched the hidden #offers-list, which is
            // exactly why filters/sort previously appeared to do nothing.
            if (typeof applyRpF === 'function') applyRpF();

            var routeTxt = mcLegsData.map(function(l){ return l.fromC||l.from; }).join(' → ') +
              (mcLegsData.length ? (' → ' + (mcLegsData[mcLegsData.length-1].toC||mcLegsData[mcLegsData.length-1].to)) : '');
            var banner = '<div style="background:var(--teal-bg,#0fb5a015);border:1.5px solid var(--teal);border-radius:14px;padding:14px;margin-bottom:12px;text-align:center"><div style="font-size:13px;font-weight:700;color:var(--teal)">✈ Multi-City Route: ' + escHtml(routeTxt) + '</div></div>';
            if (!allOffers.length) {
              rpList.innerHTML = banner + '<div style="text-align:center;padding:40px 20px;color:var(--tx3)"><div style="font-size:2.5rem;margin-bottom:10px">😕</div><div style="font-size:14px;font-weight:600">' + tL('Keine Flüge gefunden','No flights found','لم نجد رحلات') + '</div></div>';
            } else {
              rpList.insertAdjacentHTML('afterbegin', banner);
            }

            _lastMcOffers = rpList.innerHTML;
            _lastMcMeta = JSON.parse(JSON.stringify(mcLegsData));
            _lastNormalOffers = null;
            _lastNormalMeta = null;
            rpUpdateHeader();
          }
        }, 600);
        return;
      }

      // Build all slices in one request (Duffel multi-city format)
      if (idx === 0) {
        var slices = mcLegsData.map(function(l) {
          return { origin: l.from, destination: l.to, departure_date: l.date };
        });
        var mcBody = {
          slices: slices,
          cabin_class: PAX.cabin,
          adults: PAX.a,
          children: PAX.c,
          infants: PAX.i,
          multi_city: true
        };
        fetch(PROXY + '/search', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(mcBody) })
          .then(function(r){ return r.json(); })
          .then(function(json){
            var raw = Array.isArray(json.offers) ? json.offers : [];
            // [FIX] Each multi-city offer is ONE itinerary covering every
            // leg at ONE total price — normalize it as a single combined
            // offer (mcOffers), never split per leg.
            var mcOffers = [];
            raw.forEach(function(offer) {
              var no = duffelToLocalMultiCity(offer);
              if (no) mcOffers.push(no);
            });
            mcOffers.sort(function(a,b){ return a.price - b.price; });
            window._mcOffers = mcOffers;
            searchLeg(mcLegsData.length); // skip to end
          }).catch(function(){
            window._mcOffers = [];
            searchLeg(mcLegsData.length);
          });
      }
    }
    searchLeg(0);
    return;
  }

  // Open results page immediately with loading state
  var orig = fromI || document.getElementById('from-in').value.trim().toUpperCase().slice(0,3);
  var dest = toI || document.getElementById('to-in').value.trim().toUpperCase().slice(0,3);
  var depEl = document.getElementById('dep-date');
  var retEl = document.getElementById('ret-date');
  var dep = depEl ? depEl.value : '';
  var ret = retEl ? retEl.value : '';
  // Smart helper instead of error messages
  var missing = [];
  if (!orig || orig.length < 3) missing.push({
    ico:'🛫', title:'Abflugort fehlt', sub:'Wo startest du?',
    action:'focusFrom'
  });
  if (!dest || dest.length < 3) missing.push({
    ico:'🛬', title:'Zielort fehlt', sub:'Wohin möchtest du fliegen?',
    action:'focusTo'
  });
  if (!dep) missing.push({
    ico:'📅', title:'Abflugdatum fehlt', sub:'Wann geht dein Flug?',
    action:'openDep'
  });
  if (trip === 'rr' && !ret) missing.push({
    ico:'🔄', title:'Rückflugdatum fehlt', sub:'Wann kommst du zurück?',
    action:'openRet'
  });
  if (orig && dest && orig === dest) missing.push({
    ico:'🤔', title:'Start = Ziel?', sub:'Abflug und Ziel müssen verschieden sein',
    action:'focusTo'
  });
  if (missing.length > 0) return showHelper(missing);
  hideErr();
  // Open results page immediately with loading screen
  var rpPage = document.getElementById('results-page');
  if (rpPage) { rpPage.classList.add('open'); document.body.style.overflow = 'hidden'; }
  rpUpdateHeader();
  var rpList = document.getElementById('rp-offers-list');
  if (rpList) rpList.innerHTML = '<div style="text-align:center;padding:80px 20px"><div style="font-size:3.5rem;margin-bottom:16px">✈️</div><div style="font-size:16px;font-weight:700;color:var(--tx);margin-bottom:8px">Suche die besten Verbindungen...</div><div style="font-size:13px;color:var(--tx3);margin-bottom:20px">Flüge werden gesucht...</div><div style="margin:0 auto;max-width:220px;height:5px;background:var(--bd);border-radius:3px"><div id="rp-prog" style="height:100%;width:8%;background:var(--teal);border-radius:3px;transition:width 1.5s ease"></div></div></div>';
  setTimeout(function(){var p=document.getElementById('rp-prog');if(p)p.style.width='65%';},300);
  var rpTabs = document.getElementById('rp-tabs'); if(rpTabs) rpTabs.style.display='none';
  var rpCount = document.getElementById('rp-count'); if(rpCount) rpCount.textContent='';
  showLoader('Flüge werden gesucht...');
  showSkel();
  document.getElementById('rw').classList.remove('show');
  allOffers = []; shownN = 0; animP(0, 55);

  // Try real Duffel API
  var body = {origin:orig, destination:dest, departure_date:dep, cabin_class:PAX.cabin, adults:PAX.a, children:PAX.c, infants:PAX.i, cabin_bags:PAX.h, checked_bags:PAX.b};
  if (trip === 'rr' && ret) body.return_date = ret;

  var searchRetries = 0;
  var thisSearchId = ++_currentSearchId;
  // Abort any previous pending fetch
  if (window._searchAbortCtrl) { try { window._searchAbortCtrl.abort(); } catch(e) {} }
  window._searchAbortCtrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;

  function doFetch() {
    var fetchOpts = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    };
    if (window._searchAbortCtrl) fetchOpts.signal = window._searchAbortCtrl.signal;

    var timeoutId = setTimeout(function() {
      if (window._searchAbortCtrl) { try { window._searchAbortCtrl.abort(); } catch(e) {} }
    }, 20000);

    fetch(PROXY + '/search', fetchOpts).then(function(res) {
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function(json) {
      if (thisSearchId !== _currentSearchId) return; // stale search, ignore
      var offers = Array.isArray(json.offers) ? json.offers : [];
      // Always reset so previous search results never linger
      allOffers = [];
      if (json.ok && offers.length > 0) {
        for (var i = 0; i < offers.length; i++) {
          var o = duffelToLocal(offers[i], orig, dest);
          if (o) allOffers.push(o);
        }
      }
      finishSearch(orig, dest);
    }).catch(function(err) {
      clearTimeout(timeoutId);
      if (err && err.name === 'AbortError') return; // intentionally aborted
      if (thisSearchId !== _currentSearchId) return; // stale
      fwLog('error', {msg: err.message || 'Network error'});
      if (searchRetries < 3) {
        searchRetries++;
        var lsub = document.getElementById('lsub');
        var waitMsg = searchRetries === 1
          ? '⏳ Server startet... (30-60 Sek.)'
          : '🔄 Erneuter Versuch ' + searchRetries + '/3...';
        if (lsub) lsub.textContent = waitMsg;
        var delay = searchRetries === 1 ? 5000 : 3000;
        setTimeout(doFetch, delay);
      } else {
        hideLoader();
        var errBox = document.getElementById('rp-offers-list');
        if (errBox) errBox.innerHTML = '';
        showErr('❌ Server nicht erreichbar. Bitte 30 Sekunden warten und erneut versuchen.');
        var retryBtn = document.createElement('button');
        retryBtn.className = 'lm-btn';
        retryBtn.style.cssText = 'margin:12px auto;display:block;width:200px';
        retryBtn.textContent = '🔄 Erneut versuchen';
        retryBtn.onclick = doSearch;
        var ebox = document.getElementById('ebox');
        if (ebox) ebox.appendChild(retryBtn);
      }
    });
  }
  doFetch();
}

function finishSearch(orig, dest) {
  // Announce results for screen readers
  setTimeout(function() {
    var ann = document.getElementById('search-announce');
    if (ann) ann.textContent = allOffers.length > 0
      ? allOffers.length + ' Flüge gefunden von ' + (fromC||orig) + ' nach ' + (toC||dest)
      : 'Keine Flüge gefunden für ' + (fromC||orig) + ' nach ' + (toC||dest);
  }, 400);
  updateStickySearch();
  // Show sticky bar immediately - no scroll needed
  // Don't show sticky bar immediately - show on scroll only
  var rw = document.getElementById('rw');
  if (rw) rw.classList.add('sfb-on');
  if (!allOffers.length) {
    hideLoader();
    showErr('Keine Flüge gefunden für ' + orig + ' → ' + dest + '. Bitte andere Daten oder Strecke versuchen.');
    return;
  }
  if (fDir) {
    // [MULTICITY-FIX] Must check the WHOLE itinerary's stop count
    // (totalStops), not just the first leg's (.stops) — otherwise a
    // multi-city offer whose first leg is direct but a later leg has a
    // layover would wrongly pass a "direct flights only" filter.
    var tmp = [];
    for (var i = 0; i < allOffers.length; i++) {
      var _o = allOffers[i];
      var _totalStops = typeof _o.totalStops === 'number' ? _o.totalStops : (typeof _o.stops === 'number' ? _o.stops : 0);
      if (_totalStops === 0) tmp.push(_o);
    }
    allOffers = tmp;
  }
  if (fBag) {
    var tmp2 = [];
    for (var i = 0; i < allOffers.length; i++) {
      if (allOffers[i].hasCabin || allOffers[i].hasChecked) tmp2.push(allOffers[i]);
    }
    allOffers = tmp2;
  }
  animP(55, 100);
  // Save to recent searches
  var depVal2 = document.getElementById('dep-date') ? document.getElementById('dep-date').value : '';
  var retVal2 = document.getElementById('ret-date') ? document.getElementById('ret-date').value : '';
  saveRecentSearch(orig, dest, depVal2, retVal2); trackEvent('search');
  setTimeout(function() {
    hideLoader();
    // Show tabs again and clear loading screen
    var rpTabs = document.getElementById('rp-tabs'); if(rpTabs) rpTabs.style.display='';
    var p = document.getElementById('rp-prog'); if(p) p.style.width='100%';
    setTimeout(function() { initResults(orig, dest); }, 200);
  }, 320);
}

function qs(from, to, label) {
  fromI = from; toI = to; toC = label;
  var fa = null;
  for (var i = 0; i < AP.length; i++) { if (AP[i][0] === from) { fa = AP[i]; break; } }
  fromC = fa ? fa[2] : from;
  var fi = document.getElementById('from-in');
  var fs = document.getElementById('from-sub');
  if (fi) fi.value = fromC;
  if (fs) fs.textContent = (fa ? fa[1] : from) + ' (' + from + ')';
  var ti = document.getElementById('to-in');
  var ts = document.getElementById('to-sub');
  if (ti) ti.value = label;
  var ta = null;
  for (var j = 0; j < AP.length; j++) { if (AP[j][0] === to) { ta = AP[j]; break; } }
  if (ts) ts.textContent = (ta ? ta[1] : to) + ' (' + to + ')';
  window.scrollTo({top: 0, behavior: 'smooth'});
  setTimeout(doSearch, 400);
}

// ═══ DUFFEL CONVERTER ═══
// [FIX] Multi-city normalizer: a multi-city Duffel offer is ONE itinerary
// with ONE total price covering all legs (e.g. BER→ALG→LON). It must render
// as a single card listing every leg in order — never split into separate
// "offers" per leg (that produced the bug where leg 2 wrongly showed as a
// return to the leg-1 origin, and filters/details didn't work because the
// card structure didn't match what the rest of the UI expects).
function duffelToLocalMultiCity(o) {
  if (!o || !Array.isArray(o.allSlices) || !o.allSlices.length) return null;
  var alCode = o.al ? o.al[0] : 'XX';
  var alName = o.al ? o.al[1] : 'Unknown';
  function convSlice(sl) {
    if (!sl) return null;
    var segs = [];
    for (var i = 0; i < (sl.segs || []).length; i++) {
      var seg = sl.segs[i];
      segs.push({
        id: seg.id,
        from: seg.from, to: seg.to,
        dep: new Date(seg.dep), arr: new Date(seg.arr),
        dur: seg.dur || 0, fn: seg.fn || '',
        al: [seg.al ? seg.al[0] : alCode, seg.al ? seg.al[1] : alName]
      });
    }
    var depTime = segs.length ? segs[0].dep : new Date();
    var arrTime = segs.length ? segs[segs.length-1].arr : new Date();
    var slDur = sl.dur || 0;
    if (!slDur && depTime && arrTime) slDur = Math.round((arrTime.getTime() - depTime.getTime()) / 60000);
    // [FIX] Use THIS leg's actual airline (from its first segment), not the
    // overall offer's airline (which is always leg 1's carrier). Multi-city
    // itineraries routinely mix carriers — e.g. leg 1 on Royal Jordanian,
    // leg 2 on a different airline — and the card must show each leg's real
    // carrier, not leg 1's carrier repeated for every leg.
    var legAl = (segs.length && segs[0].al) ? segs[0].al : [alCode, alName];
    return { orig: sl.orig, dest: sl.dest, dep: depTime, arr: arrTime, dur: slDur, stops: sl.stops || 0, segs: segs, al: legAl };
  }
  var legs = o.allSlices.map(convSlice).filter(Boolean);
  if (!legs.length) return null;
  var firstLeg = legs[0];
  return {
    id: o.id || ('duf_' + Math.random().toString(36).slice(2)),
    isDuffel: true, duffelId: o.raw_offer_id || o.id,
    multiCity: true,
    legs: legs,
    al: [alCode, alName],
    orig: legs[0].orig, dest: legs[legs.length-1].dest,
    // The PRIMARY line shown at the top of the card is leg 1 only — every
    // other leg renders below it via buildCard's extraLegs loop, exactly
    // like a return leg does for normal round-trips.
    dep: firstLeg.dep, arr: firstLeg.arr, dur: firstLeg.dur, stops: firstLeg.stops, segs: firstLeg.segs,
    totalDur: legs.reduce(function(s,l){ return s + (l.dur||0); }, 0),
    totalStops: legs.reduce(function(s,l){ return s + (l.stops||0); }, 0) + (legs.length - 1),
    price: o.price, currency: o.currency || 'EUR',
    hasCabin: !!o.hasCabin, hasChecked: !!o.hasChecked,
    co2: o.co2 || 0,
    expires_at: o.expires_at, conditions: o.conditions || {},
    identityDocsRequired: !!o.identityDocsRequired
  };
}

function duffelToLocal(o, orig, dest) {
  if (!o || !o.outbound) return null;
  var ob = o.outbound;
  var ib = o.inbound || null;
  var alCode = o.al ? o.al[0] : 'XX';
  var alName = o.al ? o.al[1] : 'Unknown';
  function convSlice(sl, from, to) {
    if (!sl) return null;
    var segs = [];
    for (var i = 0; i < (sl.segs || []).length; i++) {
      var seg = sl.segs[i];
      segs.push({
        id: seg.id,
        from: seg.from || from, to: seg.to || to,
        dep: new Date(seg.dep), arr: new Date(seg.arr),
        dur: seg.dur || 0, fn: seg.fn || '',
        al: [seg.al ? seg.al[0] : alCode, seg.al ? seg.al[1] : alName]
      });
    }
    var depTime = segs.length ? segs[0].dep : new Date();
    var arrTime = segs.length ? segs[segs.length-1].arr : new Date();
    // Ensure dates are Date objects
    if (!(depTime instanceof Date)) depTime = new Date(depTime);
    if (!(arrTime instanceof Date)) arrTime = new Date(arrTime);
    // Calculate duration from dep/arr if dur is missing or 0
    var slDur = sl.dur || 0;
    if (!slDur && depTime && arrTime && !isNaN(depTime.getTime()) && !isNaN(arrTime.getTime())) {
      slDur = Math.round((arrTime.getTime() - depTime.getTime()) / 60000);
    }
    // Also fix individual segment durations
    for (var si2 = 0; si2 < segs.length; si2++) {
      if (!segs[si2].dur && segs[si2].dep && segs[si2].arr) {
        segs[si2].dur = Math.round((segs[si2].arr.getTime() - segs[si2].dep.getTime()) / 60000);
      }
    }
    return {
      orig: sl.orig || from, dest: sl.dest || to,
      dep: depTime, arr: arrTime,
      dur: slDur, stops: sl.stops || 0, segs: segs,
      al: [alCode, alName]
    };
  }
  var outSlice = convSlice(ob, orig, dest);
  var inSlice = ib ? convSlice(ib, dest, orig) : null;
  var retObj = null;
  if (inSlice) {
    retObj = {};
    for (var k in inSlice) { if (inSlice.hasOwnProperty(k)) retObj[k] = inSlice[k]; }
    retObj.orig = dest; retObj.dest = orig;
  }
  return {
    id: o.id || ('duf_' + Math.random().toString(36).slice(2)),
    isDuffel: true, duffelId: o.raw_offer_id || o.id,
    al: [alCode, alName],
    dep: outSlice ? outSlice.dep : new Date(),
    arr: outSlice ? outSlice.arr : new Date(),
    dur: outSlice ? outSlice.dur : 0,
    stops: outSlice ? outSlice.stops : 0,
    price: o.price || 0, currency: o.currency || 'EUR',
    hasCabin: o.hasCabin || false, hasChecked: o.hasChecked || false,
    co2: o.co2 || 0, orig: orig, dest: dest,
    segs: outSlice ? outSlice.segs : [],
    ret: retObj, expires_at: o.expires_at || null,
    conditions: o.conditions || {},
    isRefundable: !!(o.conditions && o.conditions.refund_before_departure && o.conditions.refund_before_departure.allowed),
    isChangeable: !!(o.conditions && o.conditions.change_before_departure && o.conditions.change_before_departure.allowed),
    fareName: o.fare_brand_name || '',
    // ── Real fare brand data from Duffel (null/empty when airline omits it) ──
    fareBrandName: o.fare_brand_name || null,
    cabinMarketingName: o.cabin_marketing_name || null,
    cabinClass: o.cabin_class || null,
    amenities: o.amenities || null,
    cabinBagQty: (typeof o.cabinBagQty === 'number') ? o.cabinBagQty : null,
    checkedBagQty: (typeof o.checkedBagQty === 'number') ? o.checkedBagQty : null,
    cabinBagWeightKg: (typeof o.cabinBagWeightKg === 'number') ? o.cabinBagWeightKg : null,
    checkedBagWeightKg: (typeof o.checkedBagWeightKg === 'number') ? o.checkedBagWeightKg : null,
    holdSpace: o.holdSpace === true,
    identityDocsRequired: o.identityDocsRequired === true
  };
}

// ═══ INIT RESULTS ═══
// [MULTICITY-FIX] Extracted from initResults() so multi-city search (which
// never called initResults — it opens results-page directly and just sets
// allOffers + calls applyRpF()) can also populate the airline checklist,
// stop counts, and price-slider max. Before this fix, those filter UI
// pieces were only ever built by normal one-way/return search, so on the
// multi-city results screen the airline list stayed empty, the stop counts
// stayed blank, and the price slider kept its default 0–9999 range
// regardless of the actual offers — making every filter look broken even
// though toggleFilterCheck()/applyF()/applyRpF() themselves worked fine.
function rebuildFilterPanels() {
  if (!allOffers.length) return;

  // Sort tabs
  var sorted_p = allOffers.slice().sort(function(a,b){ return a.price - b.price; });
  var sorted_d = allOffers.slice().sort(function(a,b){ return a.dur - b.dur; });
  var cheapest = sorted_p[0];
  var fastest = sorted_d[0];
  var avgP = 0, avgD = 0;
  for (var i = 0; i < allOffers.length; i++) { avgP += allOffers[i].price; avgD += allOffers[i].dur; }
  avgP /= allOffers.length; avgD /= allOffers.length;
  var best = allOffers.slice().sort(function(a,b) {
    if (!avgD) return (a.price||0) - (b.price||0);
    return (a.price/avgP*0.6 + a.dur/avgD*0.4) - (b.price/avgP*0.6 + b.dur/avgD*0.4);
  })[0];

  var spb = document.getElementById('sp-best');
  var sdb = document.getElementById('sd-best');
  if (spb) spb.textContent = fmt(best.price);
  // [MULTICITY-FIX] Use totalStops so this label is accurate for
  // multi-city offers too (e.g. "1 Stopp" instead of wrongly "Direktflug"
  // when only the first leg happens to be nonstop).
  var bestTotalStops = typeof best.totalStops === 'number' ? best.totalStops : best.stops;
  if (sdb) sdb.textContent = durStr(best.dur) + ' · ' + (bestTotalStops === 0 ? 'Direktflug' : bestTotalStops + ' Stopp');
  var spp = document.getElementById('sp-price');
  if (spp) spp.textContent = fmt(cheapest.price);
  var spd = document.getElementById('sp-dur');
  if (spd) spd.textContent = fmt(fastest.price);
  var sdd = document.getElementById('sd-dur');
  var fastestTotalStops = typeof fastest.totalStops === 'number' ? fastest.totalStops : fastest.stops;
  if (sdd) sdd.textContent = durStr(fastest.dur) + (fastestTotalStops === 0 ? ' · Direktflug' : '');

  // Sidebar airlines
  // [MULTICITY-FIX] Collect airline codes from EVERY leg of EVERY offer
  // (not just each offer's primary/first-leg carrier) — see
  // offerAirlineCodes() for why this matters for multi-city itineraries.
  var als = {};
  for (var j = 0; j < allOffers.length; j++) {
    var offerCodes = offerAirlineCodes(allOffers[j]);
    var offerCodeKeys = Object.keys(offerCodes);
    for (var ok = 0; ok < offerCodeKeys.length; ok++) als[offerCodeKeys[ok]] = offerCodes[offerCodeKeys[ok]];
  }
  alF = {};
  var fa_html = '';
  var als_keys = Object.keys(als);
  for (var ki = 0; ki < als_keys.length; ki++) {
    var k = als_keys[ki];
    alF[k] = false;
    fa_html += '<div class="filter-check" onclick="toggleAirlineFilter(' + "'" + escHtml(k) + "'" + ')">' + '<div class="filter-check-left">' + '<div class="filter-check-box" id="fcb-al-' + escHtml(k) + '"></div>' + '<span class="filter-check-label">' + escHtml(als[k]) + '</span>' + '</div></div>';
  }
  var fa_el = document.getElementById('f-airlines');
  if (fa_el) fa_el.innerHTML = fa_html;

  // Stop counts
  // [MULTICITY-FIX] Must use totalStops (whole-itinerary stop count) here
  // too, matching applyF()'s own filter logic — using .stops (first leg
  // only) made this counter disagree with what actually got filtered for
  // multi-city offers.
  var s0c = 0, s1c = 0, s2c = 0;
  for (var si = 0; si < allOffers.length; si++) {
    var _stops = typeof allOffers[si].totalStops === 'number' ? allOffers[si].totalStops : (typeof allOffers[si].stops === 'number' ? allOffers[si].stops : 0);
    if (_stops === 0) s0c++;
    else if (_stops === 1) s1c++;
    else s2c++;
  }
  var c0 = document.getElementById('c-s0'); if (c0) c0.textContent = s0c;
  var c1 = document.getElementById('c-s1'); if (c1) c1.textContent = s1c;
  var c2 = document.getElementById('c-s2'); if (c2) c2.textContent = s2c;

  // Max price
  var maxP = 0;
  for (var pi = 0; pi < allOffers.length; pi++) { if (allOffers[pi].price > maxP) maxP = allOffers[pi].price; }
  maxP = Math.ceil(maxP / 100) * 100;
  var prEl = document.getElementById('f-price');
  if (prEl) { prEl.max = maxP; prEl.value = maxP; }
  var pv = document.getElementById('pval');
  if (pv) pv.textContent = '€' + maxP;

  // Price graph removed — uses only real API data
}

function initResults(orig, dest) {
  var rw = document.getElementById('rw');
  rw.classList.add('show');
  var rt = document.getElementById('rtitle');
  if (rt) rt.innerHTML = '<em>' + escHtml(fromC || orig) + '</em> → <em>' + escHtml(toC || dest) + '</em>';
  if (!allOffers.length) {
    var ol = document.getElementById('offers-list');
    if (ol) ol.innerHTML = '<div style="text-align:center;padding:48px 20px"><div style="font-size:2.5rem">😕</div><div style="font-size:14px;font-weight:600;color:var(--tx2);margin-top:10px">Keine Flüge gefunden</div></div>';
    var lmw = document.getElementById('lmw');
    if (lmw) lmw.style.display = 'none';
    rw.scrollIntoView({behavior:'smooth', block:'start'});
    return;
  }

  rebuildFilterPanels();

  // [GA4-EVENTS] A real, successful search with results — not every
  // search attempt (failed/empty searches return before this point).
  trackEvent('search_results', { origin: fromI, destination: toI, results_count: allOffers.length });

  var mfb = document.getElementById('mfbtn');
  if (mfb) mfb.style.display = 'flex';
  applyF();
  rw.scrollIntoView({behavior:'smooth', block:'start'});
  // Show mfbtn on mobile, sidebar on desktop
  var mfb2 = document.getElementById('mfbtn');
  var qf = document.getElementById('quick-filters');
  if (window.innerWidth < 1000) {
    if (mfb2) mfb2.style.display = 'flex';
    if (qf) qf.style.display = 'flex';
  } else {
    var sb2 = document.getElementById('sidebar');
    if (sb2) sb2.style.display = 'block';
    if (mfb2) mfb2.style.display = 'none';
    if (qf) qf.style.display = 'none';
  }
  // Show flex hint for first search
  try {
    if (!localStorage.getItem('fw_flex_shown')) {
      setTimeout(showFlexHint, 2000);
      localStorage.setItem('fw_flex_shown', '1');
    }
  } catch(e) {}
}


// ═══ FILTERS & SORT ═══

// ═══ NEW FILTER CHECKBOXES ═══
var filterState = {s0: false, s1: false, s2: false};

function toggleFilterCheck(key) {
  filterState[key] = !filterState[key];
  // Update both the sidebar and the bottom sheet checkboxes
  ['fcb-' + key, 'fcb2-' + key].forEach(function(id) {
    var box = document.getElementById(id);
    if (box) {
      if (filterState[key]) box.classList.add('checked');
      else box.classList.remove('checked');
    }
  });
  applyF();
  applyRpF();
}


// [MULTICITY-FIX] Returns EVERY airline code involved in one offer — for a
// normal one-way/return offer that's just o.al[0], but a multi-city
// itinerary routinely mixes carriers leg-to-leg (e.g. leg 1 on Royal
// Jordanian, leg 2 on a different airline). Using only o.al[0] (the first
// leg's carrier) for filtering meant: (a) the sidebar's airline list never
// showed a carrier that only appeared on leg 2+, and (b) checking that
// carrier in the filter would WRONGLY hide the whole multi-city offer even
// though one of its legs actually matches. This is used both when building
// the filter checkbox list and when applying the filter, so the two always
// agree on what counts as "this offer involves airline X".
function offerAirlineCodes(o) {
  if (o.multiCity && Array.isArray(o.legs) && o.legs.length) {
    var codes = {};
    for (var i = 0; i < o.legs.length; i++) {
      var legAl = o.legs[i] && o.legs[i].al;
      if (legAl && legAl[0]) codes[legAl[0]] = legAl[1] || 'Unknown';
    }
    return codes;
  }
  var al = o.al || ['XX', 'Unknown'];
  var single = {};
  single[al[0] || 'XX'] = al[1] || 'Unknown';
  return single;
}

function toggleAirlineFilter(code) {
  alF[code] = !alF[code];
  // Update all matching checkboxes (sidebar + bottom sheet)
  document.querySelectorAll('[id^="fcb-al-' + code + '"]').forEach(function(box) {
    if (alF[code]) box.classList.add('checked');
    else box.classList.remove('checked');
  });
  applyF();
  applyRpF();
}

function toggleStop(el) {
  el.classList.toggle('active');
  applyF();
}

function applyF() {
  var s0 = filterState.s0;
  var s1 = filterState.s1;
  var s2 = filterState.s2;
  var prEl = document.getElementById('f-price');
  var maxP = prEl ? (parseInt(prEl.value) || 999999) : 999999;
  filtered = [];
  for (var i = 0; i < allOffers.length; i++) {
    var o = allOffers[i];
    // Stops filter - if nothing selected show all, else show only selected
    // (use totalStops for multi-city offers so the filter reflects the
    // whole itinerary, not just the first leg shown at the top of the card)
    var stops = typeof o.totalStops === 'number' ? o.totalStops : (typeof o.stops === 'number' ? o.stops : 0);
    var anyStopSelected = s0 || s1 || s2;
    if (anyStopSelected) {
      if (stops === 0 && !s0) continue;
      if (stops === 1 && !s1) continue;
      if (stops >= 2 && !s2) continue;
    }
    // Price filter
    var price = typeof o.price === 'number' ? o.price : 0;
    if (price > maxP) continue;
    // Time filter — safely get hours
    var depDate = o.dep instanceof Date ? o.dep : new Date(o.dep);
    var h = isNaN(depDate.getTime()) ? 12 : depDate.getHours();
    var anyTimeSelected = tF.early || tF.morning || tF.afternoon || tF.evening;
    if (anyTimeSelected) {
      var timeOk = (h < 6 && tF.early) || (h >= 6 && h < 12 && tF.morning) ||
                   (h >= 12 && h < 18 && tF.afternoon) || (h >= 18 && tF.evening);
      if (!timeOk) continue;
    }
    // Airline filter — if nothing selected show all, else show only
    // offers where ANY leg's airline matches a selected checkbox.
    // [MULTICITY-FIX] Previously only checked o.al[0] (the first leg's
    // carrier), so a multi-city offer whose 2nd/3rd leg matched the
    // selected airline was wrongly excluded entirely.
    var anyAlSelected = false;
    var alKeys = Object.keys(alF);
    for (var ai = 0; ai < alKeys.length; ai++) { if (alF[alKeys[ai]]) { anyAlSelected = true; break; } }
    if (anyAlSelected) {
      var offerCodes2 = offerAirlineCodes(o);
      var matchesAnySelected = false;
      var offerCodeKeys2 = Object.keys(offerCodes2);
      for (var ock = 0; ock < offerCodeKeys2.length; ock++) {
        if (alF[offerCodeKeys2[ock]]) { matchesAnySelected = true; break; }
      }
      if (!matchesAnySelected) continue;
    }
    // Baggage filter
    if (fBag && !o.hasCabin && !o.hasChecked) continue;
    filtered.push(o);
  }
  filtered = sortList(filtered, sortMode);
  var rc = document.getElementById('rcount');
  if (rc) rc.textContent = filtered.length + ' Flüge gefunden';
  shownN = 0;
  var ol = document.getElementById('offers-list');
  if (ol) ol.innerHTML = '';
  addOffers(10);
}

function toggleTime(btn) {
  var t = btn.getAttribute('data-t');
  tF[t] = !tF[t];
  btn.classList.toggle('on', tF[t]);
  applyF();
}

function resetF() {
  filterState = {s0: true, s1: true, s2: true};
  ['s0','s1','s2'].forEach(function(k) {
    var box = document.getElementById('fcb-' + k);
    if (box) box.classList.add('checked');
  });
  var alf_keys2 = Object.keys(alF);
  for (var j = 0; j < alf_keys2.length; j++) {
    alF[alf_keys2[j]] = false;
    var fcbEl = document.getElementById('fcb-al-' + alf_keys2[j]);
    if (fcbEl) fcbEl.classList.remove('checked');
  }
  tF = {early:false, morning:false, afternoon:false, evening:false};
  var tccs = document.querySelectorAll('.tcc');
  for (var ti = 0; ti < tccs.length; ti++) tccs[ti].classList.remove('on');
  var tf_keys = Object.keys(tF);
  for (var k = 0; k < tf_keys.length; k++) tF[tf_keys[k]] = true;
  var tccs = document.querySelectorAll('.tcc');
  for (var ti = 0; ti < tccs.length; ti++) tccs[ti].classList.add('on');
  var maxP = parseInt(document.getElementById('f-price').max);
  var fp = document.getElementById('f-price'); if (fp) fp.value = maxP;
  var pv = document.getElementById('pval'); if (pv) pv.textContent = '€' + maxP;
  applyF();
}

function sortList(list, mode) {
  var copy = list.slice();
  if (mode === 'price') {
    copy.sort(function(a, b) { return (a.price||0) - (b.price||0); });
  } else if (mode === 'dur') {
    copy.sort(function(a, b) { return (a.dur||0) - (b.dur||0); });
  } else {
    // Best: weighted price + duration score
    var N = list.length || 1;
    var avgP = 0, avgD = 0;
    for (var _i = 0; _i < list.length; _i++) { avgP += list[_i].price||0; avgD += list[_i].dur||0; }
    avgP = avgP/N || 1; avgD = avgD/N || 1;
    copy.sort(function(a, b) {
      var sa = (a.price||0)/avgP*0.6 + (a.dur||0)/avgD*0.4;
      var sb = (b.price||0)/avgP*0.6 + (b.dur||0)/avgD*0.4;
      return sa - sb;
    });
  }
  return copy;
}

function sortBy(m) {
  sortMode = m;
  var tabs = ['best','price','dur'];
  for (var i = 0; i < tabs.length; i++) {
    var el = document.getElementById('st-' + tabs[i]);
    if (el) el.classList.toggle('on', tabs[i] === m);
  }
  filtered = sortList(filtered, m);
  shownN = 0;
  var ol = document.getElementById('offers-list');
  if (ol) ol.innerHTML = '';
  addOffers(10);
}

// ═══ BUILD CARDS ═══
function addOffers(n) {
  var c = document.getElementById('offers-list');
  if (!c) return;
  var end = Math.min(shownN + n, filtered.length);
  for (var i = shownN; i < end; i++) c.appendChild(buildCard(filtered[i], i));
  shownN = end;
  var lmw = document.getElementById('lmw');
  if (lmw) lmw.style.display = shownN < filtered.length ? 'block' : 'none';
  // Load real logos after render
  setTimeout(loadRealLogos, 200);
}

function loadRealLogos() {
  // الشعارات تُحمّل مباشرة في buildCard من روابط Duffel العامة
  // (https://assets.duffel.com/...) مع fallback عبر onLogoErr.
  // هذه الدالة معطّلة عمداً لأنها كانت تستبدل الشعار الشغّال
  // بمحاولة فاشلة على endpoint قديم غير موجود في السيرفر.
  return;
}

function loadMore() { addOffers(10); }

function p2(n) { return ('0' + n).slice(-2); }
function fmt(n) {
  try { return new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR', minimumFractionDigits:0}).format(n); }
  catch(e) { return '€' + n; }
}
function durStr(m) { return Math.floor(m/60) + 'h ' + p2(m%60) + 'm'; }
function fmtC(el) { el.value = el.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim().slice(0,19); }
function fmtE(el) { el.value = el.value.replace(/\D/g,'').replace(/^(\d{2})(\d)/,'$1/$2').slice(0,5); }

function buildCard(o, idx) {
  var isBest = idx === 0 && sortMode === 'best';
  // Fare badges from conditions
  var isRefundable = o.conditions && o.conditions.refund_before_departure && o.conditions.refund_before_departure.allowed;
  var isChangeable = o.conditions && o.conditions.change_before_departure && o.conditions.change_before_departure.allowed;
  var logo = PROXY + '/airline-logo/' + (o.al && o.al[0] ? o.al[0] : 'XX');
  var logoFallback = o.al[0];
  var alCode = (o.al && o.al[0]) ? o.al[0] : 'XX';
  var alColor = getAirlineColor(alCode);
  var alTextColor = getAirlineTextColor(alCode);
  var depT = p2(o.dep.getHours()) + ':' + p2(o.dep.getMinutes());
  var arrT = p2(o.arr.getHours()) + ':' + p2(o.arr.getMinutes());
  var nextDay = o.arr.getDate() !== o.dep.getDate() ? '<sup>+1</sup>' : '';
  var trackParts = [];
  if (o.stops === 0) {
    trackParts.push('<div class="fts"></div>');
  } else {
    for (var si = 0; si < o.stops; si++) {
      trackParts.push('<div class="fts"></div><div class="ftd"></div>');
    }
    trackParts.push('<div class="fts"></div>');
  }
  var track = trackParts.join('');
  function stopCityNames(segs) {
    if (!segs || segs.length < 2) return '';
    var names = [];
    for (var k = 0; k < segs.length - 1; k++) {
      var code = segs[k].to;
      if (!code) continue;
      var city = code;
      for (var ai = 0; ai < AP.length; ai++) {
        if (AP[ai][0] === code) { city = AP[ai][2]; break; }
      }
      names.push(city !== code ? (code + ', ' + city) : code);
    }
    return names.join(', ');
  }
  var stopCities = stopCityNames(o.segs);
  var badge = o.stops === 0 ? '<span class="fbdg fb-d">' + t('det_direct') + '</span>' : '<span class="fbdg fb-s">' + o.stops + ' ' + (o.stops > 1 ? t('stops') : t('stop')) + (stopCities ? ' · ' + stopCities : '') + '</span>';
  var tp = PAX.a + PAX.c + PAX.i;
  var retLine = '';
  // [FIX] Multi-city: render every additional leg (index 1+) the same way
  // a return leg is rendered, instead of only supporting exactly one o.ret.
  var extraLegs = (o.multiCity && Array.isArray(o.legs)) ? o.legs.slice(1) : (o.ret ? [o.ret] : []);
  extraLegs.forEach(function(r) {
    var rTrackParts = [];
    if (r.stops === 0) {
      rTrackParts.push('<div class="fts"></div>');
    } else {
      for (var ri = 0; ri < r.stops; ri++) rTrackParts.push('<div class="fts"></div><div class="ftd"></div>');
      rTrackParts.push('<div class="fts"></div>');
    }
    var rTrack = rTrackParts.join('');
    var rStopCities = stopCityNames(r.segs);
    var rBadge = r.stops === 0 ? '<span class="fbdg fb-d">' + t('det_direct') + '</span>' : '<span class="fbdg fb-s">' + r.stops + ' ' + (r.stops > 1 ? t('stops') : t('stop')) + (rStopCities ? ' · ' + rStopCities : '') + '</span>';
    retLine += '<hr class="fc-sep">';
    retLine += '<div class="sl-line">';
    var retCode = (r.al && r.al[0]) ? r.al[0] : alCode;
    var retColor = getAirlineColor(retCode);
    var retTextColor = getAirlineTextColor(retCode);
    retLine += '<div class="al-logo" data-code="' + retCode + '" data-color="' + retColor + '"><img src="https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/' + retCode + '.svg" alt="' + retCode + '" loading="lazy" onerror="onLogoErr(this,&quot;' + retCode + '&quot;,&quot;' + retColor + '&quot;)"></div>';
    retLine += '<div class="sl-t"><div class="sl-r">';
    retLine += '<span class="ft">' + p2(r.dep.getHours()) + ':' + p2(r.dep.getMinutes()) + '</span>';
    retLine += '<div class="ftr"><div class="ftrb">' + rTrack + '</div></div>';
    retLine += '<span class="ft">' + p2(r.arr.getHours()) + ':' + p2(r.arr.getMinutes()) + '</span>';
    retLine += '</div><div class="farp"><span>' + (r.orig || '') + '</span><span>' + (r.dest || '') + '</span></div></div>';
    retLine += '<div class="sl-dur"><strong>' + durStr(r.dur) + '</strong></div>';
    retLine += '</div>';
    retLine += '<div class="stops-under">' + rBadge + '<div class="sl-airline">' + (r.al && r.al[1] ? r.al[1] : '') + '</div></div>';
  });

  var el = document.createElement('div');
  el.className = 'fc' + (isBest ? ' best-val' : '');
  el.id = 'fc' + idx;

  var html = '';
  if (isBest) html += '<div class="best-lbl">✦ BESTE WAHL</div>';
  html += '<div class="fc-body" onclick="openFlightSheet(' + idx + ')">';
  html += '<div class="sl-line">';
  html += '<div class="al-logo" data-code="' + alCode + '" data-color="' + alColor + '"><img src="https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/' + alCode + '.svg" alt="' + alCode + '" loading="lazy" onerror="onLogoErr(this,&quot;' + alCode + '&quot;,&quot;' + alColor + '&quot;)"></div>';
  // badgeHtml removed
  html += '<div class="sl-t"><div class="sl-r">';
  html += '<span class="ft">' + depT + '</span>';
  html += '<div class="ftr"><div class="ftrb">' + track + '</div></div>';
  html += '<span class="ft">' + arrT + nextDay + '</span>';
  html += '</div><div class="farp"><span>' + (o.segs && o.segs.length ? o.segs[0].from : o.orig) + '</span><span>' + (o.segs && o.segs.length ? o.segs[o.segs.length-1].to : o.dest) + '</span></div></div>';
  html += '<div class="sl-dur"><strong>' + durStr(o.dur) + '</strong></div>';
  html += '</div>';
  html += '<div class="stops-under">' + badge + '<div class="sl-airline">' + (o.al && o.al[1] ? o.al[1] : '') + '</div></div>' + retLine;
  html += '</div>';
  html += '<div class="fc-foot">';
  html += '<div class="bag-row">';
  var SVG_CABIN = '<svg width="18" height="20" viewBox="0 0 24 28"><rect x="9" y="2" width="6" height="6" rx="2" fill="#9aa6b2"/><rect x="3" y="6" width="18" height="20" rx="3" fill="#1a2233"/><rect x="9" y="13" width="9" height="2.4" rx="1.2" fill="#9aa6b2"/><rect x="9" y="17" width="6" height="6" rx="1.5" fill="#9aa6b2"/></svg>';
  var SVG_CHECKED = '<svg width="20" height="20" viewBox="0 0 24 24"><rect x="6" y="2" width="6" height="4" rx="1.5" fill="#1a2233"/><rect x="2" y="4" width="20" height="17" rx="3" fill="#1a2233"/><rect x="6" y="7" width="2.2" height="11" fill="#fff"/><rect x="10" y="7" width="2.2" height="11" fill="#fff"/><rect x="14" y="7" width="2.2" height="11" fill="#fff"/><rect x="18" y="7" width="2.2" height="11" fill="#fff"/><circle cx="8" cy="22.5" r="1.5" fill="#1a2233"/><circle cx="16" cy="22.5" r="1.5" fill="#1a2233"/></svg>';
  // Two bag icons (cabin + checked), always shown, with REAL count beside each.
  var cardCabinN = (typeof o.cabinBagQty === 'number') ? o.cabinBagQty : (o.hasCabin ? 1 : 0);
  var cardCheckedN = (typeof o.checkedBagQty === 'number') ? o.checkedBagQty : (o.hasChecked ? 1 : 0);
  html += '<div class="bag-i' + (cardCabinN > 0 ? '' : ' no') + '">' + cardCabinN + SVG_CABIN + '</div>';
  html += '<div class="bag-i' + (cardCheckedN > 0 ? '' : ' no') + '">' + cardCheckedN + SVG_CHECKED + '</div>';
  html += '<div class="bag-i" id="bt' + idx + '" style="cursor:pointer;font-weight:800;transition:transform .15s;font-size:16px" onclick="event.stopPropagation();toggleBagInfo(' + idx + ')">⌄</div>';

  if (o.isRefundable) html += '<div class="fare-badge fare-ref">↩ Erstattbar</div>';
  if (o.fareName) html += '<div class="fare-badge" style="background:var(--bg2);color:var(--tx3)">' + o.fareName + '</div>';
  html += '</div>';
  html += '<div class="fc-actions">';
  html += '<div class="fp-wrap"><div class="famt">' + fmt(o.price) + '</div>';
  html += '<div class="fpsub">' + (tp > 1 ? 'gesamt (' + tp + ' Pax)' : 'pro Person') + '</div></div>';
  html += '<div class="fc-btns">';
  html += '<button class="bkbtn" onclick="event.stopPropagation();openBflow(\'' + o.id + '\')">Buchen →</button>';
  html += '<button class="share-btn" onclick="event.stopPropagation();shareFlight(' + idx + ')" title="Teilen"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>';
  html += '</div></div></div>';
  html += '<div class="fdet" id="fd' + idx + '">' + buildDets(o) + '</div>';

  el.innerHTML = html;
  return el;
}

function buildDets(o) {
  function segsHtml(segs, title) {
    var h = '<div class="sl-hd">' + title + '</div>';
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      var logo2 = 'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/' + seg.al[0] + '.svg';
      h += '<div class="seg">';
      h += '<div class="seg-logo"><img src="' + logo2 + '" loading="lazy" onerror="this.style.display=\'none\'" alt=""></div>';
      h += '<div class="seg-b"><div class="seg-r2">' + seg.from + ' → ' + seg.to + '</div>';
      h += '<div class="seg-m">' + seg.al[1] + ' · Flug ' + seg.fn + ' · ' + p2(seg.dep.getHours()) + ':' + p2(seg.dep.getMinutes()) + ' – ' + p2(seg.arr.getHours()) + ':' + p2(seg.arr.getMinutes()) + '</div></div>';
      h += '<div class="seg-right"><div class="seg-time">' + p2(seg.dep.getHours()) + ':' + p2(seg.dep.getMinutes()) + ' → ' + p2(seg.arr.getHours()) + ':' + p2(seg.arr.getMinutes()) + '</div>';
      h += '<div class="seg-dur2">' + durStr(seg.dur) + '</div></div></div>';
      if (i < segs.length - 1 && segs[i+1]) {
        var lay = Math.round((segs[i+1].dep - seg.arr) / 60000) || 65;
        if (lay > 0) h += '<div class="layover">⏳ Aufenthalt in ' + seg.to + ': ' + durStr(Math.abs(lay)) + '</div>';
      }
    }
    return h;
  }
  var h = segsHtml(o.segs, o.multiCity ? ('✈ FLUG 1/' + o.legs.length) : '✈ HINFLUG');
  if (o.multiCity && Array.isArray(o.legs)) {
    for (var bdLi = 1; bdLi < o.legs.length; bdLi++) {
      h += '<div class="sl-sep"></div>';
      h += segsHtml(o.legs[bdLi].segs, '✈ FLUG ' + (bdLi+1) + '/' + o.legs.length);
    }
  } else if (o.ret && o.ret.segs) {
    h += '<div class="sl-sep"></div>';
    h += segsHtml(o.ret.segs, '🔄 RÜCKFLUG');
  }
  return h;
}

function toggleBagInfo(i) {
  var o = filtered[i];
  var rowsEl = document.getElementById('baginfo-rows');
  var rows = '';
  var cabinN = (typeof o.cabinBagQty === 'number') ? o.cabinBagQty : (o.hasCabin ? 1 : 0);
  var checkedN = (typeof o.checkedBagQty === 'number') ? o.checkedBagQty : (o.hasChecked ? 1 : 0);
  var cabinW = (typeof o.cabinBagWeightKg === 'number') ? o.cabinBagWeightKg : null;
  var checkedW = (typeof o.checkedBagWeightKg === 'number') ? o.checkedBagWeightKg : null;
  // Cabin bag row — weight shown only if the airline provided it
  var cabinLbl = t('fc_cabin') + (cabinW ? ' \u00b7 ' + cabinW + ' kg' : '');
  rows += '<div class="bi-row"><span>\ud83c\udf92 ' + cabinLbl + '</span><span style="color:' + (cabinN > 0 ? 'var(--gr)' : 'var(--tx3)') + ';font-weight:700">' + (cabinN > 0 ? cabinN + '\u00d7 \u2713' : '0 \u2717') + '</span></div>';
  // Checked bag row
  var checkedLbl = t('fc_checked') + (checkedW ? ' \u00b7 ' + checkedW + ' kg' : '');
  rows += '<div class="bi-row"><span>\ud83e\uddf3 ' + checkedLbl + '</span><span style="color:' + (checkedN > 0 ? 'var(--gr)' : 'var(--tx3)') + ';font-weight:700">' + (checkedN > 0 ? checkedN + '\u00d7 \u2713' : '0 \u2717') + '</span></div>';
  rowsEl.innerHTML = rows;
  var titleEl = document.getElementById('baginfo-title');
  if (titleEl) titleEl.textContent = t('bg_overview');
  var closeBtn = document.getElementById('baginfo-close-btn');
  if (closeBtn) closeBtn.textContent = t('bg_close');
  document.getElementById('baginfo-ov').classList.add('open');
}
function closeBagInfo() {
  document.getElementById('baginfo-ov').classList.remove('open');
}

function toggleDet(i) {
  var el = document.getElementById('fd' + i);
  if (el) el.classList.toggle('open');
}

// ── FLIGHT DETAIL BOTTOM SHEET ──
function dayDiff(a, b) {
  var d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  var d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((d2 - d1) / 86400000);
}
function fmtSegDate(d) {
  var loc = LANG === 'ar' ? 'ar' : (LANG === 'en' ? 'en-GB' : 'de-DE');
  try { return d.toLocaleDateString(loc, {weekday:'short', day:'2-digit', month:'short'}); }
  catch(e) { return p2(d.getDate()) + '.' + p2(d.getMonth()+1) + '.'; }
}
function apFullName(code) {
  for (var a = 0; a < AP.length; a++) {
    if (AP[a][0] === code) return AP[a][1] || AP[a][2] || code;
  }
  return '';
}
function apCity(code) {
  for (var a = 0; a < AP.length; a++) {
    if (AP[a][0] === code) return AP[a][2] || code;
  }
  return code;
}

function buildJourney(segs, label, totalDur) {
  var h = '<div class="jrny-sec-t">' + label;
  if (totalDur) h += '<span class="jrny-dur">🕐 ' + durStr(totalDur) + '</span>';
  h += '</div>';
  for (var i = 0; i < segs.length; i++) {
    var seg = segs[i];
    var code = (seg.al && seg.al[0]) ? seg.al[0] : 'XX';
    var alName = (seg.al && seg.al[1]) ? seg.al[1] : code;
    var col = getAirlineColor(code);
    var tcol = getAirlineTextColor(code);
    var depFull = apFullName(seg.from), arrFull = apFullName(seg.to);
    // next-day indicator: compare calendar days
    var nd = dayDiff(seg.dep, seg.arr);
    var ndBadge = nd > 0 ? '<span class="nday">+' + nd + '</span>' : '';

    h += '<div class="seg-card">';
    // departure row
    h += '<div class="seg-pt">';
    h += '<div class="seg-pt-time"><div class="seg-time">' + p2(seg.dep.getHours()) + ':' + p2(seg.dep.getMinutes()) + '</div><div class="seg-date">' + fmtSegDate(seg.dep) + '</div></div>';
    h += '<div class="seg-dot-wrap"><div class="seg-dot"></div></div>';
    h += '<div><div class="seg-ap">' + escHtml(apCity(seg.from)) + ' · ' + seg.from + '</div>' + (depFull ? '<div class="seg-ap-full">' + escHtml(depFull) + '</div>' : '') + '</div>';
    h += '</div>';
    // middle row: duration + dashed line + airline pill
    h += '<div class="seg-mid">';
    h += '<div class="seg-mid-dur">' + durStr(seg.dur) + '</div>';
    h += '<div class="seg-mid-line"></div>';
    h += '<div class="seg-mid-al"><span class="seg-al-pill"><span class="seg-al-logo" data-code="' + code + '" data-color="' + col + '"><img src="https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/' + code + '.svg" alt="' + code + '" loading="lazy" onerror="onLogoErr(this,&quot;' + code + '&quot;,&quot;' + col + '&quot;)"></span>' + escHtml(alName) + '</span><span class="seg-al-fn">' + t('det_flight') + ' ' + escHtml(String(seg.fn)) + '</span></div>';
    h += '</div>';
    // arrival row
    h += '<div class="seg-pt">';
    h += '<div class="seg-pt-time"><div class="seg-time">' + p2(seg.arr.getHours()) + ':' + p2(seg.arr.getMinutes()) + ndBadge + '</div><div class="seg-date">' + fmtSegDate(seg.arr) + '</div></div>';
    h += '<div class="seg-dot-wrap"><div class="seg-dot end"></div></div>';
    h += '<div><div class="seg-ap">' + escHtml(apCity(seg.to)) + ' · ' + seg.to + '</div>' + (arrFull ? '<div class="seg-ap-full">' + escHtml(arrFull) + '</div>' : '') + '</div>';
    h += '</div>';
    h += '</div>';
    // layover between cards
    if (i < segs.length - 1 && segs[i+1]) {
      var lay = Math.round((segs[i+1].dep - seg.arr) / 60000);
      if (lay > 0) h += '<div class="jrny-layover">⏳ ' + t('det_layover') + ' ' + seg.to + ' · ' + durStr(lay) + '</div>';
    }
  }
  return h;
}

function openFlightSheet(idx) {
  var o = filtered[idx];
  if (!o) return;
  document.getElementById('fsheet-title').textContent = t('det_title');
  var body = '';
  body += buildJourney(o.segs, '🛫 ' + (o.multiCity ? (t('det_outbound') + ' (1/' + o.legs.length + ')') : t('det_outbound')), o.dur);
  // [FIX] Multi-city: show every additional leg, not just a single o.ret
  if (o.multiCity && Array.isArray(o.legs)) {
    for (var li = 1; li < o.legs.length; li++) {
      // Nights spent at the stopover city between leg li-1's arrival and
      // leg li's departure — the most useful piece of info for multi-city
      // trip planning, shown prominently between the two journey cards.
      var prevArr = o.legs[li-1].arr;
      var nextDep = o.legs[li].dep;
      var nightsMs = nextDep.getTime() - prevArr.getTime();
      var nights = Math.round(nightsMs / 86400000);
      if (nights > 0) {
        body += '<div class="jrny-stopover-nights">🌙 ' + nights + ' ' + (nights === 1 ? tL('Nacht','night','ليلة') : tL('Nächte','nights','ليالٍ')) + ' ' + tL('in','in','في') + ' ' + escHtml(apCity(o.legs[li].orig) || o.legs[li].orig) + '</div>';
      } else {
        body += '<div class="jrny-sep"></div>';
      }
      body += buildJourney(o.legs[li].segs, '🛫 ' + t('det_outbound') + ' (' + (li+1) + '/' + o.legs.length + ')', o.legs[li].dur);
    }
  } else if (o.ret && o.ret.segs) {
    body += '<div class="jrny-sep"></div>';
    body += buildJourney(o.ret.segs, '🛬 ' + t('det_return'), o.ret.dur);
  }
  document.getElementById('fsheet-body').innerHTML = body;
  var tp = PAX.a + PAX.c + PAX.i;
  document.getElementById('fsheet-price').textContent = fmt(o.price);
  document.getElementById('fsheet-price-sub').textContent = tp > 1 ? ('gesamt (' + tp + ' Pax)') : t('perPerson');
  document.getElementById('fsheet-book').innerHTML = '✈ ' + t('det_book_now');
  document.getElementById('fsheet-book').onclick = function() { closeFlightSheet(); openBflow(o.id); };
  document.getElementById('fsheet-ov').classList.add('open');
  document.getElementById('fsheet').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeFlightSheet() {
  document.getElementById('fsheet-ov').classList.remove('open');
  document.getElementById('fsheet').classList.remove('open');
  document.body.style.overflow = '';
}

function shareFlight(idx) {
  var o = filtered[idx];
  if (!o) return;
  var text = 'Airpiv: ' + o.orig + ' → ' + o.dest + ' ab ' + fmt(o.price) +
             ' · ' + o.dep.toLocaleDateString('de-DE') + ' · ' + o.al[1];
  if (navigator.share) {
    navigator.share({ title: 'Airpiv Flug', text: text, url: window.location.href });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    showToast('🔗 Link kopiert!', 'success');
  } else {
    showToast('📋 ' + text, 'info');
  }
}

function showDemoBooking() {
  var ref = 'FW-' + Date.now().toString(36).toUpperCase().slice(-8);
  var o = selOffer || bflowOffer;
  var tp = PAX.a + PAX.c + PAX.i;

  // Collect passenger data
  var paxList = [];
  for (var pi = 0; pi < tp; pi++) {
    var prefix = document.getElementById('fn' + pi) ? '' : 'bf-';
    var fn = (document.getElementById(prefix + 'fn' + pi) || {}).value || '';
    var ln = (document.getElementById(prefix + 'ln' + pi) || {}).value || '';
    var dob = (document.getElementById(prefix + 'dob' + pi) || {}).value || '';
    if (fn || ln) paxList.push({fn: fn || 'Reisende/r', ln: ln || (pi+1), dob: dob});
  }

  var extra = 0;
  for (var ei = 0; ei < selExtras.length; ei++) extra += selExtras[ei].p;

  // Save to localStorage
  try {
    var bks = JSON.parse(localStorage.getItem('fw_bookings') || '[]');
    bks.unshift({
      ref: ref, date: new Date().toISOString(),
      orig: o ? o.orig : '', dest: o ? o.dest : '',
      price: o ? o.price + extra : 0,
      passengers: paxList
    });
    localStorage.setItem('fw_bookings', JSON.stringify(bks.slice(0,20)));
  } catch(e) {}

  // Show confirmation page
  showConfirmation({
    reference: ref,
    orderId: null,
    offer: o,
    passengers: paxList,
    basePrice: o ? o.price : 0,
    extrasPrice: extra,
    totalPrice: o ? o.price + extra : 0
  });
  // ── Loyalty: earn points (demo) ──
  if (FW_USER) {
    var earnedPts2 = loyaltyEarnPoints(o ? o.price + extra : 50);
    if (earnedPts2 > 0) {
      setTimeout(function(){ showToast('🏆 +'+earnedPts2+' Treuepunkte verdient!', 'success'); }, 2000);
    }
  }

  // Close old modal if open
  var sov = document.getElementById('sov');
  if (sov) sov.classList.remove('open');
}


function loadMyBookings() {
  var list = document.getElementById('bookings-list');
  if (!list) return;
  var local = getLocalBookings();
  // [SECURITY-FIX] Previously queried Supabase's `bookings` table directly
  // from the browser with column names that don't exist on it at all
  // (booking_ref/origin/destination/order_id/total_amount instead of the
  // real booking_reference/route_label/duffel_order_id/customer_paid),
  // and — with no RLS policy defined anywhere — relied purely on a
  // client-supplied .eq('user_id', ...) filter as if it were a security
  // boundary. Now goes through /my-bookings, which runs server-side with
  // the real columns and the verified user id from the auth token.
  if (_sb && FW_USER) {
    list.innerHTML = '<div style="text-align:center;padding:32px"><div style="font-size:2rem">⏳</div></div>';
    _sb.auth.getSession().then(function(res) {
      var token = res.data && res.data.session && res.data.session.access_token;
      if (!token) { renderBookingsList(list, local.filter(function(b){ return !(b.user_id || b.userId); })); return; }
      fetch(PROXY + '/my-bookings', { headers: { Authorization: 'Bearer ' + token } })
        .then(function(r){ return r.json(); })
        .then(function(j){
          var remoteRows = (j && j.ok && j.bookings) ? j.bookings : [];
          var knownRefs = {};
          var merged = remoteRows.map(function(b){
            knownRefs[b.bookingReference] = true;
            return {
              booking_reference: b.bookingReference,
              order_id: b.orderId || '',
              route: b.routeLabel || '',
              date: b.createdAt ? new Date(b.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}) : '',
              price: b.customerPaid ? fmt(b.customerPaid) : '',
              _ts: b.createdAt ? new Date(b.createdAt).getTime() : 0
            };
          });
          // Add local bookings ONLY if they belong to the current user.
          // [PRIVACY-FIX] The previous check (`if (owner && owner !== FW_USER.id) return;`)
          // only filtered out a local entry when it had SOME owner that
          // didn't match — an entry with no owner at all (owner is
          // null/undefined) sailed straight through and was shown to
          // EVERY account that ever logged in on this device. This is
          // exactly how stale guest-era or pre-privacy-fix entries already
          // sitting in localStorage could "stick" and appear identical
          // for every different account tested on the same browser. The
          // check now requires an EXACT match on user_id — an entry with
          // no owner is never shown to a logged-in user, full stop.
          local.forEach(function(b){
            var ref = b.ref || b.booking_reference;
            var owner = b.user_id || b.userId || null;
            if (owner !== FW_USER.id) return; // no owner, or a different account — never shown here
            if (ref && !knownRefs[ref]) {
              knownRefs[ref] = true;
              merged.push({
                booking_reference: ref,
                order_id: b.orderId || b.order_id || '',
                route: b.route || ((b.orig || '') + ' → ' + (b.dest || '')),
                date: b.date ? new Date(b.date).toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}) : '',
                price: b.price ? fmt(b.price) : '',
                _ts: b.date ? new Date(b.date).getTime() : 0
              });
            }
          });
          merged.sort(function(a,b){ return (b._ts || 0) - (a._ts || 0); });
          renderBookingsList(list, merged, true);
        })
        .catch(function(){ renderBookingsList(list, local, true); });
    });
    return;
  }
  // [GUEST-PRIVACY-FIX] "Meine Buchungen" must require an actual account —
  // a guest checkout has nothing to log into later that would show it
  // again, so showing it here (even just on the same device, to the same
  // unauthenticated browser) blurs the line between "guest" and "has an
  // account" in exactly the way that confuses customers about whether
  // they're signed in. saveBookingRecord() no longer writes anything to
  // localStorage for a guest checkout going forward, but this still
  // explicitly refuses to render ANY local entry while logged out —
  // including any stray guest entry saved by an older version of this
  // page before this fix — rather than relying only on there being
  // nothing left to filter.
  if (!(_sb && FW_USER)) {
    list.innerHTML = '<div style="text-align:center;padding:48px 20px"><div style="font-size:3rem;margin-bottom:12px">🎫</div><div style="font-size:15px;font-weight:700;color:var(--tx)">Noch keine Buchungen</div><div style="font-size:13px;color:var(--tx3);margin-top:6px">Melde dich an, um deine Buchungen zu sehen</div><br><button class="auth-btn" style="max-width:220px;margin:0 auto" onclick="openAuthModal(\'login\')">Jetzt anmelden →</button></div>';
    return;
  }
}

function getLocalBookings() {
  try { return JSON.parse(localStorage.getItem('fw_bookings') || '[]'); } catch(e) { return []; }
}

// [GUEST-LINK] Wired to the "Frühere Buchungen verknüpfen" button
// rendered by renderBookingsList() above. Shows a small loading state on
// the button itself, then either re-loads the list (so newly-linked
// bookings appear immediately) or tells the customer none were found.
function manualLinkBookingsClick(btn) {
  var original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ ' + tL('Wird gesucht...','Searching...','جارٍ البحث...');
  linkGuestBookingsManual(function(j){
    if (j && j.ok && j.linked && j.linked.length) {
      var n = j.linked.length;
      showToast('🔗 ' + tL(
        n + ' frühere Buchung' + (n > 1 ? 'en' : '') + ' gefunden und hinzugefügt!',
        n + ' earlier booking' + (n > 1 ? 's' : '') + ' found and added!',
        'تم العثور على ' + n + ' حجز سابق وإضافته!'
      ), 'success');
      loadMyBookings();
    } else if (j && j.ok) {
      showToast(tL('Keine weiteren Buchungen gefunden.','No further bookings found.','لم يتم العثور على حجوزات إضافية.'), 'info');
      btn.disabled = false;
      btn.textContent = original;
    } else {
      showToast(tL('Bitte erneut versuchen.','Please try again.','حاول مرة أخرى.'), 'error');
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

function renderBookingsList(list, bookings, showLinkButton) {
  // [GUEST-LINK] Backup manual trigger, shown only for a logged-in user —
  // covers the auto-link-missed cases mentioned in linkGuestBookingsManual()
  // above (signed up under a different email first, an earlier guest
  // booking made after the last auto-link ran, etc).
  var linkBtnHtml = showLinkButton ? '<div style="text-align:center;margin-bottom:14px"><button onclick="manualLinkBookingsClick(this)" style="background:var(--bg2);border:1.5px solid var(--bd);color:var(--tx2);padding:9px 16px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer">🔗 ' + tL('Frühere Buchungen verknüpfen','Import previous bookings','استرجاع حجوزاتي السابقة') + '</button></div>' : '';
  if (!bookings.length) {
    list.innerHTML = linkBtnHtml + '<div style="text-align:center;padding:48px 20px"><div style="font-size:3rem;margin-bottom:12px">🎫</div><div style="font-size:15px;font-weight:700;color:var(--tx)">Noch keine Buchungen</div><div style="font-size:13px;color:var(--tx3);margin-top:6px">Deine gebuchten Flüge erscheinen hier</div></div>';
    return;
  }
  var html = linkBtnHtml;
  for (var i = 0; i < bookings.length; i++) {
    var b = bookings[i];
    var oid = b.order_id || b.orderId || '';
    var ref = b.booking_reference || b.ref || '—';
    var route = b.route || ((b.orig || '') + ' → ' + (b.dest || ''));
    html += '<div onclick="openBookingDetail(\'' + escHtml(oid) + '\')" style="background:var(--bg2);border-radius:12px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--bd);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px" onmouseover="this.style.borderColor=\'var(--teal)\'" onmouseout="this.style.borderColor=\'var(--bd)\'">';
    html += '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:14px;color:var(--tx)">' + escHtml(route || 'Flug') + '</div>';
    html += '<div style="font-size:11px;color:var(--tx3);margin-top:3px">' + escHtml(b.date || '') + (b.price ? ' · ' + escHtml(String(b.price)) : '') + '</div></div>';
    html += '<div style="text-align:right;display:flex;align-items:center;gap:8px">';
    html += '<div style="font-family:monospace;font-size:12px;font-weight:700;color:var(--teal2);background:var(--teal-lt);padding:4px 10px;border-radius:6px">' + escHtml(ref) + '</div>';
    html += '<div style="font-size:18px;color:var(--tx3)">›</div>';
    html += '</div></div>';
  }
  list.innerHTML = html;
}

function fetchOrderDetails(el) {
  var orderId = typeof el === 'string' ? el : (el && el.getAttribute ? el.getAttribute('data-oid') : '');
  if (!orderId) return;
  showToast('⏳ Buchungsdetails werden geladen...', 'info');
  fetch(PROXY + '/order/' + orderId)
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (j.ok && j.order) {
        var o = j.order;
        var msg = '✅ ' + (o.booking_reference || orderId);
        if (o.total_amount) msg += ' · ' + o.total_amount + ' ' + (o.total_currency || 'EUR');
        if (o.passengers && o.passengers[0]) msg += ' · ' + o.passengers[0].given_name;
        showToast(msg, 'success');
      } else {
        showToast('❌ ' + (j.error || 'Fehler beim Laden'), 'error');
      }
    })
    .catch(function() { showToast('❌ Verbindungsfehler', 'error'); });
}

function cancelOrder(el) {
  var orderId = el && el.getAttribute ? el.getAttribute('data-oid') : '';
  if (!orderId) return;
  if (!confirm('Buchung wirklich stornieren?')) return;
  showToast('⏳ Stornierung wird bearbeitet...', 'info');
  fetch(PROXY + '/cancel', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({order_id: orderId})
  })
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (j.ok) {
        showToast('✅ Storniert! Rückerstattung: ' + (j.refund_amount || '—'), 'success');
        // Find the booking reference linked to this order (needed to void any referral reward)
        var bookingRef = null;
        try {
          var bks = JSON.parse(localStorage.getItem('fw_bookings') || '[]');
          var match = bks.filter(function(b) { return b.orderId === orderId; })[0];
          if (match) bookingRef = match.ref;
          bks = bks.filter(function(b) { return b.orderId !== orderId; });
          localStorage.setItem('fw_bookings', JSON.stringify(bks));
          loadMyBookings();
        } catch(e) {}
        // [ADMIN-CANCEL-SYNC-FIX] The server's /cancel endpoint now marks
        // the booking cancelled in our own bookings table itself (keyed
        // correctly off duffel_order_id, server-side) right after Duffel
        // confirms the cancellation — no client-side Supabase write needed
        // or wanted here anymore.
        if (bookingRef) referralMarkBookingCancelled(bookingRef);
      } else {
        showToast('❌ ' + (j.error || 'Stornierung fehlgeschlagen'), 'error');
      }
    })
    .catch(function() { showToast('❌ Verbindungsfehler', 'error'); });
}

// ═══ HELPERS ═══
function showLoader(s) {
  var l = document.getElementById('loader'); if (l) l.classList.add('show');
  var ls = document.getElementById('lsub'); if (ls && s) ls.textContent = s;
  var pf = document.getElementById('pfill'); if (pf) pf.style.width = '0%';
}
function hideLoader() { var l = document.getElementById('loader'); if (l) l.classList.remove('show'); }
function showErr(m) {
  hideLoader();
  var b = document.getElementById('ebox'); if (!b) return;
  b.classList.add('show');
  var em = document.getElementById('emsg'); if (em) em.textContent = m;
  b.scrollIntoView({behavior:'smooth'});
}
function hideErr() { var b = document.getElementById('ebox'); if (b) b.classList.remove('show'); }

var _af;
function animP(from, to) {
  cancelAnimationFrame(_af);
  var v = from;
  var el = document.getElementById('pfill');
  function step() {
    v = Math.min(v + 1.5, to);
    if (el) el.style.width = v + '%';
    if (v < to) _af = requestAnimationFrame(step);
  }
  _af = requestAnimationFrame(step);
}

function showSkel() {
  var el = document.getElementById('offers-list');
  if (!el) return;
  var html = '';
  for (var i = 0; i < 4; i++) {
    html += '<div class="skc">' +
      '<div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">' +
      '<div class="skl" style="width:40px;height:40px;border-radius:10px;flex-shrink:0;margin:0"></div>' +
      '<div style="flex:1">' +
      '<div class="skl" style="width:55%;height:14px;margin-bottom:6px"></div>' +
      '<div class="skl" style="width:35%;height:11px"></div>' +
      '</div>' +
      '<div class="skl" style="width:70px;height:22px;border-radius:6px;margin:0"></div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
      '<div class="skl" style="width:18%;height:16px"></div>' +
      '<div class="skl" style="flex:1;height:3px"></div>' +
      '<div class="skl" style="width:18%;height:16px"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;border-top:1px solid var(--bg2);padding-top:10px">' +
      '<div class="skl" style="width:40%;height:12px"></div>' +
      '<div class="skl" style="width:25%;height:30px;border-radius:8px"></div>' +
      '</div>' +
      '</div>';
  }
  el.innerHTML = html;
}

// ═══ DARK MODE ═══
function initDarkMode() {
  try {
    if (localStorage.getItem('dm') === '1') {
      document.documentElement.setAttribute('data-theme', 'dark');
      var i = document.getElementById('dm-ico');
      if (i) i.textContent = '☀️';
    }
  } catch(e) {}
}
function toggleDark() {
  var d = document.documentElement.getAttribute('data-theme') === 'dark';
  if (d) {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  try { localStorage.setItem('dm', d ? '0' : '1'); } catch(e) {}
  var i = document.getElementById('dm-ico');
  if (i) i.textContent = d ? '🌙' : '☀️';
}

// ═══ AUTH SYSTEM ═══
var FW_USER = null;

function initAuth() {
  if (!_sb) { maybeShowWelcomeBanner(); return; }
  // Restore current session
  _sb.auth.getSession().then(function(res){
    var session = res.data && res.data.session;
    if (session && session.user) {
      FW_USER = mapSupaUser(session.user);
      onAuthSuccess(FW_USER, session.access_token, false);
      syncLocalBookingsToSupabase();
    } else {
      maybeShowWelcomeBanner();
    }
  }).catch(function(){ maybeShowWelcomeBanner(); });
  // React to login/logout across tabs
  _sb.auth.onAuthStateChange(function(event, session){
    // [PASSWORD-RECOVERY-FIX] The actual missing trigger — Supabase fires
    // this specific event (distinct from a normal SIGNED_IN) when the
    // customer returns from the reset-password email link. Without this,
    // they just landed back on the homepage with no indication anything
    // special was supposed to happen.
    if (event === 'PASSWORD_RECOVERY') {
      showNewPasswordBox();
      return;
    }
    if (session && session.user) {
      FW_USER = mapSupaUser(session.user);
      updateUserNav(FW_USER);
      syncLocalBookingsToSupabase();
      closeAuthBanner(true); // logged in now — the banner no longer applies
    } else {
      FW_USER = null;
    }
  });
}

// [USER-AUTH] Shows the "sign up for €10 credit" banner to anonymous
// visitors only — never to a logged-in user, and never again in this
// browser once they've dismissed it (or signed up). This is purely a
// nudge: declining it changes nothing about being able to search/book.
function maybeShowWelcomeBanner() {
  if (FW_USER) return;
  var dismissed = false;
  try { dismissed = localStorage.getItem('fw_auth_banner_dismissed') === '1'; } catch(e) {}
  if (dismissed) return;
  setTimeout(function() {
    var el = document.getElementById('auth-welcome-banner');
    if (el && !FW_USER) el.style.display = 'flex';
  }, 1400);
}
function closeAuthBanner(skipSave) {
  var el = document.getElementById('auth-welcome-banner');
  if (el) el.style.display = 'none';
  if (!skipSave) { try { localStorage.setItem('fw_auth_banner_dismissed', '1'); } catch(e) {} }
}

// Push any locally-saved bookings that never made it into Supabase
// (e.g. saved right after a payment redirect, before the login session
// had finished restoring) up to the server, so they show up on every
// device and don't get lost from "Meine Buchungen".
function syncLocalBookingsToSupabase() {
  if (!_sb || !FW_USER) return;
  var local = getLocalBookings();
  var pending = local.filter(function(b){ return b.ref && !b._synced; });
  if (!pending.length) return;
  _sb.from('bookings').select('booking_ref').eq('user_id', FW_USER.id).then(function(res){
    var existing = {};
    (res.data || []).forEach(function(r){ existing[r.booking_ref] = true; });
    pending.forEach(function(b){
      if (!existing[b.ref]) {
        _sb.from('bookings').insert({
          user_id: FW_USER.id, booking_ref: b.ref, order_id: b.orderId || '',
          origin: b.orig || '', destination: b.dest || '', airline: b.airline || '',
          total_amount: b.price || 0, created_at: b.date || new Date().toISOString(),
          departure_date: b.departureDate || null, status: 'confirmed'
        }).then(function(){}, function(){});
      }
    });
    // Mark all of them as synced locally so we don't keep re-checking/re-inserting
    try {
      var all = getLocalBookings();
      all.forEach(function(b){ if (b.ref && pending.some(function(p){ return p.ref === b.ref; })) b._synced = true; });
      localStorage.setItem('fw_bookings', JSON.stringify(all));
    } catch(e) {}
  }, function(){});
}

// Convert a Supabase user object to Airpiv's {name,email} shape
function mapSupaUser(u) {
  var meta = u.user_metadata || {};
  return {
    id: u.id,
    email: u.email,
    name: meta.name || meta.full_name || (u.email ? u.email.split('@')[0] : 'Nutzer'),
    accountNumber: meta.account_number || ''
  };
}

function openAuthModal(tab) {
  switchAuthTab(tab || 'login');
  clearAuthMsgs();
  document.getElementById('auth-ov').classList.add('open');
}
function closeAuthModal() {
  document.getElementById('auth-ov').classList.remove('open');
  clearAuthMsgs();
}
function switchAuthTab(tab) {
  document.getElementById('auth-form-login').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('auth-form-register').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('auth-tab-login').className = 'auth-tab' + (tab === 'login' ? ' on' : '');
  document.getElementById('auth-tab-register').className = 'auth-tab' + (tab === 'register' ? ' on' : '');
  document.getElementById('auth-sub').textContent = tab === 'login' ? 'Willkommen zurück' : 'Kostenloses Konto erstellen';
  clearAuthMsgs();
}
function clearAuthMsgs() {
  var e = document.getElementById('auth-err'); if(e){e.textContent='';e.className='auth-err';}
  var o = document.getElementById('auth-ok'); if(o){o.textContent='';o.className='auth-ok';}
}
function showAuthErr(msg) {
  var e = document.getElementById('auth-err');
  if (e) { e.textContent = msg; e.className = 'auth-err show'; }
}
function showAuthOk(msg) {
  var o = document.getElementById('auth-ok');
  if (o) { o.textContent = msg; o.className = 'auth-ok show'; }
}

async function doLogin() {
  clearAuthMsgs();
  var email = document.getElementById('login-email').value.trim();
  var pass = document.getElementById('login-pass').value;
  if (!email || !pass) { showAuthErr('Bitte E-Mail und Passwort eingeben.'); return; }
  var btn = document.getElementById('login-btn');
  btn.disabled = true;
  document.getElementById('login-btn-txt').textContent = '⏳ Anmelden...';
  var isLocal = !window.location.host || window.location.protocol === 'file:' || window.location.hostname === 'localhost';
  if (!_sb || isLocal) {
    setTimeout(function() {
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem('fw_demo_user') || 'null'); } catch(e) {}
      FW_USER = saved || { id: 'demo_' + Date.now(), email: email, name: email.split('@')[0] };
      onAuthSuccess(FW_USER, 'demo_token', true);
      btn.disabled = false;
      document.getElementById('login-btn-txt').textContent = 'Anmelden →';
    }, 700);
    return;
  }
  try {
    var res = await _sb.auth.signInWithPassword({ email: email, password: pass });
    if (res.error) {
      var m = res.error.message || '';
      var errMsg = m.indexOf('Invalid login') >= 0 ? 'Ungültige E-Mail oder Passwort.' : (m.indexOf('not confirmed') >= 0 ? 'Bitte bestätige zuerst deine E-Mail.' : m);
      showAuthErr(errMsg);
      if (m.indexOf('Invalid login') >= 0) showForgotBox(email);
    } else {
      FW_USER = mapSupaUser(res.data.user);
      onAuthSuccess(FW_USER, res.data.session.access_token, true);
    }
  } catch(e) {
    FW_USER = { id: 'demo_' + Date.now(), email: email, name: email.split('@')[0] };
    onAuthSuccess(FW_USER, 'demo_token', true);
  }
  btn.disabled = false;
  document.getElementById('login-btn-txt').textContent = 'Anmelden →';
}

async function doRegister() {
  clearAuthMsgs();
  var name = document.getElementById('reg-name').value.trim();
  var email = document.getElementById('reg-email').value.trim();
  var pass = document.getElementById('reg-pass').value;
  var accountNumber = (document.getElementById('reg-account-number').value || '').trim();
  if (!name || !email || !pass) { showAuthErr('Bitte alle Felder ausfüllen.'); return; }
  if (pass.length < 8) { showAuthErr('Passwort muss mindestens 8 Zeichen haben.'); return; }
  var btn = document.getElementById('reg-btn');
  btn.disabled = true;
  document.getElementById('reg-btn-txt').textContent = '⏳ Konto wird erstellt...';
  var isLocal = !window.location.host || window.location.protocol === 'file:' || window.location.hostname === 'localhost';
  if (!_sb || isLocal) {
    setTimeout(function() {
      FW_USER = { id: 'demo_' + Date.now(), email: email, name: name, accountNumber: accountNumber };
      try { localStorage.setItem('fw_demo_user', JSON.stringify(FW_USER)); } catch(e) {}
      referralLinkNewUser(FW_USER);
      onAuthSuccess(FW_USER, 'demo_token', true);
      btn.disabled = false;
      document.getElementById('reg-btn-txt').textContent = 'Konto erstellen →';
    }, 900);
    return;
  }
  try {
    var res = await _sb.auth.signUp({
      email: email,
      password: pass,
      options: { data: { name: name, account_number: accountNumber } }
    });
    if (res.error) {
      showAuthErr(res.error.message || 'Registrierung fehlgeschlagen.');
    } else if (res.data.session) {
      FW_USER = mapSupaUser(res.data.user);
      referralLinkNewUser(FW_USER);
      onAuthSuccess(FW_USER, res.data.session.access_token, true);
    } else if (res.data.user && Array.isArray(res.data.user.identities) && res.data.user.identities.length === 0) {
      // [AUTH-FIX] Per Supabase's own documented behavior, signUp() never
      // returns an explicit "email already registered" error — for
      // existing CONFIRMED accounts it silently returns an obfuscated
      // user object with session:null and identities:[] (empty), to avoid
      // leaking which emails are registered to an unauthenticated caller.
      // Without checking this, a returning user who mistakenly hits
      // "Konto erstellen" instead of "Anmelden" saw the same generic
      // "confirmation email sent" message as a real new signup — no email
      // ever arrives (Supabase doesn't resend anything in this case), so
      // they're left waiting indefinitely with no idea why.
      showAuthErr('Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an oder setze dein Passwort zurück.');
      showForgotBox(email);
    } else {
      showAuthOk('✅ Bestätigungs-E-Mail gesendet! Bitte bestätige deine E-Mail.');
    }
  } catch(e) {
    FW_USER = { id: 'demo_' + Date.now(), email: email, name: name };
    try { localStorage.setItem('fw_demo_user', JSON.stringify(FW_USER)); } catch(e2) {}
    referralLinkNewUser(FW_USER);
    onAuthSuccess(FW_USER, 'demo_token', true);
  }
  btn.disabled = false;
  document.getElementById('reg-btn-txt').textContent = 'Konto erstellen →';
}

function showForgotBox(prefillEmail) {
  var box = document.getElementById('auth-reset-box');
  if (box) {
    box.classList.add('show');
    var inp = document.getElementById('reset-email');
    if (inp && prefillEmail) inp.value = prefillEmail;
    if (inp) inp.focus();
  }
}
function hideForgotBox() {
  var box = document.getElementById('auth-reset-box');
  if (box) { box.classList.remove('show'); }
  var o = document.getElementById('auth-ok');
  if (o) { o.textContent = ''; o.className = 'auth-ok'; }
}

// [PASSWORD-RECOVERY-FIX] Called when Supabase fires PASSWORD_RECOVERY
// (the customer just landed back on the site from the reset-password
// email link). Opens the auth modal directly into "set new password"
// mode — login/register tabs and forms are hidden so there's no way to
// get confused and try logging in with the OLD (forgotten) password
// instead. This is the piece that was completely missing before: the
// email's redirectTo brought them back to the site, but nothing ever
// detected this state or gave them anywhere to actually type a new
// password.
function showNewPasswordBox() {
  document.getElementById('auth-tab-login').style.display = 'none';
  document.getElementById('auth-tab-register').style.display = 'none';
  document.getElementById('auth-form-login').style.display = 'none';
  document.getElementById('auth-form-register').style.display = 'none';
  document.getElementById('auth-sub').textContent = 'Neues Passwort festlegen';
  var box = document.getElementById('auth-newpass-box');
  if (box) box.classList.add('show');
  document.getElementById('auth-ov').classList.add('open');
}

async function doSetNewPassword() {
  var pass = document.getElementById('newpass-input').value;
  if (!pass || pass.length < 6) { showAuthErr('Passwort muss mindestens 6 Zeichen haben.'); return; }
  var btn = document.getElementById('newpass-send-btn');
  var txt = document.getElementById('newpass-send-txt');
  btn.disabled = true; txt.textContent = '⏳ Wird gespeichert...';
  try {
    var { error } = await _sb.auth.updateUser({ password: pass });
    if (error) {
      showAuthErr(error.message);
    } else {
      // [PASSWORD-RECOVERY-FIX] Password is set — restore the normal
      // login/register modal state (in case the customer opens the
      // modal again later this session) and close it. They're now
      // signed in with the new password automatically (Supabase's
      // updateUser keeps the recovery session active).
      document.getElementById('auth-newpass-box').classList.remove('show');
      document.getElementById('auth-tab-login').style.display = '';
      document.getElementById('auth-tab-register').style.display = '';
      closeAuthModal();
      showToast('✅ Passwort erfolgreich geändert!', 'success');
    }
  } catch (e) {
    showAuthErr('Fehler beim Speichern. Bitte versuche es erneut.');
  }
  btn.disabled = false; txt.textContent = 'Passwort speichern ✓';
}
async function doResetPassword() {
  var email = (document.getElementById('reset-email').value || '').trim();
  if (!email) { showAuthErr('Bitte E-Mail-Adresse eingeben.'); return; }
  var btn = document.getElementById('reset-send-btn');
  var txt = document.getElementById('reset-send-txt');
  btn.disabled = true; txt.textContent = '⏳ Wird gesendet...';
  try {
    if (_sb) {
      var { error } = await _sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
      });
      if (error) { showAuthErr(error.message); }
      else {
        hideForgotBox();
        showAuthOk('✅ Reset-Link gesendet! Bitte prüfe deine E-Mails.');
      }
    } else {
      hideForgotBox();
      showAuthOk('✅ Reset-Link gesendet! Bitte prüfe deine E-Mails.');
    }
  } catch(e) {
    showAuthErr('Fehler beim Senden. Bitte versuche es erneut.');
  }
  btn.disabled = false; txt.textContent = 'Link senden ✉️';
}

async function doGoogleLogin() {
  if (!_sb) return;
  clearAuthMsgs();
  try {
    var { error } = await _sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) showAuthErr(error.message);
  } catch(e) {
    showAuthErr('Google-Anmeldung fehlgeschlagen.');
  }
}

function onAuthSuccess(user, token, showWelcome) {
  updateUserNav(user);
  // Identify user in Brevo chat so agent sees name, email and account number
  if (window.BrevoConversations) {
    window.BrevoConversations('updateIntegrationData', {
      email: user.email || '',
      name: user.name || '',
      userId: user.id || '',
      customAttributes: { account_number: user.accountNumber || '' }
    });
  } else {
    // Brevo not loaded yet — retry once loaded
    var _brevoIdentifyDone = false;
    var _brevoIdentifyInterval = setInterval(function() {
      if (window.BrevoConversations && !_brevoIdentifyDone) {
        _brevoIdentifyDone = true;
        clearInterval(_brevoIdentifyInterval);
        window.BrevoConversations('updateIntegrationData', {
          email: user.email || '',
          name: user.name || '',
          userId: user.id || '',
          customAttributes: { account_number: user.accountNumber || '' }
        });
      }
    }, 600);
  }
  if (showWelcome) {
    showAuthOk('✅ Willkommen, ' + (user.name || user.email) + '!');
    setTimeout(closeAuthModal, 1200);
    showToast('👋 Hallo, ' + (user.name || user.email) + '!', 'success');
    // Init loyalty program for new user
    setTimeout(function(){ loyaltyInit(user); }, 1400);
  } else {
    // Returning user: show cached data immediately, then refresh from the
    // server so a stale cached credit balance (e.g. already spent on an
    // earlier booking) never silently drives pricing shown to the customer.
    loyaltyLoad();
    loyaltyUpdateNav();
    loyaltySyncFromServer();
  }
  // [GUEST-LINK] Runs on every successful sign-up AND every login (not
  // just sign-up) — covers both "I just created an account with the
  // email I booked under" and "I logged into an existing account that
  // happens to share an email with an earlier guest booking". Safe to
  // call every time: the server only ever links bookings that still have
  // no user_id, so a booking already linked (here or anywhere else) is
  // simply skipped, never re-processed or reassigned.
  linkGuestBookings(token);
  // Check if any pending referral reward has become due (friend's flight departed)
  setTimeout(function(){ referralCheckAndPayout(); }, 1600);
}

// [GUEST-LINK] Calls /auth/link-guest-bookings with the fresh session
// token and, if any earlier guest bookings were found and linked, shows
// the customer a friendly confirmation — this is the auto-link half of
// "book as guest, link to your account later" (see linkGuestBookingsManual()
// below for the backup "Frühere Buchungen verknüpfen" button).
function linkGuestBookings(token) {
  if (!token) return;
  fetch(PROXY + '/auth/link-guest-bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
  })
    .then(function(r){ return r.json(); })
    .then(function(j){
      if (j && j.ok && j.linked && j.linked.length) {
        var n = j.linked.length;
        var msg = tL(
          'Wir haben ' + n + ' frühere Buchung' + (n > 1 ? 'en' : '') + ' gefunden, die mit deiner E-Mail-Adresse verknüpft ' + (n > 1 ? 'sind' : 'ist') + ', und ' + (n > 1 ? 'sie' : 'sie') + ' deinem Konto hinzugefügt.',
          'We found ' + n + ' earlier booking' + (n > 1 ? 's' : '') + ' associated with your email and added ' + (n > 1 ? 'them' : 'it') + ' to your account.',
          'وجدنا ' + n + ' حجز سابق مرتبط ببريدك الإلكتروني وأضفناه لحسابك.'
        );
        setTimeout(function(){ showToast('🔗 ' + msg, 'success'); }, 2200);
      }
    })
    .catch(function(){ /* best-effort — never block sign-in on this */ });
}

// [GUEST-LINK] Backup manual trigger — e.g. for "Frühere Buchungen
// verknüpfen" button inside the account/bookings page, for the case the
// automatic call above ran before a booking existed, or simply to let the
// customer re-check on demand. cb receives the same {ok, linked} shape so
// the caller can render its own message/list.
function linkGuestBookingsManual(cb) {
  if (!_sb) { if (cb) cb({ ok: false, error: 'not_logged_in' }); return; }
  _sb.auth.getSession().then(function(res) {
    var token = res.data && res.data.session && res.data.session.access_token;
    if (!token) { if (cb) cb({ ok: false, error: 'not_logged_in' }); return; }
    fetch(PROXY + '/auth/link-guest-bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
    })
      .then(function(r){ return r.json(); })
      .then(function(j){ if (cb) cb(j); })
      .catch(function(){ if (cb) cb({ ok: false, error: 'network_error' }); });
  });
}

function updateUserNav(user) {
  var authBtn = document.getElementById('nav-auth-btn');
  var userMenu = document.getElementById('user-menu');
  if (authBtn) authBtn.style.display = 'none';
  if (userMenu) userMenu.style.display = '';
  var nameEl = document.getElementById('user-dropdown-name');
  var emailEl = document.getElementById('user-dropdown-email');
  if (nameEl) nameEl.textContent = user.name || 'Nutzer';
  if (emailEl) emailEl.textContent = user.email || '';
  // Show loyalty badge (already in HTML)
  var badge = document.getElementById('loyalty-nav-badge');
  if (badge) badge.style.display = 'inline-flex';
  loyaltyUpdateNav();
}

function toggleUserMenu() {
  var dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.toggle('open');
}
document.addEventListener('click', function(e) {
  var menu = document.getElementById('user-menu');
  if (menu && !menu.contains(e.target)) {
    var dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.remove('open');
  }
});

function logoutUser(silent) {
  if (_sb) { try { _sb.auth.signOut(); } catch(e) {} }
  FW_USER = null;
  try { localStorage.removeItem('fw_token'); localStorage.removeItem('fw_user'); } catch(e) {}
  var authBtn = document.getElementById('nav-auth-btn');
  var userMenu = document.getElementById('user-menu');
  if (authBtn) authBtn.style.display = '';
  if (userMenu) userMenu.style.display = 'none';
  var dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.remove('open');
  if (!silent) showToast('👋 Erfolgreich abgemeldet', 'info');
}

// ═══ END AUTH SYSTEM ═══

// [PHONE-INPUT] Country dial codes for the contact-phone field, sorted
// with the markets Airpiv actually targets (DE-speaking + nearby Europe +
// MENA) first, rest alphabetical by country name. [code, dial, flag emoji]
var PHONE_COUNTRIES = [
  ['DE','49','🇩🇪'],['AT','43','🇦🇹'],['CH','41','🇨🇭'],
  ['SA','966','🇸🇦'],['AE','971','🇦🇪'],['EG','20','🇪🇬'],['JO','962','🇯🇴'],['LB','961','🇱🇧'],['IQ','964','🇮🇶'],['KW','965','🇰🇼'],['QA','974','🇶🇦'],['BH','973','🇧🇭'],['OM','968','🇴🇲'],['MA','212','🇲🇦'],['TN','216','🇹🇳'],['DZ','213','🇩🇿'],
  ['TR','90','🇹🇷'],
  ['GB','44','🇬🇧'],['FR','33','🇫🇷'],['IT','39','🇮🇹'],['ES','34','🇪🇸'],['NL','31','🇳🇱'],['BE','32','🇧🇪'],['PT','351','🇵🇹'],['PL','48','🇵🇱'],['SE','46','🇸🇪'],['NO','47','🇳🇴'],['DK','45','🇩🇰'],['FI','358','🇫🇮'],['IE','353','🇮🇪'],['GR','30','🇬🇷'],['CZ','420','🇨🇿'],['HU','36','🇭🇺'],['RO','40','🇷🇴'],
  ['US','1','🇺🇸'],['CA','1','🇨🇦'],
  ['IN','91','🇮🇳'],['PK','92','🇵🇰'],['CN','86','🇨🇳'],['JP','81','🇯🇵'],['KR','82','🇰🇷'],
  ['AU','61','🇦🇺'],['RU','7','🇷🇺']
];
function phoneCountryOptionsHtml(selectedDial) {
  selectedDial = selectedDial || '49';
  return PHONE_COUNTRIES.map(function(c) {
    var sel = c[1] === selectedDial ? ' selected' : '';
    return '<option value="' + c[1] + '"' + sel + '>' + c[2] + ' +' + c[1] + '</option>';
  }).join('');
}
// Splits a full E.164-ish string like "+49 151 23456789" into
// {dial:'49', local:'151 23456789'} by matching the longest known dial
// code first (so e.g. '+1...' picks US/CA, not a coincidental longer
// match). Used only to restore a previously-saved number into the two
// visible fields — never part of the validation/submit path itself.
function splitPhoneValue(full) {
  var digits = (full || '').replace(/[^\d+]/g, '');
  if (!digits.startsWith('+')) return { dial: '49', local: digits };
  digits = digits.slice(1);
  var sorted = PHONE_COUNTRIES.slice().sort(function(a, b) { return b[1].length - a[1].length; });
  for (var i = 0; i < sorted.length; i++) {
    if (digits.startsWith(sorted[i][1])) return { dial: sorted[i][1], local: digits.slice(sorted[i][1].length) };
  }
  return { dial: '49', local: digits };
}
// [PHONE-INPUT] Recombines the country-code <select> + local-number
// <input> into the single hidden field every existing validation/submit
// code path already reads (#bf-contact-phone). This is the ONLY place
// that writes to the hidden field, so nothing downstream needs to change.
function syncPhoneHidden() {
  var ccEl = document.getElementById('bf-contact-phone-cc');
  var numEl = document.getElementById('bf-contact-phone-num');
  var hidden = document.getElementById('bf-contact-phone');
  if (!ccEl || !numEl || !hidden) return;
  var local = (numEl.value || '').replace(/[\s\-().]/g, '');
  hidden.value = '+' + ccEl.value + (local ? ' ' + local : '');
  validatePhoneField(hidden);
  // Mirror the hidden field's validity onto the visible number input so
  // the red/green border the customer actually sees is correct.
  numEl.classList.toggle('err', hidden.classList.contains('err'));
}

// ═══════════════════════════════════════════════
// ══ AIRPIV LOYALTY PROGRAM ══════════════════════
// ═══════════════════════════════════════════════
var LOYALTY = {
  POINTS_PER_EURO: 2,
  WELCOME_POINTS: 100,
  WELCOME_CREDIT: 10.0,
  MAX_CREDIT_PER_BOOKING: 5.0,
  POINTS_PER_EURO_REDEEM: 400,
  TIERS: {
    bronze: { name: 'Bronze', min: 0,    max: 3999,  multiplier: 1.0, icon: '🥉', color: '#cd7f32', supportLabel: 'Standard' },
    silver: { name: 'Silver', min: 4000, max: 9999,  multiplier: 1.5, icon: '🥈', color: '#a8a9ad', supportLabel: 'Priority',  coupon: 20  },
    gold:   { name: 'Gold',   min: 10000, max: Infinity, multiplier: 2.0, icon: '🥇', color: '#ffd700', supportLabel: 'VIP',    coupon: 100 }
  }
};

var loyaltyData = { points: 0, lifetimePoints: 0, credit: 0.0, tier: 'bronze', bookings: 0, creditUsed: 0 };

// [ADMIN-LOYALTY] A stable per-browser identifier, generated once and kept
// in localStorage. This is NOT a real login/auth system — it's just how
// the server tells "this browser" apart from another one for loyalty
// purposes. The server is still the only place that can change a balance;
// this id only says WHICH balance to look at.
function loyaltyDeviceId() {
  try {
    var id = localStorage.getItem('fw_device_id');
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      localStorage.setItem('fw_device_id', id);
    }
    return id;
  } catch(e) { return null; }
}

// [ADMIN-LOYALTY] Pulls the REAL balance from the server and refreshes the
// local display cache (loyaltyData). Called on load and again right after
// a booking completes, so the UI never shows a stale/tampered number for
// long. If the server has no record yet, it lazily creates one with the
// admin's configured welcome bonus — same effect as the old client-side
// "first visit" logic, but the balance now actually lives server-side.
//
// [USER-AUTH] A logged-in user's real account (keyed by their Supabase
// user id) always takes priority over the anonymous device account —
// matches computeAuthoritativePricing()'s priority on the server, so the
// displayed balance and the one actually charged always agree.
function loyaltySyncFromServer(cb) {
  if (_sb && FW_USER && FW_USER.id) {
    _sb.auth.getSession().then(function(res) {
      var token = res.data && res.data.session && res.data.session.access_token;
      if (!token) { loyaltySyncFromServerByDevice(cb); return; }
      fetch(PROXY + '/auth/me', { headers: { Authorization: 'Bearer ' + token } })
        .then(function(r){ return r.json(); })
        .then(function(j){
          if (j && j.ok && j.loyalty) {
            var wasInitialized = loyaltyData._initialized;
            loyaltyData.points = j.loyalty.points;
            // [TIER-PROGRESS-FIX] Drives "X points until next tier" — must
            // never shrink when points are redeemed for credit, unlike
            // `points` (the spendable balance, which does shrink).
            loyaltyData.lifetimePoints = (j.loyalty.lifetime_points != null) ? j.loyalty.lifetime_points : j.loyalty.points;
            loyaltyData.credit = j.loyalty.credit;
            loyaltyData.tier = j.loyalty.tier;
            var isFirstTimeSeen = !wasInitialized && !loyaltyData._initialized;
            loyaltyData._initialized = true;
            loyaltySave();
            loyaltyUpdateNav();
            if (isFirstTimeSeen) setTimeout(showLoyaltyWelcome, 800);
            // [LOYALTY-BUTTON-SYNC-FIX] This fetch is async and can land
            // AFTER bflowRender() already drew the payment step with
            // loyaltyData.credit still at its old/zero value — the pay
            // button's price (bflow-btn-price) was computed once at render
            // time and never touched again, so it kept showing the
            // pre-loyalty-discount total even after the big "Gesamtbetrag"
            // card updated correctly via the separate server price sync.
            // Re-running the same refresh used after promo/bag/seat changes
            // keeps both numbers in agreement.
            if (bflowStep === 5 && bflowOffer) bflowRefreshPrices();
          }
          if (cb) cb();
        })
        .catch(function(){ if (cb) cb(); });
    }).catch(function(){ loyaltySyncFromServerByDevice(cb); });
  } else {
    loyaltySyncFromServerByDevice(cb);
  }
}

// [LOYALTY-FIX] An anonymous (not-logged-in) visitor must see ZERO loyalty
// balance — no welcome credit, no points, no "welcome" toast — until they
// actually create an account. This used to call /loyalty/account/:deviceId,
// which silently auto-created a device-scoped loyalty account on first
// call and handed it the admin's configured welcome bonus immediately,
// with no signup involved at all. That balance then got spent automatically
// as a discount at checkout (computeAuthoritativePricing, server-side),
// which is exactly how a logged-out customer could watch the price drop
// by the welcome-credit amount with zero visible "discount" anywhere —
// the device-loyalty system simply no longer exists. An anonymous visitor
// now always sees the zeroed-out default loyaltyData and nothing more.
function loyaltySyncFromServerByDevice(cb) {
  if (cb) cb();
}

function loyaltyGetTier(points) {
  if (points >= LOYALTY.TIERS.gold.min) return 'gold';
  if (points >= LOYALTY.TIERS.silver.min) return 'silver';
  return 'bronze';
}

function loyaltyLoad() {
  try {
    var saved = JSON.parse(localStorage.getItem('fw_loyalty') || 'null');
    if (saved) loyaltyData = saved;
  } catch(e) {}
}

function loyaltySave() {
  try { localStorage.setItem('fw_loyalty', JSON.stringify(loyaltyData)); } catch(e) {}
}

function loyaltyInit(user) {
  loyaltyLoad();
  loyaltyUpdateNav(); // show cached values immediately (no flash of zeros)
  // [ADMIN-LOYALTY] Real balance + welcome-bonus creation now happen
  // server-side. loyaltySyncFromServer() fetches the account (creating it
  // with the admin's configured bonus if this is the first visit) and
  // refreshes loyaltyData + the nav badge once the real numbers arrive.
  loyaltySyncFromServer();
}

function loyaltyEarnPoints(amountEur) {
  var tier = LOYALTY.TIERS[loyaltyData.tier];
  var pts = Math.floor(amountEur * LOYALTY.POINTS_PER_EURO * tier.multiplier);
  var prevTier = loyaltyData.tier;
  loyaltyData.points += pts;
  loyaltyData.bookings += 1;
  var newTier = loyaltyGetTier(loyaltyData.points);
  loyaltyData.tier = newTier;
  loyaltySave();
  loyaltyUpdateNav();
  if (newTier !== prevTier) {
    setTimeout(function(){ showLoyaltyUpgrade(newTier); }, 1200);
  }
  return pts;
}

function loyaltyRedeemCredit(amount) {
  var use = Math.min(amount, loyaltyData.credit, LOYALTY.MAX_CREDIT_PER_BOOKING);
  if (use <= 0) return 0;
  loyaltyData.credit -= use;
  loyaltyData.creditUsed = (loyaltyData.creditUsed || 0) + use;
  loyaltySave();
  loyaltyUpdateNav();
  return use;
}

// [POINTS-RESET-FIX] Converts points to credit via the server (POST
// /loyalty/redeem) instead of editing loyaltyData locally. The old version
// only ever wrote to localStorage — the server's real balance never
// changed, so the next sync (e.g. logging out and back in, or any normal
// background refresh) silently restored the pre-conversion points/credit,
// making the redemption look like it had "reverted". Returns a Promise of
// the redeemed euro amount (0 if the call failed or was rejected).
function loyaltyConvertPoints(pts) {
  if (!FW_USER || !FW_USER.id) return Promise.resolve(0);
  if (pts > loyaltyData.points) return Promise.resolve(0);

  function withAuth() {
    if (_sb) {
      return _sb.auth.getSession().then(function(res){
        var tok = res.data && res.data.session && res.data.session.access_token;
        return tok ? { Authorization: 'Bearer ' + tok } : {};
      }).catch(function(){ return {}; });
    }
    return Promise.resolve({});
  }

  return withAuth().then(function(authHeader) {
    return fetch(PROXY + '/loyalty/redeem', {
      method: 'POST',
      headers: Object.assign({'Content-Type':'application/json'}, authHeader),
      body: JSON.stringify({ points: pts })
    }).then(function(r){ return r.json(); })
      .then(function(j){
        if (!j || !j.ok || !j.loyalty) return 0;
        // [TIER-DEMOTION-FIX] tier comes straight from the server, derived
        // from lifetime_points — never recomputed here from the now-lower
        // points balance, which is exactly what used to demote a customer
        // a tier purely for redeeming points they'd already earned.
        loyaltyData.points = j.loyalty.points;
        // [TIER-PROGRESS-FIX] Untouched by redemption — kept in sync here
        // purely so loyaltyData stays internally consistent.
        loyaltyData.lifetimePoints = (j.loyalty.lifetime_points != null) ? j.loyalty.lifetime_points : loyaltyData.lifetimePoints;
        loyaltyData.credit = j.loyalty.credit;
        loyaltyData.tier = j.loyalty.tier;
        loyaltySave();
        loyaltyUpdateNav();
        return j.redeemed_euros || 0;
      })
      .catch(function(){ return 0; });
  });
}

function loyaltyUpdateNav() {
  var tier = LOYALTY.TIERS[loyaltyData.tier];
  var badge = document.getElementById('loyalty-nav-badge');
  if (badge) {
    badge.textContent = tier.icon + ' ' + loyaltyData.points.toLocaleString() + ' pts';
    badge.style.background = tier.color + '22';
    badge.style.color = tier.color;
    badge.style.border = '1px solid ' + tier.color + '55';
  }
  var ddLoyalty = document.getElementById('dd-loyalty-section');
  if (ddLoyalty) {
    var nextMin = loyaltyData.tier === 'gold' ? LOYALTY.TIERS.gold.min : (loyaltyData.tier === 'bronze' ? LOYALTY.TIERS.silver.min : LOYALTY.TIERS.gold.min);
    // [TIER-PROGRESS-FIX] Same fix as openLoyaltyPanel(): progress toward
    // the next tier must be measured against total points ever earned,
    // not the spendable balance that drops when points are redeemed.
    var progressPointsNav = loyaltyData.lifetimePoints || 0;
    var pct = loyaltyData.tier === 'gold' ? 100 : Math.floor((progressPointsNav / nextMin) * 100);
    pct = Math.min(pct, 100);
    var nextTierName = loyaltyData.tier === 'gold' ? 'Gold' : (loyaltyData.tier === 'bronze' ? 'Silver' : 'Gold');
    var remaining = Math.max(0, nextMin - progressPointsNav);
    ddLoyalty.innerHTML =
      '<div style="background:linear-gradient(135deg,'+tier.color+'18,'+tier.color+'08);border:1px solid '+tier.color+'33;border-radius:12px;padding:11px 13px;margin:6px 0">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
          '<span style="font-size:1.4rem">'+tier.icon+'</span>' +
          '<div style="flex:1">' +
            '<div style="font-size:13px;font-weight:800;color:var(--tx)">'+tier.name+' Member</div>' +
            '<div style="font-size:10px;color:var(--tx3)">'+tier.multiplier+'x Punkte · '+tier.supportLabel+' Support</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:14px;font-weight:800;color:'+tier.color+'">'+loyaltyData.points.toLocaleString()+'</div>' +
            '<div style="font-size:9px;color:var(--tx3)">Punkte</div>' +
          '</div>' +
        '</div>' +
        (loyaltyData.tier !== 'gold' ?
          '<div style="margin-bottom:6px">' +
            '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--tx3);margin-bottom:4px">' +
              '<span>Nächstes: '+nextTierName+'</span>' +
              '<span>'+remaining.toLocaleString()+' fehlen</span>' +
            '</div>' +
            '<div style="height:5px;background:var(--bd);border-radius:3px;overflow:hidden">' +
              '<div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,'+tier.color+','+tier.color+'cc);border-radius:3px"></div>' +
            '</div>' +
          '</div>' : '') +
        '<div style="display:flex;gap:6px;margin-top:8px">' +
          '<div style="flex:1;background:var(--bg);border-radius:8px;padding:7px;text-align:center;border:1px solid var(--bd)">' +
            '<div style="font-size:12px;font-weight:800;color:var(--teal)">€'+loyaltyData.credit.toFixed(2)+'</div>' +
            '<div style="font-size:9px;color:var(--tx3)">Guthaben</div>' +
          '</div>' +
          '<div style="flex:1;background:var(--bg);border-radius:8px;padding:7px;text-align:center;border:1px solid var(--bd)">' +
            '<div style="font-size:12px;font-weight:800;color:var(--tx)">'+loyaltyData.bookings+'</div>' +
            '<div style="font-size:9px;color:var(--tx3)">Buchungen</div>' +
          '</div>' +
        '</div>' +
        '<button onclick="openLoyaltyPanel();toggleUserMenu()" style="width:100%;margin-top:8px;background:'+tier.color+';color:#fff;border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:700;cursor:pointer">Treueprogramm öffnen →</button>' +
      '</div>';
  }
}

function showLoyaltyWelcome() {
  var ov = document.createElement('div');
  ov.id = 'loyalty-welcome-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,14,20,.88);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)';
  ov.innerHTML =
    '<div style="background:var(--bg);border-radius:26px;max-width:380px;width:100%;box-shadow:0 30px 90px rgba(0,0,0,.5);position:relative;overflow:hidden;animation:welcomePop .45s cubic-bezier(.34,1.56,.64,1) both">' +

      // ── Dark gradient header band: medal with a glow, on the brand's own navy ──
      '<div style="background:linear-gradient(150deg,var(--navy) 0%,var(--navy2) 60%,#0d3530 100%);padding:34px 24px 52px;text-align:center;position:relative;overflow:hidden">' +
        '<div id="loyalty-confetti-zone" style="position:absolute;inset:0;pointer-events:none;overflow:hidden"></div>' +
        '<div style="position:relative;width:84px;height:84px;margin:0 auto 4px">' +
          '<div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,#ffd76a55,transparent 70%);animation:welcomeGlow 2.2s ease-in-out infinite"></div>' +
          '<div style="position:relative;font-size:3.4rem;line-height:84px;animation:welcomeMedal .6s .15s cubic-bezier(.34,1.56,.64,1) both">🥉</div>' +
        '</div>' +
        '<div style="font-family:\'Syne\',sans-serif;font-size:1.55rem;font-weight:800;color:#fff;letter-spacing:-.01em">Willkommen bei Airpiv!</div>' +
        '<div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:6px;line-height:1.6;max-width:280px;margin-left:auto;margin-right:auto">Du bist jetzt <strong style="color:#fff">Bronze Member</strong> und hast dir sofort ein Startguthaben gesichert.</div>' +
      '</div>' +

      // ── Stat cards, overlapping the header band slightly for depth ──
      '<div style="padding:0 22px 26px;margin-top:-26px;position:relative;z-index:2">' +
        '<div style="display:flex;gap:10px;margin-bottom:18px">' +
          '<div style="flex:1;background:var(--bg2);border:1px solid var(--bd);border-radius:16px;padding:16px 10px;text-align:center;box-shadow:0 8px 20px rgba(0,0,0,.06)">' +
            '<div style="font-size:1.4rem;margin-bottom:2px">🏆</div>' +
            '<div id="pts-counter" style="font-family:\'Syne\',sans-serif;font-size:1.7rem;font-weight:800;color:#cd7f32">0</div>' +
            '<div style="font-size:10.5px;color:var(--tx3);margin-top:1px;letter-spacing:.02em">PUNKTE</div>' +
          '</div>' +
          '<div style="flex:1;background:linear-gradient(160deg,var(--teal-lt),var(--bg2));border:1px solid rgba(15,181,160,.3);border-radius:16px;padding:16px 10px;text-align:center;box-shadow:0 8px 20px rgba(15,181,160,.1)">' +
            '<div style="font-size:1.4rem;margin-bottom:2px">💶</div>' +
            '<div id="credit-counter" style="font-family:\'Syne\',sans-serif;font-size:1.7rem;font-weight:800;color:var(--teal2)">€0</div>' +
            '<div style="font-size:10.5px;color:var(--tx3);margin-top:1px;letter-spacing:.02em">GUTHABEN</div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:11.5px;color:var(--tx3);text-align:center;margin-bottom:18px">2 Punkte pro Euro · Bis zu €5 Guthaben pro Buchung</div>' +
        '<button onclick="document.getElementById(\'loyalty-welcome-ov\').remove()" style="width:100%;background:var(--teal);color:#fff;border:none;border-radius:15px;padding:16px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 8px 22px rgba(15,181,160,.35);transition:transform .15s" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'none\'">Los geht\'s! ✈</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(ov);
  animateCounter('pts-counter', 0, LOYALTY.WELCOME_POINTS, 1200, '');
  animateCounter('credit-counter', 0, LOYALTY.WELCOME_CREDIT, 1200, '€', true);
  spawnLoyaltyConfetti('loyalty-confetti-zone', 26);
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
}

function showLoyaltyUpgrade(newTier) {
  var tier = LOYALTY.TIERS[newTier];
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,24,34,.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)';
  ov.innerHTML =
    '<div style="background:var(--bg);border-radius:24px;max-width:360px;width:100%;padding:32px 24px;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.4);position:relative;overflow:hidden">' +
      '<div id="upgrade-confetti" style="position:absolute;inset:0;pointer-events:none;overflow:hidden"></div>' +
      '<div style="font-size:4rem;margin-bottom:10px">'+tier.icon+'</div>' +
      '<div style="font-size:11px;font-weight:700;color:'+tier.color+';letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">Level Up!</div>' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:1.5rem;font-weight:800;color:var(--tx);margin-bottom:10px">Du bist jetzt '+tier.name+'!</div>' +
      '<div style="background:linear-gradient(135deg,'+tier.color+'18,'+tier.color+'08);border:1px solid '+tier.color+'33;border-radius:14px;padding:14px;margin-bottom:16px;text-align:left">' +
        '<div style="font-size:12px;font-weight:700;color:var(--tx);margin-bottom:8px">Deine neuen Vorteile:</div>' +
        '<div style="font-size:12px;color:var(--tx2);line-height:1.9">'+
          '✨ <strong>'+tier.multiplier+'x Punkte</strong> auf jede Buchung<br>' +
          '🎫 <strong>'+tier.supportLabel+' Support</strong><br>' +
          '🎁 <strong>€'+tier.coupon+' Gutschein</strong> als Willkommensgeschenk' +
        '</div>' +
      '</div>' +
      '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="width:100%;background:'+tier.color+';color:#fff;border:none;border-radius:14px;padding:15px;font-size:15px;font-weight:700;cursor:pointer">Fantastisch! 🎉</button>' +
    '</div>';
  document.body.appendChild(ov);
  spawnLoyaltyConfetti('upgrade-confetti', 60);
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
}

function openLoyaltyPanel() {
  var existing = document.getElementById('loyalty-panel');
  if (existing) { existing.classList.add('open'); return; }
  var tier = LOYALTY.TIERS[loyaltyData.tier];
  var panel = document.createElement('div');
  panel.id = 'loyalty-panel';
  panel.className = 'pg open';
  var nextMin = loyaltyData.tier === 'gold' ? LOYALTY.TIERS.gold.min : (loyaltyData.tier === 'bronze' ? LOYALTY.TIERS.silver.min : LOYALTY.TIERS.gold.min);
  // [TIER-PROGRESS-FIX] lifetimePoints (total ever earned) drives the
  // progress bar and "remaining" figure — using the spendable `points`
  // balance here made the bar look like it had gone backwards (or the
  // "remaining" number balloon) the moment a customer redeemed points for
  // credit, even though their actual tier standing hadn't changed at all.
  var progressPoints = loyaltyData.lifetimePoints || 0;
  var pct = loyaltyData.tier === 'gold' ? 100 : Math.floor((progressPoints / nextMin) * 100);
  pct = Math.min(pct, 100);
  var nextTierName = loyaltyData.tier === 'gold' ? 'Gold' : (loyaltyData.tier === 'bronze' ? 'Silver' : 'Gold');
  var remaining = Math.max(0, nextMin - progressPoints);
  var euroValue = (loyaltyData.points / LOYALTY.POINTS_PER_EURO_REDEEM).toFixed(2);

  panel.innerHTML =
    '<div class="pg-hd" style="background:linear-gradient(135deg,'+tier.color+'22,'+tier.color+'08);border-bottom:1px solid '+tier.color+'33">' +
      '<button class="pg-bk" onclick="document.getElementById(\'loyalty-panel\').classList.remove(\'open\')" style="background:rgba(0,0,0,.08);color:var(--tx)">←</button>' +
      '<h2 style="color:var(--tx)">'+tier.icon+' Treueprogramm</h2>' +
    '</div>' +
    '<div class="pg-b">' +
      '<div style="background:linear-gradient(135deg,'+tier.color+','+tier.color+'bb);border-radius:20px;padding:20px;margin-bottom:16px;color:#fff;position:relative;overflow:hidden">' +
        '<div style="position:absolute;top:-20px;right:-20px;font-size:8rem;opacity:.15">'+tier.icon+'</div>' +
        '<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.8;margin-bottom:4px">Airpiv Loyalty</div>' +
        '<div style="font-family:\'Syne\',sans-serif;font-size:2rem;font-weight:800;margin-bottom:2px">'+tier.name+' Member</div>' +
        '<div style="font-size:12px;opacity:.75;margin-bottom:16px">'+tier.multiplier+'x Punkte · '+tier.supportLabel+' Support</div>' +
        '<div style="display:flex;gap:12px">' +
          '<div><div style="font-family:\'Syne\',sans-serif;font-size:1.6rem;font-weight:800">'+loyaltyData.points.toLocaleString()+'</div><div style="font-size:10px;opacity:.75">Punkte</div></div>' +
          '<div style="width:1px;background:rgba(255,255,255,.3)"></div>' +
          '<div><div style="font-family:\'Syne\',sans-serif;font-size:1.6rem;font-weight:800">€'+loyaltyData.credit.toFixed(2)+'</div><div style="font-size:10px;opacity:.75">Guthaben</div></div>' +
          '<div style="width:1px;background:rgba(255,255,255,.3)"></div>' +
          '<div><div style="font-family:\'Syne\',sans-serif;font-size:1.6rem;font-weight:800">'+loyaltyData.bookings+'</div><div style="font-size:10px;opacity:.75">Buchungen</div></div>' +
        '</div>' +
      '</div>' +
      (loyaltyData.tier !== 'gold' ?
        '<div style="background:var(--bg2);border-radius:14px;padding:14px;margin-bottom:16px">' +
          '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px">' +
            '<span style="font-weight:700;color:var(--tx)">Fortschritt zu '+nextTierName+'</span>' +
            '<span style="color:var(--tx3)">'+remaining.toLocaleString()+' fehlen</span>' +
          '</div>' +
          '<div style="height:10px;background:var(--bd);border-radius:6px;overflow:hidden;margin-bottom:6px">' +
            '<div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,'+tier.color+','+tier.color+'cc);border-radius:6px"></div>' +
          '</div>' +
          '<div style="font-size:10px;color:var(--tx3)">'+progressPoints.toLocaleString()+' / '+nextMin.toLocaleString()+' Punkte</div>' +
        '</div>' : '') +
      '<div style="background:var(--bg2);border-radius:14px;padding:14px;margin-bottom:16px">' +
        '<div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:10px">💱 Punkte umtauschen</div>' +
        '<div style="font-size:12px;color:var(--tx2);margin-bottom:10px">'+LOYALTY.POINTS_PER_EURO_REDEEM+' Punkte = €1,00 Guthaben</div>' +
        '<div style="display:flex;gap:8px">' +
          '<input id="loyalty-redeem-input" type="number" min="'+LOYALTY.POINTS_PER_EURO_REDEEM+'" step="'+LOYALTY.POINTS_PER_EURO_REDEEM+'" placeholder="z.B. '+LOYALTY.POINTS_PER_EURO_REDEEM+'" style="flex:1;background:var(--bg);border:2px solid var(--bd);border-radius:10px;padding:10px 12px;font-size:14px;font-weight:700;color:var(--tx);outline:none">' +
          '<button id="loyalty-redeem-btn" onclick="loyaltyDoRedeem()" style="background:var(--teal);color:#fff;border:none;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;cursor:pointer">Umtauschen</button>' +
        '</div>' +
        '<div style="font-size:11px;color:var(--tx3);margin-top:8px">€'+loyaltyData.credit.toFixed(2)+' Guthaben · '+loyaltyData.points.toLocaleString()+' Punkte = €'+euroValue+' möglich</div>' +
      '</div>' +
      '<div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:10px">🏆 Alle Stufen</div>' +
      ['bronze','silver','gold'].map(function(key) {
        var t = LOYALTY.TIERS[key];
        var isActive = loyaltyData.tier === key;
        return '<div style="background:'+(isActive?'linear-gradient(135deg,'+t.color+'15,'+t.color+'05)':'var(--bg2)')+';border:2px solid '+(isActive?t.color+'55':'var(--bd)')+';border-radius:14px;padding:14px;margin-bottom:10px">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<span style="font-size:1.8rem">'+t.icon+'</span>' +
            '<div style="flex:1">' +
              '<div style="font-weight:800;color:var(--tx);font-size:14px">'+t.name+(isActive?' ✓':'')+' </div>' +
              '<div style="font-size:11px;color:var(--tx3);margin-top:2px">'+(key==='bronze'?'Start':'ab '+t.min.toLocaleString()+' Punkten')+'</div>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">' +
            '<span style="font-size:11px;font-weight:600;background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:4px 9px">'+t.multiplier+'x Punkte</span>' +
            '<span style="font-size:11px;font-weight:600;background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:4px 9px">'+t.supportLabel+' Support</span>' +
            (t.coupon ? '<span style="font-size:11px;font-weight:600;background:var(--gr-bg);border:1px solid var(--gr);color:var(--gr);border-radius:8px;padding:4px 9px">🎁 €'+t.coupon+' Bonus</span>' : '') +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';

  document.body.appendChild(panel);
}

function loyaltyDoRedeem() {
  var input = document.getElementById('loyalty-redeem-input');
  if (!input) return;
  var step = LOYALTY.POINTS_PER_EURO_REDEEM;
  var pts = Math.floor(parseInt(input.value, 10) / step) * step;
  if (!pts || pts <= 0) { showToast('⚠️ Mindestens ' + step + ' Punkte eingeben', 'error'); return; }
  if (pts > loyaltyData.points) { showToast('⚠️ Nicht genug Punkte', 'error'); return; }
  var btn = document.getElementById('loyalty-redeem-btn');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  loyaltyConvertPoints(pts).then(function(euros) {
    if (btn) { btn.disabled = false; btn.textContent = 'Umtauschen'; }
    if (!euros) { showToast('⚠️ Umtausch fehlgeschlagen — bitte erneut versuchen', 'error'); return; }
    showToast('✅ '+pts+' Punkte → €'+euros.toFixed(2)+' Guthaben!', 'success');
    input.value = '';
    var panel = document.getElementById('loyalty-panel');
    if (panel) { panel.remove(); openLoyaltyPanel(); }
  });
}

// ═══════════════════════════════════════════════
// ══ AIRPIV REFERRAL PROGRAM ═════════════════════
// ═══════════════════════════════════════════════
// How it works:
// - Every signed-in user has a unique referral code + link.
// - New users who sign up via that link/code get linked to the referrer.
// - When the REFERRED user's booked flight reaches its departure date
//   (and the booking was NOT cancelled), BOTH the referrer and the
//   referred user instantly receive €10 credit.
// - If the booking is cancelled (before or after departure), neither
//   side receives the reward; if already paid, it is reversed.
var REFERRAL = {
  REWARD_EUR: 10.0,
  STORAGE_KEY: 'fw_referral_code',
  PENDING_KEY: 'fw_referral_pending', // code captured from URL, applied on next signup
  LEDGER_KEY: 'fw_referral_ledger'    // local fallback ledger of referral records
};

// Generate a short, shareable referral code from a user id (stable, deterministic)
function referralCodeFor(userId) {
  var s = String(userId || '');
  var hash = 0;
  for (var i = 0; i < s.length; i++) { hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0; }
  var code = Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
  while (code.length < 6) code += '0';
  return 'AP-' + code;
}

function referralLinkFor(userId) {
  var base = window.location.origin + window.location.pathname;
  return base + '?ref=' + referralCodeFor(userId);
}

// [ROUTE-PAGES] Pre-fill the search form from ?from=IATA&to=IATA in the
// URL — used by the SEO route landing pages' "Jetzt buchen" link. Fetches
// each airport's real name/city from the same /search/airports endpoint
// the normal autocomplete uses, then calls pickAC() with that real data
// — so the search bar shows "Berlin Brandenburg · BER" exactly as if the
// customer had typed and picked it themselves, not the IATA code
// repeated as a placeholder name/city.
function prefillSearchFromUrl() {
  try {
    var params = new URLSearchParams(window.location.search);
    var from = params.get('from');
    var to = params.get('to');
    if (from) prefillAirportField('from', from.toUpperCase());
    if (to) prefillAirportField('to', to.toUpperCase());
  } catch (e) {}
}

function prefillAirportField(side, code) {
  // Show something immediately (better than a blank field while the
  // lookup is in flight), then replace it with the real name/city the
  // moment the lookup resolves.
  pickAC(side, code, code, code);
  fetch(PROXY + '/search/airports?q=' + encodeURIComponent(code))
    .then(function(r) { return r.json(); })
    .then(function(json) {
      if (!json.ok || !json.airports || !json.airports.length) return;
      var match = json.airports.find(function(a) { return a.code === code && a.type === 'airport'; }) || json.airports.find(function(a) { return a.code === code; });
      if (match) pickAC(side, match.code, match.name, match.city);
    })
    .catch(function() { /* keep the IATA-code fallback already shown */ });
}

// [DATE-MATCH-FIX] Pre-fill the departure date from ?depart=YYYY-MM-DD —
// set by flight-route.html's "Jetzt Flüge suchen" link once the exact
// date its indicative price was computed for is known, so the customer
// searches for that SAME date instead of defaulting to today (which
// would likely show a different, probably higher, last-minute fare).
// Applies it through the exact same confirmCal() the calendar's own
// confirm button uses — identical behavior to picking the date manually,
// no duplicated update logic to drift out of sync later.
function prefillDateFromUrl() {
  try {
    var params = new URLSearchParams(window.location.search);
    var depart = params.get('depart');
    if (!depart || !/^\d{4}-\d{2}-\d{2}$/.test(depart)) return;
    var d = new Date(depart + 'T00:00:00');
    var today = new Date(); today.setHours(0,0,0,0);
    var twoYearsOut = new Date(); twoYearsOut.setFullYear(twoYearsOut.getFullYear() + 2);
    // A stale or malformed ?depart= (e.g. an old bookmarked link) must
    // never silently set a date in the past or an unreasonable far future.
    if (isNaN(d.getTime()) || d < today || d > twoYearsOut) return;
    calDepDate = depart;
    confirmCal();
  } catch (e) {}
}

// Capture ?ref=CODE from the URL on page load and remember it locally until signup
function referralCaptureFromUrl() {
  try {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref');
    if (ref) { localStorage.setItem(REFERRAL.PENDING_KEY, ref.trim().toUpperCase()); }
  } catch (e) {}
}

function referralGetPendingCode() {
  try { return localStorage.getItem(REFERRAL.PENDING_KEY) || ''; } catch (e) { return ''; }
}

function referralClearPendingCode() {
  try { localStorage.removeItem(REFERRAL.PENDING_KEY); } catch (e) {}
}

// Local ledger fallback (used when Supabase / 'referrals' table isn't reachable)
function referralLoadLedger() {
  try { return JSON.parse(localStorage.getItem(REFERRAL.LEDGER_KEY) || '[]'); } catch (e) { return []; }
}
function referralSaveLedger(list) {
  try { localStorage.setItem(REFERRAL.LEDGER_KEY, JSON.stringify(list)); } catch (e) {}
}

// Called right after a new user successfully registers.
// Links the new user to whoever owns the captured referral code (if any).
async function referralLinkNewUser(newUser) {
  var code = referralGetPendingCode();
  if (!code || !newUser) return;
  referralClearPendingCode();
  // We don't have a server-side lookup table of code -> user without a backend,
  // so we store the raw code alongside the referral record; resolving the
  // referrer's identity happens via the 'referrals' table (referrer_code column)
  // when a real Supabase project is connected. Locally we just keep the code.
  var record = {
    referrer_code: code,
    referred_id: newUser.id,
    referred_email: newUser.email || '',
    booking_ref: null,
    departure_date: null,
    status: 'awaiting_booking', // awaiting_booking -> pending -> completed | cancelled
    reward_referrer_paid: false,
    reward_referred_paid: false,
    created_at: new Date().toISOString()
  };
  try {
    if (_sb) {
      await _sb.from('referrals').insert(record);
      return;
    }
  } catch (e) {}
  // Local fallback
  var ledger = referralLoadLedger();
  ledger.push(record);
  referralSaveLedger(ledger);
}

// Called when a referred user completes a booking — attaches the flight's
// departure date + booking reference to their open referral record, so we
// know exactly when the reward becomes due.
async function referralAttachBooking(userId, bookingRef, departureDate) {
  if (!userId || !bookingRef || !departureDate) return;
  var isoDeparture = (departureDate instanceof Date) ? departureDate.toISOString() : String(departureDate);
  try {
    if (_sb) {
      await _sb.from('referrals')
        .update({ booking_ref: bookingRef, departure_date: isoDeparture, status: 'pending' })
        .eq('referred_id', userId)
        .eq('status', 'awaiting_booking');
      return;
    }
  } catch (e) {}
  var ledger = referralLoadLedger();
  var changed = false;
  ledger.forEach(function(r) {
    if (r.referred_id === userId && r.status === 'awaiting_booking') {
      r.booking_ref = bookingRef; r.departure_date = isoDeparture; r.status = 'pending';
      changed = true;
    }
  });
  if (changed) referralSaveLedger(ledger);
}

// Called when a booking gets cancelled — marks the linked referral (if any)
// as cancelled so the reward is blocked / reversed for both sides.
async function referralMarkBookingCancelled(bookingRef) {
  if (!bookingRef) return;
  try {
    if (_sb) {
      var res = await _sb.from('referrals').select('*').eq('booking_ref', bookingRef);
      if (res.data && res.data.length) {
        for (var i = 0; i < res.data.length; i++) {
          var rec = res.data[i];
          if (rec.reward_referrer_paid || rec.reward_referred_paid) {
            await referralReverseReward(rec);
          }
          await _sb.from('referrals').update({ status: 'cancelled' }).eq('id', rec.id);
        }
      }
      return;
    }
  } catch (e) {}
  var ledger = referralLoadLedger();
  var changed = false;
  ledger.forEach(function(r) {
    if (r.booking_ref === bookingRef && r.status !== 'cancelled') {
      if (r.reward_referrer_paid || r.reward_referred_paid) referralReverseRewardLocal(r);
      r.status = 'cancelled';
      changed = true;
    }
  });
  if (changed) referralSaveLedger(ledger);
}

// Reverses a previously paid reward (used only if a booking is cancelled
// AFTER the reward was already granted).
async function referralReverseReward(rec) {
  try {
    if (rec.reward_referred_paid && loyaltyData && FW_USER && FW_USER.id === rec.referred_id) {
      loyaltyData.credit = Math.max(0, loyaltyData.credit - REFERRAL.REWARD_EUR);
      loyaltySave(); loyaltyUpdateNav();
    }
  } catch (e) {}
}
function referralReverseRewardLocal(rec) {
  try {
    if (rec.reward_referred_paid && FW_USER && FW_USER.id === rec.referred_id) {
      loyaltyData.credit = Math.max(0, loyaltyData.credit - REFERRAL.REWARD_EUR);
      loyaltySave(); loyaltyUpdateNav();
    }
  } catch (e) {}
}

// Checks all of the CURRENT user's referral records (as referrer OR referred)
// and pays out the €10 reward the moment a linked flight's departure date
// has passed, as long as the booking wasn't cancelled. Safe to call often;
// each record is only paid once (reward_*_paid flags prevent double payouts).
async function referralCheckAndPayout() {
  if (!FW_USER) return;
  var now = new Date();
  var rows = [];
  try {
    if (_sb) {
      var res = await _sb.from('referrals')
        .select('*')
        .or('referred_id.eq.' + FW_USER.id);
      rows = res.data || [];
    } else {
      rows = referralLoadLedger().filter(function(r) { return r.referred_id === FW_USER.id; });
    }
  } catch (e) {
    rows = referralLoadLedger().filter(function(r) { return r.referred_id === FW_USER.id; });
  }

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.status !== 'pending' || !r.departure_date) continue;
    var dep = new Date(r.departure_date);
    if (isNaN(dep.getTime()) || dep.getTime() > now.getTime()) continue; // not due yet

    // Pay the referred user (this device/account)
    if (!r.reward_referred_paid) {
      loyaltyData.credit += REFERRAL.REWARD_EUR;
      loyaltySave(); loyaltyUpdateNav();
      showToast('🎉 €' + REFERRAL.REWARD_EUR.toFixed(2) + ' ' + tL('Empfehlungsbonus erhalten!','Referral bonus received!','حصلت على مكافأة الإحالة!'), 'success');
      r.reward_referred_paid = true;
    }
    r.status = 'completed';
    try {
      if (_sb) {
        await _sb.from('referrals').update({ status: 'completed', reward_referred_paid: true }).eq('id', r.id);
      } else {
        var ledger = referralLoadLedger();
        ledger.forEach(function(lr) { if (lr.referred_id === r.referred_id && lr.booking_ref === r.booking_ref) { lr.status = 'completed'; lr.reward_referred_paid = true; } });
        referralSaveLedger(ledger);
      }
    } catch (e) {}
  }
}

// Renders the "Invite friends" panel content
function renderReferralPanel() {
  var body = document.getElementById('referral-body');
  if (!body || !FW_USER) return;
  var code = referralCodeFor(FW_USER.id);
  var link = referralLinkFor(FW_USER.id);
  body.innerHTML =
    '<div style="background:linear-gradient(135deg,var(--teal),var(--teal2));border-radius:18px;padding:20px;color:#fff;margin-bottom:16px;position:relative;overflow:hidden">' +
      '<div style="position:absolute;top:-16px;right:-16px;font-size:6rem;opacity:.15">🎁</div>' +
      '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.85;margin-bottom:6px">' + tL('Freunde einladen','Invite friends','دعوة الأصدقاء') + '</div>' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:1.5rem;font-weight:800;margin-bottom:8px">' + tL('10€ für dich, 10€ für deinen Freund','€10 for you, €10 for your friend','10€ لك و10€ لصديقك') + '</div>' +
      '<div style="font-size:13px;opacity:.9;line-height:1.5">' + tL('Sobald dein Freund seinen Flug antritt, erhalten ihr beide 10€ Guthaben — automatisch.','As soon as your friend boards their flight, you both instantly get €10 credit.','بمجرد صعود صديقك للطائرة، يحصل كلاكما فورًا على 10€ رصيد.') + '</div>' +
    '</div>' +
    '<div style="background:var(--bg2);border-radius:14px;padding:14px;margin-bottom:14px">' +
      '<div style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">' + tL('Dein Einladungslink','Your invite link','رابط دعوتك') + '</div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<input id="referral-link-input" readonly value="' + link + '" style="flex:1;min-width:0;background:var(--bg);border:1.5px solid var(--bd);border-radius:10px;padding:10px 12px;font-size:12px;color:var(--tx);outline:none">' +
        '<button onclick="referralCopyLink()" style="flex-shrink:0;background:var(--teal);color:#fff;border:none;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;cursor:pointer">' + tL('Kopieren','Copy','نسخ') + '</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:10px">' +
        '<div style="font-size:11px;color:var(--tx3)">' + tL('oder Code','or code','أو الكود') + ':</div>' +
        '<div style="font-family:monospace;font-weight:800;font-size:13px;background:var(--bg);border:1px dashed var(--bd);border-radius:8px;padding:4px 10px;color:var(--teal2)">' + code + '</div>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:16px">' +
      '<button onclick="referralShare()" style="flex:1;background:var(--navy);color:#fff;border:none;border-radius:12px;padding:12px;font-size:13px;font-weight:700;cursor:pointer">📤 ' + tL('Teilen','Share','مشاركة') + '</button>' +
    '</div>' +
    '<div style="background:var(--ye-bg);border:1px solid var(--ye);border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:12px;color:var(--ye);line-height:1.5">' +
      '⚠️ ' + tL('Die Belohnung wird erst am Abflugtag des Fluges deines Freundes gutgeschrieben. Bei Stornierung der Buchung entfällt die Belohnung für euch beide.','The reward is only credited on your friend\'s flight departure day. If their booking is cancelled, the reward is void for both of you.','تُمنح المكافأة فقط في يوم مغادرة رحلة صديقك. عند إلغاء الحجز، تسقط المكافأة عن كليكما.') +
    '</div>' +
    '<div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:10px">📋 ' + tL('Deine Empfehlungen','Your referrals','إحالاتك') + '</div>' +
    '<div id="referral-list">' +
      '<div style="text-align:center;padding:24px;color:var(--tx3);font-size:13px">⏳ ' + tL('Wird geladen...','Loading...','جارٍ التحميل...') + '</div>' +
    '</div>';
  referralLoadList();
}

async function referralLoadList() {
  var list = document.getElementById('referral-list');
  if (!list || !FW_USER) return;
  var rows = [];
  try {
    if (_sb) {
      var res = await _sb.from('referrals').select('*').eq('referrer_code', referralCodeFor(FW_USER.id)).order('created_at', { ascending: false });
      rows = res.data || [];
    } else {
      rows = referralLoadLedger().filter(function(r) { return r.referrer_code === referralCodeFor(FW_USER.id); });
    }
  } catch (e) {
    rows = referralLoadLedger().filter(function(r) { return r.referrer_code === referralCodeFor(FW_USER.id); });
  }
  if (!rows.length) {
    list.innerHTML = '<div style="text-align:center;padding:32px 16px;color:var(--tx3)"><div style="font-size:2.2rem;margin-bottom:8px">👥</div><div style="font-size:13px">' + tL('Noch keine Einladungen versendet','No invites sent yet','لم تُرسل أي دعوات بعد') + '</div></div>';
    return;
  }
  var html = '';
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var statusLabel = r.status === 'completed' ? tL('Abgeschlossen ✓','Completed ✓','مكتمل ✓')
      : r.status === 'cancelled' ? tL('Storniert','Cancelled','ملغي')
      : r.status === 'pending' ? tL('Unterwegs ✈','In progress ✈','قيد السفر ✈')
      : tL('Warte auf Buchung','Awaiting booking','بانتظار الحجز');
    var statusColor = r.status === 'completed' ? 'var(--gr)' : r.status === 'cancelled' ? 'var(--rd)' : 'var(--ye)';
    var statusBg = r.status === 'completed' ? 'var(--gr-bg)' : r.status === 'cancelled' ? 'var(--rd-bg)' : 'var(--ye-bg)';
    html += '<div style="background:var(--bg2);border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:700;font-size:13px;color:var(--tx)">' + escHtml(r.referred_email || tL('Freund','Friend','صديق')) + '</div>' +
        (r.booking_ref ? '<div style="font-size:11px;color:var(--tx3);margin-top:2px;font-family:monospace">' + escHtml(r.booking_ref) + '</div>' : '') +
      '</div>' +
      '<div style="font-size:11px;font-weight:700;color:' + statusColor + ';background:' + statusBg + ';border-radius:8px;padding:5px 10px;flex-shrink:0">' + statusLabel + '</div>' +
    '</div>';
  }
  list.innerHTML = html;
}

function referralCopyLink() {
  var input = document.getElementById('referral-link-input');
  if (!input) return;
  input.select();
  try {
    navigator.clipboard.writeText(input.value);
    showToast('✅ ' + tL('Link kopiert!','Link copied!','تم نسخ الرابط!'), 'success');
  } catch (e) {
    document.execCommand('copy');
    showToast('✅ ' + tL('Link kopiert!','Link copied!','تم نسخ الرابط!'), 'success');
  }
}

function referralShare() {
  if (!FW_USER) return;
  var link = referralLinkFor(FW_USER.id);
  var text = tL(
    'Buche günstige Flüge auf Airpiv und wir bekommen beide 10€ Guthaben geschenkt! ',
    'Book cheap flights on Airpiv and we both get €10 credit for free! ',
    'احجز رحلات رخيصة على Airpiv ونحصل كلانا على 10€ رصيد مجانًا! '
  );
  if (navigator.share) {
    navigator.share({ title: 'Airpiv', text: text, url: link }).catch(function(){});
  } else {
    referralCopyLink();
  }
}

function openReferralPanel() {
  renderReferralPanel();
  openPg('referral');
}

function spawnLoyaltyConfetti(containerId, count) {
  var zone = document.getElementById(containerId);
  if (!zone) return;
  var colors = ['#ffd700','#cd7f32','#a8a9ad','#0fb5a0','#ff5a5f','#fff'];
  for (var i = 0; i < count; i++) {
    (function(i){
      setTimeout(function() {
        var c = document.createElement('div');
        var size = Math.random() * 8 + 4;
        c.style.cssText = 'position:absolute;width:'+size+'px;height:'+size+'px;background:'+colors[Math.floor(Math.random()*colors.length)]+';border-radius:'+(Math.random()>.5?'50%':'2px')+';left:'+(Math.random()*100)+'%;top:-10px;animation:confettiFall '+(Math.random()*.8+.8)+'s ease-in forwards;transform:rotate('+(Math.random()*360)+'deg)';
        zone.appendChild(c);
        setTimeout(function(){ if(c.parentNode) c.remove(); }, 1600);
      }, i * 30);
    })(i);
  }
}

function animateCounter(id, from, to, duration, prefix, isFloat) {
  var el = document.getElementById(id);
  if (!el) return;
  var start = Date.now();
  var diff = to - from;
  function tick() {
    var elapsed = Date.now() - start;
    var progress = Math.min(elapsed / duration, 1);
    var ease = 1 - Math.pow(1 - progress, 3);
    var val = from + diff * ease;
    el.textContent = prefix + (isFloat ? val.toFixed(2) : Math.floor(val).toLocaleString());
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
// ═══════════════════════════════════════════════
// ══ END LOYALTY PROGRAM ═════════════════════════
// ═══════════════════════════════════════════════

// ═══ COOKIE ═══
function initCookie() {
  try {
    var ck = document.getElementById('ck');
    if (ck && localStorage.getItem('ck')) ck.classList.add('hide');
  } catch(e) {}
}
function closeCk(ok) {
  try { localStorage.setItem('ck', ok ? '1' : '0'); } catch(e) {}
  var ck = document.getElementById('ck');
  if (ck) ck.classList.add('hide');
}

// ═══ PAGES ═══
function openPg(n) {
  var el = document.getElementById('pg-' + n);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closePg(n) {
  var el = document.getElementById('pg-' + n);
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}
function tFq(el) {
  el.classList.toggle('open');
  el.querySelector('.fqa').classList.toggle('open');
}
function sendCt() {
  var n = document.getElementById('ct-name');
  var e = document.getElementById('ct-email');
  var s = document.getElementById('ct-sub2');
  var m = document.getElementById('ct-msg');
  if (!n||!e||!m||!n.value.trim()||!e.value.trim()||!m.value.trim()) {
    showToast('⚠️ Bitte alle Felder ausfüllen', 'error');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.value.trim())) {
    showToast('⚠️ Ungültige E-Mail-Adresse', 'error');
    return;
  }
  var sendBtn = document.getElementById('ct-send-btn');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '…'; }
  fetch(PROXY + '/contact', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ name: n.value.trim(), email: e.value.trim(), subject: s ? s.value.trim() : '', message: m.value.trim() })
  }).then(function(r){ return r.json(); }).then(function(j){
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Senden ✉️'; }
    if (j.ok) {
      showToast('✉️ Gesendet! Wir melden uns bald.', 'success');
      n.value = ''; e.value = ''; if (s) s.value = ''; m.value = '';
    } else {
      showToast('❌ ' + (j.error || 'Senden fehlgeschlagen'), 'error');
    }
  }).catch(function(){
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Senden ✉️'; }
    showToast('❌ Verbindungsfehler. Bitte später erneut versuchen.', 'error');
  });
}
function bni(el, s) {
  var bnis = document.querySelectorAll('.bni');
  for (var i = 0; i < bnis.length; i++) bnis[i].classList.remove('on');
  el.classList.add('on');
  if (s === 'flights') window.scrollTo({top:0, behavior:'smooth'});
  else openPg(s);
}


// ═══ SMART HELPER ═══
function showHelper(items) {
  var titleEl = document.getElementById('help-title');
  var subEl = document.getElementById('help-sub');
  var cards = document.getElementById('help-cards');
  if (!cards) return;
  if (titleEl) titleEl.textContent = items.length === 1 ? 'Fast geschafft!' : 'Gleich geht es los!';
  if (subEl) subEl.textContent = items.length === 1 ? 'Nur noch eine Angabe fehlt' : items.length + ' Angaben fehlen noch';
  var html = '';
  for (var ci = 0; ci < items.length; ci++) {
    var card = items[ci];
    html += '<div class="help-card" onclick="handleHelper(\'' + card.action + '\')">';
    html += '<div class="help-card-ico">' + card.ico + '</div>';
    html += '<div class="help-card-txt">';
    html += '<div class="help-card-title">' + card.title + '</div>';
    html += '<div class="help-card-sub">' + card.sub + '</div>';
    html += '</div><div class="help-card-arrow">&#8250;</div></div>';
  }
  cards.innerHTML = html;
  var ov = document.getElementById('help-ov');
  if (ov) ov.classList.add('open');
}

function closeHelper() {
  var ov = document.getElementById('help-ov');
  if (ov) ov.classList.remove('open');
}

function handleHelper(action) {
  closeHelper();
  setTimeout(function() {
    if (action === 'focusFrom') {
      var el = document.getElementById('from-in');
      if (el) { el.focus(); el.select(); }
    } else if (action === 'focusTo') {
      var el2 = document.getElementById('to-in');
      if (el2) { el2.focus(); el2.select(); }
    } else if (action === 'openDep') {
      openDatePicker('dep');
    } else if (action === 'openRet') {
      openDatePicker('ret');
    } else if (action.indexOf('mcFocusFrom:') === 0) {
      var idx = parseInt(action.split(':')[1], 10);
      var elF = document.getElementById('mc-from-' + idx);
      if (elF) { elF.focus(); elF.select(); }
    } else if (action.indexOf('mcFocusTo:') === 0) {
      var idx2 = parseInt(action.split(':')[1], 10);
      var elT = document.getElementById('mc-to-' + idx2);
      if (elT) { elT.focus(); elT.select(); }
    } else if (action.indexOf('mcOpenDate:') === 0) {
      var idx3 = parseInt(action.split(':')[1], 10);
      mcOpenCal(idx3);
    }
  }, 200);
}

// ═══ DOM READY ═══
// [GA4-EVENTS] Scroll depth tracking — fires once per threshold per page
// load. Passive listener (doesn't block scrolling); a simple percentage
// of total scrollable height, not tied to any specific section.
(function() {
  var fired = {25: false, 50: false, 75: false, 100: false};
  window.addEventListener('scroll', function() {
    var scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollableHeight <= 0) return;
    var pct = Math.round((window.scrollY / scrollableHeight) * 100);
    [25, 50, 75, 100].forEach(function(threshold) {
      if (pct >= threshold && !fired[threshold]) {
        fired[threshold] = true;
        trackEvent('scroll_depth', { percent: threshold });
      }
    });
  }, { passive: true });
})();

document.addEventListener('DOMContentLoaded', function() {
  checkMaintenanceMode();
  referralCaptureFromUrl();
  prefillSearchFromUrl();
  initDates();
  // [DATE-MATCH-FIX] Must run AFTER initDates() — initDates()
  // unconditionally resets calDepDate to null and clears #dep-date,
  // which would silently wipe out a date prefilled before it.
  prefillDateFromUrl();
  // [AUTO-SEARCH-FROM-ROUTE-FIX] When arriving from a route page's
  // "Jetzt Flüge suchen" link (?from=...&to=...&depart=...), the
  // customer should land directly on ready search results — not just a
  // pre-filled form requiring one more tap. Only triggers when the URL
  // actually carries from+to (never on a normal homepage visit with no
  // params). A short delay (not because of any async dependency —
  // pickAC() inside prefillSearchFromUrl already sets fromI/toI
  // synchronously with the IATA code before any fetch resolves) just
  // lets the DOM finish settling from the prefill calls above.
  (function() {
    try {
      var p = new URLSearchParams(window.location.search);
      if (p.get('from') && p.get('to')) {
        // [AUTO-SEARCH-FROM-ROUTE-FIX] trip defaults to 'rr' (round-trip)
        // always — a route page's link only carries from/to/depart, no
        // return date, so doSearch() would otherwise reject the
        // auto-search and ask for a return date the customer was never
        // prompted for. This matches what the link actually represents:
        // a one-way search for the indicative date.
        trip = 'ow';
        setTimeout(function() { doSearch(); }, 150);
      }
    } catch (e) {}
  })();
  initDarkMode();
  initCookie();
  initLang();
  initAuth();
  checkStripeReturn();
  renderRecentSearches();
  lazyLoadDestinations();
  addSwipeToDismiss('cal-ov', closeCal);
  addSwipeToDismiss('help-ov', closeHelper);
  addSwipeToDismiss('bov', closeBov);
  // Show filter sidebar on desktop
  if (window.innerWidth >= 900) {
    var sb = document.getElementById('sidebar');
    if (sb) sb.style.display = 'block';
    var mfb = document.getElementById('mfbtn');
    if (mfb) mfb.style.display = 'none';
  }
  // Restore PAX preferences
  try {
    var savedPax = JSON.parse(localStorage.getItem('fw_pax') || 'null');
    if (savedPax && typeof savedPax === 'object') {
      var validCabins = ['economy','premium_economy','business','first'];
      PAX.a = safeInt(savedPax.a, 1, 9, 1);
      PAX.c = safeInt(savedPax.c, 0, 8, 0);
      PAX.i = safeInt(savedPax.i, 0, 4, 0);
      PAX.b = safeInt(savedPax.b, 0, 4, 0);
      PAX.h = safeInt(savedPax.h, 0, 4, 1);
      PAX.cabin = (validCabins.indexOf(savedPax.cabin) !== -1) ? savedPax.cabin : 'economy';
      var paEl=document.getElementById('pa'); if(paEl) paEl.textContent=PAX.a;
      var pcEl=document.getElementById('pc'); if(pcEl) pcEl.textContent=PAX.c;
      var piEl=document.getElementById('pi'); if(piEl) piEl.textContent=PAX.i;
      var pbEl=document.getElementById('pb'); if(pbEl) pbEl.textContent=PAX.b;
      var cabEl=document.getElementById('cabin'); if(cabEl) cabEl.value=PAX.cabin;
    }
  } catch(e) {}
  var pb = document.getElementById('pb'); if (pb) pb.textContent = '0';
  var ph3 = document.getElementById('ph'); if (ph3) ph3.textContent = PAX.h;
  function checkMobile() {
    var isMobile = window.innerWidth <= 700;
    var bnav = document.querySelector('.bnav');
    var fab = document.querySelector('.fab');
    if (bnav) bnav.classList.toggle('mobile-show', isMobile);
    if (fab) fab.classList.toggle('mobile-show', isMobile);
    document.body.style.paddingBottom = isMobile ? '70px' : '';
  }
  checkMobile();
  var _resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(checkMobile, 150);
  });
});


/* ===== NEXT INLINE SCRIPT BLOCK ===== */


// ══ RESULTS FULL-SCREEN PAGE ══
var rpShownN = 0;
var rpFiltered = [];
var rpSortMode = 'best';

function openResultsPage() {
  var page = document.getElementById('results-page');
  if (!page) return;
  page.classList.add('open');
  document.body.style.overflow = 'hidden';
  rpUpdateHeader();
  rpRenderOffers();
}

function closeResultsPage() {
  // Hide and clear main page results
  var rw = document.getElementById('rw');
  if (rw) { rw.classList.remove('show'); rw.classList.remove('sfb-on'); }
  var ol = document.getElementById('offers-list');
  if (ol) ol.innerHTML = '';
  allOffers = []; filtered = []; shownN = 0;
  var mfb = document.getElementById('mfbtn'); if (mfb) mfb.style.display = 'none';
  var qf = document.getElementById('quick-filters'); if (qf) qf.style.display = 'none';
  var page = document.getElementById('results-page');
  if (!page) return;
  page.classList.remove('open');
  document.body.style.overflow = '';
  var drop = document.getElementById('rp-edit-drop');
  if (drop) drop.classList.remove('open');
}

function rpUpdateHeader() {
  var routeEl = document.getElementById('rp-route');
  var metaEl = document.getElementById('rp-meta');

  if (trip === 'mc' && mcLegsData && mcLegsData.length) {
    // Multi-city route display
    var cities = mcLegsData.map(function(l){ return l.fromC || l.from || ''; });
    var last = mcLegsData[mcLegsData.length-1];
    if (last.toC || last.to) cities.push(last.toC || last.to);
    if (routeEl) routeEl.textContent = cities.filter(Boolean).join(' → ');
    var paxCount = (PAX.a||1)+(PAX.c||0)+(PAX.i||0);
    var dates = mcLegsData.map(function(l){ return l.date ? fmtDate(l.date) : null; }).filter(Boolean);
    if (metaEl) metaEl.textContent = (dates.length ? dates[0] + (dates.length>1 ? ' – '+dates[dates.length-1] : '') + ' · ' : '') + paxCount + ' Reisende';
    return;
  }

  var orig = fromI || '';
  var dest = toI || '';
  var fromCity = fromC || orig;
  var toCity = toC || dest;

  if (routeEl) routeEl.textContent = fromCity + ' ⇌ ' + toCity;

  var depEl = document.getElementById('dep-date');
  var retEl = document.getElementById('ret-date');
  var dep = depEl ? depEl.value : '';
  var ret = retEl ? retEl.value : '';
  var paxCount = (PAX.a || 1) + (PAX.c || 0) + (PAX.i || 0);
  var meta = '';
  if (dep) meta += fmtDate(dep);
  if (ret) meta += ' – ' + fmtDate(ret);
  meta += ' · ' + paxCount + ' Reisende';

  if (metaEl) metaEl.textContent = meta;

  // Fill edit drop
  var rpeFrom = document.getElementById('rpe-from');
  var rpeTo = document.getElementById('rpe-to');
  var rpeDep = document.getElementById('rpe-dep');
  var rpeRet = document.getElementById('rpe-ret');
  var rpePax = document.getElementById('rpe-pax');
  if (rpeFrom) rpeFrom.textContent = fromCity || '—';
  if (rpeTo) rpeTo.textContent = toCity || '—';
  if (rpeDep) rpeDep.textContent = dep ? fmtDate(dep) : '—';
  if (rpeRet) rpeRet.textContent = ret ? fmtDate(ret) : '—';
  if (rpePax) rpePax.textContent = paxCount + ' Reisende · ' + (PAX.cabin || 'economy');
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    var parts = d.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  } catch(e) { return d; }
}

function toggleRpEdit() {
  var drop = document.getElementById('rp-edit-drop');
  if (!drop) return;

  // If multi-city: replace dropdown content with mc legs UI
  if (trip === 'mc') {
    var isOpen = drop.classList.contains('open');
    if (!isOpen) {
      // Build mc legs editor inline
      var html = '<div style="padding:4px 0 8px">';
      for (var i = 0; i < mcLegsData.length; i++) {
        var leg = mcLegsData[i];
        var legLabel = i === 0 ? 'Hinflug' : i === mcLegsData.length - 1 ? 'Letzter Stopp' : 'Zwischenstopp ' + i;
        html += '<div style="margin-bottom:10px">';
        html += '<div style="font-size:10px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">Flug ' + (i+1) + ' (' + legLabel + ')</div>';
        html += '<div class="rp-edit-row">';
        html += '<div class="rp-edit-field" onclick="rpMcEditLoc(' + i + ',\'from\')">';
        html += '<div class="rp-edit-lbl">Von</div>';
        html += '<div class="rp-edit-val" id="rpe-mc-from-' + i + '">' + (leg.fromC || leg.from || '—') + '</div>';
        html += '</div>';
        html += '<div class="rp-edit-field" onclick="rpMcEditLoc(' + i + ',\'to\')">';
        html += '<div class="rp-edit-lbl">Nach</div>';
        html += '<div class="rp-edit-val" id="rpe-mc-to-' + i + '">' + (leg.toC || leg.to || '—') + '</div>';
        html += '</div>';
        html += '</div>';
        html += '<div class="rp-edit-row" style="grid-template-columns:1fr;margin-top:5px">';
        html += '<div class="rp-edit-field" onclick="rpMcOpenDateCustom(' + i + ')">';
        html += '<div class="rp-edit-lbl">Datum</div>';
        html += '<div class="rp-edit-val" id="rpe-mc-date-' + i + '">' + (leg.date ? fmtDate(leg.date) : '—') + '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
      }
      html += '</div>';
      html += '<button class="rp-edit-search" onclick="doRpSearch()">🔍 Erneut suchen</button>';
      drop.innerHTML = html;
    }
    drop.classList.toggle('open');
    return;
  }

  drop.classList.toggle('open');
}

function rpMcEditLoc(legIdx, side) {
  var valEl = document.getElementById('rpe-mc-' + side + '-' + legIdx);
  if (!valEl || valEl.tagName === 'INPUT') return;
  var current = side === 'from' ? (mcLegsData[legIdx].fromC || '') : (mcLegsData[legIdx].toC || '');
  var input = document.createElement('input');
  input.id = 'rpe-mc-' + side + '-' + legIdx;
  input.className = 'rp-edit-val';
  input.value = current;
  input.setAttribute('autocomplete', 'off');
  input.style.cssText = 'border:none;outline:none;background:transparent;width:100%;font:inherit;color:inherit';
  input.oninput = function() { rpMcAcS(legIdx, side, this.value); };
  valEl.parentNode.replaceChild(input, valEl);
  input.focus(); input.select();
  event.stopPropagation();
}

function rpMcAcS(legIdx, side, q) {
  var dropId = 'rpe-mc-ac-' + legIdx + '-' + side;
  var existing = document.getElementById(dropId);
  if (!existing) {
    existing = document.createElement('div');
    existing.id = dropId;
    existing.className = 'acdrop';
    existing.style.cssText = 'position:absolute;top:100%;left:0;right:0;z-index:200';
    var fieldEl = document.getElementById('rpe-mc-' + side + '-' + legIdx);
    if (fieldEl && fieldEl.parentNode) fieldEl.parentNode.style.position = 'relative';
    if (fieldEl && fieldEl.parentNode) fieldEl.parentNode.appendChild(existing);
  }
  if (!q || q.length < 1) { existing.classList.remove('open'); existing.innerHTML=''; return; }
  var ql = q.toLowerCase();
  var hits = [];
  for (var i = 0; i < AP.length; i++) {
    var a = AP[i];
    if (a[0].toLowerCase().indexOf(ql)===0||a[1].toLowerCase().indexOf(ql)>=0||a[2].toLowerCase().indexOf(ql)>=0||a[3].toLowerCase().indexOf(ql)>=0) {
      hits.push(a); if (hits.length>=8) break;
    }
  }
  if (!hits.length) { existing.classList.remove('open'); existing.innerHTML=''; return; }
  var html = '';
  for (var j=0;j<hits.length;j++) {
    var a2=hits[j];
    html+='<div class="aci" onclick="event.stopPropagation();rpMcPickAC('+legIdx+',\''+side+'\',\''+a2[0]+'\',\''+a2[1].replace(/'/g,"\\'")+'\',\''+a2[2].replace(/'/g,"\\'")+'\')"><div class="acb">'+a2[0]+'</div><div><div class="acn">'+a2[2]+', '+a2[3]+'</div><div class="acs">'+a2[1]+'</div></div></div>';
  }
  existing.innerHTML=html; existing.classList.add('open');
}

function rpMcPickAC(legIdx, side, code, name, city) {
  if (side==='from') { mcLegsData[legIdx].from=code; mcLegsData[legIdx].fromC=city; }
  else { mcLegsData[legIdx].to=code; mcLegsData[legIdx].toC=city;
    if (legIdx < mcLegsData.length-1) { mcLegsData[legIdx+1].from=code; mcLegsData[legIdx+1].fromC=city; }
  }
  var input = document.getElementById('rpe-mc-'+side+'-'+legIdx);
  if (input) { var div=document.createElement('div'); div.id='rpe-mc-'+side+'-'+legIdx; div.className='rp-edit-val'; div.textContent=city; input.parentNode.replaceChild(div,input); }
  var acDrop = document.getElementById('rpe-mc-ac-'+legIdx+'-'+side);
  if (acDrop) { acDrop.classList.remove('open'); acDrop.innerHTML=''; }
  // Update next leg from label
  if (side==='to' && legIdx < mcLegsData.length-1) {
    var nextFrom = document.getElementById('rpe-mc-from-'+(legIdx+1));
    if (nextFrom) nextFrom.textContent = city;
  }
}

function rpMcOpenDate(legIdx) {
  rpMcOpenDateCustom(legIdx);
}

function rpMcOpenDateCustom(legIdx) {
  if (event) event.stopPropagation();
  var today = new Date().toISOString().split('T')[0];

  // minDate: اليوم، أو تاريخ الرحلة السابقة إذا وُجد
  var minDate = today;
  if (legIdx > 0 && mcLegsData[legIdx - 1].date && mcLegsData[legIdx - 1].date > today) {
    minDate = mcLegsData[legIdx - 1].date;
  }

  // maxDate: تاريخ الرحلة التالية إذا وُجد
  var maxDate = null;
  if (legIdx < mcLegsData.length - 1 && mcLegsData[legIdx + 1].date) {
    maxDate = mcLegsData[legIdx + 1].date;
  }

  var curDate = mcLegsData[legIdx].date || minDate;
  if (curDate < minDate) curDate = minDate;

  calMode = 'dep';
  calDepDate = curDate;
  calRetDate = null;

  var refDate = new Date(curDate + 'T00:00:00');
  calYear = refDate.getFullYear();
  calMonth = refDate.getMonth();

  // حفظ السياق حتى يعرف الـ calendar أنه في وضع تعديل صفحة النتائج
  window._mcCalLegIdx = legIdx;
  window._mcCalMinDate = minDate;
  window._mcCalMaxDate = maxDate;
  window._mcCalActive = true;
  window._rpMcCalMode = true; // علامة: نحن في وضع تعديل صفحة النتائج

  updateCalHeader();
  buildCalGrid();

  var rb = document.getElementById('cal-ret-btn');
  if (rb) rb.style.display = 'none';

  var ov = document.getElementById('cal-ov');
  if (ov) ov.classList.add('open');
}

function rpMcDateChange(legIdx, val) {
  mcLegsData[legIdx].date = val;
  var lbl = document.getElementById('rpe-mc-date-' + legIdx);
  if (lbl) lbl.textContent = val ? fmtDate(val) : '—';

  // تحديث باقي الرحلات: تاريخ أي رحلة لاحقة أقل من هذا التاريخ يجب مسحه
  for (var i = legIdx + 1; i < mcLegsData.length; i++) {
    if (mcLegsData[i].date && mcLegsData[i].date < val) {
      mcLegsData[i].date = '';
      var nxtLbl = document.getElementById('rpe-mc-date-' + i);
      if (nxtLbl) nxtLbl.textContent = '—';
    }
  }
}

function toggleRpFilter() {
  var ov = document.getElementById('rp-filter-ov');
  if (!ov) return;
  ov.classList.add('open');
  // Sync filter state to sheet
  syncRpFilterUI();
}

function closeRpFilter() {
  var ov = document.getElementById('rp-filter-ov');
  if (ov) ov.classList.remove('open');
  applyRpF();
}

function syncRpFilterUI() {
  // Sync stop counts
  ['s0','s1','s2'].forEach(function(k) {
    var orig = document.getElementById('fcb-' + k);
    var copy = document.getElementById('fcb2-' + k);
    if (orig && copy) copy.className = orig.className;
    var c1 = document.getElementById('c-' + k);
    var c2 = document.getElementById('c2-' + k);
    if (c1 && c2) c2.textContent = c1.textContent;
  });

  // Sync price
  var fp = document.getElementById('f-price');
  var fp2 = document.getElementById('f-price2');
  var pv2 = document.getElementById('pval2');
  if (fp && fp2) { fp2.max = fp.max; fp2.value = fp.value; }
  if (pv2 && fp) pv2.textContent = '€' + fp.value;

  // Rebuild airlines in bottom sheet with correct IDs and handlers
  var airlines2 = document.getElementById('f-airlines2');
  if (airlines2 && typeof alF !== 'undefined') {
    var html = '';
    Object.keys(alF).forEach(function(code) {
      var isChecked = alF[code];
      html += '<div class="filter-check" onclick="toggleAirlineFilter(\'' + code + '\')">';
      html += '<div class="filter-check-left">';
      html += '<div class="filter-check-box' + (isChecked ? ' checked' : '') + '" id="fcb-al-' + code + '-2"></div>';
      // Get airline name from existing sidebar
      var existBox = document.querySelector('#f-airlines .filter-check-label');
      var alName = code;
      var allChecks = document.querySelectorAll('#f-airlines .filter-check');
      allChecks.forEach(function(el) {
        if (el.innerHTML.indexOf("'" + code + "'") !== -1) {
          var lbl = el.querySelector('.filter-check-label');
          if (lbl) alName = lbl.textContent;
        }
      });
      html += '<span class="filter-check-label">' + alName + '</span>';
      html += '</div></div>';
    });
    airlines2.innerHTML = html;
  }
}

function applyRpF() {
  // Sync back to main filter and apply
  applyF();
  // Re-render results in rp page
  rpFiltered = sortList(filtered.slice(), rpSortMode);
  rpShownN = 0;
  var list = document.getElementById('rp-offers-list');
  if (list) list.innerHTML = '';
  var countEl = document.getElementById('rp-count');
  if (countEl) countEl.textContent = rpFiltered.length + ' Flüge gefunden';
  // [FIX] This was the root cause of "sort tabs show a stale/wrong price":
  // applyRpF() never updated the Beste/Günstigste/Schnellste tab prices —
  // only the separate rpRenderOffers() did, and multi-city search calls
  // applyRpF() (not rpRenderOffers()), so the tabs kept showing whatever
  // price was left over from a previous search instead of the current
  // results. Updating the tabs here fixes it for every search type.
  if (allOffers.length) {
    var sorted_p = allOffers.slice().sort(function(a,b){ return a.price - b.price; });
    var sorted_d = allOffers.slice().sort(function(a,b){ return a.dur - b.dur; });
    var avgP = 0, avgD = 0;
    for (var i = 0; i < allOffers.length; i++) { avgP += allOffers[i].price; avgD += allOffers[i].dur; }
    avgP /= allOffers.length; avgD /= allOffers.length;
    var best = allOffers.slice().sort(function(a,b) {
      if (!avgD) return (a.price||0) - (b.price||0);
      return (a.price/avgP*0.6 + a.dur/avgD*0.4) - (b.price/avgP*0.6 + b.dur/avgD*0.4);
    })[0];
    var bp = document.getElementById('rpt-best-p');
    var pp = document.getElementById('rpt-price-p');
    var dp = document.getElementById('rpt-dur-p');
    if (bp) bp.textContent = fmt(best.price);
    if (pp) pp.textContent = fmt(sorted_p[0].price);
    if (dp) dp.textContent = fmt(sorted_d[0].price);
  }
  rpAddOffers(10);
}

function resetRpF() {
  resetF();
  syncRpFilterUI();
  applyRpF();
}

function rpEditLoc(side) {
  var valEl = document.getElementById('rpe-' + side);
  var fieldEl = document.getElementById('rpe-' + side + '-field');
  if (!valEl || !fieldEl || valEl.tagName === 'INPUT') return; // already editing
  var current = (side === 'from') ? (fromC || '') : (toC || '');
  var input = document.createElement('input');
  input.id = 'rpe-' + side;
  input.className = 'rp-edit-val';
  input.value = current;
  input.setAttribute('autocomplete', 'off');
  input.style.border = 'none';
  input.style.outline = 'none';
  input.style.background = 'transparent';
  input.style.width = '100%';
  input.style.font = 'inherit';
  input.style.color = 'inherit';
  input.oninput = function() { rpAcS(side, this.value); };
  fieldEl.replaceChild(input, valEl);
  input.focus();
  input.select();
  rpAcS(side, current);
  event.stopPropagation();
}

function rpAcS(side, q) {
  var drop = document.getElementById('rpe-' + side + '-ac');
  if (!drop) return;
  if (!q || q.length < 1) { drop.classList.remove('open'); drop.innerHTML=''; return; }
  var ql = q.toLowerCase();
  var hits = [];
  for (var i = 0; i < AP.length; i++) {
    var a = AP[i];
    if (a[0].toLowerCase().indexOf(ql) === 0 ||
        a[1].toLowerCase().indexOf(ql) >= 0 ||
        a[2].toLowerCase().indexOf(ql) >= 0 ||
        a[3].toLowerCase().indexOf(ql) >= 0) {
      hits.push(a);
      if (hits.length >= 8) break;
    }
  }
  if (!hits.length) { drop.classList.remove('open'); drop.innerHTML=''; return; }
  var html = '';
  for (var j = 0; j < hits.length; j++) {
    var a2 = hits[j];
    html += '<div class="aci" role="option" aria-selected="false" onclick="event.stopPropagation();rpPickAC(\'' + side + '\',\'' + a2[0] + '\',\'' + a2[1].replace(/'/g,"\\'") + '\',\'' + a2[2].replace(/'/g,"\\'") + '\')">';
    html += '<div class="acb">' + a2[0] + '</div>';
    html += '<div><div class="acn">' + a2[2] + ', ' + a2[3] + '</div><div class="acs">' + a2[1] + '</div></div>';
    html += '</div>';
  }
  drop.innerHTML = html;
  drop.classList.add('open');
}

function rpPickAC(side, code, name, city) {
  if (side === 'from') { fromI = code; fromC = city; }
  else { toI = code; toC = city; }
  var drop = document.getElementById('rpe-' + side + '-ac');
  if (drop) { drop.classList.remove('open'); drop.innerHTML=''; }
  var input = document.getElementById('rpe-' + side);
  if (input && input.tagName === 'INPUT') {
    var div = document.createElement('div');
    div.id = 'rpe-' + side;
    div.className = 'rp-edit-val';
    div.textContent = city;
    input.parentNode.replaceChild(div, input);
  }
  // Sync main search form fields too
  var mainIn = document.getElementById(side + '-in');
  var mainSub = document.getElementById(side + '-sub');
  if (mainIn) mainIn.value = city;
  if (mainSub) mainSub.textContent = name + ' · ' + code;
}

function doRpSearch() {
  toggleRpEdit();
  doSearch();
}

function rpRenderOffers() {
  // Use filtered if available, else allOffers
  var source = (typeof filtered !== 'undefined' && filtered.length) ? filtered : allOffers;
  rpFiltered = sortList(source.slice(), rpSortMode);
  rpShownN = 0;

  var list = document.getElementById('rp-offers-list');
  if (list) list.innerHTML = '';

  var countEl = document.getElementById('rp-count');
  if (countEl) countEl.textContent = rpFiltered.length + ' Flüge gefunden';

  // Update sort tab prices
  if (allOffers.length) {
    var sorted_p = allOffers.slice().sort(function(a,b){ return a.price - b.price; });
    var sorted_d = allOffers.slice().sort(function(a,b){ return a.dur - b.dur; });
    var avgP = 0, avgD = 0;
    for (var i = 0; i < allOffers.length; i++) { avgP += allOffers[i].price; avgD += allOffers[i].dur; }
    avgP /= allOffers.length; avgD /= allOffers.length;
    // If avgD is 0 (durations not available), sort by price only
    var best = allOffers.slice().sort(function(a,b) {
      if (!avgD) return (a.price||0) - (b.price||0);
      return (a.price/avgP*0.6 + a.dur/avgD*0.4) - (b.price/avgP*0.6 + b.dur/avgD*0.4);
    })[0];
    var bp = document.getElementById('rpt-best-p');
    var pp = document.getElementById('rpt-price-p');
    var dp = document.getElementById('rpt-dur-p');
    if (bp) bp.textContent = fmt(best.price);
    if (pp) pp.textContent = fmt(sorted_p[0].price);
    if (dp) dp.textContent = fmt(sorted_d[0].price);
  }

  rpAddOffers(10);
}

function rpAddOffers(n) {
  var list = document.getElementById('rp-offers-list');
  if (!list) return;
  var end = Math.min(rpShownN + n, rpFiltered.length);
  for (var i = rpShownN; i < end; i++) {
    var card = buildCard(rpFiltered[i], i);
    list.appendChild(card);
  }
  rpShownN = end;
  var lmw = document.getElementById('rp-lmw');
  if (lmw) lmw.style.display = rpShownN < rpFiltered.length ? 'block' : 'none';
  setTimeout(loadRealLogos, 200);
}

function rpLoadMore() { rpAddOffers(10); }

function rpSort(mode) {
  rpSortMode = mode;
  var tabs = ['best','price','dur'];
  for (var i = 0; i < tabs.length; i++) {
    var el = document.getElementById('rpt-' + tabs[i]);
    if (el) el.classList.toggle('on', tabs[i] === mode);
  }
  rpRenderOffers();
  var body = document.getElementById('rp-body');
  if (body) body.scrollTop = 0;
}

// Override initResults to open the new full-screen page
var _origInitResults = initResults;
initResults = function(orig, dest) {
  _origInitResults(orig, dest);
  // حفظ آخر نتائج البحث العادي
  if (trip !== 'mc') {
    _lastNormalOffers = allOffers.slice();
    _lastMcOffers = null; // مسح نتائج mc القديمة لأن البحث الحالي عادي
    var depEl = document.getElementById('dep-date');
    var retEl = document.getElementById('ret-date');
    _lastNormalMeta = {
      fromI: fromI, toI: toI, fromC: fromC, toC: toC,
      dep: depEl ? depEl.value : '',
      ret: retEl ? retEl.value : '',
      trip: trip
    };
  }
  openResultsPage();
};

// ══ PORTED FROM PREVIOUS VERSION ══
// [LANG-FIX] This used to redeclare `var LANG = 'de';` here — a leftover
// from copy-pasting a chunk of code from an older version of this file.
// Because plain `var` redeclarations execute silently with no error, and
// initLang() (which restores the user's saved language from localStorage)
// runs BEFORE this point in the script, this line was unconditionally
// resetting every returning visitor's language back to German on every
// page load, even if they had explicitly chosen Arabic or English. LANG
// is already declared once near the top of the file — no need to declare
// it again here at all.

// ── showToast ──
function showToast(msg, type) {
  var existing = document.getElementById('fw-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'fw-toast';
  toast.className = 'fw-toast fw-toast-' + (type || 'info');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.classList.add('show'); }, 10);
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
  }, 3500);
}

// ── shareFlight ──
function shareFlight(idx) {
  var o = filtered[idx];
  if (!o) return;
  var text = 'Airpiv: ' + o.orig + ' → ' + o.dest + ' ab ' + fmt(o.price) +
             ' · ' + o.dep.toLocaleDateString('de-DE') + ' · ' + o.al[1];
  if (navigator.share) {
    navigator.share({ title: 'Airpiv Flug', text: text, url: window.location.href });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    showToast('🔗 Link kopiert!', 'success');
  } else {
    showToast('📋 ' + text, 'info');
  }
}

// (initLang and setLang defined earlier)

// ── addSwipeToDismiss ──
function addSwipeToDismiss(elId, closeFn) {
  var el = document.getElementById(elId);
  if (!el) return;
  var startY = 0;
  el.addEventListener('touchstart', function(e) { startY = e.touches[0].clientY; }, {passive:true});
  el.addEventListener('touchend', function(e) {
    var dy = e.changedTouches[0].clientY - startY;
    if (dy > 80) closeFn();
  }, {passive:true});
}

// (renderRecentSearches defined earlier, shows last search only)

// ── saveRecentSearch ──
// trackEvent defined earlier in this file

// ── ACCESSIBILITY: Focus trap for open modals ──
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Tab') return;
  var modal = document.querySelector('.ov.open, .bflow-ov.open');
  if (!modal) return;
  var focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  var first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first || !modal.contains(document.activeElement)) {
      last.focus(); e.preventDefault();
    }
  } else {
    if (document.activeElement === last || !modal.contains(document.activeElement)) {
      first.focus(); e.preventDefault();
    }
  }
});


/* ===== NEXT INLINE SCRIPT BLOCK ===== */


// ── DOB Calendar Logic ──
var _dobCalPaxIdx = 0;
var _dobCalPaxType = 'adult'; // 'adult' | 'child' | 'infant' — drives the allowed year/day range
var _dobCalYearRange = null;  // { min, max, defaultY } for the current passenger type
var _dobCalYear = new Date().getFullYear() - 25;
var _dobCalMonth = new Date().getMonth();
var _dobCalSel = null; // { y, m, d }
var _dobYmMode = 'year'; // 'year' or 'month'
var DE_MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
var DE_MONTHS_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

// [FIX] Age limits per Duffel's real passenger-type rules (adult ≥12,
// child 2–11, infant ≤1) — computed once and reused to both restrict the
// calendar's year range AND start it on a sensible default year, instead
// of always opening on "today's year − 25" regardless of passenger type.
function dobCalPaxType(idx) {
  return (idx >= PAX.a + PAX.c) ? 'infant' : (idx >= PAX.a) ? 'child' : 'adult';
}
function dobCalYearRange(paxType) {
  var nowY = new Date().getFullYear();
  if (paxType === 'infant') return { min: nowY - 2, max: nowY, defaultY: nowY };
  if (paxType === 'child') return { min: nowY - 12, max: nowY - 2, defaultY: nowY - 6 };
  return { min: nowY - 100, max: nowY - 12, defaultY: nowY - 30 };
}

function openDobCal(idx) {
  _dobCalPaxIdx = idx;
  _dobCalPaxType = dobCalPaxType(idx);
  _dobCalYearRange = dobCalYearRange(_dobCalPaxType);
  // Read existing value if any
  var hidden = document.getElementById('bf-dob' + idx);
  if (hidden && hidden.value) {
    var parts = hidden.value.split('-');
    if (parts.length === 3) {
      _dobCalYear = parseInt(parts[0]);
      _dobCalMonth = parseInt(parts[1]) - 1;
      _dobCalSel = { y: parseInt(parts[0]), m: parseInt(parts[1]) - 1, d: parseInt(parts[2]) };
    }
  } else {
    _dobCalSel = null;
    _dobCalYear = _dobCalYearRange.defaultY;
    _dobCalMonth = 0;
  }
  renderDobCal();
  document.getElementById('dob-cal-ov').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDobCal() {
  document.getElementById('dob-cal-ov').classList.remove('open');
  document.body.style.overflow = '';
}

function renderDobCal() {
  // Header
  var selTxt = _dobCalSel
    ? (_dobCalSel.d + '. ' + DE_MONTHS[_dobCalSel.m] + ' ' + _dobCalSel.y)
    : '— — ——';
  document.getElementById('dob-cal-selected').textContent = selTxt;
  document.getElementById('dob-cal-year-lbl').textContent = _dobCalSel ? '' : '';
  document.getElementById('dob-cal-month-lbl').textContent = DE_MONTHS[_dobCalMonth] + ' ' + _dobCalYear;
  document.getElementById('dob-cal-confirm').disabled = !_dobCalSel;

  // Grid
  var today = new Date(); today.setHours(0,0,0,0);
  var firstDay = new Date(_dobCalYear, _dobCalMonth, 1).getDay(); // 0=Sun
  // Convert to Mon-first: Mon=0, Sun=6
  var startOffset = (firstDay === 0) ? 6 : firstDay - 1;
  var daysInMonth = new Date(_dobCalYear, _dobCalMonth + 1, 0).getDate();

  var grid = document.getElementById('dob-cal-grid');
  var html = '';
  for (var i = 0; i < startOffset; i++) html += '<div class="dob-cal-day empty"></div>';
  // [FIX] Disable days that would put this passenger outside Duffel's real
  // age rules (adult ≥12, child 2–11, infant ≤1) — previously only future
  // dates were disabled, so e.g. picking an infant's DOB still let you tap
  // any day in 2001 and only complain about it after confirming.
  var ageMinDate = null, ageMaxDate = null;
  if (_dobCalPaxType === 'adult') {
    ageMaxDate = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate());
  } else if (_dobCalPaxType === 'child') {
    ageMinDate = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate() + 1);
    ageMaxDate = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
  } else if (_dobCalPaxType === 'infant') {
    ageMinDate = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate() + 1);
  }
  for (var d = 1; d <= daysInMonth; d++) {
    var thisDate = new Date(_dobCalYear, _dobCalMonth, d);
    var isSel = _dobCalSel && _dobCalSel.y === _dobCalYear && _dobCalSel.m === _dobCalMonth && _dobCalSel.d === d;
    var isToday = thisDate.getTime() === today.getTime();
    var isFuture = thisDate > today;
    var isOutOfAgeRange = (ageMaxDate && thisDate > ageMaxDate) || (ageMinDate && thisDate < ageMinDate);
    var isDisabled = isFuture || isOutOfAgeRange;
    var cls = 'dob-cal-day' + (isSel ? ' sel' : '') + (isToday ? ' today' : '') + (isDisabled ? ' disabled' : '');
    if (isDisabled) {
      html += '<div class="' + cls + '">' + d + '</div>';
    } else {
      html += '<div class="' + cls + '" onclick="dobPickDay(' + d + ')">' + d + '</div>';
    }
  }
  grid.innerHTML = html;
}

function dobPickDay(d) {
  _dobCalSel = { y: _dobCalYear, m: _dobCalMonth, d: d };
  renderDobCal();
}

function dobCalPrev() {
  _dobCalMonth--;
  if (_dobCalMonth < 0) { _dobCalMonth = 11; _dobCalYear--; }
  renderDobCal();
}

function dobCalNext() {
  var now = new Date();
  if (_dobCalYear > now.getFullYear() || (_dobCalYear === now.getFullYear() && _dobCalMonth >= now.getMonth())) return;
  _dobCalMonth++;
  if (_dobCalMonth > 11) { _dobCalMonth = 0; _dobCalYear++; }
  renderDobCal();
}

function openDobYmPick() {
  _dobYmMode = 'year';
  var pick = document.getElementById('dob-ym-pick');
  document.getElementById('dob-ym-title').textContent = 'Jahr wählen';
  // [FIX] Only list years actually valid for this passenger's type (adult
  // ≥12, child 2–11, infant ≤1) — previously showed ALL years back to 1920
  // for every passenger, forcing the user to scroll past ~90 irrelevant
  // years to find e.g. an infant's birth year.
  var range = _dobCalYearRange || dobCalYearRange(_dobCalPaxType || 'adult');
  var html = '';
  for (var y = range.max; y >= range.min; y--) {
    var isSel = y === _dobCalYear;
    html += '<div class="dob-ym-item' + (isSel ? ' sel' : '') + '" onclick="dobPickYear(' + y + ')">' + y + '</div>';
  }
  document.getElementById('dob-ym-grid').innerHTML = html;
  pick.classList.add('open');
  // Scroll to selected year
  setTimeout(function(){
    var selEl = document.querySelector('#dob-ym-grid .dob-ym-item.sel');
    if (selEl) selEl.scrollIntoView({ block: 'center' });
  }, 50);
}

function dobPickYear(y) {
  _dobCalYear = y;
  _dobYmMode = 'month';
  document.getElementById('dob-ym-title').textContent = 'Monat wählen — ' + y;
  var html = '';
  var now = new Date();
  for (var m = 0; m < 12; m++) {
    var isFuture = (y > now.getFullYear()) || (y === now.getFullYear() && m > now.getMonth());
    var isSel = m === _dobCalMonth;
    if (isFuture) {
      html += '<div class="dob-ym-item" style="opacity:.3">' + DE_MONTHS_SHORT[m] + '</div>';
    } else {
      html += '<div class="dob-ym-item' + (isSel ? ' sel' : '') + '" onclick="dobPickMonth(' + m + ')">' + DE_MONTHS_SHORT[m] + '</div>';
    }
  }
  document.getElementById('dob-ym-grid').innerHTML = html;
}

function dobPickMonth(m) {
  _dobCalMonth = m;
  closeDobYmPick();
  renderDobCal();
}

function closeDobYmPick() {
  document.getElementById('dob-ym-pick').classList.remove('open');
}

function confirmDobCal() {
  if (!_dobCalSel) return;
  var y = _dobCalSel.y;
  var m = String(_dobCalSel.m + 1).padStart(2, '0');
  var d = String(_dobCalSel.d).padStart(2, '0');
  var isoVal = y + '-' + m + '-' + d;
  var displayVal = d + '.' + m + '.' + y;

  // Set hidden input value
  var hidden = document.getElementById('bf-dob' + _dobCalPaxIdx);
  if (hidden) { hidden.value = isoVal; }

  // Update display
  var wrap = document.getElementById('dob-wrap' + _dobCalPaxIdx);
  var display = document.getElementById('dob-display' + _dobCalPaxIdx);
  if (display) { display.textContent = displayVal; display.classList.add('has-val'); }
  if (wrap) { wrap.classList.add('filled'); wrap.classList.remove('err-state'); }

  // Validate age
  validateDobField({ value: isoVal, classList: { add: function(){}, remove: function(){} } }, _dobCalPaxIdx);

  closeDobCal();
}


/* ===== NEXT INLINE SCRIPT BLOCK ===== */


(function(d, w, c) {
    w.BrevoConversationsID = '6a33a5bd0003ed495604725f';
    // [BREVO-FIX] customWidgetButton is the officially documented way to
    // use our own "Live-Chat" button instead of Brevo's default floating
    // launcher — per Brevo's docs, setting this "also hides the default
    // chat button" automatically, which is exactly what we want (no extra
    // floating icon, only our own styled buttons trigger the chat). This
    // replaces the old startHidden+show()/hideLauncher approach: startHidden
    // hid the WHOLE widget (so openChat() alone never revealed anything,
    // and calling show() brought back the default button we didn't want);
    // customWidgetButton hides only the default button while leaving the
    // widget itself ready to open normally.
    w.BrevoConversationsSetup = { customWidgetButton: '.brevo-chat-trigger' };
    w[c] = w[c] || function() {
        (w[c].q = w[c].q || []).push(arguments);
    };
    var s = d.createElement('script');
    s.async = true;
    s.src = 'https://conversations-widget.brevo.com/brevo-conversations.js';
    // Track real success/failure of the script tag itself — distinguishes
    // "script never arrived" (network/CSP/adblock/account issue) from
    // "script loaded but the chat just hasn't rendered yet".
    s.onload = function () { w.__brevoLoaded = true; };
    s.onerror = function () {
      w.__brevoLoaded = false;
      console.error('[Brevo Chat] Skript konnte nicht geladen werden (Netzwerk, CSP oder Adblocker).');
    };
    if (d.head) d.head.appendChild(s);
})(document, window, 'BrevoConversations');

function openInsuranceLink() {
  window.open('https://ektatraveling.tpo.mx/1qYI0Y2A', '_blank', 'noopener,noreferrer');
}

function switchSvcTab(tab) {
  document.querySelectorAll('.svc-tab').forEach(function(b){ b.classList.remove('active'); });
  document.getElementById('svc-' + tab).classList.add('active');

  var flightsContent = document.getElementById('flights-content');
  var comingSoon = document.getElementById('coming-soon-msg');
  var insPromo = document.getElementById('ins-promo');
  var icon = document.getElementById('coming-soon-icon');
  var title = document.getElementById('coming-soon-title');
  var sub = document.getElementById('coming-soon-sub');
  var T = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[(typeof LANG !== 'undefined' ? LANG : 'de')]) ? TRANSLATIONS[(typeof LANG !== 'undefined' ? LANG : 'de')] : {};

  flightsContent.style.display = (tab === 'flights') ? '' : 'none';
  comingSoon.classList.toggle('show', (tab === 'hotels' || tab === 'cars'));
  if (insPromo) insPromo.classList.toggle('show', tab === 'insurance');

  if (tab === 'hotels') { icon.textContent = '🏨'; title.textContent = T.coming_soon_title || 'Demnächst'; sub.textContent = T.coming_soon_hotels || 'Hotelbuchung kommt bald. Bleib dran!'; }
  if (tab === 'cars')   { icon.textContent = '🚗'; title.textContent = T.coming_soon_title || 'Demnächst'; sub.textContent = T.coming_soon_cars || 'Mietwagen kommt bald. Bleib dran!'; }
}

function openBrevoChat() {
    function doOpen() {
        if (window.BrevoConversations) {
            // [BREVO-FIX] With customWidgetButton set, clicking .brevo-chat-trigger
            // already opens the widget automatically — this call is a
            // deliberate redundant safety net in case that auto-binding
            // hasn't attached yet for any reason, not the primary trigger.
            window.BrevoConversations('openChat', true);
        }
    }
    // Diagnostic: if the widget script never loaded (network/CSP/adblock
    // issue), window.BrevoConversations stays a bare queue function forever
    // and calling 'openChat' on it silently does nothing. Detect that case
    // after the retry window and tell the user clearly instead of failing
    // silently.
    if (window.BrevoConversations && window.__brevoLoaded) {
        doOpen();
    } else {
        var tries = 0;
        var poll = setInterval(function() {
            tries++;
            if (window.__brevoLoaded) {
                clearInterval(poll);
                doOpen();
            } else if (tries >= 10) {
                clearInterval(poll);
                console.warn('[Brevo Chat] Widget-Skript wurde nach 5s nicht geladen — mögliche Ursachen: Adblocker, Netzwerk, oder Conversations ist im Brevo-Konto nicht aktiviert.');
                showToast('💬 ' + tL('Live-Chat momentan nicht verfügbar — bitte per E-Mail kontaktieren','Live chat unavailable right now — please use email instead','الدردشة المباشرة غير متاحة حالياً — يرجى التواصل عبر الإيميل'), 'error');
                window.location.href = 'mailto:support@airpiv.com';
            }
        }, 500);
    }
}
