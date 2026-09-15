window.APP_CONFIG = {
  SUPABASE_URL: "https://tflpaysskecpmdpwbvog.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ZXi_Rq2zYQIj3LJoNFRctQ_eZogIGD0",
  GOOGLE_ADS_CONVERSION_ID: "AW-18336159187",
  GOOGLE_ADS_PURCHASE_LABEL: "6phDCL3BqvAcENOrrqdE",
  TURNSTILE_SITE_KEY: ""
};
(function () {
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[data-fw-search-session]')) return;
  var s = document.createElement('script');
  s.src = '/search-session.js';
  s.async = false;
  s.setAttribute('data-fw-search-session', '1');
  (document.head || document.documentElement).appendChild(s);
})();

/*
 * Canonical multilingual place resolver.
 *
 * This runs against the real #from-in / #to-in controls and the AP dataset
 * already loaded by app.js. It is intentionally local-first: every keystroke
 * is resolved against AP; the existing app autocomplete remains the fallback
 * when AP has no useful candidates. Nothing is sent to Duffel as a raw city
 * string.
 *
 * Important invariant:
 *   input text != selected canonical place => selected IATA is invalidated.
 * This prevents stale state such as "Riyadh" with IBZ from reaching search.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var MAX_RESULTS = 8;
  var MIN_QUERY = 2;
  var index = null;
  var LANG_COLUMNS = { de: 2, en: 4, ar: 5, es: 7, fr: 8, it: 9, nl: 10, tr: 11 };

  function fold(value) {
    return String(value == null ? '' : value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '')
      .replace(/ß/g, 'ss').replace(/[øØ]/g, 'o').replace(/[æÆ]/g, 'ae').replace(/[œŒ]/g, 'oe').replace(/[łŁ]/g, 'l').replace(/[đðÐ]/g, 'd')
      .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
  }

  function unique(values) {
    var seen = Object.create(null), out = [];
    for (var i = 0; i < values.length; i++) {
      var value = fold(values[i]);
      if (!value || seen[value]) continue;
      seen[value] = true;
      out.push(value);
    }
    return out;
  }

  function build() {
    if (index && index.source === window.AP) return index;
    if (!Array.isArray(window.AP) || !window.AP.length) return null;

    var entries = [];
    var exact = Object.create(null);
    var prefix = Object.create(null);

    for (var i = 0; i < window.AP.length; i++) {
      var row = window.AP[i];
      if (!Array.isArray(row)) continue;
      var code = String(row[0] || '').toUpperCase();
      if (!/^[A-Z0-9]{3}$/.test(code)) continue;

      var values = [];
      for (var j = 0; j < row.length; j++) {
        if (typeof row[j] === 'string' && row[j].trim()) values.push(row[j]);
      }
      values = unique(values);
      if (!values.length) continue;

      var entry = { row: row, code: code, values: values };
      entries.push(entry);

      for (var v = 0; v < values.length; v++) {
        var value = values[v];
        (exact[value] || (exact[value] = [])).push(entry);
        var parts = value.split(' ');
        for (var p = 0; p < parts.length; p++) {
          if (parts[p].length < 2) continue;
          var key = parts[p].slice(0, 5);
          (prefix[key] || (prefix[key] = [])).push(entry);
        }
      }
    }

    index = { source: window.AP, entries: entries, exact: exact, prefix: prefix };
    return index;
  }

  function score(entry, query) {
    var q = fold(query), compactQ = q.replace(/ /g, ''), qt = q.split(' ').filter(Boolean), best = 0;
    if (!q) return 0;

    for (var i = 0; i < entry.values.length; i++) {
      var value = entry.values[i], compactValue = value.replace(/ /g, ''), vt = value.split(' ');
      if (value === q) best = Math.max(best, 1200);
      else if (compactValue === compactQ) best = Math.max(best, 1150);
      else if (value.indexOf(q) === 0) best = Math.max(best, 1000);
      else if (vt.some(function (token) { return token.indexOf(q) === 0; })) best = Math.max(best, 900);
      else if (qt.length && qt.every(function (token) {
        return vt.some(function (candidate) { return candidate.indexOf(token) === 0; });
      })) best = Math.max(best, 820);
      else if (value.indexOf(q) >= 0) best = Math.max(best, 700);
    }
    return best;
  }

  function resolve(query) {
    var data = build();
    if (!data) return [];
    var q = fold(query);
    if (!q) return [];

    var key = q.slice(0, 5), pool = data.prefix[key] || data.entries;
    var out = [], seen = Object.create(null);
    for (var i = 0; i < pool.length; i++) {
      var entry = pool[i];
      if (seen[entry.code]) continue;
      seen[entry.code] = true;
      var s = score(entry, q);
      if (s > 0) out.push({ entry: entry, score: s });
    }
    out.sort(function (a, b) { return b.score - a.score || a.entry.code.localeCompare(b.entry.code); });
    return out.slice(0, MAX_RESULTS);
  }

  function city(row) {
    if (typeof window.apLocalizedCityName === 'function') {
      try {
        var localized = window.apLocalizedCityName(row);
        if (localized) return localized;
      } catch (_) {}
    }
    var lang = String(window.LANG || document.documentElement.lang || 'de').slice(0, 2);
    return row[LANG_COLUMNS[lang] || 2] || row[2] || row[1] || row[0];
  }

  function airport(row) { return row[1] || row[2] || row[0]; }
  function country(row) { return row[3] || ''; }

  function clearCanonical(side, keepText) {
    var input = document.getElementById(side + '-in');
    var sub = document.getElementById(side + '-sub');
    var drop = document.getElementById(side + '-ac');
    window[side + 'I'] = '';
    window[side + 'C'] = '';
    window[side + 'A'] = '';
    if (input) {
      input.removeAttribute('data-fw-iata');
      input.removeAttribute('data-iata');
      if (!keepText) input.value = '';
    }
    if (sub) sub.textContent = '';
    if (drop) {
      drop.innerHTML = '';
      drop.classList.remove('open');
    }
  }

  function render(side, input, drop, results) {
    var html = '';
    for (var i = 0; i < results.length; i++) {
      var row = results[i].entry.row, code = results[i].entry.code;
      html += '<button type="button" class="aci fw-ac-item" role="option" data-fw-ac-code="' + esc(code) + '" data-fw-ac-side="' + esc(side) + '">'
        + '<span class="acb">' + esc(code) + '</span>'
        + '<span><span class="acn">' + esc(city(row)) + (country(row) ? ', ' + esc(country(row)) : '') + '</span>'
        + '<span class="acs">' + esc(airport(row)) + '</span></span></button>';
    }
    drop.innerHTML = html;
    drop.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
  }

  function hide(drop, input) {
    if (drop) { drop.innerHTML = ''; drop.classList.remove('open'); }
    if (input) input.setAttribute('aria-expanded', 'false');
  }

  function commit(side, row) {
    var code = String(row[0] || '').toUpperCase();
    var c = city(row);
    var a = airport(row);
    var input = document.getElementById(side + '-in');
    var sub = document.getElementById(side + '-sub');
    var drop = document.getElementById(side + '-ac');
    if (!/^[A-Z0-9]{3}$/.test(code)) return false;

    if (input) {
      input.value = c;
      input.setAttribute('data-fw-iata', code);
      input.setAttribute('data-iata', code);
    }
    if (sub) sub.textContent = a + ' · ' + code;
    window[side + 'I'] = code;
    window[side + 'C'] = c;
    window[side + 'A'] = a;
    hide(drop, input);
    if (input) input.dispatchEvent(new CustomEvent('fw-place-selected', {
      bubbles: true,
      detail: { side: side, iata: code, city: c, airport: a }
    }));
    return true;
  }

  function showError(side) {
    var input = document.getElementById(side + '-in');
    if (input) input.focus();
    var announce = document.getElementById('search-announce');
    if (announce) announce.textContent = 'Bitte wählen Sie einen gültigen Flughafen aus der Vorschlagsliste.';
    var box = document.getElementById('ebox'), msg = document.getElementById('emsg');
    if (box && msg) {
      msg.textContent = 'Bitte wählen Sie ' + (side === 'from' ? 'den Abflugort' : 'das Reiseziel') + ' aus der Vorschlagsliste.';
      box.classList.add('show');
      setTimeout(function () { box.classList.remove('show'); }, 4500);
    }
  }

  function canonicalMatchesInput(side) {
    var input = document.getElementById(side + '-in');
    var code = String(window[side + 'I'] || '').toUpperCase();
    var selectedCity = fold(window[side + 'C'] || '');
    var value = fold(input ? input.value : '');
    return /^[A-Z0-9]{3}$/.test(code) && !!selectedCity && !!value && selectedCity === value;
  }

  function onInput(ev) {
    var input = ev.target;
    if (!input || (input.id !== 'from-in' && input.id !== 'to-in')) return;
    var side = input.id === 'from-in' ? 'from' : 'to';
    var query = input.value.trim();

    /* Any user edit invalidates the previous canonical selection immediately. */
    window[side + 'I'] = '';
    window[side + 'C'] = '';
    window[side + 'A'] = '';
    input.removeAttribute('data-fw-iata');
    input.removeAttribute('data-iata');
    var sub = document.getElementById(side + '-sub');
    if (sub) sub.textContent = '';

    var drop = document.getElementById(side + '-ac');
    if (!drop) return;
    if (query.length < MIN_QUERY) { hide(drop, input); return; }

    var results = resolve(query);
    if (!results.length) {
      hide(drop, input);
      /* Let the existing app autocomplete perform its server/Duffel fallback. */
      return;
    }

    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
    render(side, input, drop, results);
  }

  function onClick(ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest('.fw-ac-item') : null;
    if (el) {
      var side = el.getAttribute('data-fw-ac-side');
      var code = el.getAttribute('data-fw-ac-code');
      var data = build();
      if (data && side && code) {
        for (var i = 0; i < data.entries.length; i++) {
          if (data.entries[i].code === code) {
            ev.preventDefault();
            ev.stopPropagation();
            if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
            commit(side, data.entries[i].row);
            return;
          }
        }
      }
    }

    /* Guard every real search submit against stale/non-canonical place state. */
    var searchButton = ev.target && ev.target.closest ? ev.target.closest('[data-fn="doSearch"]') : null;
    if (!searchButton) return;
    if (!canonicalMatchesInput('from')) {
      ev.preventDefault(); ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      showError('from');
      return;
    }
    if (!canonicalMatchesInput('to')) {
      ev.preventDefault(); ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      showError('to');
    }
  }

  function init() {
    if (window.__fwMultilingualResolverV3) return;
    window.__fwMultilingualResolverV3 = true;
    document.addEventListener('input', onInput, true);
    document.addEventListener('click', onClick, true);
    window.__fwMultilingualResolverDiagnostics = function () {
      var d = build();
      return {
        installed: true,
        apAvailable: !!d,
        apCount: d ? d.entries.length : 0,
        fields: d && d.entries[0] ? d.entries[0].row.length : 0,
        fromIata: window.fromI || '',
        toIata: window.toI || '',
        fromCanonical: window.fromC || '',
        toCanonical: window.toC || ''
      };
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
