window.APP_CONFIG = {
  SUPABASE_URL: "https://tflpaysskecpmdpwbvog.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ZXi_Rq2zYQIj3LJoNFRctQ_eZogIGD0",
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

// [MULTILINGUAL-SEARCH] Resolve origin/destination against the bundled AP
// dataset before falling back to the server/Duffel places endpoint. AP already
// contains the site's supported localized city names; this layer makes matching
// accent/case/punctuation/Arabic-normalization tolerant and searches every
// localized name field instead of requiring an English query.
(function () {
  if (typeof window === 'undefined') return;

  function fold(value) {
    return String(value == null ? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ـ/g, '')
      .replace(/ß/g, 'ss')
      .replace(/[øØ]/g, 'o')
      .replace(/[æÆ]/g, 'ae')
      .replace(/[œŒ]/g, 'oe')
      .replace(/[łŁ]/g, 'l')
      .replace(/[đðÐ]/g, 'd')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }

  function esc(value) {
    return String(value == null ? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function render(side, rows, drop) {
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var code = String(row[0] || '').toUpperCase();
      var airport = row[1] || row[2] || code;
      var city = (typeof window.apLocalizedCityName === 'function')
        ? window.apLocalizedCityName(row)
        : (row[2] || airport);
      var country = row[3] || '';
      html += '<div class="aci" role="option" aria-selected="false" data-side="' + esc(side) + '" data-code="' + esc(code) + '" data-name="' + esc(airport) + '" data-city="' + esc(row[2] || city) + '" data-fn="doPickAC" data-fn-arg="$el">';
      html += '<div class="acb">' + esc(code) + '</div>';
      html += '<div><div class="acn">' + esc(city) + (country ? ', ' + esc(country) : '') + '</div><div class="acs">' + esc(airport) + '</div></div>';
      html += '</div>';
    }
    drop.innerHTML = html;
    drop.classList.add('open');
  }

  function localResolve(side, query, drop) {
    if (!Array.isArray(window.AP) || !drop) return false;
    var q = fold(query);
    if (!q) return false;

    var scored = [];
    for (var i = 0; i < window.AP.length; i++) {
      var row = window.AP[i];
      if (!Array.isArray(row) || !row[0]) continue;
      var best = 0;
      for (var j = 0; j < row.length; j++) {
        var value = fold(row[j]);
        if (!value) continue;
        if (value === q) best = Math.max(best, j === 0 ? 1000 : 900);
        else if (value.indexOf(q) === 0) best = Math.max(best, j === 0 ? 800 : 700);
        else if (value.indexOf(' ' + q) >= 0 || value.indexOf(q + ' ') === 0) best = Math.max(best, 600);
        else if (value.indexOf(q) >= 0) best = Math.max(best, 400);
      }
      if (best > 0) scored.push({ row: row, score: best });
    }

    if (!scored.length) return false;
    scored.sort(function (a, b) { return b.score - a.score; });

    var seen = {};
    var rows = [];
    for (var k = 0; k < scored.length && rows.length < 8; k++) {
      var code = String(scored[k].row[0]).toUpperCase();
      if (seen[code]) continue;
      seen[code] = true;
      rows.push(scored[k].row);
    }
    render(side, rows, drop);
    return true;
  }

  function install() {
    if (typeof window.acS !== 'function' || window.__fwUniversalAcInstalled) return;
    var originalAcS = window.acS;
    window.acS = function (side, query) {
      var drop = document.getElementById(side + '-ac');
      if (drop && query && String(query).trim().length >= 2 && localResolve(side, query, drop)) return;
      return originalAcS.apply(this, arguments);
    };
    window.__fwUniversalAcInstalled = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
