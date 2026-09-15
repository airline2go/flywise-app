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

/*
 * Universal place resolver
 * ------------------------
 * Search input may be Arabic, Latin, Cyrillic, CJK, Turkish, accented, or a
 * common misspelling. The resolver never sends the user's spelling to the
 * flight search itself: selecting a result continues to use the canonical
 * IATA code already carried by the AP dataset.
 *
 * The resolver is deliberately local-first. It indexes AP once, ranks exact /
 * prefix / token / substring matches, and only uses a small edit-distance
 * fallback for sufficiently long queries. Low-confidence matches are not
 * allowed to replace the existing server autocomplete fallback.
 */
(function () {
  if (typeof window === 'undefined') return;

  var MAX_RESULTS = 8;
  var MIN_FUZZY_LENGTH = 4;
  var FUZZY_MAX_DISTANCE = 2;
  var index = null;

  function fold(value) {
    return String(value == null ? '' : value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[ى]/g, 'ي')
      .replace(/[ؤ]/g, 'و')
      .replace(/[ئ]/g, 'ي')
      .replace(/[ة]/g, 'ه')
      .replace(/[ـ]/g, '')
      .replace(/[ß]/g, 'ss')
      .replace(/[øØ]/g, 'o')
      .replace(/[æÆ]/g, 'ae')
      .replace(/[œŒ]/g, 'oe')
      .replace(/[łŁ]/g, 'l')
      .replace(/[đðÐ]/g, 'd')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function compact(value) {
    return fold(value).replace(/\s+/g, '');
  }

  function tokens(value) {
    var f = fold(value);
    if (!f) return [];
    return f.split(' ').filter(Boolean);
  }

  function levenshtein(a, b, limit) {
    if (a === b) return 0;
    if (!a || !b) return Math.max(a.length, b.length);
    if (Math.abs(a.length - b.length) > limit) return limit + 1;

    var prev = new Array(b.length + 1);
    var cur = new Array(b.length + 1);
    for (var j = 0; j <= b.length; j++) prev[j] = j;

    for (var i = 1; i <= a.length; i++) {
      cur[0] = i;
      var rowMin = cur[0];
      for (var k = 1; k <= b.length; k++) {
        var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
        cur[k] = Math.min(cur[k - 1] + 1, prev[k] + 1, prev[k - 1] + cost);
        rowMin = Math.min(rowMin, cur[k]);
      }
      if (rowMin > limit) return limit + 1;
      var tmp = prev;
      prev = cur;
      cur = tmp;
    }
    return prev[b.length];
  }

  function unique(values) {
    var seen = {};
    var out = [];
    for (var i = 0; i < values.length; i++) {
      var value = fold(values[i]);
      if (!value || seen[value]) continue;
      seen[value] = true;
      out.push(value);
    }
    return out;
  }

  function buildIndex() {
    if (index && index.source === window.AP) return index;
    if (!Array.isArray(window.AP)) return null;

    var entries = [];
    var exact = Object.create(null);
    var prefix = Object.create(null);

    for (var i = 0; i < window.AP.length; i++) {
      var row = window.AP[i];
      if (!Array.isArray(row) || !row[0]) continue;

      var code = String(row[0]).toUpperCase();
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
        if (!exact[value]) exact[value] = [];
        exact[value].push(entry);

        var parts = value.split(' ');
        for (var p = 0; p < parts.length; p++) {
          if (parts[p].length < 2) continue;
          var key = parts[p].slice(0, Math.min(5, parts[p].length));
          if (!prefix[key]) prefix[key] = [];
          prefix[key].push(entry);
        }
      }
    }

    index = { source: window.AP, entries: entries, exact: exact, prefix: prefix };
    return index;
  }

  function scoreEntry(entry, query) {
    var q = fold(query);
    var qCompact = compact(query);
    var qTokens = tokens(query);
    var best = 0;

    for (var i = 0; i < entry.values.length; i++) {
      var value = entry.values[i];
      var valueCompact = value.replace(/\s+/g, '');
      var valueTokens = value.split(' ');

      if (value === q) best = Math.max(best, 1200);
      else if (valueCompact === qCompact) best = Math.max(best, 1180);
      else if (value.indexOf(q) === 0) best = Math.max(best, 1000);
      else if (valueTokens.some(function (t) { return t.indexOf(q) === 0; })) best = Math.max(best, 920);
      else if (qTokens.every(function (qt) {
        return valueTokens.some(function (vt) { return vt.indexOf(qt) === 0; });
      })) best = Math.max(best, 850);
      else if (value.indexOf(q) >= 0) best = Math.max(best, 700);
    }

    if (best >= 700 || q.length < MIN_FUZZY_LENGTH) return best;

    for (var x = 0; x < entry.values.length; x++) {
      var candidate = entry.values[x];
      var candidateTokens = candidate.split(' ');
      for (var y = 0; y < candidateTokens.length; y++) {
        var token = candidateTokens[y];
        if (Math.abs(token.length - q.length) > FUZZY_MAX_DISTANCE) continue;
        var distance = levenshtein(q, token, FUZZY_MAX_DISTANCE);
        if (distance <= FUZZY_MAX_DISTANCE) {
          var fuzzyScore = distance === 1 ? 520 : 440;
          if (token.length >= 7 && distance === 2) fuzzyScore = 400;
          best = Math.max(best, fuzzyScore);
        }
      }
    }
    return best;
  }

  function collectCandidates(q) {
    var data = buildIndex();
    if (!data) return [];

    var candidates = [];
    var seen = Object.create(null);
    var key = fold(q).slice(0, 5);
    var pool = data.prefix[key] || data.entries;

    for (var i = 0; i < pool.length; i++) {
      var entry = pool[i];
      if (seen[entry.code]) continue;
      seen[entry.code] = true;
      var score = scoreEntry(entry, q);
      if (score > 0) candidates.push({ entry: entry, score: score });
    }

    candidates.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.code.localeCompare(b.entry.code);
    });
    return candidates;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;');
  }

  function localizedCity(row) {
    if (typeof window.apLocalizedCityName === 'function') {
      var localized = window.apLocalizedCityName(row);
      if (localized) return localized;
    }
    return row[2] || row[1] || row[0];
  }

  function render(side, candidates, drop) {
    var rows = [];
    var seen = Object.create(null);
    for (var i = 0; i < candidates.length && rows.length < MAX_RESULTS; i++) {
      var row = candidates[i].entry.row;
      var code = candidates[i].entry.code;
      if (seen[code]) continue;
      seen[code] = true;
      rows.push(row);
    }
    if (!rows.length) return false;

    var html = '';
    for (var j = 0; j < rows.length; j++) {
      var item = rows[j];
      var code = String(item[0] || '').toUpperCase();
      var airport = item[1] || item[2] || code;
      var city = localizedCity(item);
      var country = item[3] || '';
      html += '<div class="aci" role="option" aria-selected="false" data-side="' + esc(side) + '" data-code="' + esc(code) + '" data-name="' + esc(airport) + '" data-city="' + esc(item[2] || city) + '" data-fn="doPickAC" data-fn-arg="$el">';
      html += '<div class="acb">' + esc(code) + '</div>';
      html += '<div><div class="acn">' + esc(city) + (country ? ', ' + esc(country) : '') + '</div><div class="acs">' + esc(airport) + '</div></div>';
      html += '</div>';
    }
    drop.innerHTML = html;
    drop.classList.add('open');
    return true;
  }

  function localResolve(side, query, drop) {
    if (!drop || !String(query || '').trim()) return false;
    var candidates = collectCandidates(query);
    if (!candidates.length) return false;

    /* Never auto-pick an ambiguous result. Suggestions stay visible and the
       existing picker remains responsible for the final canonical IATA code. */
    return render(side, candidates, drop);
  }

  function install() {
    if (typeof window.acS !== 'function' || window.__fwUniversalAcInstalled) return;
    var originalAcS = window.acS;
    window.acS = function (side, query) {
      var drop = document.getElementById(side + '-ac');
      if (drop && String(query || '').trim().length >= 2 && localResolve(side, query, drop)) return;
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