// [INTERNAL-LINKING-SEO-FIX] الجزء اللي كان ناقص من التنفيذ السابق —
// القسم كان موجود بس فاضي ومخفي (display:none) من غير أي جافاسكريبت
// يملاه. هنا بيجيب مسارات حقيقية منشورة فعلياً ويعرضها كروابط
// <a href="/flights/..."> قابلة للزحف، بعدين يظهر القسم. عمداً
// PROXY محلي هنا (مش المتغير العام في app.js) لأن app.js متحمّل
// بـdefer، يعني بيتنفذ بعد أي <script> عادي زي ده — الاعتماد على
// متغيره العام هنا كان هيبقى خطأ ترتيب تنفيذ.
(function() {
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
      var routes = j.routes.slice(0, 24);
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
