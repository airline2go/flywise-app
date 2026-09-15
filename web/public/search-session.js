/* Search Session bootstrap — no UI. Issues a short-lived token after
   (optional) Turnstile and attaches X-Search-Session on /search and
   /search/airports. Guests can still search without an account. */
(function () {
  var TOKEN_KEY = 'fw_search_session';
  var EXP_KEY = 'fw_search_session_exp';
  var PROXY = 'https://api.airpiv.com';
  var inflight = null;
  var origFetch = window.fetch;

  function siteKey() {
    return (window.APP_CONFIG && window.APP_CONFIG.TURNSTILE_SITE_KEY) || '';
  }

  function storedToken() {
    try {
      var t = sessionStorage.getItem(TOKEN_KEY);
      var exp = parseInt(sessionStorage.getItem(EXP_KEY) || '0', 10);
      if (t && exp > (Date.now() / 1000) + 60) return t;
    } catch (e) { /* private mode */ }
    return null;
  }

  function saveToken(token, exp) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(EXP_KEY, String(exp || 0));
    } catch (e) { /* ignore */ }
  }

  function clearToken() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(EXP_KEY);
    } catch (e) { /* ignore */ }
  }

  function loadTurnstile() {
    var key = siteKey();
    if (!key) return Promise.resolve(null);
    if (window.turnstile) return Promise.resolve(window.turnstile);
    return new Promise(function (resolve) {
      var existing = document.querySelector('script[data-fw-turnstile]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(window.turnstile || null); });
        existing.addEventListener('error', function () { resolve(null); });
        return;
      }
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.setAttribute('data-fw-turnstile', '1');
      s.onload = function () { resolve(window.turnstile || null); };
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    });
  }

  function getTurnstileToken() {
    var key = siteKey();
    if (!key) return Promise.resolve(null);
    return loadTurnstile().then(function (ts) {
      if (!ts || typeof ts.render !== 'function') return null;
      return new Promise(function (resolve) {
        var el = document.getElementById('fw-cf-turnstile');
        if (!el) {
          el = document.createElement('div');
          el.id = 'fw-cf-turnstile';
          el.setAttribute('aria-hidden', 'true');
          el.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;clip:rect(0,0,0,0);';
          document.body.appendChild(el);
        }
        var done = false;
        var finish = function (token) {
          if (done) return;
          done = true;
          resolve(token || null);
        };
        try {
          var widgetId = ts.render(el, {
            sitekey: key,
            size: 'invisible',
            callback: finish,
            'error-callback': function () { finish(null); },
            'expired-callback': function () { finish(null); },
          });
          if (typeof ts.execute === 'function') ts.execute(widgetId);
          setTimeout(function () { finish(null); }, 8000);
        } catch (e) {
          finish(null);
        }
      });
    });
  }

  function issueSession() {
    if (inflight) return inflight;
    inflight = getTurnstileToken().then(function (tsToken) {
      var body = {};
      if (tsToken) body.turnstile_token = tsToken;
      return origFetch.call(window, PROXY + '/search/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(function (r) { return r.json(); });
    }).then(function (j) {
      inflight = null;
      if (j && j.ok && j.token) {
        saveToken(j.token, j.expires_at);
        return j.token;
      }
      return null;
    }).catch(function () {
      inflight = null;
      return null;
    });
    return inflight;
  }

  function ensureSession() {
    var t = storedToken();
    if (t) return Promise.resolve(t);
    return issueSession();
  }

  function isGuarded(url) {
    var u = String(url || '');
    if (u.indexOf('/search/session') !== -1) return false;
    if (u.indexOf('/search/airports') !== -1) return true;
    return /\/search(?:\?|$)/.test(u);
  }

  function withSessionHeader(init, token) {
    var next = init ? Object.assign({}, init) : {};
    var headers = new Headers(next.headers || {});
    if (token) headers.set('X-Search-Session', token);
    next.headers = headers;
    return next;
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!isGuarded(url)) return origFetch.call(window, input, init);
    return ensureSession().then(function (token) {
      return origFetch.call(window, input, withSessionHeader(init, token)).then(function (res) {
        if (res.status !== 403) return res;
        clearToken();
        return issueSession().then(function (t2) {
          return origFetch.call(window, input, withSessionHeader(init, t2));
        });
      });
    });
  };

  window.ensureSearchSession = ensureSession;

  function prefetch() { ensureSession(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prefetch);
  } else {
    prefetch();
  }
})();

/* [AIRPIV-UNIFIED-UI-V7]
   One autocomplete presentation/selection path for the homepage, Multi-City,
   and the normal/round-trip results editor. This intentionally only touches
   UI/state for location picking; search payload/pricing rules remain unchanged. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var MIN_QUERY = 1, MAX_RESULTS = 8, LANG_COLUMNS = { de: 2, en: 4, ar: 5, es: 7, fr: 8, it: 9, nl: 10, tr: 11 };

  function fold(v) {
    return String(v == null ? '' : v).normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '')
      .replace(/ß/g, 'ss').replace(/[øØ]/g, 'o').replace(/[æÆ]/g, 'ae')
      .replace(/[œŒ]/g, 'oe').replace(/[łŁ]/g, 'l').replace(/[đðÐ]/g, 'd')
      .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
  }

  function queryLang(q) {
    if (/[\u0600-\u06FF]/.test(q)) return 'ar';
    if (/[ñÑ]/.test(q)) return 'es';
    if (/[çÇœŒ]/.test(q)) return 'fr';
    return String(window.LANG || document.documentElement.lang || 'de').slice(0, 2);
  }

  function city(row, q) {
    var l = queryLang(q || '');
    if (LANG_COLUMNS[l] != null && row[LANG_COLUMNS[l]]) return row[LANG_COLUMNS[l]];
    if (typeof window.apLocalizedCityName === 'function') {
      try { var x = window.apLocalizedCityName(row); if (x) return x; } catch (_) {}
    }
    return row[2] || row[1] || row[0];
  }

  function airport(row) { return row[1] || row[2] || row[0]; }
  function country(row) { return row[3] || ''; }

  function entries() {
    var ap = window.AP;
    if (!Array.isArray(ap)) return [];
    var out = [];
    for (var i = 0; i < ap.length; i++) {
      var row = ap[i];
      if (!Array.isArray(row)) continue;
      var code = String(row[0] || '').toUpperCase();
      if (!/^[A-Z0-9]{3}$/.test(code)) continue;
      var vals = [];
      for (var j = 0; j < row.length; j++) if (typeof row[j] === 'string' && row[j].trim()) vals.push(fold(row[j]));
      if (typeof window.apLocalizedCityName === 'function') {
        try { vals.push(fold(window.apLocalizedCityName(row))); } catch (_) {}
      }
      var seen = Object.create(null), unique = [];
      for (var k = 0; k < vals.length; k++) if (vals[k] && !seen[vals[k]]) { seen[vals[k]] = 1; unique.push(vals[k]); }
      out.push({ row: row, code: code, values: unique });
    }
    return out;
  }

  function score(entry, q) {
    var qt = fold(q), best = 0;
    if (!qt) return 0;
    var parts = qt.split(' ').filter(Boolean);
    for (var i = 0; i < entry.values.length; i++) {
      var v = entry.values[i], compact = v.replace(/ /g, ''), qcompact = qt.replace(/ /g, ''), vp = v.split(' ');
      if (v === qt) best = Math.max(best, 1200);
      else if (compact === qcompact) best = Math.max(best, 1150);
      else if (/^ال/.test(v) && v.slice(2) === qt) best = Math.max(best, 1180);
      else if (v.indexOf(qt) === 0) best = Math.max(best, 1000);
      else if (vp.some(function (p) { return p.indexOf(qt) === 0; })) best = Math.max(best, 900);
      else if (parts.length && parts.every(function (p) { return vp.some(function (x) { return x.indexOf(p) === 0; }); })) best = Math.max(best, 820);
      else if (v.indexOf(qt) >= 0) best = Math.max(best, 700);
    }
    return best;
  }

  function resolve(q) {
    var fq = fold(q), es = entries(), out = [];
    if (!fq) return out;
    for (var i = 0; i < es.length; i++) {
      var s = score(es[i], fq);
      if (s > 0) out.push({ entry: es[i], score: s });
    }
    out.sort(function (a, b) { return b.score - a.score || a.entry.code.localeCompare(b.entry.code); });
    return out.slice(0, MAX_RESULTS);
  }

  function getInput(side) { return document.getElementById(side + '-in'); }
  function getDrop(side) { return document.getElementById(side + '-ac'); }

  function renderDrop(drop, results, q) {
    if (!drop) return;
    var h = '';
    for (var i = 0; i < results.length; i++) {
      var r = results[i].entry.row, c = results[i].entry.code;
      h += '<button type="button" class="aci fw-ac-item" role="option" data-fw-unified-code="' + esc(c) + '">' +
        '<span class="acb">' + esc(c) + '</span>' +
        '<span><span class="acn">' + esc(city(r, q)) + (country(r) ? ', ' + esc(country(r)) : '') + '</span>' +
        '<span class="acs">' + esc(airport(r)) + '</span></span></button>';
    }
    drop.innerHTML = h;
    drop.classList.add('open');
  }

  function hideDrop(drop) {
    if (!drop) return;
    drop.innerHTML = '';
    drop.classList.remove('open');
  }

  function findCode(code) {
    var es = entries(), c = String(code || '').toUpperCase();
    for (var i = 0; i < es.length; i++) if (es[i].code === c) return es[i];
    return null;
  }

  function commitMain(side, entry, q) {
    var row = entry.row, code = entry.code, el = getInput(side), sub = document.getElementById(side + '-sub');
    if (!el) return;
    var c = city(row, q), a = airport(row);
    el.value = c;
    el.setAttribute('data-fw-iata', code);
    el.setAttribute('data-iata', code);
    el.setAttribute('data-fw-selected', fold(c));
    window[side + 'I'] = code;
    window[side + 'C'] = c;
    window[side + 'A'] = a;
    if (sub) sub.textContent = a + ' · ' + code;
    hideDrop(getDrop(side));
  }

  function mcTarget(id) {
    var m = String(id || '').match(/^mc-(from|to)-(\d+)$/);
    return m ? { side: m[1], idx: parseInt(m[2], 10), input: document.getElementById(id), drop: document.getElementById('mc-ac-' + m[1] + '-' + m[2]) } : null;
  }

  function rpTarget(id) {
    var m = String(id || '').match(/^rpe-(from|to)$/);
    if (m) return { side: m[1], idx: -1, input: document.getElementById(id), drop: document.getElementById(id + '-ac') };
    m = String(id || '').match(/^rpe-mc-(from|to)-(\d+)$/);
    if (m) return { side: m[1], idx: parseInt(m[2], 10), input: document.getElementById(id), drop: document.getElementById('rpe-mc-ac-' + m[2] + '-' + m[1]) };
    return null;
  }

  function ensureRpDrop(target) {
    if (target.drop) return target.drop;
    if (!target.input || !target.input.parentNode) return null;
    var d = document.createElement('div');
    d.id = target.input.id + '-ac';
    d.className = 'acdrop';
    d.style.cssText = 'position:absolute;top:100%;left:0;right:0;z-index:200';
    var p = target.input.parentNode;
    p.style.position = 'relative';
    p.appendChild(d);
    target.drop = d;
    return d;
  }

  function commitMc(target, entry, q) {
    if (!Array.isArray(window.mcLegsData) || !window.mcLegsData[target.idx]) return;
    var row = entry.row, code = entry.code, c = city(row, q), input = target.input;
    window.mcLegsData[target.idx][target.side] = code;
    window.mcLegsData[target.idx][target.side + 'C'] = c;
    if (input) input.value = c;
    hideDrop(target.drop);
    if (target.side === 'to' && target.idx < window.mcLegsData.length - 1) {
      window.mcLegsData[target.idx + 1].from = code;
      window.mcLegsData[target.idx + 1].fromC = c;
      var next = document.getElementById('mc-from-' + (target.idx + 1));
      if (next) next.value = c;
    }
  }

  function commitRp(target, entry, q) {
    var row = entry.row, code = entry.code, c = city(row, q), input = target.input;
    if (target.idx >= 0 && Array.isArray(window.mcLegsData) && window.mcLegsData[target.idx]) {
      window.mcLegsData[target.idx][target.side] = code;
      window.mcLegsData[target.idx][target.side + 'C'] = c;
      if (input) input.value = c;
      hideDrop(target.drop);
      if (target.side === 'to' && target.idx < window.mcLegsData.length - 1) {
        window.mcLegsData[target.idx + 1].from = code;
        window.mcLegsData[target.idx + 1].fromC = c;
        var nextMc = document.getElementById('rpe-mc-from-' + (target.idx + 1));
        if (nextMc) nextMc.textContent = c;
      }
      return;
    }
    if (target.side === 'from') { window.fromI = code; window.fromC = c; }
    else { window.toI = code; window.toC = c; }
    if (input) input.value = c;
    var main = getInput(target.side), sub = document.getElementById(target.side + '-sub');
    if (main) { main.value = c; main.setAttribute('data-fw-iata', code); main.setAttribute('data-iata', code); main.setAttribute('data-fw-selected', fold(c)); }
    if (sub) sub.textContent = airport(row) + ' · ' + code;
    hideDrop(target.drop);
  }

  function closeBlockingOverlays(ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('[data-fn="closeAuthBanner"]') : null;
    if (t) {
      ev.preventDefault(); ev.stopPropagation();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      var b = document.getElementById('auth-welcome-banner');
      if (b) { b.style.display = 'none'; b.style.pointerEvents = 'none'; }
      try { localStorage.setItem('fw_auth_banner_dismissed', '1'); } catch (_) {}
      return true;
    }
    var c = ev.target && ev.target.closest ? ev.target.closest('.ck-no, .ck-ok') : null;
    if (c) {
      ev.preventDefault(); ev.stopPropagation();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      var ck = document.getElementById('ck');
      if (ck) { ck.classList.add('hide'); ck.style.pointerEvents = 'none'; ck.style.display = 'none'; }
      try { localStorage.setItem('ck', c.classList.contains('ck-ok') ? '1' : '0'); } catch (_) {}
      return true;
    }
    return false;
  }

  function onInput(ev) {
    if (closeBlockingOverlays(ev)) return;
    var el = ev.target;
    if (!el || el.tagName !== 'INPUT') return;
    var mainSide = el.id === 'from-in' ? 'from' : el.id === 'to-in' ? 'to' : null;
    var mt = mcTarget(el.id), rt = rpTarget(el.id);
    if (!mainSide && !mt && !rt) return;
    var q = String(el.value || '').trim();
    if (!mainSide && typeof window.acTypeReset === 'function') {
      /* Legacy globals must not retain the old selection while typing. */
    }
    if (q.length < MIN_QUERY) {
      hideDrop(mainSide ? getDrop(mainSide) : (mt ? mt.drop : ensureRpDrop(rt)));
      return;
    }
    var results = resolve(q);
    if (!results.length) {
      hideDrop(mainSide ? getDrop(mainSide) : (mt ? mt.drop : ensureRpDrop(rt)));
      return;
    }
    ev.preventDefault(); ev.stopPropagation();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    if (mainSide) {
      if (typeof window.acTypeReset === 'function') window.acTypeReset(mainSide);
      renderDrop(getDrop(mainSide), results, q);
    } else if (mt) {
      window.mcLegsData && window.mcLegsData[mt.idx] && (window.mcLegsData[mt.idx][mt.side] = '', window.mcLegsData[mt.idx][mt.side + 'C'] = '');
      renderDrop(mt.drop, results, q);
    } else if (rt) {
      var d = ensureRpDrop(rt);
      renderDrop(d, results, q);
    }
  }

  function onPick(ev) {
    if (closeBlockingOverlays(ev)) return;
    var item = ev.target && ev.target.closest ? ev.target.closest('[data-fw-unified-code]') : null;
    if (!item) return;
    var code = item.getAttribute('data-fw-unified-code'), entry = findCode(code);
    if (!entry) return;
    var drop = item.closest('.acdrop, .ac-drop'), id = drop && drop.id || '';
    ev.preventDefault(); ev.stopPropagation();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    var main = id.match(/^(from|to)-ac$/);
    if (main) { commitMain(main[1], entry, document.getElementById(main[1] + '-in').value); return; }
    var mc = id.match(/^mc-ac-(from|to)-(\d+)$/);
    if (mc) { commitMc({ side: mc[1], idx: parseInt(mc[2], 10), input: document.getElementById('mc-' + mc[1] + '-' + mc[2]), drop: drop }, entry, document.getElementById('mc-' + mc[1] + '-' + mc[2]).value); return; }
    var rp = id.match(/^rpe-(from|to)-ac$/);
    if (rp) { commitRp({ side: rp[1], idx: -1, input: document.getElementById('rpe-' + rp[1]), drop: drop }, entry, document.getElementById('rpe-' + rp[1]).value); return; }
    var rpm = id.match(/^rpe-mc-ac-(\d+)-(from|to)$/);
    if (rpm) { var rid = 'rpe-mc-' + rpm[2] + '-' + rpm[1]; commitRp({ side: rpm[2], idx: parseInt(rpm[1], 10), input: document.getElementById(rid), drop: drop }, entry, document.getElementById(rid).value); }
  }

  function init() {
    document.addEventListener('pointerdown', onPick, true);
    document.addEventListener('mousedown', onPick, true);
    document.addEventListener('click', onPick, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('compositionend', onInput, true);
    document.addEventListener('change', onInput, true);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        var b = document.getElementById('auth-welcome-banner');
        if (b && b.style.display !== 'none') { b.style.display = 'none'; b.style.pointerEvents = 'none'; try { localStorage.setItem('fw_auth_banner_dismissed', '1'); } catch (_) {} }
        var ck = document.getElementById('ck');
        if (ck && !ck.classList.contains('hide')) { ck.classList.add('hide'); ck.style.pointerEvents = 'none'; ck.style.display = 'none'; try { localStorage.setItem('ck', '0'); } catch (_) {} }
      }
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
