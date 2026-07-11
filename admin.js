// ============ [ADMIN-AUTH] API CONFIG ============
// The dashboard talks ONLY to these endpoints — never directly to
// Supabase from the browser. Change API_BASE if the backend ever moves.
const API_BASE = 'https://api.airpiv.com';
let ADMIN_TOKEN = sessionStorage.getItem('airpiv_admin_token') || null;
// [STAFF-ROLES] Defaults to 'admin' when unset — a token stored before this
// feature existed can only be the legacy ADMIN_TOKEN, which is always full
// access anyway. Every FRESH login (owner or staff) sets this explicitly.
let ADMIN_ROLE = sessionStorage.getItem('airpiv_admin_role') || 'admin';
let ADMIN_NAME = sessionStorage.getItem('airpiv_admin_name') || '';
let _staffLoginMode = false;

// Wrapper around fetch() that always sends the bearer token and handles
// 401s uniformly (kick back to the login screen if the token is rejected).
async function adminFetch(path, opts) {
  opts = opts || {};
  opts.headers = Object.assign({ 'Authorization': 'Bearer ' + ADMIN_TOKEN, 'Content-Type': 'application/json' }, opts.headers || {});
  const res = await fetch(API_BASE + path, opts);
  if (res.status === 401) {
    ADMIN_TOKEN = null;
    sessionStorage.removeItem('airpiv_admin_token');
    showLoginScreen('انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى');
    throw new Error('unauthorized');
  }
  return res;
}

function showLoginScreen(errMsg) {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-shell').classList.remove('ready');
  if (errMsg) {
    const err = document.getElementById('login-err');
    err.textContent = errMsg;
    err.classList.add('show');
  }
}

async function doAdminLogin() {
  const pwInput = document.getElementById('login-password');
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-err');
  const password = pwInput.value || '';
  if (!password) return;
  err.classList.remove('show');
  btn.disabled = true; btn.textContent = '...';
  try {
    const res = await fetch(API_BASE + '/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const j = await res.json();
    if (res.ok && j.ok && j.token) {
      ADMIN_TOKEN = j.token;
      ADMIN_ROLE = j.role || 'admin';
      ADMIN_NAME = '';
      sessionStorage.setItem('airpiv_admin_token', ADMIN_TOKEN);
      sessionStorage.setItem('airpiv_admin_role', ADMIN_ROLE);
      sessionStorage.setItem('airpiv_admin_name', ADMIN_NAME);
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app-shell').classList.add('ready');
      pwInput.value = '';
      initDashboard();
    } else {
      err.textContent = j.error || 'كلمة مرور خاطئة';
      err.classList.add('show');
    }
  } catch (e) {
    err.textContent = 'خطأ في الاتصال بالسيرفر';
    err.classList.add('show');
  } finally {
    btn.disabled = false; btn.textContent = 'دخول';
  }
}

// [STAFF-LOGIN] Same shape as doAdminLogin() but posts to /admin/staff-login
// (email+password) instead of the single owner password.
async function doStaffLogin() {
  const emailInput = document.getElementById('login-staff-email');
  const pwInput = document.getElementById('login-staff-password');
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-err');
  const email = (emailInput.value || '').trim();
  const password = pwInput.value || '';
  if (!email || !password) return;
  err.classList.remove('show');
  btn.disabled = true; btn.textContent = '...';
  try {
    const res = await fetch(API_BASE + '/admin/staff-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const j = await res.json();
    if (res.ok && j.ok && j.token) {
      ADMIN_TOKEN = j.token;
      ADMIN_ROLE = j.role || 'staff';
      ADMIN_NAME = j.name || '';
      sessionStorage.setItem('airpiv_admin_token', ADMIN_TOKEN);
      sessionStorage.setItem('airpiv_admin_role', ADMIN_ROLE);
      sessionStorage.setItem('airpiv_admin_name', ADMIN_NAME);
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app-shell').classList.add('ready');
      pwInput.value = '';
      initDashboard();
    } else {
      err.textContent = j.error || 'بيانات دخول خاطئة';
      err.classList.add('show');
    }
  } catch (e) {
    err.textContent = 'خطأ في الاتصال بالسيرفر';
    err.classList.add('show');
  } finally {
    btn.disabled = false; btn.textContent = 'دخول';
  }
}

function doLoginSubmit() {
  if (_staffLoginMode) doStaffLogin(); else doAdminLogin();
}

function toggleStaffLoginMode() {
  _staffLoginMode = !_staffLoginMode;
  document.getElementById('login-owner-fields').style.display = _staffLoginMode ? 'none' : '';
  document.getElementById('login-staff-fields').style.display = _staffLoginMode ? '' : 'none';
  document.getElementById('login-mode-toggle').textContent = _staffLoginMode ? 'تسجيل دخول كمدير' : 'تسجيل دخول كموظف';
  document.getElementById('login-sub').textContent = _staffLoginMode ? 'أدخل بريدك وكلمة المرور الخاصة بحساب الموظف' : 'أدخل كلمة مرور لوحة التحكم';
  document.getElementById('login-err').classList.remove('show');
}

function doAdminLogout() {
  if (ADMIN_TOKEN) {
    // Best-effort — a legacy ADMIN_TOKEN login has no session to revoke,
    // and the server treats that case as a harmless no-op either way.
    fetch(API_BASE + '/admin/staff-logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + ADMIN_TOKEN } }).catch(() => {});
  }
  ADMIN_TOKEN = null;
  ADMIN_ROLE = 'admin';
  ADMIN_NAME = '';
  sessionStorage.removeItem('airpiv_admin_token');
  sessionStorage.removeItem('airpiv_admin_role');
  sessionStorage.removeItem('airpiv_admin_name');
  showLoginScreen();
}

// [STAFF-ROLES] Client-side hiding is UX only — the real boundary is
// requireFullAdmin on the server. Hides the 3 admin-only nav entries
// (sidebar + more-menu) for a staff session.
function applyRoleGating() {
  var isAdmin = ADMIN_ROLE === 'admin';
  ['nav-profit', 'nav-ancillary', 'nav-team', 'nav-api', 'mm-profit', 'mm-ancillary', 'mm-team', 'mm-api'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? '' : 'none';
  });
}

// ============ STATE ============
let allBookings = [];
let promos = [];               // loaded from GET /admin/promos
let ticketTiers = [];           // loaded from GET /admin/profit-tiers
let ancillaryTiers = [];        // loaded from GET /admin/ancillary-margin
let loyaltyConfig = null;       // loaded from GET /admin/loyalty-config
let invoiceConfig = null;       // loaded from GET /admin/invoice-config

// ============ INIT ============
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('ar-SA', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
  if (ADMIN_TOKEN) {
    // We have a token from a previous session in this tab — try using it.
    // If it's stale/invalid, adminFetch() will bounce us back to login.
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').classList.add('ready');
    initDashboard();
  } else {
    showLoginScreen();
  }
});

// Loads everything the dashboard needs right after a successful login —
// replaces the old tryAutoConnect()/connectSupabase() flow.
async function initDashboard() {
  applyRoleGating();
  await Promise.all([
    loadStats(),
    loadPromosFromServer(),
    loadTicketTiers(),
    loadAncillaryTiers(),
    loadLoyaltyConfigFromServer(),
    loadCancellationBadge(),
  ]);
  calcExample();
  calcAncillaryExample();
  setProfitPeriod('today');
}

// ============ [CANCEL-NOTIFY-FIX] Cancellation notifications ============
async function loadCancellationBadge() {
  try {
    const [cancelRes, failureRes, syncRes] = await Promise.all([
      adminFetch('/admin/cancellations'),
      adminFetch('/admin/booking-failures'),
      adminFetch('/admin/sync-failures'),
    ]);
    const cancelJ = await cancelRes.json();
    const failureJ = await failureRes.json();
    const syncJ = await syncRes.json();
    const cancelCount = cancelJ.ok ? cancelJ.unreadCount : 0;
    const failureCount = failureJ.ok ? failureJ.unreadCount : 0;
    const syncCount = syncJ.ok ? syncJ.unreadCount : 0;
    renderCancelBadge(cancelCount + failureCount + syncCount);
    if (cancelCount > 0) {
      showToast('🚫 لديك ' + cancelCount + ' إلغاء حجز جديد يحتاج مراجعة', 'error');
    }
    if (failureCount > 0) {
      // [BOOKING-FAILURE-NOTIFY] Distinct, more urgent wording — a
      // charged customer with a failed booking (even auto-refunded) is a
      // worse outcome than a clean cancellation and needs to read as such.
      showToast('🆘 لديك ' + failureCount + ' مشكلة في حجز بعد الدفع — راجع فوراً', 'error');
    }
    if (syncCount > 0) {
      // [SYNC-FAILURE-NOTIFY] The most urgent of the three — our own
      // records have silently drifted from what actually happened.
      showToast('⚠️ لديك ' + syncCount + ' حجز يحتاج مزامنة يدوية — راجع فوراً', 'error');
    }
  } catch (e) { console.error('Admin API error:', e); }
}

function renderCancelBadge(count) {
  [document.getElementById('cancel-badge'), document.getElementById('cancel-badge-mobile')].forEach(function(el) {
    if (!el) return;
    if (count > 0) { el.textContent = count; el.style.display = 'inline-block'; }
    else el.style.display = 'none';
  });
}

async function markCancellationsAsRead() {
  try {
    // [BOOKING-FAILURE-NOTIFY] / [SYNC-FAILURE-NOTIFY] All three
    // notification types live on the same badge (the Bookings nav item)
    // — opening that page should clear all of them, since the admin is
    // about to see all three kinds of events listed there.
    await Promise.all([
      adminFetch('/admin/cancellations/mark-read', { method: 'POST' }),
      adminFetch('/admin/booking-failures/mark-read', { method: 'POST' }),
      adminFetch('/admin/sync-failures/mark-read', { method: 'POST' }),
    ]);
    renderCancelBadge(0);
  } catch (e) { console.error('Admin API error:', e); }
}

// [BOOKING-FAILURE-NOTIFY] Renders both cancellation and booking-failure
// events as cards at the top of the Bookings page — the panel is hidden
// entirely when there's nothing to show, so it never adds clutter for the
// common case (no issues).
async function loadBookingIssuesPanel() {
  try {
    const [cancelRes, failureRes, syncRes] = await Promise.all([
      adminFetch('/admin/cancellations'),
      adminFetch('/admin/booking-failures'),
      adminFetch('/admin/sync-failures'),
    ]);
    const cancelJ = await cancelRes.json();
    const failureJ = await failureRes.json();
    const syncJ = await syncRes.json();
    const cancelEvents = cancelJ.ok ? (cancelJ.events || []).slice(0, 5) : [];
    const failureEvents = failureJ.ok ? (failureJ.events || []).slice(0, 5) : [];
    const syncEvents = syncJ.ok ? (syncJ.events || []).slice(0, 5) : [];
    const panel = document.getElementById('booking-issues-panel');
    if (!cancelEvents.length && !failureEvents.length && !syncEvents.length) { panel.style.display = 'none'; return; }

    var html = '';
    // [SYNC-FAILURE-NOTIFY] Shown FIRST — the most dangerous category:
    // the real operation succeeded with Duffel, but our database doesn't
    // know it yet. Distinct purple/critical styling sets it apart from
    // the red booking-failure cards below.
    syncEvents.forEach(function(ev) {
      var b = ev.booking;
      html += '<div style="background:var(--bg2);border:1.5px solid #7c3aed;border-radius:10px;padding:14px 16px;margin-bottom:10px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px">' +
          '<div style="font-weight:700;color:#7c3aed;font-size:13px">⚠️ مزامنة مفقودة — العملية نجحت فعلاً لكن قاعدتنا لم تتحدث</div>' +
        '</div>' +
        '<div style="font-size:12.5px;color:var(--tx2);margin-bottom:4px">' + escHtml(ev.message || '') + '</div>' +
        (b ? '<div style="font-size:12px;color:var(--tx2);margin-bottom:4px">' + escHtml(b.route_label || '') + ' · ' + escHtml(b.customer_email || '') + ' · ' + (ev.refund_amount || '—') + '</div>' : '') +
        '<div style="font-size:11px;color:var(--tx3);margin-bottom:8px" class="mono">Order: ' + escHtml(ev.order_id || '—') + ' · ' + new Date(ev.at).toLocaleString('ar') + '</div>' +
        '<button class="btn btn-ghost" style="padding:5px 12px;font-size:11px" onclick="resolveSyncFailure(\'' + escHtml(ev.order_id) + '\')">✓ تأكيد: تمت المزامنة يدوياً</button>' +
      '</div>';
    });
    failureEvents.forEach(function(ev) {
      var refundBadge = ev.refunded
        ? '<span class="badge confirmed">✓ تم الاسترجاع</span>'
        : '<span class="badge cancelled" style="background:rgba(220,38,38,.15);color:#dc2626">⚠ لم يُسترجع — تحقق فوراً</span>';
      html += '<div style="background:var(--bg2);border:1px solid #dc2626;border-radius:10px;padding:14px 16px;margin-bottom:10px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px">' +
          '<div style="font-weight:700;color:#dc2626;font-size:13px">🆘 فشل حجز بعد الدفع</div>' +
          refundBadge +
        '</div>' +
        '<div style="font-size:12.5px;color:var(--tx2);margin-bottom:4px">' + escHtml(ev.message || 'سبب غير معروف') + '</div>' +
        '<div style="font-size:11px;color:var(--tx3)" class="mono">Session: ' + escHtml(ev.session_id || '—') + ' · ' + new Date(ev.at).toLocaleString('ar') + '</div>' +
      '</div>';
    });
    cancelEvents.forEach(function(ev) {
      var b = ev.booking;
      html += '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px">' +
        '<div style="font-weight:700;color:var(--tx);font-size:13px;margin-bottom:6px">✕ إلغاء حجز من العميل</div>' +
        '<div style="font-size:12.5px;color:var(--tx2)">' + (b ? (escHtml(b.route_label || '') + ' · ' + escHtml(b.customer_email || '')) : 'تفاصيل الحجز غير متوفرة') + '</div>' +
        '<div style="font-size:11px;color:var(--tx3);margin-top:4px" class="mono">' + new Date(ev.at).toLocaleString('ar') + '</div>' +
      '</div>';
    });
    panel.innerHTML = html;
    panel.style.display = 'block';
  } catch (e) { console.error('Admin API error:', e); }
}

// [SYNC-FAILURE-NOTIFY] Manual reconciliation action — once the admin has
// independently verified (e.g. checking Duffel's own dashboard) that the
// cancellation genuinely went through, this fixes the drifted status in
// one click rather than requiring direct database access.
async function resolveSyncFailure(orderId) {
  if (!confirm('تأكيد: تحققت من Duffel مباشرة وهذا الحجز ملغي فعلاً؟ سيتم تحديث الحالة بقاعدتنا الآن.')) return;
  try {
    const res = await adminFetch('/admin/sync-failures/' + encodeURIComponent(orderId) + '/resolve', { method: 'POST' });
    const j = await res.json();
    if (j.ok) { showToast('✅ تم تحديث الحالة بنجاح', 'success'); loadBookingIssuesPanel(); loadBookingsFromServer(); }
    else showToast(j.error || 'فشل التحديث', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر', 'error'); }
}

// ============ [BLOG-SYSTEM] Blog admin ============
var allBlogPosts = [];

async function loadBlogPosts() {
  try {
    const res = await adminFetch('/admin/blog-posts');
    const j = await res.json();
    if (j.ok) { allBlogPosts = j.posts; renderBlogPostsList(); }
  } catch (e) { console.error('Admin API error:', e); }
}

function renderBlogPostsList() {
  var tbody = document.getElementById('blog-posts-list');
  if (!allBlogPosts.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:30px">لا توجد مقالات بعد — اضغط "مقال جديد" للبدء</td></tr>';
    return;
  }
  tbody.innerHTML = allBlogPosts.map(function(p) {
    var statusBadge = p.status === 'published'
      ? '<span class="badge confirmed">✓ منشور</span>'
      : '<span class="badge pending">◔ مسودة</span>';
    var pubDate = p.published_at ? new Date(p.published_at).toLocaleDateString('ar') : '—';
    return '<tr>' +
      '<td>' + escHtml(p.title) + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' + pubDate + '</td>' +
      '<td class="mono">' + (p.views_count || 0) + '</td>' +
      '<td style="display:flex;gap:6px">' +
        '<button class="btn btn-ghost blog-edit-btn" style="padding:5px 10px;font-size:11px" data-id="' + escHtml(p.id) + '">تعديل</button>' +
        '<button class="btn btn-ghost blog-delete-btn" style="padding:5px 10px;font-size:11px" data-id="' + escHtml(p.id) + '">حذف</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

// [BLOG-DELETE-FIX] Delegated click handler — only a short id string ever
// goes into the row's HTML now (no post content/title embedded in any
// attribute), so nothing about a post's content can ever break the
// row's markup or silently disable these buttons. Attached once via
// event delegation rather than re-attached after every render.
document.addEventListener('click', function(e) {
  try {
    var editBtn = e.target.closest('.blog-edit-btn');
    if (editBtn) {
      var post = allBlogPosts.find(function(p) { return p.id === editBtn.getAttribute('data-id'); });
      if (post) openBlogEditor(post);
      return;
    }
    var delBtn = e.target.closest('.blog-delete-btn');
    if (delBtn) {
      deleteBlogPost(delBtn.getAttribute('data-id'));
    }
  } catch (err) {
    // [DIAGNOSTIC] If anything throws here — before deleteBlogPost's own
    // try/catch even gets a chance to run — this guarantees a visible
    // error instead of total silence, which is the actual symptom being
    // diagnosed right now.
    alert('DEBUG ERROR (blog click handler): ' + (err && err.message ? err.message : String(err)));
  }
});

function openBlogEditor(post) {
  document.getElementById('blog-editor-title').textContent = post ? 'تعديل المقال' : 'مقال جديد';
  document.getElementById('blog-edit-id').value = post ? post.id : '';
  // [BLOG-SINGLE-FIELD] Reconstruct the one-box view from the post's
  // separately-stored columns: title on line 1, the cover image URL (if
  // any) on its own line right after, then the content. Saving always
  // re-derives everything from this same box — see parseSingleBlogInput.
  var single = '';
  if (post) {
    single = post.title || '';
    if (post.cover_image_url) single += '\n' + post.cover_image_url;
    single += '\n\n' + (post.content || '');
  }
  document.getElementById('blog-single').value = single;
  updateBlogSlugPreview();
  document.getElementById('blog-editor-modal').classList.add('open');
}

// [BLOG-SINGLE-FIELD] One box in, four database columns out. Convention:
// first non-empty line = title. Any later line that's nothing but a bare
// URL = the cover image (removed from the body wherever it appears, so
// it never shows up as stray text in the published article). Everything
// else = content. The excerpt and SEO meta description are no longer
// filled in by hand at all — both are derived from the plain text of the
// first paragraph of the body, trimmed to a clean word boundary.
function parseSingleBlogInput(raw) {
  var lines = String(raw || '').replace(/\r\n/g, '\n').split('\n');
  var i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  // [TITLE-TAG-FIX] Defensively strips any HTML tags from the title
  // line — the exact bug that shipped a literal "<h2>...</h2>" as a
  // post's visible title: someone wrapped the first line in tags out of
  // habit from formatting the body. The title is always plain text, no
  // matter what's typed here; headings belong in the body below.
  var title = (lines[i] || '').replace(/<[^>]+>/g, '').trim();
  i++;

  // [COVER-URL-FIX] Only the line RIGHT AFTER the title counts as the
  // cover image — previously any bare URL found ANYWHERE in the article
  // was silently grabbed as the cover image and stripped from the text,
  // which meant a route link recommended later in the article could
  // vanish from the body without warning. Any other bare URL just stays
  // in the content, where the server now turns it into a real link.
  while (i < lines.length && !lines[i].trim()) i++;
  var coverUrl = '';
  if (i < lines.length && /^https?:\/\/\S+$/i.test(lines[i].trim())) {
    coverUrl = lines[i].trim();
    i++;
  }

  var content = lines.slice(i).join('\n').replace(/^\s*\n+/, '').trim();

  var firstParagraph = (content.split(/\n\s*\n/)[0] || content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  var excerpt = truncateAtWordBoundary(firstParagraph, 155);

  return { title: title, content: content, cover_image_url: coverUrl, excerpt: excerpt, meta_description: excerpt };
}
function truncateAtWordBoundary(s, max) {
  if (s.length <= max) return s;
  var cut = s.slice(0, max);
  var lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 40) cut = cut.slice(0, lastSpace); // don't chop a very short first word off
  return cut.trim() + '…';
}

// [BLOG-SYSTEM] Mirrors the server's slugify() closely enough for a live
// preview — the server is still the source of truth for the actual saved
// slug (and handles collisions), this is just so the admin can see roughly
// what URL their post will get before saving.
function updateBlogSlugPreview() {
  var title = parseSingleBlogInput(document.getElementById('blog-single').value).title;
  var umlauts = {'ä':'ae','ö':'oe','ü':'ue','Ä':'Ae','Ö':'Oe','Ü':'Ue','ß':'ss'};
  var slug = title.replace(/[äöüÄÖÜß]/g, function(c){ return umlauts[c] || c; })
    .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  document.getElementById('blog-slug-preview').textContent = slug ? ('airpiv.com/blog-post.html?slug=' + slug) : '';
}

async function saveBlogPost(status) {
  var id = document.getElementById('blog-edit-id').value;
  var parsed = parseSingleBlogInput(document.getElementById('blog-single').value);
  if (!parsed.title || !parsed.content) { showToast('⚠️ لازم تكتب عنوان (السطر الأول) ومحتوى', 'error'); return; }

  var payload = {
    title: parsed.title,
    meta_description: parsed.meta_description,
    excerpt: parsed.excerpt,
    cover_image_url: parsed.cover_image_url,
    content: parsed.content,
    status: status,
  };

  try {
    const res = id
      ? await adminFetch('/admin/blog-posts/' + id, { method: 'PUT', body: JSON.stringify(payload) })
      : await adminFetch('/admin/blog-posts', { method: 'POST', body: JSON.stringify(payload) });
    const j = await res.json();
    if (j.ok) {
      showToast(status === 'published' ? '🚀 تم النشر بنجاح!' : '💾 تم حفظ المسودة', 'success');
      closeModal('blog-editor-modal');
      loadBlogPosts();
    } else {
      showToast(j.error || 'فشل الحفظ', 'error');
    }
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

async function deleteBlogPost(id) {
  if (!confirm('تأكيد حذف هذا المقال نهائياً؟ لا يمكن التراجع.')) return;
  try {
    const res = await adminFetch('/admin/blog-posts/' + id, { method: 'DELETE' });
    const j = await res.json();
    if (j.ok) { showToast('🗑 تم حذف المقال', 'success'); loadBlogPosts(); }
    else showToast(j.error || 'فشل الحذف', 'error');
  } catch (e) {
    // [DIAGNOSTIC] alert() as a backup alongside showToast — in case
    // showToast itself is broken for any reason, this guarantees a
    // visible error appears instead of this catch block failing silently.
    try { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); } catch (e2) {}
    alert('DEBUG ERROR (deleteBlogPost): ' + (e && e.message ? e.message : String(e)));
  }
}

// ============ [ROUTE-PAGES] Route landing pages admin ============
var allRoutePages = [];
var rpCurrentPage = 1;
var rpTotalPages = 1;
var rpSearchTimer = null;

// [ADMIN-SCALE-FIX] البحث بيستنى المستخدم يوقف عن الكتابة 400ms قبل ما
// يبعت الطلب فعلياً — بدون ده، كل حرف بيكتبه هيبعت طلب منفصل للسيرفر.
function rpSearchDebounced() {
  clearTimeout(rpSearchTimer);
  rpSearchTimer = setTimeout(rpResetAndLoad, 400);
}
function rpResetAndLoad() {
  rpCurrentPage = 1;
  loadRoutePages();
}
function rpGoToPage(p) {
  if (p < 1 || p > rpTotalPages) return;
  rpCurrentPage = p;
  loadRoutePages();
}

async function runRouteBackfill() {
  if (!confirm('سيتم فحص كل المسارات القديمة وإضافة بيانات الدولة/المدينة الناقصة لها (يستخدم بيانات حقيقية من Duffel). قد يستغرق دقيقة أو أكثر حسب عدد المسارات. هل تريد المتابعة؟')) return;
  showToast('⏳ جارٍ الإصلاح، يرجى الانتظار...', 'info');
  try {
    const res = await adminFetch('/admin/route-pages/backfill-locations', { method: 'POST' });
    const j = await res.json();
    if (j.ok) {
      showToast('✅ تم: ' + j.updated + ' مسار تم تحديثه، ' + j.skipped + ' لم يحتج تعديل' + (j.failed ? '، ' + j.failed + ' فشل (راجع سجل الأخطاء)' : ''), j.failed ? 'error' : 'success');
      loadRoutePages();
    } else {
      showToast(j.error || 'فشلت العملية', 'error');
    }
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// [DATE-MATCH-FIX] Clears all cached route prices — needed for routes
// published before departure_date was added to the price cache, whose
// cached price entry shows a price but has departure_date missing
// entirely, so the booking link never gets the &depart= param even
// though the underlying fix is correct. Without this, the admin would
// otherwise have to wait up to 6 hours for the old cache to expire
// naturally.
async function clearRoutePriceCache() {
  if (!confirm('سيتم حذف كل الأسعار المخزّنة مؤقتاً — سيُعاد جلب السعر الحقيقي (مع التاريخ) لكل مسار عند أول زيارة بعد هذا. هل تريد المتابعة؟')) return;
  showToast('⏳ جارٍ تحديث الأسعار...', 'info');
  try {
    const res = await adminFetch('/admin/route-pages/clear-price-cache', { method: 'POST' });
    const j = await res.json();
    if (j.ok) {
      showToast('✅ تم حذف ' + j.cleared + ' سعر مخزّن — سيُعاد جلبه عند الزيارة القادمة', 'success');
    } else {
      showToast(j.error || 'فشلت العملية', 'error');
    }
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// [ADMIN-SCALE-FIX] كانت بتجيب كل المسارات دفعة واحدة من غير أي حد —
// دلوقتي بتبعت البحث والفلترة ورقم الصفحة، والسيرفر هو اللي بيرجّع
// بس 50 مسار في المرة (مش كل شيء ثم قص من الفرونت إند، ده كان هيفضل
// بيحمّل آلاف الصفوف كل مرة حتى لو مش هيتعرضوا كلهم).
async function loadRoutePages() {
  try {
    var q = encodeURIComponent(document.getElementById('rp-search-input').value.trim());
    var status = document.getElementById('rp-status-filter').value;
    var refreshFilter = document.getElementById('rp-refresh-filter').value;
    var sort = document.getElementById('rp-sort-select').value;
    var url = '/admin/route-pages?page=' + rpCurrentPage + '&limit=50';
    if (q) url += '&q=' + q;
    if (status) url += '&status=' + status;
    if (refreshFilter) url += '&refresh_frequency=' + refreshFilter;
    if (sort) url += '&sort=' + sort;
    const res = await adminFetch(url);
    const j = await res.json();
    if (j.ok) {
      allRoutePages = j.routes;
      rpTotalPages = j.totalPages || 1;
      clearRoutePagesSelection();
      renderRoutePagesList();
      renderRoutePagesPagination(j.total || 0);
    }
  } catch (e) { console.error('Admin API error:', e); }
}

function renderRoutePagesPagination(total) {
  var el = document.getElementById('rp-pagination');
  if (!el) return;
  if (total === 0) { el.innerHTML = ''; return; }
  var html = '<span>' + total.toLocaleString('ar-EG') + ' مسار إجمالاً — صفحة ' + rpCurrentPage + ' من ' + rpTotalPages + '</span>';
  html += '<button class="btn btn-ghost" style="padding:5px 12px" ' + (rpCurrentPage <= 1 ? 'disabled' : '') + ' onclick="rpGoToPage(' + (rpCurrentPage - 1) + ')">‹ السابق</button>';
  html += '<button class="btn btn-ghost" style="padding:5px 12px" ' + (rpCurrentPage >= rpTotalPages ? 'disabled' : '') + ' onclick="rpGoToPage(' + (rpCurrentPage + 1) + ')">التالي ›</button>';
  el.innerHTML = html;
}

// [ROUTE-REFRESH-TIER] 'none' = SEO-only, backed by one field — see
// sql/route_refresh_tier.sql (flywise-server) for the full reasoning.
function routeRefreshBadge(freq) {
  if (freq === '6h') return '<span class="badge confirmed">أسعار حية · 6س</span>';
  if (freq === '12h') return '<span class="badge confirmed">أسعار حية · 12س</span>';
  if (freq === '24h') return '<span class="badge confirmed">أسعار حية · 24س</span>';
  return '<span class="badge">SEO فقط</span>';
}

// [ROUTE-SCORE-4A] للعرض فقط — لا يوجد أتمتة تقرأ هاي القيمة بهاي
// المرحلة. الثقة (confidence) موضحة جنب الرقم عشان رقم مبني على بيانات
// قليلة ما ينقرأ وكأنه بنفس وزن رقم مبني على بيانات وفيرة.
function routeScoreBadge(score, confidence) {
  if (score == null) return '<span class="badge" style="color:var(--tx3)">—</span>';
  var confLabel = confidence === 'high' ? 'ثقة عالية' : confidence === 'medium' ? 'ثقة متوسطة' : 'ثقة منخفضة';
  var confColor = confidence === 'high' ? '#22c55e' : confidence === 'medium' ? '#f59e0b' : 'var(--tx3)';
  return '<span class="mono" style="font-weight:700">' + Number(score).toLocaleString('en-US', { maximumFractionDigits: 1 }) + '</span>' +
    '<div style="font-size:10px;color:' + confColor + '">' + confLabel + '</div>';
}

var selectedRoutePageIds = {}; // {id: true} — current-page selection for bulk refresh-frequency apply

function renderRoutePagesList() {
  var tbody = document.getElementById('route-pages-list');
  if (!allRoutePages.length) {
    var q = document.getElementById('rp-search-input').value.trim();
    tbody.innerHTML = q
      ? '<tr><td colspan="7" style="text-align:center;color:var(--tx3);padding:30px">مفيش نتايج لـ "' + escHtml(q) + '"</td></tr>'
      : '<tr><td colspan="7" style="text-align:center;color:var(--tx3);padding:30px">لا توجد مسارات بعد — اضغط "مسار جديد" للبدء</td></tr>';
    return;
  }
  tbody.innerHTML = allRoutePages.map(function(r) {
    var statusBadge = r.status === 'published'
      ? '<span class="badge confirmed">✓ منشور</span>'
      : r.status === 'dead'
      ? '<span class="badge" style="background:rgba(239,68,68,.15);color:#ef4444">💀 ميت (مفيش رحلات)</span>'
      : '<span class="badge pending">◔ مسودة</span>';
    var checked = selectedRoutePageIds[r.id] ? 'checked' : '';
    return '<tr>' +
      '<td><input type="checkbox" class="route-select-checkbox" data-id="' + escHtml(r.id) + '" ' + checked + ' onchange="toggleRoutePageSelection(this)"></td>' +
      '<td>' + escHtml(r.origin_city) + ' (' + escHtml(r.origin_iata) + ') → ' + escHtml(r.destination_city) + ' (' + escHtml(r.destination_iata) + ')</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' + routeRefreshBadge(r.refresh_frequency) + '</td>' +
      '<td>' + routeScoreBadge(r.route_score, r.route_score_confidence) + '</td>' +
      '<td class="mono" style="font-size:11px">flights/' + escHtml(r.slug) + '</td>' +
      '<td style="display:flex;gap:6px">' +
        '<button class="btn btn-ghost route-edit-btn" style="padding:5px 10px;font-size:11px" data-id="' + escHtml(r.id) + '">تعديل</button>' +
        '<button class="btn btn-ghost route-delete-btn" style="padding:5px 10px;font-size:11px" data-id="' + escHtml(r.id) + '">حذف</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function toggleRoutePageSelection(checkbox) {
  var id = checkbox.getAttribute('data-id');
  if (checkbox.checked) selectedRoutePageIds[id] = true;
  else delete selectedRoutePageIds[id];
  updateBulkRefreshBar();
}

function toggleAllRoutePagesSelection(checked) {
  allRoutePages.forEach(function(r) {
    if (checked) selectedRoutePageIds[r.id] = true;
    else delete selectedRoutePageIds[r.id];
  });
  renderRoutePagesList();
  updateBulkRefreshBar();
}

function clearRoutePagesSelection() {
  selectedRoutePageIds = {};
  var selectAll = document.getElementById('rp-select-all');
  if (selectAll) selectAll.checked = false;
  renderRoutePagesList();
  updateBulkRefreshBar();
}

function updateBulkRefreshBar() {
  var count = Object.keys(selectedRoutePageIds).length;
  var bar = document.getElementById('rp-bulk-refresh-bar');
  bar.style.display = count > 0 ? 'flex' : 'none';
  document.getElementById('rp-bulk-refresh-count').textContent = count.toLocaleString('ar-EG') + ' مسار محدد';
}

async function applyBulkRefresh() {
  var ids = Object.keys(selectedRoutePageIds);
  if (!ids.length) return;
  var freq = document.getElementById('rp-bulk-refresh-select').value;
  if (!confirm('هيتغيّر معدل تحديث السعر لـ ' + ids.length.toLocaleString('ar-EG') + ' مسار محدد. متأكد؟')) return;
  try {
    const res = await adminFetch('/admin/route-pages/bulk-refresh', {
      method: 'PUT', body: JSON.stringify({ ids: ids, refresh_frequency: freq }),
    });
    const j = await res.json();
    if (j.ok) {
      showToast('✅ تم تحديث ' + j.updated + ' مسار', 'success');
      clearRoutePagesSelection();
      loadRoutePages();
    } else {
      showToast(j.error || 'فشلت العملية', 'error');
    }
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// [BULK-PUBLISH] بيجيب العدد الحقيقي للمسودات الأول (طلب خفيف، limit=1
// بس محتاجين الـ total)، عشان رسالة التأكيد توري رقم حقيقي — مش
// تحذير عام غامض قبل عملية مالها رجعة سهلة على آلاف المسارات.
async function publishAllDrafts() {
  try {
    const countRes = await adminFetch('/admin/route-pages?status=draft&limit=1');
    const countJ = await countRes.json();
    const total = countJ.ok ? (countJ.total || 0) : 0;
    if (total === 0) { showToast('مفيش مسودات خالص حالياً', 'info'); return; }

    if (!confirm('هتنشر ' + total.toLocaleString('ar-EG') + ' مسار (كل المسودات الحالية) دفعة واحدة — هيظهروا للزوار فوراً. متأكد؟')) return;

    showToast('⏳ جارٍ نشر ' + total.toLocaleString('ar-EG') + ' مسار...', 'info');
    const res = await adminFetch('/admin/route-pages/publish-all-drafts', { method: 'POST' });
    const j = await res.json();
    if (j.ok) {
      showToast('✅ تم نشر ' + j.published + ' مسار بنجاح', 'success');
      rpResetAndLoad();
    } else {
      showToast(j.error || 'فشلت العملية', 'error');
    }
  } catch (e) {
    showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error');
  }
}

// ============ [DEAD-ROUTES-HEALTH-CHECK] فحص صحة المسارات ============
// بيستدعي endpoint الفحص بشكل متكرر (دفعة كل مرة) لحد ما كل المسارات
// تتفحص — مش طلب واحد ضخم ممكن يفشل بـ timeout مع 1000 مسار.
var healthCheckRunning = false;
async function runHealthCheck() {
  if (healthCheckRunning) return;
  if (!confirm('هيتم فحص كل المسارات فعلياً (رحلة حقيقية موجودة ولا لأ) عن طريق Duffel.\n\n⚠️ لو Duffel لسه في وضع Test، النتيجة مش موثوقة (Test بيرجّع رحلات وهمية لأي مسار تقريباً) — استخدم الفحص ده بجدية بس بعد تفعيل Production، وقتها استخدم زرار "إعادة تعيين الفحص" الأول.\n\nالعملية ممكن تاخد كذا دقيقة حسب عدد المسارات. تكمل؟')) return;

  healthCheckRunning = true;
  var progressEl = document.getElementById('health-check-progress');
  progressEl.style.display = 'block';
  progressEl.textContent = '⏳ جارٍ الفحص...';

  var totalChecked = 0, totalDead = 0;
  try {
    while (true) {
      const res = await adminFetch('/admin/route-pages/health-check-batch', { method: 'POST' });
      const j = await res.json();
      if (!j.ok) { showToast(j.error || 'فشل الفحص', 'error'); break; }
      totalChecked += j.checked;
      totalDead += j.dead;
      progressEl.textContent = '🩺 اتفحص ' + totalChecked + ' مسار لحد دلوقتي — ' + totalDead + ' اتلاقوا ميتين (مفيش رحلات حقيقية) — باقي حوالي ' + j.remaining + '...';
      if (j.checked === 0 || j.remaining === 0) break;
      await new Promise(function(r) { setTimeout(r, 800); }); // فاصل بين كل دفعة عشان مانضغطش على Duffel
    }
    progressEl.textContent = '✅ خلص الفحص — إجمالي ' + totalChecked + ' مسار اتفحص، ' + totalDead + ' اتلاقوا ميتين وانحطوا في حالة "ميت" تلقائياً (اختفوا من الموقع).';
    showToast('✅ الفحص خلص: ' + totalDead + ' مسار ميت من أصل ' + totalChecked, totalDead > 0 ? 'info' : 'success');
    rpResetAndLoad();
  } catch (e) {
    progressEl.textContent = '❌ حصل خطأ في الاتصال أثناء الفحص — اللي اتفحص لحد دلوقتي (' + totalChecked + ' مسار) اتحفظ، ممكن تدوس الزرار تاني يكمل من بعده.';
    showToast('خطأ في الاتصال بالسيرفر أثناء الفحص', 'error');
  } finally {
    healthCheckRunning = false;
  }
}

// [RESET-HEALTH-CHECK] Duffel في وضع Test بيرجّع عروض وهمية لأي مسار
// تقريباً (حتى اللي مفيهوش رحلات حقيقية)، فأي فحص صحة اتعمل قبل
// تفعيل Production نتيجته مش موثوقة. الدالة دي بتصفّر تاريخ الفحص
// لكل المسارات (وترجّع أي "ميت" لـ"مسودة") عشان فحص جديد حقيقي
// يحصل بعد التفعيل — من غيرها الأداة هتفضل واثقة في نتايج الـ Test
// القديمة للأبد (مصممة عمداً متفحصش نفس المسار مرتين).
async function resetHealthChecks() {
  if (!confirm('⚠️ استخدم الزرار ده بس بعد ما تفعّل Duffel في وضع Production الحقيقي.\n\nفي وضع Test، Duffel بيرجّع رحلات وهمية لأي مسار تقريباً، فنتيجة أي فحص سابق مش حقيقية. الزرار ده هيمسح تاريخ كل الفحوصات القديمة (وأي مسار "ميت" هيرجع "مسودة") عشان فحص جديد حقيقي 100% يحصل بعد كده.\n\nمتأكد إنك فعّلت Production بالفعل وعايز تكمل؟')) return;
  try {
    const res = await adminFetch('/admin/route-pages/reset-health-checks', { method: 'POST' });
    const j = await res.json();
    if (j.ok) {
      showToast('✅ اتصفّر فحص ' + j.cleared + ' مسار، و' + j.revived + ' مسار "ميت" رجع "مسودة" — جاهزين لفحص حقيقي جديد', 'success');
      rpResetAndLoad();
    } else {
      showToast(j.error || 'فشلت العملية', 'error');
    }
  } catch (e) {
    showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error');
  }
}

// ============ [BULK-CREATE] إنشاء مسارات بالجملة ============
var bulkSelectedAirports = []; // [{code, city, country, lat, lng}]
var bulkSearchDebounce = null;

function openBulkRouteCreator() {
  bulkSelectedAirports = [];
  renderBulkSelectedAirports();
  document.getElementById('bulk-airport-search').value = '';
  document.getElementById('bulk-preview-box').style.display = 'none';
  document.getElementById('bulk-refresh-freq').value = 'none';
  document.getElementById('bulk-route-modal').classList.add('open');
}

function bulkAirportSearch(query) {
  clearTimeout(bulkSearchDebounce);
  var dropdown = document.getElementById('bulk-airport-results');
  if (!query || query.trim().length < 2) { dropdown.style.display = 'none'; return; }
  bulkSearchDebounce = setTimeout(function() {
    adminFetch('/search/airports?q=' + encodeURIComponent(query.trim()))
      .then(function(r) { return r.json(); })
      .then(function(j) {
        if (!j.ok || !j.airports || !j.airports.length) {
          dropdown.innerHTML = '<div class="route-ac-item" style="color:var(--tx3);cursor:default">لا توجد نتائج</div>';
          dropdown.style.display = 'block';
          return;
        }
        var airportsOnly = j.airports.filter(function(a) { return a.type === 'airport'; });
        if (!airportsOnly.length) {
          dropdown.innerHTML = '<div class="route-ac-item" style="color:var(--tx3);cursor:default">لا توجد مطارات مطابقة</div>';
          dropdown.style.display = 'block';
          return;
        }
        dropdown.innerHTML = airportsOnly.map(function(a) {
          var already = bulkSelectedAirports.some(function(x) { return x.code === a.code; });
          return '<div class="route-ac-item" style="' + (already ? 'opacity:.4' : '') + '" onclick=\'' + (already ? '' : 'bulkAddAirport(' + escJsonAttr(a) + ')') + '\'>' +
            escHtml(a.city) + ' — ' + escHtml(a.name) + '<span class="ac-code">' + escHtml(a.code) + (already ? ' ✓ مضاف' : '') + '</span>' +
          '</div>';
        }).join('');
        dropdown.style.display = 'block';
      })
      .catch(function() {
        dropdown.innerHTML = '<div class="route-ac-item" style="color:#f87171;cursor:default">⚠️ خطأ في البحث</div>';
        dropdown.style.display = 'block';
      });
  }, 350);
}

function bulkAddAirport(airport) {
  if (bulkSelectedAirports.some(function(a) { return a.code === airport.code; })) return;
  bulkSelectedAirports.push({ code: airport.code, city: airport.city, country: airport.country || null, lat: airport.lat, lng: airport.lng });
  renderBulkSelectedAirports();
  document.getElementById('bulk-airport-search').value = '';
  document.getElementById('bulk-airport-results').style.display = 'none';
  document.getElementById('bulk-preview-box').style.display = 'none';
}

function bulkRemoveAirport(code) {
  bulkSelectedAirports = bulkSelectedAirports.filter(function(a) { return a.code !== code; });
  renderBulkSelectedAirports();
  document.getElementById('bulk-preview-box').style.display = 'none';
}

function renderBulkSelectedAirports() {
  var el = document.getElementById('bulk-selected-airports');
  if (!bulkSelectedAirports.length) {
    el.innerHTML = '<span style="color:var(--tx3);font-size:12px">لسه ما اخترتش أي مطار</span>';
    updateBulkPreview();
    return;
  }
  el.innerHTML = bulkSelectedAirports.map(function(a) {
    return '<span style="display:inline-flex;align-items:center;gap:6px;background:var(--teal-lt,rgba(15,181,160,.12));color:var(--teal2,#0FB5A0);border-radius:20px;padding:5px 6px 5px 12px;font-size:12px;font-weight:600">' +
      escHtml(a.city) + ' (' + escHtml(a.code) + ')' +
      '<button onclick="bulkRemoveAirport(\'' + escHtml(a.code) + '\')" style="background:rgba(0,0,0,.1);border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;color:inherit;font-size:11px;line-height:1">✕</button>' +
    '</span>';
  }).join('');
  updateBulkPreview();
}

// [PREVIEW] معاينة عدد المسارات اللي هتتعمل قبل الإرسال الفعلي —
// حساب محلي بسيط (مفيش استعلام سيرفر)، عشان الأدمن يتأكد قبل ما يبعت.
function updateBulkPreview() {
  var box = document.getElementById('bulk-preview-box');
  var n = bulkSelectedAirports.length;
  if (n < 2) { box.style.display = 'none'; return; }
  var both = document.getElementById('bulk-both-directions').checked;
  var count = both ? n * (n - 1) : (n * (n - 1)) / 2;
  box.style.display = 'block';
  box.textContent = '📊 ' + n + ' مطار مختار → هيتولد لحد ' + count + ' مسار (أي مسار موجود فعلاً هيتجاهل تلقائياً)';
}
document.addEventListener('change', function(e) {
  if (e.target && e.target.id === 'bulk-both-directions') updateBulkPreview();
});

async function submitBulkRoutes() {
  if (bulkSelectedAirports.length < 2) {
    showToast('اختار مطارين على الأقل', 'error');
    return;
  }
  var btn = document.getElementById('bulk-submit-btn');
  var originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ جارٍ الإنشاء...';
  try {
    const res = await adminFetch('/admin/route-pages/bulk-create', {
      method: 'POST',
      body: JSON.stringify({
        airports: bulkSelectedAirports,
        bothDirections: document.getElementById('bulk-both-directions').checked,
        refresh_frequency: document.getElementById('bulk-refresh-freq').value,
      }),
    });
    const j = await res.json();
    if (j.ok) {
      showToast('✅ اتعمل ' + j.created + ' مسار جديد (كمسودة) — ' + j.skippedExisting + ' كانوا موجودين بالفعل واتجاهلوا', 'success');
      closeModal('bulk-route-modal');
      rpResetAndLoad();
    } else {
      showToast(j.error || 'فشلت العملية', 'error');
    }
  } catch (e) {
    showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ============ [MISSING-ROUTES-MATRIX] مصفوفة المسارات الناقصة ============
var matrixSelectedAirports = []; // [{code, city, country, lat, lng}]
var matrixSearchDebounce = null;

function openRouteMatrix() {
  matrixSelectedAirports = [];
  renderMatrixSelectedAirports();
  document.getElementById('matrix-airport-search').value = '';
  document.getElementById('matrix-picker-step').style.display = 'block';
  document.getElementById('matrix-grid-step').style.display = 'none';
  document.getElementById('matrix-modal').classList.add('open');
}

function matrixBackToPicker() {
  document.getElementById('matrix-picker-step').style.display = 'block';
  document.getElementById('matrix-grid-step').style.display = 'none';
}

// [DRY] نفس منطق بحث المطارات بالظبط بتاع الإنشاء بالجملة، بس بيضيف
// لقائمة اختيار المصفوفة بدل قائمة الإنشاء.
function matrixAirportSearch(query) {
  clearTimeout(matrixSearchDebounce);
  var dropdown = document.getElementById('matrix-airport-results');
  if (!query || query.trim().length < 2) { dropdown.style.display = 'none'; return; }
  matrixSearchDebounce = setTimeout(function() {
    adminFetch('/search/airports?q=' + encodeURIComponent(query.trim()))
      .then(function(r) { return r.json(); })
      .then(function(j) {
        if (!j.ok || !j.airports || !j.airports.length) {
          dropdown.innerHTML = '<div class="route-ac-item" style="color:var(--tx3);cursor:default">لا توجد نتائج</div>';
          dropdown.style.display = 'block';
          return;
        }
        var airportsOnly = j.airports.filter(function(a) { return a.type === 'airport'; });
        if (!airportsOnly.length) {
          dropdown.innerHTML = '<div class="route-ac-item" style="color:var(--tx3);cursor:default">لا توجد مطارات مطابقة</div>';
          dropdown.style.display = 'block';
          return;
        }
        dropdown.innerHTML = airportsOnly.map(function(a) {
          var already = matrixSelectedAirports.some(function(x) { return x.code === a.code; });
          return '<div class="route-ac-item" style="' + (already ? 'opacity:.4' : '') + '" onclick=\'' + (already ? '' : 'matrixAddAirport(' + escJsonAttr(a) + ')') + '\'>' +
            escHtml(a.city) + ' — ' + escHtml(a.name) + '<span class="ac-code">' + escHtml(a.code) + (already ? ' ✓ مضاف' : '') + '</span>' +
          '</div>';
        }).join('');
        dropdown.style.display = 'block';
      })
      .catch(function() {
        dropdown.innerHTML = '<div class="route-ac-item" style="color:#f87171;cursor:default">⚠️ خطأ في البحث</div>';
        dropdown.style.display = 'block';
      });
  }, 350);
}

function matrixAddAirport(airport) {
  if (matrixSelectedAirports.length >= 40) { showToast('الحد الأقصى 40 مطار للمصفوفة الواحدة', 'error'); return; }
  if (matrixSelectedAirports.some(function(a) { return a.code === airport.code; })) return;
  matrixSelectedAirports.push({ code: airport.code, city: airport.city, country: airport.country || null, lat: airport.lat, lng: airport.lng });
  renderMatrixSelectedAirports();
  document.getElementById('matrix-airport-search').value = '';
  document.getElementById('matrix-airport-results').style.display = 'none';
}

function matrixRemoveAirport(code) {
  matrixSelectedAirports = matrixSelectedAirports.filter(function(a) { return a.code !== code; });
  renderMatrixSelectedAirports();
}

function renderMatrixSelectedAirports() {
  var el = document.getElementById('matrix-selected-airports');
  if (!matrixSelectedAirports.length) {
    el.innerHTML = '<span style="color:var(--tx3);font-size:12px">لسه ما اخترتش أي مطار</span>';
    return;
  }
  el.innerHTML = matrixSelectedAirports.map(function(a) {
    return '<span style="display:inline-flex;align-items:center;gap:6px;background:var(--teal-lt,rgba(15,181,160,.12));color:var(--teal2,#0FB5A0);border-radius:20px;padding:5px 6px 5px 12px;font-size:12px;font-weight:600">' +
      escHtml(a.city) + ' (' + escHtml(a.code) + ')' +
      '<button onclick="matrixRemoveAirport(\'' + escHtml(a.code) + '\')" style="background:rgba(0,0,0,.1);border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;color:inherit;font-size:11px;line-height:1">✕</button>' +
    '</span>';
  }).join('');
}

// [MATRIX-BUILD] بتجيب بس المسارات الموجودة فعلاً ضمن المطارات
// المختارة، وبتقارنها محلياً مع كل التوليفات الممكنة نظرياً — الفرق
// بينهم هو "المسارات الناقصة".
async function loadRouteMatrix() {
  if (matrixSelectedAirports.length < 2) {
    showToast('اختار مطارين على الأقل', 'error');
    return;
  }
  try {
    var codes = matrixSelectedAirports.map(function(a) { return a.code; }).join(',');
    const res = await adminFetch('/admin/route-pages/matrix?codes=' + encodeURIComponent(codes));
    const j = await res.json();
    if (!j.ok) { showToast(j.error || 'فشل تحميل المصفوفة', 'error'); return; }

    var existingMap = {}; // "ORG_DST" -> status
    (j.existing || []).forEach(function(r) { existingMap[r.origin_iata + '_' + r.destination_iata] = r.status; });

    var table = document.getElementById('matrix-table');
    var html = '<tr><th style="padding:6px 8px;background:var(--bg2)"></th>';
    matrixSelectedAirports.forEach(function(d) {
      html += '<th style="padding:6px 8px;background:var(--bg2);font-weight:700;white-space:nowrap">' + escHtml(d.code) + '</th>';
    });
    html += '</tr>';

    matrixSelectedAirports.forEach(function(o) {
      html += '<tr><th style="padding:6px 8px;background:var(--bg2);text-align:right;white-space:nowrap">' + escHtml(o.code) + '</th>';
      matrixSelectedAirports.forEach(function(d) {
        if (o.code === d.code) {
          html += '<td style="padding:6px 8px;background:var(--bd);text-align:center">—</td>';
          return;
        }
        var status = existingMap[o.code + '_' + d.code];
        if (status === 'published') {
          html += '<td style="padding:6px 8px;background:rgba(34,197,94,.25);text-align:center" title="منشور">🟩</td>';
        } else if (status === 'draft') {
          html += '<td style="padding:6px 8px;background:rgba(234,179,8,.25);text-align:center" title="مسودة">🟨</td>';
        } else {
          html += '<td style="padding:6px 8px;background:var(--bg2);text-align:center;cursor:pointer" title="ناقص — دوس للإنشاء" onclick="matrixQuickCreate(\'' + escHtml(o.code) + '\',\'' + escHtml(d.code) + '\')">➕</td>';
        }
      });
      html += '</tr>';
    });
    table.innerHTML = html;

    document.getElementById('matrix-picker-step').style.display = 'none';
    document.getElementById('matrix-grid-step').style.display = 'block';
  } catch (e) {
    showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error');
  }
}

// [QUICK-CREATE] الدوس على خانة ناقصة بيفتح فورم المسار الفردي
// بالبيانات الحقيقية (المدينة، الدولة، الإحداثيات) متعبّية تلقائياً —
// بس محتاج تأكيد الحفظ اليدوي، مفيش أي إنشاء تلقائي بدون مراجعة.
function matrixQuickCreate(originCode, destCode) {
  var o = matrixSelectedAirports.find(function(a) { return a.code === originCode; });
  var d = matrixSelectedAirports.find(function(a) { return a.code === destCode; });
  if (!o || !d) return;
  closeModal('matrix-modal');
  openRouteEditor();
  document.getElementById('route-origin-search').value = o.city + ' (' + o.code + ')';
  document.getElementById('route-origin-iata').value = o.code;
  document.getElementById('route-origin-lat').value = o.lat != null ? o.lat : '';
  document.getElementById('route-origin-lng').value = o.lng != null ? o.lng : '';
  document.getElementById('route-origin-country').value = o.country || '';
  document.getElementById('route-dest-search').value = d.city + ' (' + d.code + ')';
  document.getElementById('route-dest-iata').value = d.code;
  document.getElementById('route-dest-lat').value = d.lat != null ? d.lat : '';
  document.getElementById('route-dest-lng').value = d.lng != null ? d.lng : '';
  document.getElementById('route-dest-country').value = d.country || '';
  routeSelectedOriginCity = o.city;
  routeSelectedDestCity = d.city;
  updateRouteDistancePreview();
}

// [ROUTE-DELETE-FIX] Same delegated-click fix as the blog posts list —
// only a short id string goes into the row's HTML, immune to anything in
// the route's intro_text/custom_title content.
document.addEventListener('click', function(e) {
  try {
    var editBtn = e.target.closest('.route-edit-btn');
    if (editBtn) {
      var route = allRoutePages.find(function(r) { return r.id === editBtn.getAttribute('data-id'); });
      if (route) openRouteEditor(route);
      return;
    }
    var delBtn = e.target.closest('.route-delete-btn');
    if (delBtn) {
      deleteRoutePage(delBtn.getAttribute('data-id'));
    }
  } catch (err) {
    alert('DEBUG ERROR (route click handler): ' + (err && err.message ? err.message : String(err)));
  }
});

// [ROUTE-AIRPORT-SEARCH] Tracks the currently-selected city name for each
// direction separately from the search input's displayed text (which
// shows "City (CODE)") — the API needs the plain city name.
var routeSelectedOriginCity = '';
var routeSelectedDestCity = '';
var routeSearchDebounce = {};

// [ROUTE-FAQ-OVERRIDE] Dynamic FAQ row management — each row is a
// question + answer pair; readRouteFaqItems() collects only rows where
// BOTH fields are filled in (a half-empty row is silently ignored rather
// than saved as a broken FAQ entry).
function addRouteFaqItem(question, answer) {
  var list = document.getElementById('route-faq-list');
  var row = document.createElement('div');
  row.className = 'route-faq-row';
  row.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;position:relative';
  row.innerHTML =
    '<input type="text" class="form-input route-faq-q" placeholder="السؤال" style="margin-bottom:6px" value="' + escHtml(question || '') + '">' +
    '<textarea class="form-input route-faq-a" placeholder="الجواب" style="min-height:50px;resize:vertical">' + escHtml(answer || '') + '</textarea>' +
    '<button type="button" onclick="this.parentElement.remove()" style="position:absolute;top:6px;left:6px;background:none;border:none;color:#f87171;cursor:pointer;font-size:14px">✕</button>';
  list.appendChild(row);
}

function readRouteFaqItems() {
  var rows = document.querySelectorAll('#route-faq-list .route-faq-row');
  var items = [];
  rows.forEach(function(row) {
    var q = row.querySelector('.route-faq-q').value.trim();
    var a = row.querySelector('.route-faq-a').value.trim();
    if (q && a) items.push({ question: q, answer: a });
  });
  return items;
}

function clearRouteFaqList() {
  document.getElementById('route-faq-list').innerHTML = '';
}

function openRouteEditor(route) {
  document.getElementById('route-editor-title').textContent = route ? 'تعديل المسار' : 'مسار جديد';
  document.getElementById('route-edit-id').value = route ? route.id : '';
  if (route) {
    document.getElementById('route-origin-search').value = route.origin_city + ' (' + route.origin_iata + ')';
    document.getElementById('route-origin-iata').value = route.origin_iata;
    document.getElementById('route-origin-lat').value = route.origin_lat || '';
    document.getElementById('route-origin-lng').value = route.origin_lng || '';
    document.getElementById('route-origin-country').value = route.origin_country || '';
    document.getElementById('route-dest-search').value = route.destination_city + ' (' + route.destination_iata + ')';
    document.getElementById('route-dest-iata').value = route.destination_iata;
    document.getElementById('route-dest-lat').value = route.destination_lat || '';
    document.getElementById('route-dest-lng').value = route.destination_lng || '';
    document.getElementById('route-dest-country').value = route.destination_country || '';
    routeSelectedOriginCity = route.origin_city;
    routeSelectedDestCity = route.destination_city;
    updateRouteDistancePreview();
  } else {
    ['route-origin-search','route-origin-iata','route-origin-lat','route-origin-lng','route-origin-country',
     'route-dest-search','route-dest-iata','route-dest-lat','route-dest-lng','route-dest-country'].forEach(function(id) {
      document.getElementById(id).value = '';
    });
    routeSelectedOriginCity = '';
    routeSelectedDestCity = '';
    document.getElementById('route-distance-preview').textContent = '';
  }
  document.getElementById('route-refresh-freq').value = route ? (route.refresh_frequency || 'none') : 'none';
  document.getElementById('route-intro').value = route ? (route.intro_text || '') : '';
  document.getElementById('route-custom-title').value = route ? (route.custom_title || '') : '';
  document.getElementById('route-custom-desc').value = route ? (route.custom_meta_description || '') : '';
  clearRouteFaqList();
  if (route && route.custom_faq && route.custom_faq.length) {
    route.custom_faq.forEach(function(item) { addRouteFaqItem(item.question, item.answer); });
  }
  document.getElementById('route-editor-modal').classList.add('open');
}

// [ROUTE-AIRPORT-SEARCH] Live airport/city search reusing the same public
// GET /search/airports endpoint the main booking flow's search bar uses —
// debounced (350ms) so typing quickly doesn't fire a request per
// keystroke, and requires 2+ characters to match the endpoint's own
// minimum query length.
function routeAirportSearch(which, query) {
  clearTimeout(routeSearchDebounce[which]);
  var dropdown = document.getElementById('route-' + which + '-results');
  if (!query || query.trim().length < 2) {
    dropdown.style.display = 'none';
    return;
  }
  routeSearchDebounce[which] = setTimeout(function() {
    adminFetch('/search/airports?q=' + encodeURIComponent(query.trim()))
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(j) {
        if (!j.ok || !j.airports || !j.airports.length) {
          dropdown.innerHTML = '<div class="route-ac-item" style="color:var(--tx3);cursor:default">لا توجد نتائج</div>';
          dropdown.style.display = 'block';
          return;
        }
        // Only airports carry coordinates (cities don't — see server
        // comment) and the route page needs a specific airport anyway
        // (flight search is always by airport code), so cities are
        // filtered out of this picker entirely.
        var airportsOnly = j.airports.filter(function(a) { return a.type === 'airport'; });
        if (!airportsOnly.length) {
          dropdown.innerHTML = '<div class="route-ac-item" style="color:var(--tx3);cursor:default">لا توجد مطارات مطابقة (فقط مدينة بدون مطار محدد)</div>';
          dropdown.style.display = 'block';
          return;
        }
        dropdown.innerHTML = airportsOnly.map(function(a) {
          return '<div class="route-ac-item" onclick=\'selectRouteAirport("' + which + '",' + escJsonAttr(a) + ')\'>' +
            escHtml(a.city) + ' — ' + escHtml(a.name) + '<span class="ac-code">' + escHtml(a.code) + '</span>' +
          '</div>';
        }).join('');
        dropdown.style.display = 'block';
      })
      .catch(function(err) {
        // [SEARCH-ERROR-VISIBILITY-FIX] Previously failed silently here —
        // a 401/429/500 or network error looked identical to "no results
        // for Berlin", with nothing telling the admin the request itself
        // never succeeded.
        dropdown.innerHTML = '<div class="route-ac-item" style="color:#f87171;cursor:default">⚠️ خطأ في البحث: ' + escHtml(err.message) + '</div>';
        dropdown.style.display = 'block';
      });
  }, 350);
}

function selectRouteAirport(which, airport) {
  document.getElementById('route-' + which + '-search').value = airport.city + ' (' + airport.code + ')';
  document.getElementById('route-' + which + '-iata').value = airport.code;
  document.getElementById('route-' + which + '-lat').value = airport.lat != null ? airport.lat : '';
  document.getElementById('route-' + which + '-lng').value = airport.lng != null ? airport.lng : '';
  document.getElementById('route-' + which + '-country').value = airport.country || '';
  if (which === 'origin') routeSelectedOriginCity = airport.city;
  else routeSelectedDestCity = airport.city;
  document.getElementById('route-' + which + '-results').style.display = 'none';
  updateRouteDistancePreview();
}

// [ROUTE-AIRPORT-SEARCH] Client-side preview only (mirrors the server's
// own Haversine calculation) — shown immediately after picking both
// airports so the admin sees the real computed distance/haul type before
// even saving. The server recomputes and stores the authoritative value
// independently; this is purely informational feedback in the form.
function updateRouteDistancePreview() {
  var oLat = parseFloat(document.getElementById('route-origin-lat').value);
  var oLng = parseFloat(document.getElementById('route-origin-lng').value);
  var dLat = parseFloat(document.getElementById('route-dest-lat').value);
  var dLng = parseFloat(document.getElementById('route-dest-lng').value);
  var preview = document.getElementById('route-distance-preview');
  if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) { preview.textContent = ''; return; }
  var R = 6371;
  var toRad = function(d) { return d * Math.PI / 180; };
  var dLatRad = toRad(dLat - oLat), dLngRad = toRad(dLng - oLng);
  var a = Math.sin(dLatRad/2)**2 + Math.cos(toRad(oLat)) * Math.cos(toRad(dLat)) * Math.sin(dLngRad/2)**2;
  var distKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  var haul = distKm < 1500 ? 'short-haul (رحلة قريبة)' : 'long-haul (رحلة طويلة)';
  preview.textContent = '📏 المسافة المحسوبة: ' + distKm.toLocaleString() + ' كم · ' + haul;
}

// Hide dropdowns when clicking elsewhere in the modal.
document.addEventListener('click', function(e) {
  if (!e.target.closest('#route-origin-search') && !e.target.closest('#route-origin-results')) {
    var od = document.getElementById('route-origin-results'); if (od) od.style.display = 'none';
  }
  if (!e.target.closest('#route-dest-search') && !e.target.closest('#route-dest-results')) {
    var dd = document.getElementById('route-dest-results'); if (dd) dd.style.display = 'none';
  }
});

async function saveRoutePage(status) {
  var id = document.getElementById('route-edit-id').value;
  var originIata = document.getElementById('route-origin-iata').value.trim().toUpperCase();
  var destIata = document.getElementById('route-dest-iata').value.trim().toUpperCase();
  var originCity = routeSelectedOriginCity;
  var destCity = routeSelectedDestCity;

  if (!originCity || !originIata || !destCity || !destIata) {
    showToast('⚠️ اختر المطارين من نتائج البحث أولاً', 'error');
    return;
  }

  var payload = {
    origin_city: originCity,
    origin_iata: originIata,
    destination_city: destCity,
    destination_iata: destIata,
    origin_lat: document.getElementById('route-origin-lat').value || null,
    origin_lng: document.getElementById('route-origin-lng').value || null,
    destination_lat: document.getElementById('route-dest-lat').value || null,
    destination_lng: document.getElementById('route-dest-lng').value || null,
    origin_country: document.getElementById('route-origin-country').value || null,
    destination_country: document.getElementById('route-dest-country').value || null,
    intro_text: document.getElementById('route-intro').value.trim(),
    custom_title: document.getElementById('route-custom-title').value.trim(),
    custom_meta_description: document.getElementById('route-custom-desc').value.trim(),
    custom_faq: readRouteFaqItems(),
    status: status,
    refresh_frequency: document.getElementById('route-refresh-freq').value,
  };

  try {
    const res = id
      ? await adminFetch('/admin/route-pages/' + id, { method: 'PUT', body: JSON.stringify(payload) })
      : await adminFetch('/admin/route-pages', { method: 'POST', body: JSON.stringify(payload) });
    const j = await res.json();
    if (j.ok) {
      showToast(status === 'published' ? '🚀 تم نشر المسار!' : '💾 تم حفظ المسودة', 'success');
      closeModal('route-editor-modal');
      loadRoutePages();
    } else {
      showToast(j.error || 'فشل الحفظ', 'error');
    }
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

async function deleteRoutePage(id) {
  if (!confirm('تأكيد حذف هذا المسار نهائياً؟ لا يمكن التراجع.')) return;
  try {
    const res = await adminFetch('/admin/route-pages/' + id, { method: 'DELETE' });
    const j = await res.json();
    if (j.ok) { showToast('🗑 تم حذف المسار', 'success'); loadRoutePages(); }
    else showToast(j.error || 'فشل الحذف', 'error');
  } catch (e) {
    try { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); } catch (e2) {}
    alert('DEBUG ERROR (deleteRoutePage): ' + (e && e.message ? e.message : String(e)));
  }
}

// ============ [GEO-CMS] Airports & Cities admin ============
// Mirrors the Route Pages list/search/filter/modal pattern exactly (see
// loadRoutePages()/renderRoutePagesList()/openRouteEditor() above), with
// 3 sub-tabs sharing one page. Content CRUD tier (requireAdmin on the
// server), not owner-only.
var GEO_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ar', name: 'العربية' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
];

function showGeoTab(tab) {
  ['cities', 'countries', 'airports', 'airlines'].forEach(function (t) {
    document.getElementById('geo-subtab-' + t).style.display = t === tab ? '' : 'none';
    var btn = document.getElementById('geo-tab-btn-' + t);
    btn.className = t === tab ? 'btn btn-primary' : 'btn btn-ghost';
  });
  if (tab === 'cities' && !geoCities.length) loadGeoCities();
  if (tab === 'countries' && !geoCountries.length) loadGeoCountries();
  if (tab === 'airports' && !geoAirports.length) loadGeoAirports();
  if (tab === 'airlines' && !geoAirlines.length) loadGeoAirlines();
}

// Builds the 7 language-labeled text inputs shared by all 3 editor
// modals — dynamic instead of hardcoded 7x per modal, so adding an 8th
// language later is a one-line change to GEO_LANGUAGES, not a template edit.
function renderTranslationInputs(containerId, idPrefix, values) {
  var container = document.getElementById(containerId);
  container.innerHTML = GEO_LANGUAGES.map(function (l) {
    var v = (values && values[l.code]) || '';
    return '<div class="form-group" style="margin-bottom:8px">' +
      '<label class="form-label" style="font-size:11px">' + escHtml(l.name) + ' (' + l.code + ')</label>' +
      '<input type="text" class="form-input" id="' + idPrefix + '-' + l.code + '" value="' + escHtml(v) + '">' +
      '</div>';
  }).join('');
}
function readTranslationInputs(idPrefix) {
  var translations = {};
  GEO_LANGUAGES.forEach(function (l) {
    var el = document.getElementById(idPrefix + '-' + l.code);
    if (el && el.value.trim()) translations[l.code] = el.value.trim();
  });
  return translations;
}
function translationsSummary(count) {
  return (count || 0) + '/7';
}

// ---- Cities ----
var geoCities = [];
var geoCityPage = 1, geoCityTotalPages = 1, geoCitySearchTimer = null;
function geoCitySearchDebounced() { clearTimeout(geoCitySearchTimer); geoCitySearchTimer = setTimeout(geoCityResetAndLoad, 400); }
function geoCityResetAndLoad() { geoCityPage = 1; loadGeoCities(); }
function geoCityGoToPage(p) { if (p < 1 || p > geoCityTotalPages) return; geoCityPage = p; loadGeoCities(); }

async function loadGeoCities() {
  try {
    var q = encodeURIComponent(document.getElementById('geo-city-search').value.trim());
    var status = document.getElementById('geo-city-status-filter').value;
    var url = '/admin/cities?page=' + geoCityPage + '&limit=50';
    if (q) url += '&q=' + q;
    if (status) url += '&status=' + status;
    const res = await adminFetch(url);
    const j = await res.json();
    if (j.ok) {
      geoCities = j.cities;
      geoCityTotalPages = j.totalPages || 1;
      renderGeoCitiesList();
      renderGeoPagination('geo-cities-pagination', j.total || 0, geoCityPage, geoCityTotalPages, 'geoCityGoToPage');
    }
  } catch (e) { console.error('Admin API error:', e); }
}
function renderGeoCitiesList() {
  var tbody = document.getElementById('geo-cities-list');
  if (!geoCities.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:30px">لا توجد مدن بعد</td></tr>';
    return;
  }
  tbody.innerHTML = geoCities.map(function (c) {
    var statusBadge = c.status === 'published' ? '<span class="badge confirmed">✓ منشورة</span>' : '<span class="badge pending">◔ مسودة</span>';
    return '<tr>' +
      '<td>' + escHtml(c.name) + '<div style="font-size:11px;color:var(--tx3)">' + escHtml(c.city_slug) + '</div></td>' +
      '<td>' + escHtml(c.country_code || '—') + '</td>' +
      '<td>' + translationsSummary(c.translations_count) + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td><button class="btn btn-ghost" style="padding:5px 10px;font-size:12px" onclick=\'openCityEditor(' + escJsonAttr(c) + ')\'>✏️</button> ' +
      '<button class="btn btn-ghost" style="padding:5px 10px;font-size:12px;color:#ef4444" onclick="deleteCity(\'' + escHtml(c.id) + '\')">🗑</button></td>' +
      '</tr>';
  }).join('');
}

async function openCityEditor(city) {
  document.getElementById('city-editor-title').textContent = city ? 'تعديل مدينة' : 'مدينة جديدة';
  document.getElementById('city-edit-id').value = city ? city.id : '';
  document.getElementById('city-name').value = city ? city.name : '';
  document.getElementById('city-slug').value = city ? city.city_slug : '';
  document.getElementById('city-country-code').value = city ? (city.country_code || '') : '';
  document.getElementById('city-status').value = city ? city.status : 'published';
  document.getElementById('city-intro-text').value = city ? (city.intro_text || '') : '';
  var translations = {};
  if (city) {
    try {
      const res = await adminFetch('/admin/cities/' + city.id + '/translations');
      const j = await res.json();
      if (j.ok) translations = j.translations;
    } catch (e) { /* fall through with empty translations rather than blocking the editor */ }
  }
  renderTranslationInputs('city-translations-inputs', 'city-tr', translations);
  document.getElementById('city-editor-modal').classList.add('open');
}

async function saveCity() {
  var id = document.getElementById('city-edit-id').value;
  var payload = {
    name: document.getElementById('city-name').value.trim(),
    city_slug: document.getElementById('city-slug').value.trim().toLowerCase(),
    country_code: document.getElementById('city-country-code').value.trim().toUpperCase() || null,
    status: document.getElementById('city-status').value,
    intro_text: document.getElementById('city-intro-text').value.trim() || null,
  };
  if (!payload.name || !payload.city_slug) { showToast('⚠️ الاسم والرابط مطلوبان', 'error'); return; }
  try {
    const res = id
      ? await adminFetch('/admin/cities/' + id, { method: 'PUT', body: JSON.stringify(payload) })
      : await adminFetch('/admin/cities', { method: 'POST', body: JSON.stringify(payload) });
    const j = await res.json();
    if (!j.ok) { showToast(j.error || 'فشل الحفظ', 'error'); return; }
    var cityId = id || (j.city && j.city.id);
    var translations = readTranslationInputs('city-tr');
    if (cityId && Object.keys(translations).length) {
      await adminFetch('/admin/cities/' + cityId + '/translations', { method: 'PUT', body: JSON.stringify({ translations: translations }) });
    }
    showToast('💾 تم حفظ المدينة', 'success');
    closeModal('city-editor-modal');
    loadGeoCities();
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

async function deleteCity(id) {
  if (!confirm('تأكيد حذف هذه المدينة نهائياً؟ لا يمكن التراجع.')) return;
  try {
    const res = await adminFetch('/admin/cities/' + id, { method: 'DELETE' });
    const j = await res.json();
    if (j.ok) { showToast('🗑 تم حذف المدينة', 'success'); loadGeoCities(); }
    else showToast(j.error || 'فشل الحذف', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// ---- Countries ----
var geoCountries = [];
var geoCountryPage = 1, geoCountryTotalPages = 1, geoCountrySearchTimer = null;
function geoCountrySearchDebounced() { clearTimeout(geoCountrySearchTimer); geoCountrySearchTimer = setTimeout(geoCountryResetAndLoad, 400); }
function geoCountryResetAndLoad() { geoCountryPage = 1; loadGeoCountries(); }
function geoCountryGoToPage(p) { if (p < 1 || p > geoCountryTotalPages) return; geoCountryPage = p; loadGeoCountries(); }

async function loadGeoCountries() {
  try {
    var q = encodeURIComponent(document.getElementById('geo-country-search').value.trim());
    var status = document.getElementById('geo-country-status-filter').value;
    var url = '/admin/countries?page=' + geoCountryPage + '&limit=50';
    if (q) url += '&q=' + q;
    if (status) url += '&status=' + status;
    const res = await adminFetch(url);
    const j = await res.json();
    if (j.ok) {
      geoCountries = j.countries;
      geoCountryTotalPages = j.totalPages || 1;
      renderGeoCountriesList();
      renderGeoPagination('geo-countries-pagination', j.total || 0, geoCountryPage, geoCountryTotalPages, 'geoCountryGoToPage');
    }
  } catch (e) { console.error('Admin API error:', e); }
}
function renderGeoCountriesList() {
  var tbody = document.getElementById('geo-countries-list');
  if (!geoCountries.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:30px">لا توجد دول بعد</td></tr>';
    return;
  }
  tbody.innerHTML = geoCountries.map(function (c) {
    var statusBadge = c.status === 'published' ? '<span class="badge confirmed">✓ منشورة</span>' : '<span class="badge pending">◔ مسودة</span>';
    return '<tr>' +
      '<td>' + escHtml(c.name) + '</td>' +
      '<td class="mono">' + escHtml(c.code) + '</td>' +
      '<td>' + translationsSummary(c.translations_count) + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td><button class="btn btn-ghost" style="padding:5px 10px;font-size:12px" onclick=\'openCountryEditor(' + escJsonAttr(c) + ')\'>✏️</button> ' +
      '<button class="btn btn-ghost" style="padding:5px 10px;font-size:12px;color:#ef4444" onclick="deleteCountry(\'' + escHtml(c.id) + '\')">🗑</button></td>' +
      '</tr>';
  }).join('');
}

async function openCountryEditor(country) {
  document.getElementById('country-editor-title').textContent = country ? 'تعديل دولة' : 'دولة جديدة';
  document.getElementById('country-edit-id').value = country ? country.id : '';
  document.getElementById('country-name').value = country ? country.name : '';
  document.getElementById('country-code').value = country ? country.code : '';
  document.getElementById('country-code').disabled = !!country;
  document.getElementById('country-status').value = country ? country.status : 'published';
  document.getElementById('country-intro-text').value = country ? (country.intro_text || '') : '';
  var translations = {};
  if (country) {
    try {
      const res = await adminFetch('/admin/countries/' + country.id + '/translations');
      const j = await res.json();
      if (j.ok) translations = j.translations;
    } catch (e) { /* fall through with empty translations rather than blocking the editor */ }
  }
  renderTranslationInputs('country-translations-inputs', 'country-tr', translations);
  document.getElementById('country-editor-modal').classList.add('open');
}

async function saveCountry() {
  var id = document.getElementById('country-edit-id').value;
  var payload = {
    name: document.getElementById('country-name').value.trim(),
    status: document.getElementById('country-status').value,
    intro_text: document.getElementById('country-intro-text').value.trim() || null,
  };
  if (!id) payload.code = document.getElementById('country-code').value.trim().toUpperCase();
  if (!payload.name || (!id && !payload.code)) { showToast('⚠️ الاسم والكود مطلوبان', 'error'); return; }
  try {
    const res = id
      ? await adminFetch('/admin/countries/' + id, { method: 'PUT', body: JSON.stringify(payload) })
      : await adminFetch('/admin/countries', { method: 'POST', body: JSON.stringify(payload) });
    const j = await res.json();
    if (!j.ok) { showToast(j.error || 'فشل الحفظ', 'error'); return; }
    var countryId = id || (j.country && j.country.id);
    var translations = readTranslationInputs('country-tr');
    if (countryId && Object.keys(translations).length) {
      await adminFetch('/admin/countries/' + countryId + '/translations', { method: 'PUT', body: JSON.stringify({ translations: translations }) });
    }
    showToast('💾 تم حفظ الدولة', 'success');
    closeModal('country-editor-modal');
    loadGeoCountries();
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

async function deleteCountry(id) {
  if (!confirm('تأكيد حذف هذه الدولة نهائياً؟ لا يمكن التراجع.')) return;
  try {
    const res = await adminFetch('/admin/countries/' + id, { method: 'DELETE' });
    const j = await res.json();
    if (j.ok) { showToast('🗑 تم حذف الدولة', 'success'); loadGeoCountries(); }
    else showToast(j.error || 'فشل الحذف', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// ---- Airports ----
var geoAirports = [];
var geoAirportPage = 1, geoAirportTotalPages = 1, geoAirportSearchTimer = null;
function geoAirportSearchDebounced() { clearTimeout(geoAirportSearchTimer); geoAirportSearchTimer = setTimeout(geoAirportResetAndLoad, 400); }
function geoAirportResetAndLoad() { geoAirportPage = 1; loadGeoAirports(); }
function geoAirportGoToPage(p) { if (p < 1 || p > geoAirportTotalPages) return; geoAirportPage = p; loadGeoAirports(); }

async function loadGeoAirports() {
  try {
    var q = encodeURIComponent(document.getElementById('geo-airport-search').value.trim());
    var status = document.getElementById('geo-airport-status-filter').value;
    var url = '/admin/airports?page=' + geoAirportPage + '&limit=50';
    if (q) url += '&q=' + q;
    if (status) url += '&status=' + status;
    const res = await adminFetch(url);
    const j = await res.json();
    if (j.ok) {
      geoAirports = j.airports;
      geoAirportTotalPages = j.totalPages || 1;
      renderGeoAirportsList();
      renderGeoPagination('geo-airports-pagination', j.total || 0, geoAirportPage, geoAirportTotalPages, 'geoAirportGoToPage');
    }
  } catch (e) { console.error('Admin API error:', e); }
}
function renderGeoAirportsList() {
  var tbody = document.getElementById('geo-airports-list');
  if (!geoAirports.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--tx3);padding:30px">لا توجد مطارات بعد</td></tr>';
    return;
  }
  tbody.innerHTML = geoAirports.map(function (a) {
    var statusBadge = a.status === 'published' ? '<span class="badge confirmed">✓ منشور</span>' : '<span class="badge pending">◔ مسودة</span>';
    return '<tr>' +
      '<td>' + escHtml(a.airport_name) + '</td>' +
      '<td class="mono">' + escHtml(a.iata_code) + '</td>' +
      '<td>' + escHtml(a.city_id || '—') + '</td>' +
      '<td>' + translationsSummary(a.translations_count) + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td><button class="btn btn-ghost" style="padding:5px 10px;font-size:12px" onclick=\'openAirportEditor(' + escJsonAttr(a) + ')\'>✏️</button> ' +
      '<button class="btn btn-ghost" style="padding:5px 10px;font-size:12px;color:#ef4444" onclick="deleteAirport(\'' + escHtml(a.id) + '\')">🗑</button></td>' +
      '</tr>';
  }).join('');
}

async function openAirportEditor(airport) {
  document.getElementById('airport-editor-title').textContent = airport ? 'تعديل مطار' : 'مطار جديد';
  document.getElementById('airport-edit-id').value = airport ? airport.id : '';
  document.getElementById('airport-iata').value = airport ? airport.iata_code : '';
  document.getElementById('airport-iata').disabled = !!airport;
  document.getElementById('airport-icao').value = airport ? (airport.icao_code || '') : '';
  document.getElementById('airport-name').value = airport ? airport.airport_name : '';
  document.getElementById('airport-city-id').value = airport ? (airport.city_id || '') : '';
  document.getElementById('airport-country-code').value = airport ? (airport.country_code || '') : '';
  document.getElementById('airport-lat').value = airport && airport.latitude != null ? airport.latitude : '';
  document.getElementById('airport-lng').value = airport && airport.longitude != null ? airport.longitude : '';
  document.getElementById('airport-status').value = airport ? airport.status : 'published';
  document.getElementById('airport-distance-city-center').value = airport && airport.distance_to_city_center_km != null ? airport.distance_to_city_center_km : '';
  document.getElementById('airport-transit-options').value = airport ? (airport.transit_options || '') : '';
  document.getElementById('airport-terminal-info').value = airport ? (airport.terminal_info || '') : '';
  document.getElementById('airport-traveler-tips').value = airport ? (airport.traveler_tips || '') : '';
  var translations = {};
  if (airport) {
    try {
      const res = await adminFetch('/admin/airports/' + airport.id + '/translations');
      const j = await res.json();
      if (j.ok) translations = j.translations;
    } catch (e) { /* fall through with empty translations rather than blocking the editor */ }
  }
  renderTranslationInputs('airport-translations-inputs', 'airport-tr', translations);
  document.getElementById('airport-editor-modal').classList.add('open');
}

async function saveAirport() {
  var id = document.getElementById('airport-edit-id').value;
  var payload = {
    icao_code: document.getElementById('airport-icao').value.trim().toUpperCase() || null,
    airport_name: document.getElementById('airport-name').value.trim(),
    city_id: document.getElementById('airport-city-id').value.trim() || null,
    country_code: document.getElementById('airport-country-code').value.trim().toUpperCase() || null,
    latitude: document.getElementById('airport-lat').value.trim() || null,
    longitude: document.getElementById('airport-lng').value.trim() || null,
    status: document.getElementById('airport-status').value,
    distance_to_city_center_km: document.getElementById('airport-distance-city-center').value.trim() || null,
    transit_options: document.getElementById('airport-transit-options').value.trim() || null,
    terminal_info: document.getElementById('airport-terminal-info').value.trim() || null,
    traveler_tips: document.getElementById('airport-traveler-tips').value.trim() || null,
  };
  if (!id) payload.iata_code = document.getElementById('airport-iata').value.trim().toUpperCase();
  if (!payload.airport_name || (!id && !payload.iata_code)) { showToast('⚠️ كود IATA والاسم مطلوبان', 'error'); return; }
  try {
    const res = id
      ? await adminFetch('/admin/airports/' + id, { method: 'PUT', body: JSON.stringify(payload) })
      : await adminFetch('/admin/airports', { method: 'POST', body: JSON.stringify(payload) });
    const j = await res.json();
    if (!j.ok) { showToast(j.error || 'فشل الحفظ', 'error'); return; }
    var airportId = id || (j.airport && j.airport.id);
    var translations = readTranslationInputs('airport-tr');
    if (airportId && Object.keys(translations).length) {
      await adminFetch('/admin/airports/' + airportId + '/translations', { method: 'PUT', body: JSON.stringify({ translations: translations }) });
    }
    showToast('💾 تم حفظ المطار', 'success');
    closeModal('airport-editor-modal');
    loadGeoAirports();
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

async function deleteAirport(id) {
  if (!confirm('تأكيد حذف هذا المطار نهائياً؟ لا يمكن التراجع.')) return;
  try {
    const res = await adminFetch('/admin/airports/' + id, { method: 'DELETE' });
    const j = await res.json();
    if (j.ok) { showToast('🗑 تم حذف المطار', 'success'); loadGeoAirports(); }
    else showToast(j.error || 'فشل الحذف', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// ---- Airlines ----
var geoAirlines = [];
var geoAirlinePage = 1, geoAirlineTotalPages = 1, geoAirlineSearchTimer = null;
function geoAirlineSearchDebounced() { clearTimeout(geoAirlineSearchTimer); geoAirlineSearchTimer = setTimeout(geoAirlineResetAndLoad, 400); }
function geoAirlineResetAndLoad() { geoAirlinePage = 1; loadGeoAirlines(); }
function geoAirlineGoToPage(p) { if (p < 1 || p > geoAirlineTotalPages) return; geoAirlinePage = p; loadGeoAirlines(); }

async function loadGeoAirlines() {
  try {
    var q = encodeURIComponent(document.getElementById('geo-airline-search').value.trim());
    var status = document.getElementById('geo-airline-status-filter').value;
    var url = '/admin/airlines?page=' + geoAirlinePage + '&limit=50';
    if (q) url += '&q=' + q;
    if (status) url += '&status=' + status;
    const res = await adminFetch(url);
    const j = await res.json();
    if (j.ok) {
      geoAirlines = j.airlines;
      geoAirlineTotalPages = j.totalPages || 1;
      renderGeoAirlinesList();
      renderGeoPagination('geo-airlines-pagination', j.total || 0, geoAirlinePage, geoAirlineTotalPages, 'geoAirlineGoToPage');
    }
  } catch (e) { console.error('Admin API error:', e); }
}
function renderGeoAirlinesList() {
  var tbody = document.getElementById('geo-airlines-list');
  if (!geoAirlines.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--tx3);padding:30px">لا توجد شركات طيران بعد</td></tr>';
    return;
  }
  tbody.innerHTML = geoAirlines.map(function (a) {
    var statusBadge = a.status === 'published' ? '<span class="badge confirmed">✓ منشورة</span>' : '<span class="badge pending">◔ مسودة</span>';
    return '<tr>' +
      '<td>' + escHtml(a.name) + '</td>' +
      '<td class="mono">' + escHtml(a.iata_code) + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td><button class="btn btn-ghost" style="padding:5px 10px;font-size:12px" onclick=\'openAirlineEditor(' + escJsonAttr(a) + ')\'>✏️</button> ' +
      '<button class="btn btn-ghost" style="padding:5px 10px;font-size:12px;color:#ef4444" onclick="deleteAirline(\'' + escHtml(a.id) + '\')">🗑</button></td>' +
      '</tr>';
  }).join('');
}

function openAirlineEditor(airline) {
  document.getElementById('airline-editor-title').textContent = airline ? 'تعديل شركة طيران' : 'شركة طيران جديدة';
  document.getElementById('airline-edit-id').value = airline ? airline.id : '';
  document.getElementById('airline-name').value = airline ? airline.name : '';
  document.getElementById('airline-code').value = airline ? airline.iata_code : '';
  document.getElementById('airline-code').disabled = !!airline;
  document.getElementById('airline-status').value = airline ? airline.status : 'published';
  document.getElementById('airline-intro-text').value = airline ? (airline.intro_text || '') : '';
  document.getElementById('airline-country-code').value = airline ? (airline.country_code || '') : '';
  document.getElementById('airline-hub-iata').value = airline ? (airline.hub_iata || '') : '';
  document.getElementById('airline-editor-modal').classList.add('open');
}

async function saveAirline() {
  var id = document.getElementById('airline-edit-id').value;
  var payload = {
    name: document.getElementById('airline-name').value.trim(),
    status: document.getElementById('airline-status').value,
    intro_text: document.getElementById('airline-intro-text').value.trim() || null,
    country_code: document.getElementById('airline-country-code').value.trim().toUpperCase() || null,
    hub_iata: document.getElementById('airline-hub-iata').value.trim().toUpperCase() || null,
  };
  if (!id) payload.iata_code = document.getElementById('airline-code').value.trim().toUpperCase();
  if (!payload.name || (!id && !payload.iata_code)) { showToast('⚠️ الاسم وكود IATA مطلوبان', 'error'); return; }
  try {
    const res = id
      ? await adminFetch('/admin/airlines/' + id, { method: 'PUT', body: JSON.stringify(payload) })
      : await adminFetch('/admin/airlines', { method: 'POST', body: JSON.stringify(payload) });
    const j = await res.json();
    if (!j.ok) { showToast(j.error || 'فشل الحفظ', 'error'); return; }
    showToast('💾 تم حفظ شركة الطيران', 'success');
    closeModal('airline-editor-modal');
    loadGeoAirlines();
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

async function deleteAirline(id) {
  if (!confirm('تأكيد حذف شركة الطيران هذه نهائياً؟ لا يمكن التراجع.')) return;
  try {
    const res = await adminFetch('/admin/airlines/' + id, { method: 'DELETE' });
    const j = await res.json();
    if (j.ok) { showToast('🗑 تم حذف شركة الطيران', 'success'); loadGeoAirlines(); }
    else showToast(j.error || 'فشل الحذف', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// Shared pagination renderer for all 3 geo sub-tabs.
function renderGeoPagination(elId, total, currentPage, totalPages, gotoFn) {
  var el = document.getElementById(elId);
  if (!el) return;
  if (total === 0) { el.innerHTML = ''; return; }
  var html = '<span>' + total.toLocaleString('ar-EG') + ' إجمالاً — صفحة ' + currentPage + ' من ' + totalPages + '</span>';
  html += '<button class="btn btn-ghost" style="padding:5px 12px" ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="' + gotoFn + '(' + (currentPage - 1) + ')">‹ السابق</button>';
  html += '<button class="btn btn-ghost" style="padding:5px 12px" ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="' + gotoFn + '(' + (currentPage + 1) + ')">التالي ›</button>';
  el.innerHTML = html;
}

// ============ [ERROR-LOGS] Error logs admin ============
async function loadErrorLogs() {
  var tbody = document.getElementById('errorlogs-list');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:30px">جارٍ التحميل...</td></tr>';
  try {
    var level = document.getElementById('errlog-filter-level').value;
    var source = document.getElementById('errlog-filter-source').value;
    var qs = [];
    if (level) qs.push('level=' + encodeURIComponent(level));
    if (source) qs.push('source=' + encodeURIComponent(source));
    const res = await adminFetch('/admin/error-logs' + (qs.length ? '?' + qs.join('&') : ''));
    const j = await res.json();
    if (!j.ok) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:30px">' + (j.error||'فشل التحميل') + '</td></tr>'; return; }
    if (!j.logs.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:30px">لا توجد أخطاء مسجّلة 🎉</td></tr>';
      return;
    }
    var levelIcons = { fatal: '🔴', error: '🟠', warn: '🟡' };
    tbody.innerHTML = j.logs.map(function(l, idx) {
      var metaStr = l.meta ? JSON.stringify(l.meta, null, 2) : '';
      return '<tr>' +
        '<td>' + (levelIcons[l.level] || '⚪') + ' ' + escHtml(l.level) + '</td>' +
        '<td><span class="badge pending">' + escHtml(l.source || 'server') + '</span></td>' +
        '<td style="max-width:320px">' + escHtml(l.message) +
          (metaStr ? '<br><a href="#" onclick="event.preventDefault();this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'" style="font-size:11px;color:var(--teal)">عرض التفاصيل</a><pre class="mono" style="display:none;font-size:11px;background:var(--bg2);padding:8px;border-radius:6px;margin-top:6px;overflow-x:auto;max-width:300px">' + escHtml(metaStr) + '</pre>' : '') +
        '</td>' +
        '<td style="font-size:11px;white-space:nowrap">' + new Date(l.created_at).toLocaleString('ar') + '</td>' +
        '<td></td>' +
      '</tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:30px">خطأ في الاتصال بالسيرفر</td></tr>';
  }
}

async function clearErrorLogs() {
  if (!confirm('تأكيد حذف كل سجل الأخطاء نهائياً؟ لا يمكن التراجع.')) return;
  try {
    const res = await adminFetch('/admin/error-logs', { method: 'DELETE' });
    const j = await res.json();
    if (j.ok) { showToast('🗑 تم تنظيف السجل', 'success'); loadErrorLogs(); }
    else showToast(j.error || 'فشل التنظيف', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// ============ NAVIGATION ============
var morePages = ['reports','invoices','profit','ancillary','loyalty','promos','blog','routes','geo','errorlogs','team','api','settings'];

function showPage(name) {
  // [STAFF-ROLES] Defense in depth only — the buttons that lead here are
  // already hidden for a staff session; the real boundary is the server's
  // requireFullAdmin on every request these pages actually make.
  if ((name === 'team' || name === 'profit' || name === 'ancillary' || name === 'api') && ADMIN_ROLE !== 'admin') {
    showToast('هذه الصفحة للمدير فقط', 'error');
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes("'" + name + "'")) {
      n.classList.add('active');
    }
  });

  // Update bottom nav
  ['dashboard','bookings','customers'].forEach(p => {
    var el = document.getElementById('bn-' + p);
    if (el) el.classList.toggle('active', p === name);
  });
  var moreBtn = document.getElementById('bn-more');
  if (moreBtn) moreBtn.classList.toggle('active', morePages.includes(name));

  // Update more menu items
  morePages.forEach(p => {
    var el = document.getElementById('mm-' + p);
    if (el) el.classList.toggle('active', p === name);
  });

  if (name === 'bookings') { loadBookingsFromServer(); markCancellationsAsRead(); loadBookingIssuesPanel(); }
  if (name === 'reports') renderReports();
  if (name === 'customers') renderCustomers();
  if (name === 'invoices') renderInvoices();
  if (name === 'profit') renderTiers();
  if (name === 'ancillary') renderAncillaryTiers();
  if (name === 'loyalty') renderLoyaltyConfig();
  if (name === 'settings') { loadInvoiceConfigIntoForm(); loadMaintenanceMode(); }
  if (name === 'blog') loadBlogPosts();
  if (name === 'routes') loadRoutePages();
  if (name === 'geo') loadGeoCities();
  if (name === 'errorlogs') loadErrorLogs();
  if (name === 'team') loadStaff();
  if (name === 'api') { setApiMonitorPeriod('today'); loadApiCostConfig(); loadRouteScoreConfig(); }
}

function toggleMoreMenu() {
  var menu = document.getElementById('more-menu');
  var backdrop = document.getElementById('more-backdrop');
  var isOpen = menu.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('open');
    backdrop.classList.remove('open');
  } else {
    menu.classList.add('open');
    backdrop.classList.add('open');
  }
}

function closeMoreMenu() {
  document.getElementById('more-menu').classList.remove('open');
  document.getElementById('more-backdrop').classList.remove('open');
}

// ============ [ADMIN-AUTH] DATA LOADING — server only, never Supabase directly ============
// loadStats() drives the dashboard's KPI cards. loadBookingsFromServer()
// (called when the bookings page is opened) fetches the full list.
async function loadStats() {
  try {
    const res = await adminFetch('/admin/stats');
    const j = await res.json();
    if (j.ok) {
      document.getElementById('stat-revenue').textContent = '€' + j.revenue.toFixed(2);
      document.getElementById('stat-profit').textContent = '€' + j.profit.toFixed(2);
      document.getElementById('stat-bookings').textContent = j.bookingsCount;
      document.getElementById('stat-discounts').textContent = '€' + j.discounts.toFixed(2);
      const margin = j.revenue > 0 ? ((j.profit / j.revenue) * 100).toFixed(1) : 0;
      document.getElementById('stat-profit-sub').textContent = 'هامش ' + margin + '%';
      document.getElementById('stat-revenue-sub').textContent = j.bookingsCount + ' حجز مؤكد';
    }
  } catch (e) { /* adminFetch already handled 401s; ignore other errors silently */ }
  // Recent bookings on the dashboard home page share the same data as the
  // full bookings list — just the first 8.
  try {
    const res = await adminFetch('/admin/bookings?limit=8');
    const j = await res.json();
    if (j.ok) { allBookings = j.bookings; renderRecentBookings(); }
  } catch (e) { console.error('Admin API error:', e); }
}

async function loadBookingsFromServer() {
  try {
    const res = await adminFetch('/admin/bookings?limit=200');
    const j = await res.json();
    if (j.ok) { allBookings = j.bookings; renderAllBookings(); }
  } catch (e) { console.error('Admin API error:', e); }
}

// ============ [PROFIT-PERIOD-FIX] Profit by period ============
function fmtDateInput(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

async function setProfitPeriod(which) {
  var fromEl = document.getElementById('period-from');
  var toEl = document.getElementById('period-to');
  var today = new Date();

  if (which === 'today') {
    fromEl.value = fmtDateInput(today);
    toEl.value = fmtDateInput(today);
  } else if (which === 'week') {
    // Monday-start week, matching the standard week convention in Germany.
    var dow = today.getDay(); // 0=Sun..6=Sat
    var diffToMonday = (dow === 0) ? 6 : dow - 1;
    var monday = new Date(today); monday.setDate(today.getDate() - diffToMonday);
    fromEl.value = fmtDateInput(monday);
    toEl.value = fmtDateInput(today);
  } else if (which === 'month') {
    var firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    fromEl.value = fmtDateInput(firstOfMonth);
    toEl.value = fmtDateInput(today);
  }
  // 'custom' just uses whatever's already in the inputs.

  ['today','week','month'].forEach(function(p) {
    var btn = document.getElementById('period-btn-' + p);
    if (btn) btn.classList.toggle('active', p === which);
  });

  if (!fromEl.value || !toEl.value) { showToast('اختر تاريخ البداية والنهاية', 'error'); return; }

  try {
    const res = await adminFetch('/admin/stats?from=' + fromEl.value + '&to=' + toEl.value);
    const j = await res.json();
    if (j.ok) {
      document.getElementById('period-revenue').textContent = '€' + j.revenue.toFixed(2);
      document.getElementById('period-profit').textContent = '€' + j.profit.toFixed(2);
      document.getElementById('period-bookings').textContent = j.bookingsCount;
    } else {
      showToast(j.error || 'فشل تحميل البيانات', 'error');
    }
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// ============ [API-COST-MONITORING] API Monitoring page ============
async function setApiMonitorPeriod(which) {
  var fromEl = document.getElementById('api-period-from');
  var toEl = document.getElementById('api-period-to');
  var today = new Date();

  if (which === 'today') {
    fromEl.value = fmtDateInput(today);
    toEl.value = fmtDateInput(today);
  } else if (which === 'week') {
    var dow = today.getDay();
    var diffToMonday = (dow === 0) ? 6 : dow - 1;
    var monday = new Date(today); monday.setDate(today.getDate() - diffToMonday);
    fromEl.value = fmtDateInput(monday);
    toEl.value = fmtDateInput(today);
  } else if (which === 'month') {
    var firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    fromEl.value = fmtDateInput(firstOfMonth);
    toEl.value = fmtDateInput(today);
  }
  // 'custom' just uses whatever's already in the inputs.

  ['today', 'week', 'month'].forEach(function(p) {
    var btn = document.getElementById('api-period-btn-' + p);
    if (btn) btn.classList.toggle('active', p === which);
  });

  if (!fromEl.value || !toEl.value) { showToast('اختر تاريخ البداية والنهاية', 'error'); return; }
  loadApiMonitorStats();
}

async function loadApiMonitorStats() {
  var fromEl = document.getElementById('api-period-from');
  var toEl = document.getElementById('api-period-to');
  if (!fromEl.value || !toEl.value) return;
  try {
    const res = await adminFetch('/admin/api-logs/stats?from=' + fromEl.value + '&to=' + toEl.value);
    const j = await res.json();
    if (j.ok) renderApiMonitorStats(j);
    else showToast(j.error || 'فشل تحميل البيانات', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

async function renderApiMonitorStats(data) {
  document.getElementById('api-stat-total').textContent = data.totalRequests.toLocaleString('ar-EG');
  document.getElementById('api-stat-search').textContent = data.byCategory.search.toLocaleString('ar-EG');
  document.getElementById('api-stat-booking').textContent = data.byCategory.booking.toLocaleString('ar-EG');
  document.getElementById('api-stat-errors').textContent = data.errorCount.toLocaleString('ar-EG');
  var errorRate = data.totalRequests > 0 ? ((data.errorCount / data.totalRequests) * 100).toFixed(1) : '0';
  document.getElementById('api-stat-errors-sub').textContent = 'نسبة الفشل ' + errorRate + '%';
  document.getElementById('api-stat-total-sub').textContent = data.byCategory.other.toLocaleString('ar-EG') + ' طلب آخر';

  // Top-consuming routes — same rank-row/rank-bar-fill visual language as
  // the Reports page's top-destinations list (renderTopList()), adapted
  // to {origin,destination,count} instead of a bookings array.
  var routesEl = document.getElementById('api-top-routes');
  if (!data.topRoutes.length) {
    routesEl.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:8px 0">لا توجد بيانات لهذه الفترة</div>';
  } else {
    var maxCount = data.topRoutes[0].count;
    routesEl.innerHTML = data.topRoutes.map(function(r, idx) {
      var pct = maxCount > 0 ? (r.count / maxCount * 100) : 0;
      return '<div class="rank-row">' +
        '<div class="rank-num">' + (idx + 1) + '</div>' +
        '<div class="rank-info">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline">' +
            '<span class="rank-name">✈️ ' + escHtml(r.origin) + ' → ' + escHtml(r.destination) + '</span>' +
            '<span class="rank-value">' + r.count.toLocaleString('ar-EG') + ' طلب</span>' +
          '</div>' +
          '<div class="rank-bar-track"><div class="rank-bar-fill" style="width:' + pct + '%"></div></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // Circuit-breaker health tile.
  var circuitEl = document.getElementById('api-circuit-status');
  var circuitLabel = data.circuit.state === 'closed' ? '✅ يعمل بشكل طبيعي'
    : data.circuit.state === 'half-open' ? '🟡 يُعاد المحاولة...'
    : '🔴 متوقف مؤقتاً';
  var circuitColor = data.circuit.state === 'closed' ? 'var(--teal)' : data.circuit.state === 'half-open' ? '#f59e0b' : '#dc2626';
  circuitEl.innerHTML = '<div style="font-size:15px;font-weight:700;color:' + circuitColor + ';margin-bottom:6px">' + circuitLabel + '</div>' +
    '<div style="font-size:12px;color:var(--tx3)">فشل متتالي: ' + data.circuit.consecutiveFailures + '</div>';

  // Hidden-by-default alert banner (same bordered-card technique as
  // loadBookingIssuesPanel()) — shown when the circuit isn't closed, or
  // the admin's own configured daily-request threshold is exceeded.
  const costCfgRes = await adminFetch('/admin/api-cost-config');
  const costCfgJ = await costCfgRes.json();
  var threshold = costCfgJ.ok ? costCfgJ.config.dailyRequestAlertThreshold : 1000;
  var alertEl = document.getElementById('api-monitor-alert');
  var circuitTrouble = data.circuit.state !== 'closed';
  var overThreshold = data.totalRequests > threshold;
  if (!circuitTrouble && !overThreshold) {
    alertEl.style.display = 'none';
  } else {
    var msgs = [];
    if (circuitTrouble) msgs.push('اتصال Duffel متوقف مؤقتاً بسبب أخطاء متكررة — النظام بيعيد المحاولة تلقائياً.');
    if (overThreshold) msgs.push('عدد الطلبات في هذه الفترة (' + data.totalRequests.toLocaleString('ar-EG') + ') تجاوز الحد المُعرَّف (' + threshold.toLocaleString('ar-EG') + ').');
    alertEl.innerHTML = '<div style="background:var(--bg2);border:1.5px solid #f59e0b;border-radius:10px;padding:14px 16px">' +
      '<div style="font-weight:700;color:#f59e0b;font-size:13px;margin-bottom:6px">⚠️ تنبيه استهلاك API</div>' +
      msgs.map(function(m) { return '<div style="font-size:12.5px;color:var(--tx2)">' + escHtml(m) + '</div>'; }).join('') +
    '</div>';
    alertEl.style.display = 'block';
  }

  if (costCfgJ.ok) {
    var costPer = costCfgJ.config.costPerRequestEur;
    var estEl = document.getElementById('api-estimated-cost');
    estEl.textContent = costPer > 0
      ? '💰 تقدير تكلفة هذه الفترة: €' + (data.totalRequests * costPer).toFixed(2)
      : '';
  }
}

async function loadApiCostConfig() {
  try {
    const res = await adminFetch('/admin/api-cost-config');
    const j = await res.json();
    if (j.ok) {
      document.getElementById('api-cost-per-request').value = j.config.costPerRequestEur || '';
      document.getElementById('api-alert-threshold').value = j.config.dailyRequestAlertThreshold || '';
    }
  } catch (e) { console.error('Admin API error:', e); }
}

async function saveApiCostConfig() {
  var costPerRequestEur = parseFloat(document.getElementById('api-cost-per-request').value) || 0;
  var dailyRequestAlertThreshold = parseInt(document.getElementById('api-alert-threshold').value, 10) || 1000;
  try {
    const res = await adminFetch('/admin/api-cost-config', {
      method: 'POST', body: JSON.stringify({ costPerRequestEur, dailyRequestAlertThreshold }),
    });
    const j = await res.json();
    if (j.ok) {
      showToast('✅ تم الحفظ', 'success');
      loadApiMonitorStats();
    } else {
      showToast(j.error || 'فشل الحفظ', 'error');
    }
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// [ROUTE-SCORE-4A] Mirrors loadApiCostConfig()/saveApiCostConfig() —
// weights only, read-only display in this phase (see routeScoreBadge()).
async function loadRouteScoreConfig() {
  try {
    const res = await adminFetch('/admin/route-score-config');
    const j = await res.json();
    if (j.ok) {
      document.getElementById('rs-half-life').value = j.config.halfLifeDays || '';
      document.getElementById('rs-lookback').value = j.config.lookbackDays || '';
      document.getElementById('rs-w-impression').value = j.config.impressionWeight != null ? j.config.impressionWeight : '';
      document.getElementById('rs-w-click').value = j.config.clickWeight != null ? j.config.clickWeight : '';
      document.getElementById('rs-w-booking').value = j.config.bookingWeight != null ? j.config.bookingWeight : '';
      document.getElementById('rs-w-ctr').value = j.config.ctrWeight != null ? j.config.ctrWeight : '';
      document.getElementById('rs-conf-low').value = j.config.confidenceLowMax != null ? j.config.confidenceLowMax : '';
      document.getElementById('rs-conf-high').value = j.config.confidenceHighMin != null ? j.config.confidenceHighMin : '';
    }
  } catch (e) { console.error('Admin API error:', e); }
}

async function saveRouteScoreConfig() {
  var payload = {
    halfLifeDays: parseFloat(document.getElementById('rs-half-life').value) || 7,
    lookbackDays: parseInt(document.getElementById('rs-lookback').value, 10) || 30,
    impressionWeight: parseFloat(document.getElementById('rs-w-impression').value) || 0,
    clickWeight: parseFloat(document.getElementById('rs-w-click').value) || 0,
    bookingWeight: parseFloat(document.getElementById('rs-w-booking').value) || 0,
    ctrWeight: parseFloat(document.getElementById('rs-w-ctr').value) || 0,
    confidenceLowMax: parseInt(document.getElementById('rs-conf-low').value, 10) || 0,
    confidenceHighMin: parseInt(document.getElementById('rs-conf-high').value, 10) || 0,
  };
  try {
    const res = await adminFetch('/admin/route-score-config', { method: 'POST', body: JSON.stringify(payload) });
    const j = await res.json();
    if (j.ok) showToast('✅ تم الحفظ — الأثر يظهر بعد دورة الحساب التالية (كل ساعة)', 'success');
    else showToast(j.error || 'فشل الحفظ', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// ============ STATS ============
// [ADMIN-AUTH] Computed server-side now (GET /admin/stats) — see
// loadStats() above. No client-side aggregation of raw booking rows.

// ============ RECENT BOOKINGS ============
function renderRecentBookings() {
  var tbody = document.getElementById('recent-bookings');
  var recent = allBookings.slice(0, 8);
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--tx3);padding:30px">لا توجد حجوزات بعد</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(b => bookingRow(b, true)).join('');
}

let currentBookingsFilter = '';
function renderAllBookings(filter) {
  if (filter !== undefined) currentBookingsFilter = (filter || '').toLowerCase();
  var tbody = document.getElementById('all-bookings');
  var f = currentBookingsFilter;
  var list = f ? allBookings.filter(b =>
    (b.booking_reference || '').toLowerCase().includes(f) ||
    (b.route_label || '').toLowerCase().includes(f) ||
    (b.customer_email || '').toLowerCase().includes(f)
  ) : allBookings;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--tx3);padding:30px">لا توجد نتائج</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(b => bookingRow(b, false)).join('');
}

function bookingRow(b, short) {
  var status = b.status === 'confirmed' ? '<span class="badge confirmed">✓ مؤكد</span>'
    : b.status === 'pending' ? '<span class="badge pending">◔ معلق</span>'
    : b.status === 'cancelled' ? '<span class="badge cancelled">✕ ملغى</span>'
    : '<span class="badge">' + (b.status||'—') + '</span>';

  var paid = Number(b.customer_paid) || 0;
  var profit = Number(b.profit_margin) || 0;
  var duffel = Number(b.duffel_amount) || 0;
  var discount = Number(b.discount_amount) || 0;
  var date = b.created_at ? new Date(b.created_at).toLocaleDateString('ar') : '—';
  var route = escHtml(b.route_label || '—');
  var ref = escHtml(b.booking_reference || '—');
  var email = escHtml(b.customer_email || '—');

  if (short) {
    return `<tr>
      <td class="mono">${ref}</td>
      <td>${email}</td>
      <td>${route}</td>
      <td class="mono" style="color:var(--blue)">€${paid.toFixed(2)}</td>
      <td class="mono" style="color:var(--teal)">€${profit.toFixed(2)}</td>
      <td>${status}</td>
    </tr>`;
  }

  return `<tr>
    <td class="mono">${ref}</td>
    <td>${date}</td>
    <td>${route}</td>
    <td class="mono">€${duffel.toFixed(2)}</td>
    <td class="mono" style="color:var(--yellow)">${discount > 0 ? '-€'+discount.toFixed(2) : '—'}</td>
    <td class="mono" style="color:var(--blue)">€${paid.toFixed(2)}</td>
    <td class="mono" style="color:var(--teal)">€${profit.toFixed(2)}</td>
    <td>${status}</td>
    <td style="display:flex;gap:6px">
      <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick='showBookingDetail(${escJsonAttr(b)})'>تفاصيل</button>
      ${b.status === 'confirmed' ? `<button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="cancelBookingRow('${escHtml(b.id)}')">إلغاء</button>` : ''}
    </td>
  </tr>`;
}

function filterBookings(val) {
  renderAllBookings(val.toLowerCase());
}

// [ADMIN-AUTH] Marks a booking cancelled in our own records only — does
// NOT call Duffel's cancellation API (a refund decision shouldn't happen
// from a stray click). For an actual Duffel cancellation + refund, use
// the existing POST /cancel flow with the order id.
async function cancelBookingRow(id) {
  if (!confirm('تأكيد إلغاء هذا الحجز من السجلات؟ (هذا لا يلغي التذكرة فعلياً مع شركة الطيران)')) return;
  try {
    const res = await adminFetch('/admin/bookings/' + encodeURIComponent(id) + '/cancel', { method: 'POST' });
    const j = await res.json();
    if (j.ok) { showToast('تم إلغاء الحجز في السجلات ✅', 'success'); loadBookingsFromServer(); loadStats(); }
    else showToast(j.error || 'فشل الإلغاء', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// ============ BOOKING DETAIL ============
function showBookingDetail(b) {
  document.getElementById('modal-ref').textContent = 'حجز #' + (b.booking_reference || '—');
  var paid = Number(b.customer_paid) || 0;
  var duffel = Number(b.duffel_amount) || 0;
  var profit = Number(b.profit_margin) || (paid - duffel);
  var discount = Number(b.discount_amount) || 0;
  var route = escHtml(b.route_label || '—');
  var email = escHtml(b.customer_email || '—');
  var custName = escHtml(b.customer_name || '—');
  var custPhone = escHtml(b.customer_phone || '—');
  var custDob = b.customer_dob ? new Date(b.customer_dob).toLocaleDateString('ar') : '—';
  var promoCode = escHtml(b.promo_code || '');
  var orderId = escHtml(b.duffel_order_id || '');
  var sessionId = escHtml(b.stripe_session_id || '');

  document.getElementById('modal-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">معلومات الرحلة</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-key">المسار</div><div class="detail-val">${route}</div></div>
        <div class="detail-item"><div class="detail-key">عدد الركاب</div><div class="detail-val">${Number(b.passenger_count)||1}</div></div>
        <div class="detail-item"><div class="detail-key">البريد الإلكتروني</div><div class="detail-val">${email}</div></div>
        <div class="detail-item"><div class="detail-key">تاريخ الحجز</div><div class="detail-val">${b.created_at ? new Date(b.created_at).toLocaleDateString('ar') : '—'}</div></div>
        <div class="detail-item"><div class="detail-key">اسم العميل</div><div class="detail-val">${custName}</div></div>
        <div class="detail-item"><div class="detail-key">رقم الهاتف</div><div class="detail-val mono">${custPhone}</div></div>
        <div class="detail-item"><div class="detail-key">تاريخ الميلاد</div><div class="detail-val">${custDob}</div></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">التفاصيل المالية</div>
      <div style="background:var(--bg3);border-radius:10px;padding:16px">
        <div class="finance-row">
          <span class="label">سعر التذكرة (Duffel)</span>
          <span class="amount">€${duffel.toFixed(2)}</span>
        </div>
        <div class="finance-row profit">
          <span class="label">هامش الربح</span>
          <span class="amount">+€${profit.toFixed(2)}</span>
        </div>
        ${discount > 0 ? `<div class="finance-row discount">
          <span class="label">خصم كود ${promoCode ? '('+promoCode+')' : ''}</span>
          <span class="amount">-€${discount.toFixed(2)}</span>
        </div>` : ''}
        <div class="finance-row total">
          <span class="label">دفع العميل</span>
          <span class="amount">€${paid.toFixed(2)}</span>
        </div>
      </div>
    </div>

    ${orderId ? `<div class="detail-section">
      <div class="detail-section-title">Duffel</div>
      <div class="detail-item">
        <div class="detail-key">Order ID</div>
        <div class="detail-val mono" style="font-size:11px;word-break:break-all">${orderId}</div>
      </div>
    </div>` : ''}

    ${sessionId ? `<div class="detail-section">
      <div class="detail-section-title">Stripe</div>
      <div class="detail-item">
        <div class="detail-key">Session ID</div>
        <div class="detail-val mono" style="font-size:11px;word-break:break-all">${sessionId}</div>
      </div>
    </div>` : ''}

    ${b.status === 'confirmed' ? `<div class="detail-section">
      <button class="btn btn-primary" style="width:100%" onclick='closeModal("booking-modal"); openInvoiceIssueModal(${escJsonAttr(b)})'>🧾 إصدار فاتورة ضريبية</button>
    </div>` : ''}
  `;
  document.getElementById('booking-modal').classList.add('open');
}

// ============ PROFIT CALCULATOR ============
var DUFFEL_FIXED_FEE = 2.75;   // رسوم Duffel الثابتة لكل حجز
var ISSUANCE_PCT = 0.01;        // 1% تكلفة إصدار التذكرة

function calcExample() {
  var price = parseFloat(document.getElementById('example-price') ? document.getElementById('example-price').value : 0) || 0;
  var disc = parseFloat(document.getElementById('example-discount') ? document.getElementById('example-discount').value : 0) || 0;

  var currentTiers = getTiersFromDOM('tiers-list');
  var result = getMarginForPrice(price, currentTiers);
  var margin = result.margin;
  var tier = result.tier;

  // التكاليف الفعلية
  var duffelFee = DUFFEL_FIXED_FEE;
  var issuanceFee = price * ISSUANCE_PCT;
  var trueCost = price + duffelFee + issuanceFee;

  // العميل يدفع سعر Duffel + هامش الربح - خصم
  var customerPays = price + margin - disc;

  // صافي الربح الحقيقي = ما دفعه العميل - التكلفة الفعلية - خصم
  var netProfit = customerPays - trueCost;

  if (document.getElementById('ex-duffel')) {
    document.getElementById('ex-duffel').textContent = '€' + price.toFixed(2);
    document.getElementById('ex-duffel-fee').textContent = '-€' + duffelFee.toFixed(2);
    document.getElementById('ex-issuance-fee').textContent = '-€' + issuanceFee.toFixed(2);
    document.getElementById('ex-true-cost').textContent = '€' + trueCost.toFixed(2);
    document.getElementById('ex-margin').textContent = '€' + margin.toFixed(2);
    document.getElementById('ex-disc').textContent = '-€' + disc.toFixed(2);
    document.getElementById('ex-total').textContent = '€' + customerPays.toFixed(2);
    document.getElementById('ex-net-profit').textContent = '€' + netProfit.toFixed(2);
    document.getElementById('ex-net-profit').style.color = netProfit >= 0 ? 'var(--teal)' : 'var(--red)';
    if (document.getElementById('ex-tier-label')) {
      if (tier) {
        var toLabel = tier.to !== null ? '€' + tier.to : '∞';
        document.getElementById('ex-tier-label').textContent = '€' + tier.from + ' → ' + toLabel + ' | ' + tier.pct + '% + €' + tier.fixed;
      } else {
        document.getElementById('ex-tier-label').textContent = 'لا توجد شريحة مطابقة';
      }
    }
  }
}

// ============ [ADMIN-MARGIN] PROFIT TIERS — generic engine ============
// The exact same UI/logic powers BOTH the ticket-margin page (#tiers-list)
// and the ancillary seat/baggage-margin page (#ancillary-tiers-list).
// Tiers are loaded from / saved to the server (GET/POST /admin/profit-tiers
// and /admin/ancillary-margin) — never localStorage, and the math here is
// kept in lockstep with computeTieredMargin() in server.js so the preview
// always matches what the server actually charges.

function renderTiersInto(listId, tiers) {
  var list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = '';
  tiers.forEach(function(tier, i) {
    var row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:10px;align-items:center;background:var(--bg3);border-radius:10px;padding:12px;border:1px solid var(--border)';
    row.dataset.index = i;
    row.innerHTML = `
      <div>
        <label style="font-size:10px;color:var(--tx3);display:block;margin-bottom:4px">من €</label>
        <input type="number" class="form-input tier-from" value="${tier.from}" min="0" placeholder="0" oninput="updateTierPreview('${listId}')" style="font-family:var(--mono)">
      </div>
      <div>
        <label style="font-size:10px;color:var(--tx3);display:block;margin-bottom:4px">إلى € <span style="color:var(--tx3)">(فارغ = ∞)</span></label>
        <input type="number" class="form-input tier-to" value="${tier.to !== null && tier.to !== undefined ? tier.to : ''}" min="0" placeholder="∞" oninput="updateTierPreview('${listId}')" style="font-family:var(--mono)">
      </div>
      <div>
        <label style="font-size:10px;color:var(--tx3);display:block;margin-bottom:4px">نسبة %</label>
        <input type="number" class="form-input tier-pct" value="${tier.pct}" min="0" max="100" step="0.5" placeholder="0" oninput="updateTierPreview('${listId}')" style="font-family:var(--mono);color:var(--teal)">
      </div>
      <div>
        <label style="font-size:10px;color:var(--tx3);display:block;margin-bottom:4px">مبلغ ثابت €</label>
        <input type="number" class="form-input tier-fixed" value="${tier.fixed}" min="0" step="0.5" placeholder="0" oninput="updateTierPreview('${listId}')" style="font-family:var(--mono);color:var(--blue)">
      </div>
      <div style="padding-top:20px">
        <button class="icon-btn danger" onclick="removeTierFrom('${listId}', ${i})" title="حذف الشريحة">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    `;
    list.appendChild(row);
  });
}

function renderTiers() {
  renderTiersInto('tiers-list', ticketTiers);
  calcExample();
}

function renderAncillaryTiers() {
  renderTiersInto('ancillary-tiers-list', ancillaryTiers);
  calcAncillaryExample();
}

function addTierTo(listId, tiersArr) {
  var lastTo = tiersArr.length > 0
    ? (tiersArr[tiersArr.length - 1].to || (tiersArr[tiersArr.length - 1].from + 100))
    : 0;
  tiersArr.push({ from: lastTo, to: null, pct: 5, fixed: 1 });
  renderTiersInto(listId, tiersArr);
  var list = document.getElementById(listId);
  if (list && list.lastElementChild) list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (listId === 'tiers-list') calcExample(); else calcAncillaryExample();
}
function addTier() { addTierTo('tiers-list', ticketTiers); }
function addAncillaryTier() { addTierTo('ancillary-tiers-list', ancillaryTiers); }

function removeTierFrom(listId, i) {
  var arr = listId === 'tiers-list' ? ticketTiers : ancillaryTiers;
  arr.splice(i, 1);
  renderTiersInto(listId, arr);
  if (listId === 'tiers-list') calcExample(); else calcAncillaryExample();
}

function getTiersFromDOM(listId) {
  var rows = document.querySelectorAll('#' + listId + ' > div');
  var tiers = [];
  rows.forEach(function(row) {
    var from = parseFloat(row.querySelector('.tier-from').value) || 0;
    var toVal = row.querySelector('.tier-to').value;
    var to = toVal === '' ? null : parseFloat(toVal);
    var pct = parseFloat(row.querySelector('.tier-pct').value) || 0;
    var fixed = parseFloat(row.querySelector('.tier-fixed').value) || 0;
    tiers.push({ from, to, pct, fixed });
  });
  return tiers;
}

function updateTierPreview(listId) {
  if (listId === 'tiers-list') { ticketTiers = getTiersFromDOM(listId); calcExample(); }
  else { ancillaryTiers = getTiersFromDOM(listId); calcAncillaryExample(); }
}

// Same fixed-window tier math as computeTieredMargin() in server.js —
// kept manually in sync; if you change one, change the other.
function getMarginForPrice(price, tiers) {
  for (var i = 0; i < tiers.length; i++) {
    var t = tiers[i];
    var inFrom = price >= t.from;
    var inTo = t.to === null || t.to === undefined || price < t.to;
    if (inFrom && inTo) {
      return { margin: (price * t.pct / 100) + t.fixed, tier: t, index: i };
    }
  }
  if (tiers.length > 0) {
    var last = tiers[tiers.length - 1];
    return { margin: (price * last.pct / 100) + last.fixed, tier: last, index: tiers.length - 1 };
  }
  return { margin: 0, tier: null, index: -1 };
}

// ============ [ADMIN-MARGIN] Load/save tiers — server only ============
async function loadTicketTiers() {
  try {
    const res = await adminFetch('/admin/profit-tiers');
    const j = await res.json();
    if (j.ok) ticketTiers = j.tiers;
  } catch (e) { console.error('Admin API error:', e); }
}
async function loadAncillaryTiers() {
  try {
    const res = await adminFetch('/admin/ancillary-margin');
    const j = await res.json();
    if (j.ok) ancillaryTiers = j.tiers;
  } catch (e) { console.error('Admin API error:', e); }
}

async function saveProfit() {
  ticketTiers = getTiersFromDOM('tiers-list');
  try {
    const res = await adminFetch('/admin/profit-tiers', { method: 'POST', body: JSON.stringify({ tiers: ticketTiers }) });
    const j = await res.json();
    if (j.ok) { showToast('تم حفظ شرائح هامش التذاكر ✅', 'success'); ticketTiers = j.tiers; }
    else showToast(j.error || 'فشل الحفظ', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

async function saveAncillaryMargin() {
  ancillaryTiers = getTiersFromDOM('ancillary-tiers-list');
  try {
    const res = await adminFetch('/admin/ancillary-margin', { method: 'POST', body: JSON.stringify({ tiers: ancillaryTiers }) });
    const j = await res.json();
    if (j.ok) { showToast('تم حفظ شرائح هامش المقاعد والحقائب ✅', 'success'); ancillaryTiers = j.tiers; }
    else showToast(j.error || 'فشل الحفظ', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// Ancillary calculator mirrors calcExample() but without the Duffel
// issuance-fee line (that only applies to the base ticket, not a single
// seat/bag service) and without promo/loyalty (those only ever apply to
// the whole booking, not one ancillary item).
function calcAncillaryExample() {
  var price = parseFloat(document.getElementById('ancillary-example-price') ? document.getElementById('ancillary-example-price').value : 0) || 0;
  var currentTiers = getTiersFromDOM('ancillary-tiers-list');
  var result = getMarginForPrice(price, currentTiers);
  var margin = result.margin;
  var tier = result.tier;
  var customerPays = price + margin;

  if (document.getElementById('aex-net')) {
    document.getElementById('aex-net').textContent = '€' + price.toFixed(2);
    document.getElementById('aex-margin').textContent = '€' + margin.toFixed(2);
    document.getElementById('aex-total').textContent = '€' + customerPays.toFixed(2);
    if (document.getElementById('aex-tier-label')) {
      if (tier) {
        var toLabel = tier.to !== null ? '€' + tier.to : '∞';
        document.getElementById('aex-tier-label').textContent = '€' + tier.from + ' → ' + toLabel + ' | ' + tier.pct + '% + €' + tier.fixed;
      } else {
        document.getElementById('aex-tier-label').textContent = 'لا توجد شريحة مطابقة';
      }
    }
  }
}

// ============ [ADMIN-LOYALTY] LOYALTY CONFIG ============
// Mirrors server.js's getLoyaltyConfig()/DEFAULT_LOYALTY_CONFIG exactly —
// same field names, same tier shape ({from, to, creditEur}). Everything
// here only changes the RULES; the actual per-device balance lives in
// loyalty_accounts on the server and is never touched from this page.
async function loadLoyaltyConfigFromServer() {
  try {
    const res = await adminFetch('/admin/loyalty-config');
    const j = await res.json();
    if (j.ok) loyaltyConfig = j.config;
  } catch (e) { console.error('Admin API error:', e); }
}

function renderLoyaltyConfig() {
  if (!loyaltyConfig) return;
  document.getElementById('ly-welcome-credit').value = loyaltyConfig.welcomeCreditEur;
  document.getElementById('ly-welcome-points').value = loyaltyConfig.welcomePoints;
  document.getElementById('ly-points-per-euro').value = loyaltyConfig.pointsPerEuro;
  document.getElementById('ly-max-credit').value = loyaltyConfig.maxCreditPerBooking;
  renderLoyaltyTiers(loyaltyConfig.tiers || []);
}

function renderLoyaltyTiers(tiers) {
  var list = document.getElementById('loyalty-tiers-list');
  if (!list) return;
  list.innerHTML = '';
  tiers.forEach(function(tier, i) {
    var row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:center;background:var(--bg3);border-radius:10px;padding:12px;border:1px solid var(--border)';
    row.dataset.index = i;
    row.innerHTML = `
      <div>
        <label style="font-size:10px;color:var(--tx3);display:block;margin-bottom:4px">من €</label>
        <input type="number" class="form-input ly-tier-from" value="${tier.from}" min="0" placeholder="0" style="font-family:var(--mono)">
      </div>
      <div>
        <label style="font-size:10px;color:var(--tx3);display:block;margin-bottom:4px">إلى € <span style="color:var(--tx3)">(فارغ = ∞)</span></label>
        <input type="number" class="form-input ly-tier-to" value="${tier.to !== null && tier.to !== undefined ? tier.to : ''}" min="0" placeholder="∞" style="font-family:var(--mono)">
      </div>
      <div>
        <label style="font-size:10px;color:var(--tx3);display:block;margin-bottom:4px">خصم قابل للاستخدام €</label>
        <input type="number" class="form-input ly-tier-credit" value="${tier.creditEur}" min="0" step="0.5" placeholder="0" style="font-family:var(--mono);color:var(--teal)">
      </div>
      <div style="padding-top:20px">
        <button class="icon-btn danger" onclick="removeLoyaltyTier(${i})" title="حذف الشريحة">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    `;
    list.appendChild(row);
  });
}

function getLoyaltyTiersFromDOM() {
  var rows = document.querySelectorAll('#loyalty-tiers-list > div');
  var tiers = [];
  rows.forEach(function(row) {
    var from = parseFloat(row.querySelector('.ly-tier-from').value) || 0;
    var toVal = row.querySelector('.ly-tier-to').value;
    var to = toVal === '' ? null : parseFloat(toVal);
    var creditEur = parseFloat(row.querySelector('.ly-tier-credit').value) || 0;
    tiers.push({ from, to, creditEur });
  });
  return tiers;
}

function addLoyaltyTier() {
  var tiers = getLoyaltyTiersFromDOM();
  var lastTo = tiers.length > 0 ? (tiers[tiers.length - 1].to || (tiers[tiers.length - 1].from + 75)) : 0;
  tiers.push({ from: lastTo, to: null, creditEur: 1 });
  renderLoyaltyTiers(tiers);
}

function removeLoyaltyTier(i) {
  var tiers = getLoyaltyTiersFromDOM();
  tiers.splice(i, 1);
  renderLoyaltyTiers(tiers);
}

async function saveLoyaltyConfig() {
  var cfg = {
    welcomeCreditEur: parseFloat(document.getElementById('ly-welcome-credit').value) || 0,
    welcomePoints: parseInt(document.getElementById('ly-welcome-points').value, 10) || 0,
    pointsPerEuro: parseFloat(document.getElementById('ly-points-per-euro').value) || 0,
    maxCreditPerBooking: parseFloat(document.getElementById('ly-max-credit').value) || 0,
    tiers: getLoyaltyTiersFromDOM(),
  };
  try {
    const res = await adminFetch('/admin/loyalty-config', { method: 'POST', body: JSON.stringify(cfg) });
    const j = await res.json();
    if (j.ok) { showToast('تم حفظ إعدادات الولاء ✅', 'success'); loyaltyConfig = j.config; }
    else showToast(j.error || 'فشل الحفظ', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// ============ PROMOS ============
// ============ [ADMIN-MARGIN] PROMOS — server only ============
// Promo codes used to live as a plain hardcoded object inside the
// customer-facing site's JS (visible to anyone via devtools, with no real
// usage cap). They now live in a real `promo_codes` table, validated only
// by the server.
async function loadPromosFromServer() {
  try {
    const res = await adminFetch('/admin/promos');
    const j = await res.json();
    if (j.ok) { promos = j.promos; renderPromos(); }
  } catch (e) { console.error('Admin API error:', e); }
  loadPromoUsageLog();
}

// [ADMIN-DASHBOARD-FIX] Populates the previously-decorative "سجل الاستخدام"
// table from /admin/promos/usage-log, which derives real per-use rows
// (booking reference, who used it, how much was discounted, when) from the
// bookings table — promo_codes itself only ever tracked a used_count
// total, with no such detail available before this endpoint existed.
async function loadPromoUsageLog() {
  var tbody = document.getElementById('promo-usage-log');
  if (!tbody) return;
  try {
    const res = await adminFetch('/admin/promos/usage-log?limit=50');
    const j = await res.json();
    if (!j.ok) { console.error('Admin API error:', j.error); return; }
    if (!j.usage.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:24px">لا يوجد سجل بعد</td></tr>';
      return;
    }
    tbody.innerHTML = j.usage.map((u) => {
      var d = u.created_at ? new Date(u.created_at).toLocaleDateString('ar') : '—';
      return `<tr>
        <td class="mono">${escHtml(u.promo_code)}</td>
        <td>${escHtml(u.customer_email) || '—'}</td>
        <td class="mono">${escHtml(u.booking_reference) || '—'}</td>
        <td class="mono" style="color:var(--yellow)">-€${(Number(u.discount_amount) || 0).toFixed(2)}</td>
        <td>${d}</td>
      </tr>`;
    }).join('');
  } catch (e) { console.error('Admin API error:', e); }
}

function renderPromos() {
  var grid = document.getElementById('promo-grid');
  if (!promos.length) {
    grid.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:10px">لا توجد كودات بعد</div>';
    return;
  }
  grid.innerHTML = promos.map((p) => {
    var used = p.used_count || 0;
    var max = p.max_uses || 0;
    var pct = max > 0 ? Math.min(100, (used / max) * 100) : (used > 0 ? 50 : 0);
    var expired = p.expires_at && new Date(p.expires_at) < new Date();
    var inactive = !p.active;
    var code = escHtml(p.code);
    return `<div class="promo-card" style="${(expired || inactive) ? 'opacity:0.5' : ''}">
      <div class="promo-actions">
        <button class="icon-btn" onclick="togglePromoActive('${escHtml(p.id)}')" title="${p.active ? 'تعطيل' : 'تفعيل'}">${p.active ? '⏸' : '▶'}</button>
        <button class="icon-btn danger" onclick="deletePromo('${escHtml(p.id)}')" title="حذف">🗑</button>
      </div>
      <div class="promo-code">${code}</div>
      <div class="promo-details">
        💰 خصم: ${p.type === 'percent' ? p.value + '%' : '€' + Number(p.value).toFixed(2)}<br>
        📅 ينتهي: ${p.expires_at ? new Date(p.expires_at).toLocaleDateString('ar') : 'غير محدد'}<br>
        🔢 الحد: ${max > 0 ? max + ' مرة' : 'غير محدود'}
      </div>
      <div class="promo-usage">${used} استخدام ${max > 0 ? 'من ' + max : ''}</div>
      ${max > 0 ? `<div class="promo-bar"><div class="promo-bar-fill" style="width:${pct}%"></div></div>` : ''}
      ${expired ? '<div style="color:var(--red);font-size:11px;margin-top:6px">⚠️ منتهي الصلاحية</div>' : ''}
      ${inactive ? '<div style="color:var(--tx3);font-size:11px;margin-top:6px">⏸ معطّل</div>' : ''}
    </div>`;
  }).join('');
}

function openPromoModal() {
  document.getElementById('pm-code').value = '';
  document.getElementById('pm-value').value = '';
  document.getElementById('pm-max').value = '0';
  document.getElementById('promo-modal').classList.add('open');
}

async function savePromo() {
  var code = document.getElementById('pm-code').value.trim().toUpperCase();
  var type = document.getElementById('pm-type').value; // 'percent' | 'fixed' — matches the server's promo_codes.type
  var value = parseFloat(document.getElementById('pm-value').value);
  var expiry = document.getElementById('pm-expiry').value;
  var max = parseInt(document.getElementById('pm-max').value, 10) || 0;

  if (!code || !value) { showToast('أدخل الكود والقيمة', 'error'); return; }

  try {
    const res = await adminFetch('/admin/promos', {
      method: 'POST',
      body: JSON.stringify({
        code, type, value,
        max_uses: max > 0 ? max : null,
        expires_at: expiry || null,
      }),
    });
    const j = await res.json();
    if (j.ok) {
      showToast('تم إنشاء الكود ✅', 'success');
      closeModal('promo-modal');
      loadPromosFromServer();
    } else {
      showToast(j.error || 'فشل إنشاء الكود', 'error');
    }
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

async function togglePromoActive(id) {
  try {
    const res = await adminFetch('/admin/promos/' + encodeURIComponent(id) + '/toggle', { method: 'POST' });
    const j = await res.json();
    if (j.ok) { loadPromosFromServer(); }
    else showToast(j.error || 'فشل التحديث', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

async function deletePromo(id) {
  if (!confirm('تأكيد حذف هذا الكود نهائياً؟')) return;
  try {
    const res = await adminFetch('/admin/promos/' + encodeURIComponent(id), { method: 'DELETE' });
    const j = await res.json();
    if (j.ok) { showToast('تم حذف الكود', 'success'); loadPromosFromServer(); }
    else showToast(j.error || 'فشل الحذف', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// ============ REPORTS ============
var reportRange = 30;
var reportMode = 'daily'; // 'daily' or 'monthly'

function setReportRange(days) {
  reportRange = days;
  ['30','90','365'].forEach(d => {
    document.getElementById('rep-range-' + d).classList.toggle('active', parseInt(d) === days);
  });
  _renderReportsInner();
}

function toggleReportMode() {
  reportMode = reportMode === 'daily' ? 'monthly' : 'daily';
  document.getElementById('rep-mode-toggle').textContent = reportMode === 'daily' ? 'عرض شهري' : 'عرض يومي';
  _renderReportsInner();
}

async function renderReports() {
  await loadBookingsFromServer();
  ['30','90','365'].forEach(d => {
    document.getElementById('rep-range-' + d).classList.toggle('active', parseInt(d) === reportRange);
  });
  _renderReportsInner();
}

// Actual render logic
function _renderReportsInner() {
  var confirmed = allBookings.filter(b => b.status === 'confirmed');
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - reportRange);
  var inRange = confirmed.filter(b => b.created_at && new Date(b.created_at) >= cutoff);

  renderRevenueChart(inRange);
  renderTopList('top-destinations', inRange, b => b.route_label, '✈️');
  renderTopList('top-airlines', inRange.filter(b => b.promo_code), b => b.promo_code, '🏷');
}

function renderRevenueChart(bookings) {
  var canvas = document.getElementById('revenue-chart');
  if (!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();
  var w = rect.width || canvas.parentElement.clientWidth - 40;
  var h = 260;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Bucket data
  var buckets = {}; // key -> {revenue, profit}
  var keyFn;
  if (reportMode === 'daily') {
    keyFn = d => d.toISOString().slice(0, 10);
  } else {
    keyFn = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  bookings.forEach(b => {
    var d = new Date(b.created_at);
    var key = keyFn(d);
    if (!buckets[key]) buckets[key] = { revenue: 0, profit: 0 };
    buckets[key].revenue += (b.customer_paid || b.total_amount || 0);
    buckets[key].profit += (b.profit_margin || 0);
  });

  var keys = Object.keys(buckets).sort();
  var padding = { top: 16, right: 8, bottom: 28, left: 50 };
  var plotW = w - padding.left - padding.right;
  var plotH = h - padding.top - padding.bottom;

  if (!keys.length) {
    ctx.fillStyle = '#475569';
    ctx.font = '13px IBM Plex Sans Arabic, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('لا توجد بيانات لهذه الفترة', w / 2, h / 2);
    return;
  }

  var maxVal = Math.max(1, ...keys.map(k => buckets[k].revenue));
  var niceMax = maxVal * 1.15;

  // Grid lines + y labels
  ctx.strokeStyle = '#1e2d45';
  ctx.fillStyle = '#475569';
  ctx.font = '10px IBM Plex Mono, monospace';
  ctx.textAlign = 'right';
  var steps = 4;
  for (var i = 0; i <= steps; i++) {
    var y = padding.top + plotH - (plotH * i / steps);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.lineWidth = 1;
    ctx.stroke();
    var val = (niceMax * i / steps);
    ctx.fillText('€' + Math.round(val), padding.left - 8, y + 3);
  }

  function xFor(idx) {
    if (keys.length === 1) return padding.left + plotW / 2;
    return padding.left + (plotW * idx / (keys.length - 1));
  }
  function yFor(val) {
    return padding.top + plotH - (plotH * val / niceMax);
  }

  function drawLine(field, color) {
    ctx.beginPath();
    keys.forEach((k, idx) => {
      var x = xFor(idx);
      var y = yFor(buckets[k][field]);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // dots
    keys.forEach((k, idx) => {
      var x = xFor(idx);
      var y = yFor(buckets[k][field]);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  drawLine('revenue', '#60a5fa');
  drawLine('profit', '#00c9a7');

  // x labels (skip some if too many)
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'center';
  ctx.font = '10px IBM Plex Mono, monospace';
  var labelEvery = Math.max(1, Math.ceil(keys.length / 8));
  keys.forEach((k, idx) => {
    if (idx % labelEvery !== 0 && idx !== keys.length - 1) return;
    var x = xFor(idx);
    var label = reportMode === 'daily' ? k.slice(5) : k;
    ctx.fillText(label, x, h - 8);
  });
}

function renderTopList(containerId, bookings, fieldFn, icon) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var counts = {}; // name -> {count, revenue}
  bookings.forEach(b => {
    var name = fieldFn(b) || 'غير محدد';
    if (!counts[name]) counts[name] = { count: 0, revenue: 0 };
    counts[name].count += 1;
    counts[name].revenue += (b.customer_paid || b.total_amount || 0);
  });

  var entries = Object.entries(counts).sort((a, b) => b[1].count - a[1].count).slice(0, 6);

  if (!entries.length) {
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:8px 0">لا توجد بيانات لهذه الفترة</div>';
    return;
  }

  var maxCount = entries[0][1].count;
  el.innerHTML = entries.map((entry, idx) => {
    var name = entry[0], data = entry[1];
    var pct = maxCount > 0 ? (data.count / maxCount * 100) : 0;
    return `<div class="rank-row">
      <div class="rank-num">${idx + 1}</div>
      <div class="rank-info">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span class="rank-name">${icon} ${name}</span>
          <span class="rank-value">${data.count} حجز</span>
        </div>
        <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${pct}%"></div></div>
        <div class="rank-sub">إيرادات €${data.revenue.toFixed(2)}</div>
      </div>
    </div>`;
  }).join('');
}

// ============ CUSTOMERS ============
var VIP_THRESHOLD = 3;
var customersData = []; // cached grouped list
var customerFilter = '';
var customerVipOnly = false;

function buildCustomers() {
  var map = {}; // email -> {email, name, phone, user_id, bookings: []}
  allBookings.forEach(b => {
    var email = (b.customer_email || '').trim().toLowerCase();
    if (!email) return; // skip bookings with no identifiable customer
    if (!map[email]) {
      map[email] = { email: b.customer_email, name: b.customer_name || '', phone: b.customer_phone || '', user_id: b.user_id || null, bookings: [] };
    }
    if (!map[email].name && b.customer_name) map[email].name = b.customer_name;
    if (!map[email].phone && b.customer_phone) map[email].phone = b.customer_phone;
    if (!map[email].user_id && b.user_id) map[email].user_id = b.user_id;
    map[email].bookings.push(b);
  });

  return Object.values(map).map(c => {
    var confirmed = c.bookings.filter(b => b.status === 'confirmed');
    var totalSpent = confirmed.reduce((s, b) => s + (b.customer_paid || b.total_amount || 0), 0);
    var totalProfit = confirmed.reduce((s, b) => s + (b.profit_margin || 0), 0);
    var sorted = c.bookings.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return {
      email: c.email,
      name: c.name,
      phone: c.phone,
      user_id: c.user_id,
      bookingCount: c.bookings.length,
      confirmedCount: confirmed.length,
      totalSpent: totalSpent,
      totalProfit: totalProfit,
      lastBooking: sorted[0] ? sorted[0].created_at : null,
      bookings: sorted,
      isVip: confirmed.length >= VIP_THRESHOLD
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);
}

// [CUSTOMER-SEARCH] q, when given, is forwarded to the server's own
// ilike search across email/name/phone (GET /admin/bookings?q=) — real
// server-side search, not just a client-side substring filter, so a
// customer well past the 200-row page can still be found by phone.
async function loadCustomerBookings(q) {
  try {
    var url = '/admin/bookings?limit=200';
    if (q) url += '&q=' + encodeURIComponent(q);
    const res = await adminFetch(url);
    const j = await res.json();
    if (j.ok) allBookings = j.bookings;
  } catch (e) { console.error('Admin API error:', e); }
}

async function renderCustomers(q) {
  await loadCustomerBookings(q);
  customersData = buildCustomers();
  var noEmailCount = allBookings.filter(b => !(b.customer_email || '').trim()).length;

  document.getElementById('cust-total').textContent = customersData.length;
  var vipCount = customersData.filter(c => c.isVip).length;
  var repeatCount = customersData.filter(c => c.confirmedCount > 1).length;
  var avgSpent = customersData.length ? (customersData.reduce((s, c) => s + c.totalSpent, 0) / customersData.length) : 0;

  document.getElementById('cust-vip').textContent = vipCount;
  document.getElementById('cust-repeat').textContent = repeatCount;
  document.getElementById('cust-avg').textContent = '€' + avgSpent.toFixed(2);
  document.getElementById('cust-total-sub').textContent = noEmailCount > 0
    ? noEmailCount + ' حجز بدون إيميل عميل'
    : 'كل الحجوزات مرتبطة بعملاء';

  renderCustomersTable();
}

function renderCustomersTable() {
  var tbody = document.getElementById('customers-table');
  // [CUSTOMER-SEARCH] Text matching already happened server-side (the q
  // param on /admin/bookings) — re-filtering by email/name here client-side
  // would silently drop a phone-only match, so only the VIP toggle (a
  // purely client-side view of the already-fetched set) narrows further.
  var list = customersData.filter(c => !customerVipOnly || c.isVip);

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--tx3);padding:30px">لا توجد نتائج</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((c, i) => {
    var idx = customersData.indexOf(c);
    var lastDate = c.lastBooking ? new Date(c.lastBooking).toLocaleDateString('ar') : '—';
    var vipBadge = c.isVip ? '<span class="badge confirmed">⭐ VIP</span>' : '<span class="badge">عادي</span>';
    // [CREDIT-TOPUP] Owner-only, and only possible for a registered
    // (non-guest) customer — no user_id means no loyalty_accounts row can
    // exist for them under the current schema.
    var creditBtn = (ADMIN_ROLE === 'admin' && c.user_id)
      ? `<button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick='openCreditModal(${escJsonAttr({ user_id: c.user_id, name: c.name || c.email })})'>+ رصيد</button>`
      : '';
    return `<tr>
      <td>
        <div style="font-weight:600">${escHtml(c.name) || 'بدون اسم'}</div>
        <div style="font-size:11px;color:var(--tx3)" class="mono">${escHtml(c.email)}</div>
      </td>
      <td class="mono">${escHtml(c.phone) || '—'}</td>
      <td class="mono">${c.bookingCount}</td>
      <td class="mono" style="color:var(--blue)">€${c.totalSpent.toFixed(2)}</td>
      <td class="mono" style="color:var(--teal)">€${c.totalProfit.toFixed(2)}</td>
      <td>${lastDate}</td>
      <td>${vipBadge}</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="showCustomerDetail(${idx})">تفاصيل</button>
        ${creditBtn}
      </td>
    </tr>`;
  }).join('');
}

var _customerSearchTimer = null;
function filterCustomers(val) {
  customerFilter = (val || '').trim();
  clearTimeout(_customerSearchTimer);
  _customerSearchTimer = setTimeout(() => renderCustomers(customerFilter), 300);
}

function toggleVipFilter() {
  customerVipOnly = !customerVipOnly;
  document.getElementById('vip-filter-btn').classList.toggle('active', customerVipOnly);
  renderCustomersTable();
}

function showCustomerDetail(idx) {
  var c = customersData[idx];
  if (!c) return;

  document.getElementById('cmodal-name').textContent = c.name || c.email;

  var rows = c.bookings.map(b => {
    var status = b.status === 'confirmed' ? '<span class="badge confirmed">✓ مؤكد</span>'
      : b.status === 'pending' ? '<span class="badge pending">◔ معلق</span>'
      : b.status === 'cancelled' ? '<span class="badge cancelled">✕ ملغى</span>'
      : '<span class="badge">' + (b.status||'—') + '</span>';
    var paid = b.customer_paid || b.total_amount || 0;
    var date = b.created_at ? new Date(b.created_at).toLocaleDateString('ar') : '—';
    return `<tr>
      <td class="mono">${escHtml(b.booking_ref)||'—'}</td>
      <td>${date}</td>
      <td>${escHtml(b.origin||'?') + ' → ' + escHtml(b.destination||'?')}</td>
      <td class="mono" style="color:var(--blue)">€${paid.toFixed(2)}</td>
      <td>${status}</td>
    </tr>`;
  }).join('');

  document.getElementById('cmodal-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">معلومات العميل</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-key">الإيميل</div><div class="detail-val mono">${escHtml(c.email)}</div></div>
        <div class="detail-item"><div class="detail-key">الهاتف</div><div class="detail-val mono">${escHtml(c.phone) || '—'}</div></div>
        <div class="detail-item"><div class="detail-key">عدد الحجوزات</div><div class="detail-val">${c.bookingCount}</div></div>
        <div class="detail-item"><div class="detail-key">إجمالي الإنفاق</div><div class="detail-val">€${c.totalSpent.toFixed(2)}</div></div>
        <div class="detail-item"><div class="detail-key">صافي ربحنا منه</div><div class="detail-val">€${c.totalProfit.toFixed(2)}</div></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">سجل الحجوزات</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="text-align:right;padding:8px;font-size:11px;color:var(--tx3)">المرجع</th>
          <th style="text-align:right;padding:8px;font-size:11px;color:var(--tx3)">التاريخ</th>
          <th style="text-align:right;padding:8px;font-size:11px;color:var(--tx3)">الرحلة</th>
          <th style="text-align:right;padding:8px;font-size:11px;color:var(--tx3)">المبلغ</th>
          <th style="text-align:right;padding:8px;font-size:11px;color:var(--tx3)">الحالة</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="detail-section">
      ${(ADMIN_ROLE === 'admin' && c.user_id) ? `<button class="btn btn-primary" style="width:100%;margin-bottom:8px" onclick='closeModal("customer-modal");openCreditModal(${escJsonAttr({ user_id: c.user_id, name: c.name || c.email })})'>💳 إضافة رصيد</button>` : ''}
      <button class="btn btn-primary" style="width:100%" onclick='emailCustomer(${escJsonAttr({ email: c.email, name: c.name })})'>✉️ إرسال إيميل للعميل</button>
    </div>
  `;
  document.getElementById('customer-modal').classList.add('open');
}

function emailCustomer(c) {
  var subject = encodeURIComponent('Airpiv — بخصوص حجوزاتك');
  var body = encodeURIComponent('مرحباً ' + (c.name || '') + ',\n\n');
  window.location.href = 'mailto:' + encodeURIComponent(c.email || '') + '?subject=' + subject + '&body=' + body;
}

// ============ [CREDIT-TOPUP] Admin-triggered loyalty credit ============
// Owner-only — the server independently enforces this via requireFullAdmin
// regardless of what this UI shows or hides.
function openCreditModal(payload) {
  document.getElementById('cm-user-id').value = payload.user_id;
  document.getElementById('cm-customer-name').textContent = payload.name || '';
  document.getElementById('cm-amount').value = '';
  document.getElementById('cm-reason').value = '';
  document.getElementById('credit-modal').classList.add('open');
}

async function submitCredit() {
  var userId = document.getElementById('cm-user-id').value;
  var amount = parseFloat(document.getElementById('cm-amount').value);
  var reason = document.getElementById('cm-reason').value.trim();
  if (!userId || !amount || amount <= 0) { showToast('أدخل مبلغ صحيح', 'error'); return; }
  try {
    const res = await adminFetch('/admin/customers/credit', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, amount: amount, reason: reason || undefined }),
    });
    const j = await res.json();
    if (j.ok) {
      showToast('تمت إضافة €' + amount.toFixed(2) + ' للعميل ✅', 'success');
      closeModal('credit-modal');
    } else {
      showToast(j.error || 'فشلت العملية', 'error');
    }
  } catch (e) { /* adminFetch already redirected to the login screen on 401 */ }
}

// ============ [STAFF-ROLES] Team page — staff account management ============
var staffData = []; // cached list from GET /admin/staff

async function loadStaff() {
  try {
    const res = await adminFetch('/admin/staff');
    const j = await res.json();
    if (j.ok) { staffData = j.staff || []; renderStaffTable(); }
    else showToast(j.error || 'فشل تحميل الفريق', 'error');
  } catch (e) { console.error('Admin API error:', e); }
}

function renderStaffTable() {
  var tbody = document.getElementById('staff-table');
  if (!staffData.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--tx3);padding:30px">لا يوجد موظفون بعد</td></tr>';
    return;
  }
  tbody.innerHTML = staffData.map(s => {
    var roleLabel = s.role === 'admin' ? '<span class="badge confirmed">مدير</span>' : '<span class="badge">موظف</span>';
    var statusLabel = s.active ? '<span class="badge confirmed">✓ فعّال</span>' : '<span class="badge cancelled">✕ معطّل</span>';
    var created = s.created_at ? new Date(s.created_at).toLocaleDateString('ar') : '—';
    return `<tr>
      <td>${escHtml(s.name)}</td>
      <td class="mono">${escHtml(s.email)}</td>
      <td>${roleLabel}</td>
      <td>${statusLabel}</td>
      <td>${created}</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick='openStaffModal(${escJsonAttr(s)})'>تعديل</button>
        <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="toggleStaffActive('${escHtml(s.id)}', ${!s.active})">${s.active ? 'تعطيل' : 'تفعيل'}</button>
        <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px;color:var(--red,#e54848)" onclick="deleteStaffAccount('${escHtml(s.id)}')">حذف</button>
      </td>
    </tr>`;
  }).join('');
}

// staff is undefined for "add new"; a staff row object for "edit".
function openStaffModal(staff) {
  document.getElementById('sm-id').value = staff ? staff.id : '';
  document.getElementById('staff-modal-title').textContent = staff ? 'تعديل الموظف' : 'موظف جديد';
  document.getElementById('sm-name').value = staff ? staff.name : '';
  document.getElementById('sm-email').value = staff ? staff.email : '';
  document.getElementById('sm-password').value = '';
  document.getElementById('sm-password').placeholder = staff ? 'اتركها فارغة لعدم التغيير' : '••••••••';
  document.getElementById('sm-role').value = staff ? staff.role : 'staff';
  document.getElementById('staff-modal').classList.add('open');
}

async function saveStaff() {
  var id = document.getElementById('sm-id').value;
  var name = document.getElementById('sm-name').value.trim();
  var email = document.getElementById('sm-email').value.trim();
  var password = document.getElementById('sm-password').value;
  var role = document.getElementById('sm-role').value;
  if (!name || !email) { showToast('الاسم والبريد الإلكتروني مطلوبان', 'error'); return; }
  if (!id && !password) { showToast('كلمة المرور مطلوبة للحساب الجديد', 'error'); return; }
  try {
    const res = id
      ? await adminFetch('/admin/staff/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ name, role, password: password || undefined }) })
      : await adminFetch('/admin/staff', { method: 'POST', body: JSON.stringify({ name, email, password, role }) });
    const j = await res.json();
    if (j.ok) {
      showToast('تم الحفظ ✅', 'success');
      closeModal('staff-modal');
      loadStaff();
    } else {
      showToast(j.error || 'فشل الحفظ', 'error');
    }
  } catch (e) { /* adminFetch already redirected to the login screen on 401 */ }
}

async function toggleStaffActive(id, nextActive) {
  try {
    const res = await adminFetch('/admin/staff/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ active: nextActive }) });
    const j = await res.json();
    if (j.ok) { loadStaff(); }
    else showToast(j.error || 'فشل التحديث', 'error');
  } catch (e) { /* adminFetch already redirected to the login screen on 401 */ }
}

async function deleteStaffAccount(id) {
  if (!confirm('تأكيد حذف هذا الموظف نهائياً؟')) return;
  try {
    const res = await adminFetch('/admin/staff/' + encodeURIComponent(id), { method: 'DELETE' });
    const j = await res.json();
    if (j.ok) { showToast('تم الحذف', 'success'); loadStaff(); }
    else showToast(j.error || 'فشل الحذف', 'error');
  } catch (e) { /* adminFetch already redirected to the login screen on 401 */ }
}

// ============ [ADMIN-MARGIN] INVOICE CONFIG — server only ============
// Company name/address/tax settings now live in admin_config on the
// server (GET/POST /admin/invoice-config), available from any device you
// log in from. NOTE: this is configuration only — there is no automatic
// invoice-PDF generation or sequential numbering wired up server-side yet;
// nextNumber here is a manually-maintained value, not legally guaranteed
// to be gap-free (§14 UStG requires that for real invoice issuance — if
// you start generating actual invoice PDFs, that increment needs to be
// atomic server-side, not just a stored number).
async function saveInvoiceConfig() {
  var cfg = {
    companyName: document.getElementById('inv-name').value.trim(),
    companyAddress: document.getElementById('inv-address').value.trim(),
    steuernummer: document.getElementById('inv-steuernummer').value.trim(),
    taxMode: document.getElementById('inv-tax-mode').value,
    prefix: (document.getElementById('inv-prefix').value.trim() || 'AIRPIV').toUpperCase(),
  };
  try {
    const res = await adminFetch('/admin/invoice-config', { method: 'POST', body: JSON.stringify(cfg) });
    const j = await res.json();
    if (j.ok) showToast('تم حفظ بيانات الفاتورة ✅', 'success');
    else showToast(j.error || 'فشل الحفظ', 'error');
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

async function loadInvoiceConfigIntoForm() {
  try {
    const res = await adminFetch('/admin/invoice-config');
    const j = await res.json();
    if (j.ok) {
      invoiceConfig = j.config;
      if (document.getElementById('inv-name')) {
        document.getElementById('inv-name').value = invoiceConfig.companyName || '';
        document.getElementById('inv-address').value = invoiceConfig.companyAddress || '';
        document.getElementById('inv-steuernummer').value = invoiceConfig.steuernummer || '';
        document.getElementById('inv-tax-mode').value = invoiceConfig.taxMode || 'kleinunternehmer';
        document.getElementById('inv-prefix').value = invoiceConfig.prefix || 'AIRPIV';
      }
    }
  } catch (e) { console.error('Admin API error:', e); }
}

function isInvoiceConfigComplete() {
  return !!(invoiceConfig && invoiceConfig.companyName && invoiceConfig.companyAddress && invoiceConfig.steuernummer);
}

// ============ [MAINTENANCE-MODE] Emergency full-site shutdown ============
async function loadMaintenanceMode() {
  try {
    const res = await adminFetch('/admin/maintenance-mode');
    const j = await res.json();
    if (j.ok) renderMaintenanceStatus(j.enabled, j.message);
  } catch (e) { console.error('Admin API error:', e); }
}

function renderMaintenanceStatus(enabled, message) {
  var badge = document.getElementById('maint-status-badge');
  if (badge) {
    badge.innerHTML = enabled
      ? '<span style="color:var(--red,#e54848)">🔴 الموقع مغلق حالياً للزوار</span>'
      : '<span style="color:var(--teal)">🟢 الموقع يعمل بشكل طبيعي</span>';
  }
  var msgInput = document.getElementById('maint-message');
  if (msgInput && document.activeElement !== msgInput) msgInput.value = message || '';
  var enableBtn = document.getElementById('maint-enable-btn');
  var disableBtn = document.getElementById('maint-disable-btn');
  if (enableBtn) enableBtn.disabled = enabled;
  if (disableBtn) disableBtn.disabled = !enabled;
}

async function toggleMaintenanceMode(enable) {
  // [MAINTENANCE-MODE] Deliberate friction — this affects every visitor to
  // the site, in both directions (closing it AND reopening it are equally
  // consequential one-tap actions), so both require an explicit confirm().
  var confirmMsg = enable
    ? 'تأكيد: سيتم إغلاق الموقع بالكامل لجميع الزوار فوراً. هل أنت متأكد؟'
    : 'تأكيد: سيتم إعادة تشغيل الموقع وفتحه لجميع الزوار. هل أنت متأكد؟';
  if (!confirm(confirmMsg)) return;
  var message = (document.getElementById('maint-message') || {}).value || '';
  try {
    const res = await adminFetch('/admin/maintenance-mode', {
      method: 'POST',
      body: JSON.stringify({ enabled: enable, message: message }),
    });
    const j = await res.json();
    if (j.ok) {
      renderMaintenanceStatus(j.enabled, j.message);
      showToast(enable ? '🚨 تم إغلاق الموقع' : '✅ تم إعادة تشغيل الموقع', enable ? 'error' : 'success');
    } else {
      showToast(j.error || 'فشل تنفيذ العملية', 'error');
    }
  } catch (e) { showToast('خطأ في الاتصال بالسيرفر — تحقق من الإنترنت', 'error'); }
}

// ============ [ADMIN-INVOICE] INVOICE NUMBERING — server only ============
// The actual number is now reserved atomically by the server's
// issue_invoice() Postgres function (a real SEQUENCE, race-safe under
// concurrent admins) at the moment of issuing — never before. There is no
// more "peek" that's guaranteed accurate: showing a predicted number before
// commit risks showing one that's already been taken by another admin in
// the meantime. The modal instead shows "wird automatisch vergeben" and the
// real number appears only after the server confirms it.
async function loadInvoicesFromServer() {
  try {
    const res = await adminFetch('/admin/invoices?limit=300');
    const j = await res.json();
    if (j.ok) { issuedInvoicesCache = j.invoices; }
  } catch (e) { console.error('Admin API error:', e); }
}
let issuedInvoicesCache = [];
// ============ FLEXIBLE FIELD EXTRACTION ============
// تحاول عدة أسماء حقول شائعة عشان تشتغل بغض النظر عن تسمية أعمدتك بالضبط.
function pickField(b, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var v = b[candidates[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function extractInvoiceFields(b) {
  var route = pickField(b, ['route_label']);
  return {
    customerName: pickField(b, ['customer_email', 'customer_name', 'passenger_name', 'full_name', 'name']),
    customerAddress: pickField(b, ['customer_address', 'billing_address', 'address']),
    pnr: pickField(b, ['booking_reference', 'booking_ref', 'pnr', 'reference']),
    airline: pickField(b, ['airline']),
    route: route,
    serviceDate: pickField(b, ['departure_date', 'created_at']),
    amount: Number(b.customer_paid) || 0
  };
}

// ============ ISSUE INVOICE MODAL ============
var pendingInvoiceBooking = null;

async function openInvoiceIssueModal(b) {
  // [ADMIN-INVOICE] invoiceConfig may not be loaded yet if the admin never
  // visited the Settings page this session — load it fresh here so the
  // completeness check is never a false negative against stale/empty state.
  await loadInvoiceConfigIntoForm();
  if (!isInvoiceConfigComplete()) {
    showToast('عبّي بيانات الفاتورة (الاسم/العنوان/Steuernummer) في الإعدادات أولاً', 'error');
    showPage('settings');
    return;
  }
  pendingInvoiceBooking = b;
  var f = extractInvoiceFields(b);

  document.getElementById('invoice-modal-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">رقم الفاتورة</div>
      <div class="mono" style="font-size:13px;color:var(--tx3)">سيُحدَّد تلقائياً وبشكل متسلسل عند الإصدار — لا تكرار ولا فجوات (مُولَّد من السيرفر)</div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">تأكد/عدّل بيانات العميل قبل الإصدار</div>
      <div class="form-group" style="margin-bottom:10px">
        <label class="form-label">اسم العميل</label>
        <input type="text" class="form-input" id="iv-customer-name" value="${escHtml(f.customerName)}" placeholder="اسم العميل الكامل">
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">عنوان العميل</label>
        <textarea class="form-input" id="iv-customer-address" rows="2" placeholder="Straße, PLZ, Stadt">${escHtml(f.customerAddress)}</textarea>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">تفاصيل الخدمة</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-key">المسار</div><div class="detail-val">${escHtml(f.route)||'—'}</div></div>
        <div class="detail-item"><div class="detail-key">شركة الطيران</div><div class="detail-val">${escHtml(f.airline)||'—'}</div></div>
        <div class="detail-item"><div class="detail-key">PNR</div><div class="detail-val mono">${escHtml(f.pnr)||'—'}</div></div>
        <div class="detail-item"><div class="detail-key">المبلغ</div><div class="detail-val">€${f.amount.toFixed(2)}</div></div>
      </div>
    </div>

    <div class="detail-section">
      <button class="btn btn-primary" style="width:100%" id="iv-confirm-btn" onclick="confirmIssueInvoice()">🧾 إصدار الفاتورة</button>
    </div>
  `;
  document.getElementById('invoice-modal').classList.add('open');
}

async function confirmIssueInvoice() {
  var b = pendingInvoiceBooking;
  if (!b) return;
  var f = extractInvoiceFields(b);
  f.customerName = document.getElementById('iv-customer-name').value.trim();
  f.customerAddress = document.getElementById('iv-customer-address').value.trim();

  if (!f.customerName) { showToast('أدخل اسم العميل', 'error'); return; }

  var btn = document.getElementById('iv-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  try {
    // [ADMIN-INVOICE] The server reserves the real, atomic invoice number
    // here — this is the ONLY place a number is ever assigned. If this
    // call fails, no number was consumed (the Postgres function only
    // advances the sequence as part of successfully inserting the row).
    const res = await adminFetch('/admin/invoices/issue', {
      method: 'POST',
      body: JSON.stringify({
        booking_id: b.id || null,
        booking_reference: f.pnr,
        customer_name: f.customerName,
        customer_address: f.customerAddress,
        amount: f.amount,
        currency: b.currency || 'EUR',
        fields: f,
      }),
    });
    const j = await res.json();
    if (!j.ok) { showToast(j.error || 'فشل إصدار الفاتورة', 'error'); if (btn) { btn.disabled = false; btn.textContent = '🧾 إصدار الفاتورة'; } return; }

    const invoiceNumber = j.invoice.invoice_number;
    var cfg = invoiceConfig || { prefix: 'AIRPIV', companyName: '', companyAddress: '' };
    var record = {
      invoiceNumber: invoiceNumber,
      issuedAt: j.invoice.created_at,
      bookingRef: f.pnr,
      customerName: f.customerName,
      customerAddress: f.customerAddress,
      amount: f.amount,
      fields: f,
    };

    var pdfBytes = await buildInvoicePdf(record, cfg);
    downloadPdfBytes(pdfBytes, invoiceNumber + '.pdf');
    closeModal('invoice-modal');
    showToast('تم إصدار الفاتورة ' + invoiceNumber + ' ✅', 'success');
    await loadInvoicesFromServer();
    renderInvoicesTable();
  } catch (e) {
    console.error(e);
    showToast('خطأ أثناء إصدار الفاتورة أو توليد PDF', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🧾 إصدار الفاتورة'; }
  }
}

function exportCSV() {
  if (!allBookings.length) { showToast('لا توجد بيانات', 'error'); return; }
  // [ADMIN-DASHBOARD-FIX] These header names previously didn't match any
  // actual field on a booking row (booking_ref/origin/destination/airline
  // don't exist — the real schema has booking_reference and a single
  // combined route_label, with no separate airline column at all). Every
  // export was silently producing blank columns for reference and route,
  // the two things you'd actually need to look a booking up afterward.
  var headers = ['booking_reference','created_at','route_label','duffel_amount','discount_amount','profit_margin','customer_paid','status','promo_code','customer_email'];
  var rows = allBookings.map(b => headers.map(h => {
    var v = b[h] == null ? '' : String(b[h]);
    // Quote any field containing a comma so the CSV doesn't misalign
    // (route_label and customer_email are the only realistic risks here).
    return v.indexOf(',') >= 0 ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(','));
  var csv = [headers.join(','), ...rows].join('\n');
  var a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = 'airpiv-bookings-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  showToast('تم تصدير البيانات 📥', 'success');
}

// ============ UTILS ============
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ============ [ADMIN-SECURITY] HTML escaping ============
// Booking data (customer_email, route_label, promo_code, etc.) comes from
// real customer input at checkout time — never trust it when injecting
// into innerHTML or an inline onclick handler. escHtml() neutralizes the
// characters that matter for both contexts (quotes break out of
// onclick='...', angle brackets inject new tags).
function escHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// Safe replacement for inline onclick='fn(${JSON.stringify(obj)})' — HTML-
// escapes the JSON string itself so embedded quotes can't break out of the
// surrounding onclick='...' attribute.
function escJsonAttr(obj) {
  return escHtml(JSON.stringify(obj));
}

function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + (type || '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', function(e) {
    if (e.target === m) m.classList.remove('open');
  });
});

window.addEventListener('resize', function() {
  var page = document.getElementById('page-reports');
  if (page && page.classList.contains('active')) renderReports();
});

// ============ PDF GENERATION (pdf-lib, client-side) ============
function arabicNote() {
  // ملاحظة: الخطوط الافتراضية في pdf-lib لا تدعم الحروف العربية، لذلك يتم
  // إنشاء الفاتورة بالألمانية/الإنجليزية فقط (هذا متوافق مع المتطلبات
  // القانونية الألمانية أصلاً، الفاتورة لازم تكون مفهومة لمكتب الضرائب).
  return true;
}

async function buildInvoicePdf(record, cfg) {
  var PDFLib = window.PDFLib;
  var doc = await PDFLib.PDFDocument.create();
  var page = doc.addPage([595.28, 841.89]); // A4
  var font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  var fontBold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  var { width, height } = page.getSize();
  var teal = PDFLib.rgb(0, 0.49, 0.42);
  var dark = PDFLib.rgb(0.1, 0.12, 0.16);
  var gray = PDFLib.rgb(0.4, 0.45, 0.52);
  var lightLine = PDFLib.rgb(0.85, 0.87, 0.9);

  var y = height - 50;
  var marginX = 50;

  // [ADMIN-INVOICE] pdf-lib's standard fonts only encode WinAnsi
  // (Latin-1-ish) — any character outside that (→, em-dashes, emoji,
  // Arabic, etc.) throws and aborts PDF generation entirely. route_label
  // values like "BER → IST" come straight from the server and contain a
  // real arrow character, so this is not a hypothetical edge case — it
  // broke every single invoice with a route on it. Replace anything
  // non-WinAnsi-safe with a plain-ASCII equivalent before it ever reaches
  // drawText, rather than trying to remember to sanitize every call site.
  function sanitizeForPdf(str) {
    return String(str || '')
      .replace(/[\u2192\u27A1\u279C]/g, '->')   // → ➡ ➜
      .replace(/[\u2190]/g, '<-')                  // ←
      .replace(/[\u2013\u2014]/g, '-')             // – —
      .replace(/[\u2018\u2019]/g, "'")             // ‘ ’
      .replace(/[\u201C\u201D]/g, '"')             // “ ”
      .replace(/\u2026/g, '...')                   // …
      .replace(/[^\x00-\xFF]/g, '?');               // anything else outside WinAnsi's range
  }

  function text(str, x, yy, opts) {
    opts = opts || {};
    page.drawText(sanitizeForPdf(str), {
      x: x, y: yy,
      size: opts.size || 10,
      font: opts.bold ? fontBold : font,
      color: opts.color || dark
    });
  }
  function line(yy) {
    page.drawLine({ start: { x: marginX, y: yy }, end: { x: width - marginX, y: yy }, thickness: 0.75, color: lightLine });
  }

  // Header: brand
  text('AirPiv', marginX, y, { size: 20, bold: true, color: teal });
  y -= 16;
  text(cfg.name, marginX, y, { size: 9, color: gray });
  y -= 12;
  var addrLines = (cfg.address || '').split('\n');
  addrLines.forEach(l => { text(l, marginX, y, { size: 9, color: gray }); y -= 12; });
  text('Steuernummer: ' + cfg.steuernummer, marginX, y, { size: 9, color: gray });

  // Header: invoice meta (right side)
  var ry = height - 50;
  text('Rechnung', width - marginX - 140, ry, { size: 16, bold: true });
  ry -= 20;
  text('Rechnungsnummer: ' + record.invoiceNumber, width - marginX - 200, ry, { size: 9 }); ry -= 13;
  var issued = new Date(record.issuedAt);
  var dateStr = String(issued.getDate()).padStart(2,'0') + '.' + String(issued.getMonth()+1).padStart(2,'0') + '.' + issued.getFullYear();
  text('Rechnungsdatum: ' + dateStr, width - marginX - 200, ry, { size: 9 }); ry -= 13;
  var svcDate = record.fields.serviceDate ? new Date(record.fields.serviceDate) : issued;
  var svcDateStr = String(svcDate.getDate()).padStart(2,'0') + '.' + String(svcDate.getMonth()+1).padStart(2,'0') + '.' + svcDate.getFullYear();
  text('Leistungsdatum: ' + svcDateStr, width - marginX - 200, ry, { size: 9 });

  y -= 40;
  line(y);
  y -= 24;

  // Customer block
  text('Kunde:', marginX, y, { size: 9, color: gray }); y -= 14;
  text(record.customerName || '—', marginX, y, { size: 11, bold: true }); y -= 14;
  (record.customerAddress || '').split('\n').forEach(l => {
    if (l.trim()) { text(l, marginX, y, { size: 9.5 }); y -= 13; }
  });

  y -= 18;
  line(y);
  y -= 10;

  // Table header
  text('Beschreibung', marginX, y - 14, { size: 9, bold: true, color: gray });
  text('Betrag', width - marginX - 70, y - 14, { size: 9, bold: true, color: gray });
  y -= 22;
  line(y);
  y -= 20;

  // Service line
  var f = record.fields;
  var desc = 'Flugbuchung: ' + (f.route || '?');
  if (f.airline) desc += ' (' + f.airline + ')';
  text(desc, marginX, y, { size: 10 });
  text('\u20AC' + (record.amount || 0).toFixed(2), width - marginX - 70, y, { size: 10 });
  y -= 16;
  if (f.pnr) {
    text('Buchungsreferenz (PNR): ' + f.pnr, marginX, y, { size: 8.5, color: gray });
    y -= 24;
  } else {
    y -= 10;
  }

  line(y);
  y -= 22;

  // Totals
  var isKlein = cfg.taxMode === 'kleinunternehmer';
  var net = record.amount || 0;
  var vat = isKlein ? 0 : net - (net / 1.19);
  var netBase = isKlein ? net : (net - vat);

  text('Nettobetrag:', width - marginX - 200, y, { size: 9.5, color: gray });
  text('\u20AC' + netBase.toFixed(2), width - marginX - 70, y, { size: 9.5 });
  y -= 14;
  if (!isKlein) {
    text('USt. (19%):', width - marginX - 200, y, { size: 9.5, color: gray });
    text('\u20AC' + vat.toFixed(2), width - marginX - 70, y, { size: 9.5 });
    y -= 14;
  }
  text('Gesamtbetrag:', width - marginX - 200, y, { size: 11, bold: true });
  text('\u20AC' + net.toFixed(2), width - marginX - 70, y, { size: 11, bold: true });
  y -= 30;

  line(y);
  y -= 20;

  // Tax note
  text('Hinweis:', marginX, y, { size: 9, bold: true }); y -= 14;
  var taxNote = isKlein
    ? 'Gem\u00e4\u00df \u00a719 UStG wird keine Umsatzsteuer berechnet.'
    : 'Es gilt der Regelsteuersatz von 19% gem\u00e4\u00df \u00a712 UStG.';
  text(taxNote, marginX, y, { size: 9, color: gray }); y -= 24;

  text('Zahlungsbedingungen: Sofort f\u00e4llig / Paid online', marginX, y, { size: 9, color: gray });

  // Footer
  page.drawText('AirPiv \u2014 generiert am ' + dateStr, {
    x: marginX, y: 30, size: 7.5, font: font, color: lightLine
  });

  return await doc.save();
}

function downloadPdfBytes(bytes, filename) {
  var blob = new Blob([bytes], { type: 'application/pdf' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function mergePdfBuffers(buffers) {
  var PDFLib = window.PDFLib;
  var merged = await PDFLib.PDFDocument.create();
  for (var i = 0; i < buffers.length; i++) {
    var src = await PDFLib.PDFDocument.load(buffers[i]);
    var pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  return await merged.save();
}

// ============ INVOICES LOG / TABLE ============
var invoiceFilterText = '';

async function renderInvoices() {
  await loadInvoiceConfigIntoForm();
  await loadInvoicesFromServer();
  document.getElementById('invoice-config-banner').style.display = isInvoiceConfigComplete() ? 'none' : 'flex';
  renderInvoicesTable();
}

function renderInvoicesTable() {
  var tbody = document.getElementById('invoices-table');
  var list = issuedInvoicesCache.filter(r => {
    if (!invoiceFilterText) return true;
    var hay = (r.invoice_number + ' ' + (r.booking_reference||'') + ' ' + r.customer_name).toLowerCase();
    return hay.includes(invoiceFilterText);
  });

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--tx3);padding:30px">لا توجد فواتير صادرة بعد — أصدر فاتورة من تفاصيل أي حجز مؤكد</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(r => {
    var d = new Date(r.created_at).toLocaleDateString('ar');
    return `<tr>
      <td class="mono">${escHtml(r.invoice_number)}</td>
      <td>${d}</td>
      <td>${escHtml(r.customer_name)||'—'}</td>
      <td class="mono">${escHtml(r.booking_reference)||'—'}</td>
      <td class="mono" style="color:var(--blue)">€${(Number(r.amount)||0).toFixed(2)}</td>
      <td><button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="redownloadInvoice('${escHtml(r.invoice_number)}')">📥 إعادة تنزيل</button></td>
    </tr>`;
  }).join('');
}

function filterInvoices(val) {
  invoiceFilterText = val.toLowerCase();
  renderInvoicesTable();
}

async function redownloadInvoice(invoiceNumber) {
  var row = issuedInvoicesCache.find(r => r.invoice_number === invoiceNumber);
  if (!row) { showToast('سجل الفاتورة غير موجود', 'error'); return; }
  var record = {
    invoiceNumber: row.invoice_number,
    issuedAt: row.created_at,
    bookingRef: row.booking_reference,
    customerName: row.customer_name,
    customerAddress: row.customer_address,
    amount: Number(row.amount) || 0,
    fields: row.fields || {},
  };
  var cfg = invoiceConfig || { prefix: 'AIRPIV', companyName: '', companyAddress: '' };
  try {
    var bytes = await buildInvoicePdf(record, cfg);
    downloadPdfBytes(bytes, invoiceNumber + '.pdf');
  } catch (e) {
    console.error(e);
    showToast('خطأ أثناء إعادة التوليد', 'error');
  }
}

// ============ BATCH EXPORT (by date range) ============
function setBatchRange(kind) {
  var now = new Date();
  var from, to;
  if (kind === 'today') {
    from = to = now.toISOString().slice(0, 10);
  } else { // month
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  }
  document.getElementById('batch-from').value = from;
  document.getElementById('batch-to').value = to;
  updateBatchPreviewCount();
}

function getBatchInvoicesInRange() {
  var fromVal = document.getElementById('batch-from').value;
  var toVal = document.getElementById('batch-to').value;
  if (!fromVal || !toVal) return [];
  var from = new Date(fromVal + 'T00:00:00');
  var to = new Date(toVal + 'T23:59:59');
  return issuedInvoicesCache.filter(r => {
    var d = new Date(r.created_at);
    return d >= from && d <= to;
  }).map(r => ({
    invoiceNumber: r.invoice_number,
    issuedAt: r.created_at,
    bookingRef: r.booking_reference,
    customerName: r.customer_name,
    customerAddress: r.customer_address,
    amount: Number(r.amount) || 0,
    fields: r.fields || {},
  }));
}

function updateBatchPreviewCount() {
  var list = getBatchInvoicesInRange();
  document.getElementById('batch-preview-count').textContent =
    list.length ? (list.length + ' فاتورة في هذا المدى') : 'لا توجد فواتير صادرة في هذا المدى';
}

document.addEventListener('DOMContentLoaded', function() {
  var fromEl = document.getElementById('batch-from');
  var toEl = document.getElementById('batch-to');
  if (fromEl && toEl) {
    fromEl.addEventListener('change', updateBatchPreviewCount);
    toEl.addEventListener('change', updateBatchPreviewCount);
  }
});

async function downloadBatchMerged() {
  var list = getBatchInvoicesInRange();
  if (!list.length) { showToast('لا توجد فواتير في هذا المدى', 'error'); return; }
  var cfg = invoiceConfig || { prefix: 'AIRPIV', companyName: '', companyAddress: '' };
  showToast('جارٍ تجهيز الملف...', 'success');
  try {
    var buffers = [];
    for (var i = 0; i < list.length; i++) {
      buffers.push(await buildInvoicePdf(list[i], cfg));
    }
    var merged = await mergePdfBuffers(buffers);
    var from = document.getElementById('batch-from').value;
    var to = document.getElementById('batch-to').value;
    downloadPdfBytes(merged, 'airpiv-rechnungen-' + from + '_' + to + '.pdf');
    showToast('تم تنزيل ' + list.length + ' فاتورة في ملف واحد ✅', 'success');
  } catch (e) {
    console.error(e);
    showToast('خطأ أثناء الدمج', 'error');
  }
}

async function downloadBatchSeparate() {
  var list = getBatchInvoicesInRange();
  if (!list.length) { showToast('لا توجد فواتير في هذا المدى', 'error'); return; }
  var cfg = invoiceConfig || { prefix: 'AIRPIV', companyName: '', companyAddress: '' };
  showToast('جارٍ تجهيز الملفات...', 'success');
  try {
    for (var i = 0; i < list.length; i++) {
      var bytes = await buildInvoicePdf(list[i], cfg);
      downloadPdfBytes(bytes, list[i].invoiceNumber + '.pdf');
      // فاصل صغير حتى لا يحظر المتصفح التنزيلات المتعددة المتزامنة
      await new Promise(r => setTimeout(r, 250));
    }
    showToast('تم تنزيل ' + list.length + ' فاتورة منفصلة ✅', 'success');
  } catch (e) {
    console.error(e);
    showToast('خطأ أثناء التنزيل', 'error');
  }
}
