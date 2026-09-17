(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var ready = false;
  var state = { adult: 1, child: 0, infant: 0, bag: 0 };
  var timers = {};
  var PROXY = 'https://api.airpiv.com';
  var cal = { month: null, dep: null, ret: null, mode: 'dep', built: false };

  function lang2() { return ((document.documentElement && document.documentElement.lang) || 'en').slice(0, 2); }
  var I18N = {
    en: { depart: 'Departure', ret: 'Return', pick: 'Choose date', cancel: 'Cancel', confirm: 'Set dates', adult: 'adult', bags: 'bags' },
    de: { depart: 'Hinreise', ret: 'Rückreise', pick: 'Datum wählen', cancel: 'Abbrechen', confirm: 'Daten festlegen', adult: 'Erw.', bags: 'Gepäck' },
    ar: { depart: 'الذهاب', ret: 'العودة', pick: 'اختر التاريخ', cancel: 'إلغاء', confirm: 'تأكيد التواريخ', adult: 'بالغ', bags: 'حقائب' },
    es: { depart: 'Ida', ret: 'Vuelta', pick: 'Elegir fecha', cancel: 'Cancelar', confirm: 'Fijar fechas', adult: 'adulto', bags: 'maletas' },
    fr: { depart: 'Aller', ret: 'Retour', pick: 'Choisir la date', cancel: 'Annuler', confirm: 'Valider', adult: 'adulte', bags: 'bagages' },
    it: { depart: 'Andata', ret: 'Ritorno', pick: 'Scegli data', cancel: 'Annulla', confirm: 'Conferma date', adult: 'adulto', bags: 'bagagli' },
    nl: { depart: 'Heen', ret: 'Terug', pick: 'Kies datum', cancel: 'Annuleren', confirm: 'Datums instellen', adult: 'volw.', bags: 'bagage' },
    tr: { depart: 'Gidiş', ret: 'Dönüş', pick: 'Tarih seç', cancel: 'İptal', confirm: 'Tarihleri ayarla', adult: 'yetişkin', bags: 'bagaj' },
  };
  function t() { return I18N[lang2()] || I18N.en; }
  function locale() { var m = { en: 'en-GB', de: 'de-DE', ar: 'ar', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', nl: 'nl-NL', tr: 'tr-TR' }; return m[lang2()] || 'en-GB'; }

  function injectLegacyPriceGuard() {
    if (document.getElementById('route-search-price-guard')) return;
    var style = document.createElement('style');
    style.id = 'route-search-price-guard';
    style.textContent = '.route-price-box#route-price-box{display:none!important}';
    (document.head || document.documentElement).appendChild(style);
  }
  function injectCalStyles() {
    if (document.getElementById('route-search-cal-styles')) return;
    var s = document.createElement('style');
    s.id = 'route-search-cal-styles';
    s.textContent = [
      '.rsc-ov{display:none;position:fixed;inset:0;background:#101d2c99;z-index:3000;align-items:flex-end;justify-content:center;backdrop-filter:blur(3px)}',
      '.rsc-ov.open{display:flex}',
      '.rsc-box{background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:600px;margin:0 auto;padding-bottom:12px;box-shadow:0 -8px 40px #0003;max-height:90vh;overflow-y:auto;animation:rscUp .22s ease}',
      '@media(min-width:640px){.rsc-ov{align-items:center}.rsc-box{border-radius:20px}}',
      '@keyframes rscUp{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}',
      '.rsc-hd{padding:16px 16px 0}',
      '.rsc-sel-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px}',
      '.rsc-sel-btn{border:2px solid #e1e7ec;border-radius:10px;padding:10px 13px;cursor:pointer;background:#fff;text-align:start;transition:.15s}',
      '.rsc-sel-btn.active{border-color:#0fb5a0;background:#e6f7f4}',
      '.rsc-sel-lbl{font-size:10px;font-weight:700;color:#8fa4b4;text-transform:uppercase;letter-spacing:.07em}',
      '.rsc-sel-val{font-size:14px;font-weight:700;color:#101d2c;margin-top:3px}',
      '.rsc-nav{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 6px}',
      '.rsc-nav-btn{width:36px;height:36px;border:none;background:#f6f8fa;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#101d2c;font-weight:700}',
      '.rsc-month{font-size:1rem;font-weight:800;color:#101d2c}',
      '.rsc-wd{display:grid;grid-template-columns:repeat(7,1fr);padding:0 8px;margin-bottom:4px}',
      '.rsc-wd span{text-align:center;font-size:11px;font-weight:700;color:#8fa4b4;padding:4px 0}',
      '.rsc-grid{display:grid;grid-template-columns:repeat(7,1fr);padding:0 8px 8px;gap:2px}',
      '.rsc-day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;border-radius:50%;cursor:pointer;min-height:38px;border:none;background:0 0;color:#101d2c}',
      '.rsc-day.empty{visibility:hidden}',
      '.rsc-day.today{border:2px solid #e1e7ec}',
      '.rsc-day.past{color:#8fa4b4;opacity:.3;cursor:not-allowed;pointer-events:none}',
      '.rsc-day.in-range{background:#e6f7f4;border-radius:0;color:#0a9384}',
      '.rsc-day.range-start{border-radius:50% 0 0 50%;background:#e6f7f4;color:#0a9384}',
      '.rsc-day.range-end{border-radius:0 50% 50% 0;background:#e6f7f4;color:#0a9384}',
      '.rsc-day.sel,.rsc-day.sel.range-start,.rsc-day.sel.range-end{border-radius:50%;background:#0fb5a0;color:#fff}',
      '[dir=rtl] .rsc-day.range-start{border-radius:0 50% 50% 0}',
      '[dir=rtl] .rsc-day.range-end{border-radius:50% 0 0 50%}',
      '.rsc-foot{display:grid;grid-template-columns:1fr 2fr;gap:10px;padding:12px 16px 16px;border-top:1px solid #e1e7ec}',
      '.rsc-cancel{background:#f6f8fa;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:700;color:#46586c;cursor:pointer}',
      '.rsc-confirm{background:#0fb5a0;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:700;color:#fff;cursor:pointer}',
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;'); }
  function form() { return document.querySelector('[data-route-search]'); }
  function cfg(f) { try { return JSON.parse(f.getAttribute('data-config') || '{}'); } catch (_) { return {}; } }
  function closeDrops() { document.querySelectorAll('.route-search-ac.open').forEach(function (x) { x.classList.remove('open'); }); }
  function acBox(side) { return document.querySelector('[data-route-ac="' + side + '"]'); }
  function input(side) { return document.querySelector('[data-route-side="' + side + '"]'); }
  function renderResults(side, rows) {
    var box = acBox(side); if (!box) return;
    box.innerHTML = rows.map(function (a) {
      var code = String(a.code || a.iata || '').toUpperCase();
      var name = a.name || a.city || code;
      var city = a.city || name;
      var country = a.country || '';
      return '<button type="button" class="route-search-ac-item" data-route-pick="' + esc(code) + '" data-route-side="' + esc(side) + '" data-route-name="' + esc(city) + '"><span class="route-search-ac-code">' + esc(code) + '</span><span><span class="route-search-ac-name">' + esc(city) + '</span><span class="route-search-ac-meta">' + esc(name + (country ? ' · ' + country : '')) + '</span></span></button>';
    }).join('');
    box.classList.toggle('open', rows.length > 0);
  }
  function searchAirports(side, q) {
    var box = acBox(side);
    if (!box || q.length < 1) { if (box) box.classList.remove('open'); return; }
    clearTimeout(timers[side]);
    timers[side] = setTimeout(function () {
      var run = window.ensureSearchSession ? window.ensureSearchSession().catch(function () {}) : Promise.resolve();
      run.then(function () {
        return fetch(PROXY + '/search/airports?q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } });
      }).then(function (r) { return r.json(); }).then(function (j) {
        var rows = j && Array.isArray(j.airports) ? j.airports.slice(0, 8) : [];
        renderResults(side, rows);
      }).catch(function () { if (box) box.classList.remove('open'); });
    }, 180);
  }
  function setSide(side, code, name) {
    var el = input(side); if (!el) return;
    el.value = name || code;
    el.setAttribute('data-route-code', code || '');
    closeDrops();
  }
  function clearRouteCodeWhileTyping(el) { if (el) el.removeAttribute('data-route-code'); }
  function swap() {
    var f = input('from'), t2 = input('to'); if (!f || !t2) return;
    var fc = f.getAttribute('data-route-code') || '', tc = t2.getAttribute('data-route-code') || '';
    var fv = f.value, tv = t2.value;
    if (!fc || !tc) return;
    setSide('from', tc, tv); setSide('to', fc, fv);
  }
  function paxTotal() { return state.adult + state.child + state.infant; }
  function updatePaxButton() {
    var b = document.querySelector('.route-search-pax-btn'); if (!b) return;
    var person = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    var bag = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" style="margin-inline-start:8px"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>';
    var chev = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-inline-start:4px"><path d="M6 9l6 6 6-6"/></svg>';
    b.innerHTML = person + '<span style="margin-inline-start:4px">' + paxTotal() + '</span>' + bag + '<span style="margin-inline-start:4px">' + state.bag + '</span>' + chev;
  }
  function updateCounters() {
    ['adult', 'child', 'infant', 'bag'].forEach(function (k) {
      var el = document.querySelector('[data-route-pax-count="' + k + '"]');
      if (el) el.textContent = state[k];
    });
    updatePaxButton();
  }

  // ---- Calendar ----
  // Local-calendar date string (YYYY-MM-DD). Never use toISOString().slice(0,10)
  // here: that is UTC and shifts the day for users behind/ahead of UTC.
  function localDateString(date) { return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); }
  var today = localDateString(new Date());
  function fmtISO(d) { return localDateString(d); }
  function parseISO(s) { if (!s) return null; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayD() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function isRoundTrip() { var tr = document.querySelector('[data-route-trip]'); return !tr || tr.value === 'rr'; }
  function fmtDisp(iso) { if (!iso) return t().pick; try { return new Date(iso + 'T00:00:00').toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' }); } catch (_) { return iso; } }

  function buildCalDom() {
    if (cal.built) return;
    injectCalStyles();
    var ov = document.createElement('div');
    ov.className = 'rsc-ov'; ov.setAttribute('data-rsc-ov', '');
    ov.innerHTML =
      '<div class="rsc-box" role="dialog" aria-modal="true">' +
      '<div class="rsc-hd"><div class="rsc-sel-row">' +
      '<div class="rsc-sel-btn" data-rsc-mode="dep"><div class="rsc-sel-lbl">' + esc(t().depart) + '</div><div class="rsc-sel-val" data-rsc-selval="dep">' + esc(t().pick) + '</div></div>' +
      '<div class="rsc-sel-btn" data-rsc-mode="ret"><div class="rsc-sel-lbl">' + esc(t().ret) + '</div><div class="rsc-sel-val" data-rsc-selval="ret">' + esc(t().pick) + '</div></div>' +
      '</div></div>' +
      '<div class="rsc-nav"><button type="button" class="rsc-nav-btn" data-rsc-nav="-1" aria-label="prev">‹</button><span class="rsc-month" data-rsc-month></span><button type="button" class="rsc-nav-btn" data-rsc-nav="1" aria-label="next">›</button></div>' +
      '<div class="rsc-wd" data-rsc-wd></div>' +
      '<div class="rsc-grid" data-rsc-grid></div>' +
      '<div class="rsc-foot"><button type="button" class="rsc-cancel" data-rsc-cancel>' + esc(t().cancel) + '</button><button type="button" class="rsc-confirm" data-rsc-confirm>' + esc(t().confirm) + '</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    // weekday headers (locale-aware, Mon-first)
    var wd = ov.querySelector('[data-rsc-wd]'); var ref = new Date(2024, 0, 1); // Monday
    var names = [];
    for (var i = 0; i < 7; i++) { var d = new Date(2024, 0, 1 + i); names.push(d.toLocaleDateString(locale(), { weekday: 'short' })); }
    wd.innerHTML = names.map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('');
    ov.addEventListener('click', function (ev) {
      if (ev.target === ov || ev.target.closest('[data-rsc-cancel]')) { closeCal(); return; }
      var mode = ev.target.closest('[data-rsc-mode]'); if (mode) { cal.mode = mode.getAttribute('data-rsc-mode'); renderCal(); return; }
      var nav = ev.target.closest('[data-rsc-nav]'); if (nav) { cal.month.setMonth(cal.month.getMonth() + Number(nav.getAttribute('data-rsc-nav'))); renderCal(); return; }
      var day = ev.target.closest('[data-rsc-day]'); if (day) { pickDay(day.getAttribute('data-rsc-day')); return; }
      if (ev.target.closest('[data-rsc-confirm]')) { confirmCal(); return; }
    });
    cal.built = true;
  }
  function openCal(mode) {
    buildCalDom();
    var f = form();
    cal.dep = (f.querySelector('[name="depart"]') || {}).value || null;
    cal.ret = (f.querySelector('[name="ret"]') || {}).value || null;
    cal.mode = mode || 'dep';
    var base = parseISO(cal.dep) || todayD(); cal.month = new Date(base.getFullYear(), base.getMonth(), 1);
    document.querySelector('[data-rsc-ov]').classList.add('open');
    renderCal();
  }
  function closeCal() { var ov = document.querySelector('[data-rsc-ov]'); if (ov) ov.classList.remove('open'); }
  function pickDay(iso) {
    if (!isRoundTrip()) { cal.dep = iso; cal.ret = null; renderCal(); return; }
    if (cal.mode === 'dep') {
      cal.dep = iso; if (cal.ret && cal.ret < iso) cal.ret = null; cal.mode = 'ret';
    } else {
      if (cal.dep && iso < cal.dep) { cal.dep = iso; cal.ret = null; cal.mode = 'ret'; }
      else { cal.ret = iso; }
    }
    renderCal();
  }
  function renderCal() {
    var ov = document.querySelector('[data-rsc-ov]'); if (!ov) return;
    var rt = isRoundTrip();
    var retBtn = ov.querySelector('[data-rsc-mode="ret"]');
    if (retBtn) retBtn.style.display = rt ? '' : 'none';
    ov.querySelectorAll('[data-rsc-mode]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-rsc-mode') === cal.mode); });
    ov.querySelector('[data-rsc-selval="dep"]').textContent = fmtDisp(cal.dep);
    var rv = ov.querySelector('[data-rsc-selval="ret"]'); if (rv) rv.textContent = fmtDisp(cal.ret);
    ov.querySelector('[data-rsc-month]').textContent = cal.month.toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
    var grid = ov.querySelector('[data-rsc-grid]');
    var y = cal.month.getFullYear(), m = cal.month.getMonth();
    var first = new Date(y, m, 1); var startPad = (first.getDay() + 6) % 7; // Monday-first
    var days = new Date(y, m + 1, 0).getDate();
    var tIso = today;
    var html = '';
    for (var i = 0; i < startPad; i++) html += '<div class="rsc-day empty"></div>';
    for (var d = 1; d <= days; d++) {
      var iso = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var cls = 'rsc-day';
      if (iso < tIso) cls += ' past';
      if (iso === tIso) cls += ' today';
      var isDep = cal.dep && iso === cal.dep, isRet = cal.ret && iso === cal.ret;
      if (cal.dep && cal.ret && iso > cal.dep && iso < cal.ret) cls += ' in-range';
      if (isDep && cal.ret) cls += ' range-start';
      if (isRet) cls += ' range-end';
      if (isDep || isRet) cls += ' sel';
      html += '<button type="button" class="' + cls + '" data-rsc-day="' + iso + '">' + d + '</button>';
    }
    grid.innerHTML = html;
  }
  function confirmCal() {
    var f = form(); if (!f) return;
    var depH = f.querySelector('[name="depart"]'), retH = f.querySelector('[name="ret"]');
    if (depH) depH.value = cal.dep || '';
    if (retH) retH.value = isRoundTrip() ? (cal.ret || '') : '';
    var dd = document.querySelector('[data-route-dval="dep"]'); if (dd) dd.textContent = fmtDisp(cal.dep);
    var rd = document.querySelector('[data-route-dval="ret"]'); if (rd) rd.textContent = fmtDisp(retH ? retH.value : '');
    closeCal();
  }

  function validateDateRelation(f) {
    var trip = f.querySelector('[data-route-trip]'); var rw = document.querySelector('[data-route-return-wrap]'); var retH = f.querySelector('[name="ret"]'); var rd = document.querySelector('[data-route-dval="ret"]');
    if (trip && trip.value === 'ow') { if (retH) retH.value = ''; if (rd) rd.textContent = t().pick; if (rw) rw.classList.add('disabled'); }
    else { if (rw) rw.classList.remove('disabled'); }
  }
  function setError(msg) { var e = document.querySelector('[data-route-error]'); if (!e) return; e.textContent = msg || ''; e.classList.toggle('show', !!msg); }
  function submit(ev) {
    ev.preventDefault(); var f = form(); if (!f) return; setError('');
    var from = input('from'), to = input('to'), dep = f.querySelector('[name="depart"]'), ret = f.querySelector('[name="ret"]'), trip = f.querySelector('[data-route-trip]');
    var fc = from && from.getAttribute('data-route-code'), tc = to && to.getAttribute('data-route-code');
    if (!fc || !tc || fc === tc) return setError('Please choose a valid origin and destination from the suggestions.');
    if (!dep || !dep.value) return setError('Please choose a departure date.');
    if (trip && trip.value === 'rr' && (!ret || !ret.value)) return setError('Please choose a return date or select one way.');
    if (trip && trip.value === 'rr' && ret.value < dep.value) return setError('Return date must be on or after departure.');
    var p = new URLSearchParams(); p.set('depart', dep.value); p.set('trip', trip ? trip.value : 'rr');
    if (trip && trip.value === 'rr' && ret && ret.value) p.set('ret', ret.value);
    p.set('adults', String(state.adult)); p.set('children', String(state.child)); p.set('infants', String(state.infant));
    if (state.bag > 0) p.set('bags', String(state.bag));
    var cabin = f.querySelector('[data-route-cabin]'); if (cabin) p.set('cabin', cabin.value);
    f.querySelectorAll('input[type="checkbox"]:checked').forEach(function (x) { if (x.name) p.set(x.name, '1'); });
    window.location.href = '/search/' + encodeURIComponent(fc) + '-' + encodeURIComponent(tc) + '?' + p.toString();
  }
  function init() {
    if (ready) return; ready = true; injectLegacyPriceGuard();
    var f = form(); if (!f) return; var c = cfg(f); var from = input('from'), to = input('to');
    if (from) from.setAttribute('data-route-code', c.from || ''); if (to) to.setAttribute('data-route-code', c.to || '');
    f.addEventListener('submit', submit);
    f.addEventListener('input', function (ev) { var el = ev.target; if (el && el.getAttribute('data-route-side')) { clearRouteCodeWhileTyping(el); searchAirports(el.getAttribute('data-route-side'), el.value.trim()); } });
    f.addEventListener('focusin', function (ev) { var el = ev.target; if (el && el.getAttribute('data-route-side') && el.value.trim()) searchAirports(el.getAttribute('data-route-side'), el.value.trim()); });
    f.addEventListener('change', function (ev) { if (ev.target && ev.target.getAttribute('data-route-trip')) validateDateRelation(f); });
    f.addEventListener('click', function (ev) {
      var pick = ev.target.closest('[data-route-pick]'); if (pick) { ev.preventDefault(); setSide(pick.getAttribute('data-route-side'), pick.getAttribute('data-route-pick'), pick.getAttribute('data-route-name')); return; }
      var dateEl = ev.target.closest('[data-route-date]'); if (dateEl) { ev.preventDefault(); if (dateEl.classList.contains('disabled')) return; openCal(dateEl.getAttribute('data-route-date')); return; }
      var action = ev.target.closest('[data-route-action]');
      if (action) { ev.preventDefault(); var a = action.getAttribute('data-route-action'); if (a === 'swap') swap(); if (a === 'pax') { var mm = document.querySelector('[data-route-pax-menu]'); if (mm) { mm.classList.toggle('open'); action.setAttribute('aria-expanded', mm.classList.contains('open') ? 'true' : 'false'); } } return; }
      var pax = ev.target.closest('[data-route-pax]');
      if (pax) { ev.preventDefault(); var k = pax.getAttribute('data-route-pax'), d = Number(pax.getAttribute('data-route-delta') || 0), next = state[k] + d; if (k === 'adult') next = Math.max(1, Math.min(9, next)); else if (k === 'bag') next = Math.max(0, Math.min(9, next)); else next = Math.max(0, Math.min(8, next)); if (k === 'infant') next = Math.min(next, state.adult); state[k] = next; updateCounters(); }
    });
    document.addEventListener('click', function (ev) { if (!ev.target.closest('[data-route-search]')) { closeDrops(); var mm = document.querySelector('[data-route-pax-menu]'); if (mm) mm.classList.remove('open'); } });
    validateDateRelation(f); updateCounters();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
