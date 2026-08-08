// [INTERNAL-LINKING-SEO-FIX] الجزء اللي كان ناقص من التنفيذ السابق —
// القسم كان موجود بس فاضي ومخفي (display:none) من غير أي جافاسكريبت
// يملاه. هنا بيجيب مسارات حقيقية منشورة فعلياً ويعرضها كروابط
// <a href="/flights/..."> قابلة للزحف، بعدين يظهر القسم. عمداً
// PROXY محلي هنا (مش المتغير العام في app.js) لأن app.js متحمّل
// بـdefer، يعني بيتنفذ بعد أي <script> عادي زي ده — الاعتماد على
// متغيره العام هنا كان هيبقى خطأ ترتيب تنفيذ.
(function() {
  // [SSG-FIRST] The links are now server-rendered into the static HTML at
  // deploy time (scripts/prerender-popular-routes.mjs) so crawlers see them
  // in View Page Source. When that succeeded the container is already
  // populated — skip the redundant fetch + innerHTML (avoids an extra network
  // request and a layout shift on every homepage load). This client-side path
  // now only runs as the fallback when the build-time injection was skipped
  // (e.g. the API was unreachable during the build): container empty, section
  // still hidden — exactly the case this was originally written for.
  var existing = document.getElementById('popular-routes-links');
  if (existing && existing.children.length > 0) return;

  var PROXY_LOCAL = 'https://api.airpiv.com';
  function escHtmlLocal(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }
  fetch(PROXY_LOCAL + '/route-pages?limit=24')
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (!j.ok || !j.routes || !j.routes.length) return;
      // [ROUTE-ORDER] Show the BEST routes first, not the newest. The API's
      // default order (and its sort=score) floats unscored routes to the top
      // — a flood of freshly bulk-added routes with route_score=null — so we
      // sort client-side by route_score descending (null scores last) and
      // then take the top ones.
      var routes = j.routes.slice().sort(function(a, b) {
        var sa = (a.route_score == null) ? -Infinity : a.route_score;
        var sb = (b.route_score == null) ? -Infinity : b.route_score;
        return sb - sa;
      }).slice(0, 24);
      var html = routes.map(function(r) {
        return '<a href="/flights/' + encodeURIComponent(r.slug) + '" ' +
          'style="background:var(--bg2);border:1px solid var(--bd);border-radius:20px;padding:8px 16px;font-size:13px;font-weight:600;color:var(--tx);text-decoration:none">' +
          escHtmlLocal(r.origin_city) + ' → ' + escHtmlLocal(r.destination_city) +
        '</a>';
      }).join('');
      document.getElementById('popular-routes-links').innerHTML = html;
      document.getElementById('popular-routes-links-section').style.display = '';
    })
    .catch(function() { /* القسم يفضل مخفي بأمان لو الطلب فشل */ });
})();
