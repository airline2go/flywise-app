(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var ready = false;
  var state = { adult: 1, child: 0, infant: 0 };
  var timers = {};
  var PROXY = 'https://api.airpiv.com';

  function injectLegacyPriceGuard() {
    if (document.getElementById('route-search-price-guard')) return;
    var style = document.createElement('style');
    style.id = 'route-search-price-guard';
    style.textContent = '.route-price-box#route-price-box{display:none!important}';
    (document.head || document.documentElement).appendChild(style);
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
    var f = input('from'), t = input('to'); if (!f || !t) return;
    var fc = f.getAttribute('data-route-code') || '', tc = t.getAttribute('data-route-code') || '';
    var fv = f.value, tv = t.value;
    if (!fc || !tc) return;
    setSide('from', tc, tv); setSide('to', fc, fv);
  }
  function paxTotal() { return state.adult + state.child + state.infant; }
  function updatePaxButton() {
    var b = document.querySelector('.route-search-pax-btn'); if (!b) return;
    var lang = ((document.documentElement && document.documentElement.lang) || 'en').slice(0, 2);
    var labels = { en: 'adult', de: 'Erwachsener', ar: 'بالغ', es: 'adulto', fr: 'adulte', it: 'adulto', nl: 'volwassene', tr: 'yetişkin' };
    var label = labels[lang] || labels.en;
    b.textContent = state.adult + ' ' + label + (paxTotal() > 1 ? ' · ' + paxTotal() : '');
  }
  function updateCounters() {
    Object.keys(state).forEach(function (k) {
      var el = document.querySelector('[data-route-pax-count="' + k + '"]');
      if (el) el.textContent = state[k];
    });
    updatePaxButton();
  }
  function validateDateRelation(f) {
    var dep = f.querySelector('[name="depart"]'); var ret = f.querySelector('[name="ret"]'); var trip = f.querySelector('[data-route-trip]'); var rw = document.querySelector('[data-route-return-wrap]');
    if (trip && trip.value === 'ow') { if (ret) ret.value = ''; if (rw) rw.classList.add('disabled'); if (ret) ret.disabled = true; }
    else { if (rw) rw.classList.remove('disabled'); if (ret) ret.disabled = false; if (dep && ret) ret.min = dep.value || ret.min; }
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
    var cabin = f.querySelector('[data-route-cabin]'); if (cabin) p.set('cabin', cabin.value);
    f.querySelectorAll('input[type="checkbox"]:checked').forEach(function (x) { if (x.name) p.set(x.name, '1'); });
    window.location.href = '/search/' + encodeURIComponent(fc) + '-' + encodeURIComponent(tc) + '?' + p.toString();
  }
  function localDateString(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  function init() {
    if (ready) return; ready = true; injectLegacyPriceGuard();
    var f = form(); if (!f) return; var c = cfg(f); var from = input('from'), to = input('to');
    if (from) from.setAttribute('data-route-code', c.from || ''); if (to) to.setAttribute('data-route-code', c.to || '');
    var dep = f.querySelector('[name="depart"]'), ret = f.querySelector('[name="ret"]'), today = localDateString(new Date());
    if (dep) dep.min = today; if (ret) ret.min = today;
    f.addEventListener('submit', submit);
    f.addEventListener('input', function (ev) { var el = ev.target; if (el && el.getAttribute('data-route-side')) { clearRouteCodeWhileTyping(el); searchAirports(el.getAttribute('data-route-side'), el.value.trim()); } });
    f.addEventListener('focusin', function (ev) { var el = ev.target; if (el && el.getAttribute('data-route-side') && el.value.trim()) searchAirports(el.getAttribute('data-route-side'), el.value.trim()); });
    f.addEventListener('change', function (ev) { if (ev.target && ev.target.getAttribute('data-route-trip')) validateDateRelation(f); if (ev.target && ev.target.name === 'depart') validateDateRelation(f); });
    f.addEventListener('click', function (ev) {
      var pick = ev.target.closest('[data-route-pick]'); if (pick) { ev.preventDefault(); setSide(pick.getAttribute('data-route-side'), pick.getAttribute('data-route-pick'), pick.getAttribute('data-route-name')); return; }
      var action = ev.target.closest('[data-route-action]');
      if (action) { ev.preventDefault(); var a = action.getAttribute('data-route-action'); if (a === 'swap') swap(); if (a === 'pax') { var m = document.querySelector('[data-route-pax-menu]'); if (m) { m.classList.toggle('open'); action.setAttribute('aria-expanded', m.classList.contains('open') ? 'true' : 'false'); } } return; }
      var pax = ev.target.closest('[data-route-pax]');
      if (pax) { ev.preventDefault(); var k = pax.getAttribute('data-route-pax'), d = Number(pax.getAttribute('data-route-delta') || 0), next = state[k] + d; if (k === 'adult') next = Math.max(1, Math.min(9, next)); else next = Math.max(0, Math.min(8, next)); if (k === 'infant') next = Math.min(next, state.adult); state[k] = next; updateCounters(); }
    });
    document.addEventListener('click', function (ev) { if (!ev.target.closest('[data-route-search]')) { closeDrops(); var m = document.querySelector('[data-route-pax-menu]'); if (m) m.classList.remove('open'); } });
    validateDateRelation(f); updateCounters();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();