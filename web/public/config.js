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
 * Multilingual place resolver.
 * The production app uses #from-in / #to-in with data-inp-fn handlers.
 * Intercept those real inputs in capture phase instead of wrapping acS.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var MAX_RESULTS = 8;
  var MIN_QUERY = 2;
  var index = null;
  var LANG_COLUMNS = { de: 2, en: 4, ar: 5, es: 7, fr: 8, it: 9, nl: 10 };

  function fold(v) {
    return String(v == null ? '' : v)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '')
      .replace(/ß/g, 'ss').replace(/[øØ]/g, 'o').replace(/[æÆ]/g, 'ae').replace(/[œŒ]/g, 'oe').replace(/[łŁ]/g, 'l').replace(/[đðÐ]/g, 'd')
      .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function names(row) {
    var out = [];
    for (var i = 0; i < row.length; i++) if (typeof row[i] === 'string' && row[i].trim()) out.push(fold(row[i]));
    return Array.from(new Set(out));
  }

  function build() {
    if (index && index.source === window.AP) return index;
    if (!Array.isArray(window.AP) || !window.AP.length) return null;
    var entries = [];
    for (var i = 0; i < window.AP.length; i++) {
      var row = window.AP[i];
      if (!Array.isArray(row) || !/^[A-Za-z0-9]{3}$/.test(String(row[0] || ''))) continue;
      var vals = names(row);
      if (vals.length) entries.push({ row: row, code: String(row[0]).toUpperCase(), vals: vals });
    }
    index = { source: window.AP, entries: entries };
    return index;
  }

  function score(entry, q) {
    var fq = fold(q), best = 0, qt = fq.split(' ').filter(Boolean);
    for (var i = 0; i < entry.vals.length; i++) {
      var v = entry.vals[i], vt = v.split(' ');
      if (v === fq) best = Math.max(best, 1200);
      else if (v.replace(/ /g, '') === fq.replace(/ /g, '')) best = Math.max(best, 1150);
      else if (v.indexOf(fq) === 0) best = Math.max(best, 1000);
      else if (vt.some(function (t) { return t.indexOf(fq) === 0; })) best = Math.max(best, 900);
      else if (qt.length && qt.every(function (t) { return vt.some(function (x) { return x.indexOf(t) === 0; }); })) best = Math.max(best, 820);
      else if (v.indexOf(fq) >= 0) best = Math.max(best, 700);
    }
    return best;
  }

  function resolve(q) {
    var data = build();
    if (!data) return [];
    var out = [];
    for (var i = 0; i < data.entries.length; i++) {
      var s = score(data.entries[i], q);
      if (s) out.push({ entry: data.entries[i], score: s });
    }
    out.sort(function (a, b) { return b.score - a.score || a.entry.code.localeCompare(b.entry.code); });
    return out.slice(0, MAX_RESULTS);
  }

  function city(row) {
    var lang = String(window.LANG || document.documentElement.lang || 'de').slice(0, 2);
    return row[LANG_COLUMNS[lang] || 2] || row[2] || row[1] || row[0];
  }
  function airport(row) { return row[1] || row[2] || row[0]; }
  function country(row) { return row[3] || ''; }

  function render(side, drop, input, results) {
    var html = '';
    results.forEach(function (r) {
      var row = r.entry.row, code = r.entry.code;
      html += '<button type="button" class="aci fw-ac-item" role="option" data-fw-ac-code="' + esc(code) + '" data-fw-ac-side="' + esc(side) + '">'
        + '<span class="acb">' + esc(code) + '</span>'
        + '<span><span class="acn">' + esc(city(row)) + (country(row) ? ', ' + esc(country(row)) : '') + '</span>'
        + '<span class="acs">' + esc(airport(row)) + '</span></span></button>';
    });
    drop.innerHTML = html;
    drop.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
  }

  function hide(drop, input) {
    if (drop) drop.classList.remove('open');
    if (input) input.setAttribute('aria-expanded', 'false');
  }

  function commit(side, row) {
    var code = String(row[0]).toUpperCase(), c = city(row);
    var input = document.getElementById(side + '-in');
    var sub = document.getElementById(side + '-sub');
    var drop = document.getElementById(side + '-ac');
    if (input) { input.value = c; input.setAttribute('data-fw-iata', code); }
    if (sub) sub.textContent = airport(row) + ' · ' + code;
    window[side + 'I'] = code;
    window[side + 'C'] = c;
    window[side + 'A'] = airport(row);
    hide(drop, input);
    if (input) input.dispatchEvent(new CustomEvent('fw-place-selected', { bubbles: true, detail: { side: side, iata: code, city: c, airport: airport(row) } }));
  }

  function onInput(ev) {
    var input = ev.target;
    if (!input || (input.id !== 'from-in' && input.id !== 'to-in')) return;
    var side = input.id === 'from-in' ? 'from' : 'to';
    var drop = document.getElementById(side + '-ac');
    var q = input.value.trim();
    if (!drop || q.length < MIN_QUERY) return;
    var results = resolve(q);
    if (!results.length) return;
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
    render(side, drop, input, results);
  }

  function onClick(ev) {
    var el = ev.target.closest ? ev.target.closest('.fw-ac-item') : null;
    if (!el) return;
    var side = el.getAttribute('data-fw-ac-side'), code = el.getAttribute('data-fw-ac-code'), data = build();
    if (!data) return;
    for (var i = 0; i < data.entries.length; i++) if (data.entries[i].code === code) {
      ev.preventDefault(); ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      commit(side, data.entries[i].row);
      return;
    }
  }

  function init() {
    if (window.__fwMultilingualResolverV2) return;
    window.__fwMultilingualResolverV2 = true;
    document.addEventListener('input', onInput, true);
    document.addEventListener('click', onClick, true);
    window.__fwMultilingualResolverDiagnostics = function () {
      var d = build();
      return { installed: true, apAvailable: !!d, apCount: d ? d.entries.length : 0, fields: d && d.entries[0] ? d.entries[0].row.length : 0 };
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
