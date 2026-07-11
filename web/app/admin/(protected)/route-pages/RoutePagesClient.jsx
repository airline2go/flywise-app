'use client';

import { useCallback, useEffect, useState } from 'react';
import CrudTable, { Pagination } from '../../../../lib/admin/CrudTable';
import EntityModal from '../../../../lib/admin/EntityModal';
import AirportAutocomplete from '../../../../lib/admin/AirportAutocomplete';
import RouteFaqEditor from '../../../../lib/admin/RouteFaqEditor';
import BulkRouteModal from '../../../../lib/admin/BulkRouteModal';
import RouteMatrixModal from '../../../../lib/admin/RouteMatrixModal';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

const REFRESH_OPTIONS = [
  { value: 'none', label: 'SEO فقط (بدون تحديث تلقائي)' },
  { value: '6h', label: 'كل 6 ساعات' },
  { value: '12h', label: 'كل 12 ساعة' },
  { value: '24h', label: 'كل 24 ساعة' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'published', label: 'منشور بس' },
  { value: 'draft', label: 'مسودة بس' },
  { value: 'dead', label: '💀 ميت بس (مفيش رحلات)' },
];

const REFRESH_FILTER_OPTIONS = [
  { value: '', label: 'كل معدلات التحديث' },
  ...REFRESH_OPTIONS.map((o) => (o.value === 'none' ? { value: 'none', label: 'SEO فقط (بدون تحديث)' } : o)),
];

const SORT_OPTIONS = [
  { value: '', label: 'الأحدث أولاً' },
  { value: 'score', label: 'الأعلى Route Score أولاً' },
];

function emptyForm() {
  return {
    id: null,
    origin_iata: null, origin_city: '', origin_country: null, origin_lat: null, origin_lng: null,
    destination_iata: null, destination_city: '', destination_country: null, destination_lat: null, destination_lng: null,
    refresh_frequency: 'none',
    intro_text: '',
    custom_title: '',
    custom_meta_description: '',
    custom_faq: [],
  };
}

function statusBadge(status) {
  if (status === 'published') return <span style={badgeStyle(ADMIN_COLORS.teal)}>✓ منشور</span>;
  if (status === 'dead') return <span style={badgeStyle(ADMIN_COLORS.red)}>💀 ميت (مفيش رحلات)</span>;
  return <span style={badgeStyle(ADMIN_COLORS.yellow)}>◔ مسودة</span>;
}

function badgeStyle(color) {
  return { display: 'inline-block', fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: '3px 8px', color, background: `${color}22` };
}

// [ROUTE-SCORE-4A] للعرض فقط — مفيش أتمتة بتقرأ الرقم ده بهذه المرحلة.
function routeScoreBadge(score, confidence) {
  if (score == null) return <span style={{ color: ADMIN_COLORS.tx3 }}>—</span>;
  const confLabel = confidence === 'high' ? 'ثقة عالية' : confidence === 'medium' ? 'ثقة متوسطة' : 'ثقة منخفضة';
  const confColor = confidence === 'high' ? '#22c55e' : confidence === 'medium' ? '#f59e0b' : ADMIN_COLORS.tx3;
  return (
    <div>
      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{Number(score).toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
      <div style={{ fontSize: 10, color: confColor }}>{confLabel}</div>
    </div>
  );
}

export default function RoutePagesClient() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshFilter, setRefreshFilter] = useState('');
  const [sort, setSort] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [matrixModalOpen, setMatrixModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState({});
  const [bulkRefreshFreq, setBulkRefreshFreq] = useState('none');
  const [banner, setBanner] = useState(null); // {type: 'info'|'success'|'error', text}
  const [healthCheckRunning, setHealthCheckRunning] = useState(false);
  const [healthCheckProgress, setHealthCheckProgress] = useState('');

  // Debounce search — same UX as the old admin.js's rpSearchDebounced().
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (statusFilter) params.set('status', statusFilter);
    if (refreshFilter) params.set('refresh_frequency', refreshFilter);
    if (sort) params.set('sort', sort);
    const res = await fetch(`/admin/api/route-pages?${params.toString()}`);
    const data = await res.json();
    if (data.ok) {
      setRows(data.routes || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setSelectedIds({});
    }
    setLoading(false);
  }, [page, debouncedSearch, statusFilter, refreshFilter, sort]);

  // [SET-STATE-IN-EFFECT] setLoading/setRows/etc. all run inside this
  // setTimeout callback boundary (not synchronously in the effect body),
  // matching the same pattern already used in AirportAutocomplete.
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  }

  function openEdit(route) {
    setForm({
      id: route.id,
      origin_iata: route.origin_iata, origin_city: route.origin_city, origin_country: route.origin_country,
      origin_lat: route.origin_lat, origin_lng: route.origin_lng,
      destination_iata: route.destination_iata, destination_city: route.destination_city, destination_country: route.destination_country,
      destination_lat: route.destination_lat, destination_lng: route.destination_lng,
      refresh_frequency: route.refresh_frequency || 'none',
      intro_text: route.intro_text || '',
      custom_title: route.custom_title || '',
      custom_meta_description: route.custom_meta_description || '',
      custom_faq: route.custom_faq || [],
    });
    setError('');
    setModalOpen(true);
  }

  // [MISSING-ROUTES-MATRIX] Clicking an empty (missing) matrix cell jumps
  // straight into the create-route form with both airports prefilled —
  // still requires manual save, matches matrixQuickCreate()'s "no silent
  // auto-creation" intent.
  function openCreatePrefilled(origin, dest) {
    setMatrixModalOpen(false);
    setForm({
      ...emptyForm(),
      origin_iata: origin.code, origin_city: origin.city, origin_country: origin.country, origin_lat: origin.lat, origin_lng: origin.lng,
      destination_iata: dest.code, destination_city: dest.city, destination_country: dest.country, destination_lat: dest.lat, destination_lng: dest.lng,
    });
    setError('');
    setModalOpen(true);
  }

  async function handleDelete(route) {
    if (!confirm(`حذف المسار ${route.origin_city} → ${route.destination_city}؟`)) return;
    const res = await fetch(`/admin/api/route-pages/${route.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) load();
    else alert(data.error || 'تعذّر الحذف');
  }

  async function save(status) {
    if (!form.origin_iata || !form.destination_iata) {
      setError('اختر مطار المغادرة والوصول من نتائج البحث');
      return;
    }
    setSubmitting(true);
    setError('');
    const payload = {
      origin_iata: form.origin_iata, destination_iata: form.destination_iata,
      origin_city: form.origin_city, destination_city: form.destination_city,
      origin_country: form.origin_country, destination_country: form.destination_country,
      origin_lat: form.origin_lat, origin_lng: form.origin_lng,
      destination_lat: form.destination_lat, destination_lng: form.destination_lng,
      refresh_frequency: form.refresh_frequency,
      intro_text: form.intro_text || null,
      custom_title: form.custom_title || null,
      custom_meta_description: form.custom_meta_description || null,
      custom_faq: form.custom_faq,
      status,
    };
    const url = form.id ? `/admin/api/route-pages/${form.id}` : '/admin/api/route-pages';
    const res = await fetch(url, {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!data.ok) { setError(data.error || 'تعذّر الحفظ'); return; }
    setModalOpen(false);
    load();
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id]; else next[id] = true;
      return next;
    });
  }

  function toggleSelectAll(checked) {
    if (!checked) { setSelectedIds({}); return; }
    const next = {};
    rows.forEach((r) => { next[r.id] = true; });
    setSelectedIds(next);
  }

  async function applyBulkRefresh() {
    const ids = Object.keys(selectedIds);
    if (!ids.length) return;
    if (!confirm(`هيتغيّر معدل تحديث السعر لـ ${ids.length} مسار محدد. متأكد؟`)) return;
    const res = await fetch('/admin/api/route-pages/bulk-refresh', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, refresh_frequency: bulkRefreshFreq }),
    });
    const data = await res.json();
    if (data.ok) { setBanner({ type: 'success', text: `✅ تم تحديث ${data.updated} مسار` }); load(); }
    else setBanner({ type: 'error', text: data.error || 'فشلت العملية' });
  }

  async function runRouteBackfill() {
    if (!confirm('سيتم فحص كل المسارات القديمة وإضافة بيانات الدولة/المدينة الناقصة لها (يستخدم بيانات حقيقية من Duffel). قد يستغرق دقيقة أو أكثر حسب عدد المسارات. هل تريد المتابعة؟')) return;
    setBanner({ type: 'info', text: '⏳ جارٍ الإصلاح، يرجى الانتظار...' });
    const res = await fetch('/admin/api/route-pages/backfill-locations', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      setBanner({ type: 'success', text: `✅ تم: ${data.updated} مسار تم تحديثه، ${data.skipped} لم يحتج تعديل${data.failed ? `، ${data.failed} فشل (راجع سجل الأخطاء)` : ''}` });
      load();
    } else {
      setBanner({ type: 'error', text: data.error || 'فشلت العملية' });
    }
  }

  async function clearRoutePriceCache() {
    if (!confirm('سيتم حذف كل الأسعار المخزّنة مؤقتاً — سيُعاد جلب السعر الحقيقي (مع التاريخ) لكل مسار عند أول زيارة بعد هذا. هل تريد المتابعة؟')) return;
    setBanner({ type: 'info', text: '⏳ جارٍ تحديث الأسعار...' });
    const res = await fetch('/admin/api/route-pages/clear-price-cache', { method: 'POST' });
    const data = await res.json();
    if (data.ok) setBanner({ type: 'success', text: `✅ تم حذف ${data.cleared} سعر مخزّن — سيُعاد جلبه عند الزيارة القادمة` });
    else setBanner({ type: 'error', text: data.error || 'فشلت العملية' });
  }

  async function publishAllDrafts() {
    const countRes = await fetch('/admin/api/route-pages?status=draft&limit=1');
    const countData = await countRes.json();
    const totalDrafts = countData.ok ? (countData.total || 0) : 0;
    if (totalDrafts === 0) { setBanner({ type: 'info', text: 'مفيش مسودات خالص حالياً' }); return; }
    if (!confirm(`هتنشر ${totalDrafts} مسار (كل المسودات الحالية) دفعة واحدة — هيظهروا للزوار فوراً. متأكد؟`)) return;
    setBanner({ type: 'info', text: `⏳ جارٍ نشر ${totalDrafts} مسار...` });
    const res = await fetch('/admin/api/route-pages/publish-all-drafts', { method: 'POST' });
    const data = await res.json();
    if (data.ok) { setBanner({ type: 'success', text: `✅ تم نشر ${data.published} مسار بنجاح` }); setPage(1); load(); }
    else setBanner({ type: 'error', text: data.error || 'فشلت العملية' });
  }

  // ============ [DEAD-ROUTES-HEALTH-CHECK] ============
  // Runs health-check-batch repeatedly (10 routes/call server-side)
  // until every unchecked route has been checked, same loop shape as
  // admin.js's runHealthCheck() — one big request would risk timing out
  // with thousands of routes.
  async function runHealthCheck() {
    if (healthCheckRunning) return;
    if (!confirm('هيتم فحص كل المسارات فعلياً (رحلة حقيقية موجودة ولا لأ) عن طريق Duffel.\n\n⚠️ لو Duffel لسه في وضع Test، النتيجة مش موثوقة (Test بيرجّع رحلات وهمية لأي مسار تقريباً) — استخدم الفحص ده بجدية بس بعد تفعيل Production.\n\nالعملية ممكن تاخد كذا دقيقة حسب عدد المسارات. تكمل؟')) return;
    setHealthCheckRunning(true);
    setHealthCheckProgress('⏳ جارٍ الفحص...');
    let totalChecked = 0, totalDead = 0;
    try {
      while (true) {
        const res = await fetch('/admin/api/route-pages/health-check-batch', { method: 'POST' });
        const data = await res.json();
        if (!data.ok) { setHealthCheckProgress(data.error || 'فشل الفحص'); break; }
        totalChecked += data.checked;
        totalDead += data.dead;
        setHealthCheckProgress(`🩺 اتفحص ${totalChecked} مسار لحد دلوقتي — ${totalDead} اتلاقوا ميتين (مفيش رحلات حقيقية) — باقي حوالي ${data.remaining}...`);
        if (data.checked === 0 || data.remaining === 0) break;
        await new Promise((r) => setTimeout(r, 800));
      }
      setHealthCheckProgress(`✅ خلص الفحص — إجمالي ${totalChecked} مسار اتفحص، ${totalDead} اتلاقوا ميتين وانحطوا في حالة "ميت" تلقائياً (اختفوا من الموقع).`);
      load();
    } catch {
      setHealthCheckProgress(`❌ حصل خطأ في الاتصال أثناء الفحص — اللي اتفحص لحد دلوقتي (${totalChecked} مسار) اتحفظ، ممكن تدوس الزرار تاني يكمل من بعده.`);
    } finally {
      setHealthCheckRunning(false);
    }
  }

  const columns = [
    { key: 'route', label: 'المسار', render: (r) => `${r.origin_city} (${r.origin_iata}) → ${r.destination_city} (${r.destination_iata})` },
    { key: 'status', label: 'الحالة', render: (r) => statusBadge(r.status) },
    { key: 'refresh_frequency', label: 'معدل التحديث', render: (r) => REFRESH_OPTIONS.find((o) => o.value === r.refresh_frequency)?.label || r.refresh_frequency },
    { key: 'route_score', label: 'Route Score', render: (r) => routeScoreBadge(r.route_score, r.route_score_confidence) },
    { key: 'slug', label: 'الرابط', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>flights/{r.slug}</span> },
  ];

  const selectedCount = Object.keys(selectedIds).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>صفحات المسارات (SEO)</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>صفحات هبوط لمسارات شائعة بسعر حقيقي محدّث، لجذب زيارات من Google</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={runRouteBackfill} style={ghostSmallBtnStyle}>🔧 إصلاح المسارات القديمة</button>
          <button type="button" onClick={clearRoutePriceCache} style={ghostSmallBtnStyle}>🔄 تحديث كل الأسعار</button>
          <button type="button" onClick={openCreate} style={primarySmallBtnStyle}>➕ مسار جديد</button>
          <button type="button" onClick={() => setBulkModalOpen(true)} style={ghostSmallBtnStyle}>📦 إنشاء بالجملة</button>
          <button type="button" onClick={() => setMatrixModalOpen(true)} style={ghostSmallBtnStyle}>🗺️ مصفوفة المسارات</button>
          <button type="button" onClick={publishAllDrafts} style={ghostSmallBtnStyle}>🚀 نشر كل المسودات</button>
          <button type="button" disabled={healthCheckRunning} onClick={runHealthCheck} style={ghostSmallBtnStyle}>🩺 فحص صحة المسارات</button>
        </div>
      </div>

      {banner && (
        <div style={bannerStyle(banner.type)}>
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} style={bannerCloseStyle}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 دوّر باسم مدينة أو كود مطار (زي Berlin أو FRA)..."
          style={{ flex: 1, minWidth: 220, padding: '9px 14px', borderRadius: 10, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, fontSize: 13 }}
        />
        <select
          value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={filterSelectStyle}
        >
          {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={refreshFilter} onChange={(e) => { setRefreshFilter(e.target.value); setPage(1); }}
          style={filterSelectStyle}
        >
          {REFRESH_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}
          style={filterSelectStyle}
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {selectedCount > 0 && (
        <div style={bulkBarStyle}>
          <span>{selectedCount} مسار محدد</span>
          <select value={bulkRefreshFreq} onChange={(e) => setBulkRefreshFreq(e.target.value)} style={{ ...filterSelectStyle, padding: '6px 10px' }}>
            {REFRESH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="button" onClick={applyBulkRefresh} style={{ ...primarySmallBtnStyle, padding: '6px 14px' }}>تطبيق على المحدد</button>
          <button type="button" onClick={() => setSelectedIds({})} style={{ ...ghostSmallBtnStyle, padding: '6px 14px' }}>إلغاء التحديد</button>
        </div>
      )}

      <CrudTable
        columns={columns}
        rows={rows}
        loading={loading}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyLabel={search.trim() ? `مفيش نتايج لـ "${search.trim()}"` : 'لا توجد مسارات بعد — اضغط "مسار جديد" للبدء'}
        selection={{ selectedIds, onToggle: toggleSelect, onToggleAll: toggleSelectAll }}
      />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      {healthCheckProgress && (
        <div style={{ marginTop: 14, background: ADMIN_COLORS.bg2, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10, padding: '14px 16px', fontSize: 13, color: ADMIN_COLORS.tx2 }}>
          {healthCheckProgress}
        </div>
      )}

      {modalOpen && (
        <EntityModal
          title={form.id ? 'تعديل المسار' : 'مسار جديد'}
          values={{}}
          onChange={() => {}}
          onClose={() => setModalOpen(false)}
          submitting={submitting}
          error={error}
          extra={
            <>
              <AirportAutocomplete
                label="من (مدينة أو مطار) *"
                initialText={form.origin_iata ? `${form.origin_city} (${form.origin_iata})` : ''}
                onSelect={(a) => setForm((f) => ({ ...f, origin_iata: a.code, origin_city: a.city, origin_country: a.country, origin_lat: a.lat, origin_lng: a.lng }))}
              />
              <AirportAutocomplete
                label="إلى (مدينة أو مطار) *"
                initialText={form.destination_iata ? `${form.destination_city} (${form.destination_iata})` : ''}
                onSelect={(a) => setForm((f) => ({ ...f, destination_iata: a.code, destination_city: a.city, destination_country: a.country, destination_lat: a.lat, destination_lng: a.lng }))}
              />

              <label style={labelStyle}>
                معدل تحديث السعر
                <select value={form.refresh_frequency} onChange={(e) => setForm((f) => ({ ...f, refresh_frequency: e.target.value }))} style={inputStyle}>
                  {REFRESH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>

              <label style={labelStyle}>
                نص SEO تعريفي (اختياري — يُولَّد نص عام تلقائياً إذا تُرك فارغاً)
                <textarea
                  value={form.intro_text} onChange={(e) => setForm((f) => ({ ...f, intro_text: e.target.value }))}
                  placeholder="مثال: ابحث عن أرخص رحلات الطيران من برلين إلى لندن..."
                  style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                />
              </label>

              <details style={{ marginTop: 14 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12.5, color: ADMIN_COLORS.tx2, fontWeight: 600, marginBottom: 10 }}>
                  ⚙️ خيارات SEO متقدمة (اختياري)
                </summary>
                <label style={labelStyle}>
                  عنوان SEO مخصص (Title) — اتركه فارغاً للتوليد التلقائي
                  <input
                    type="text" value={form.custom_title} onChange={(e) => setForm((f) => ({ ...f, custom_title: e.target.value }))}
                    placeholder="مثال: Flüge Berlin (BER) nach London (LHR) günstig vergleichen"
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  وصف SEO مخصص (Meta Description) — اتركه فارغاً للتوليد التلقائي
                  <textarea
                    value={form.custom_meta_description} maxLength={160}
                    onChange={(e) => setForm((f) => ({ ...f, custom_meta_description: e.target.value }))}
                    style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                  />
                </label>
                <RouteFaqEditor items={form.custom_faq} onChange={(items) => setForm((f) => ({ ...f, custom_faq: items }))} />
              </details>
            </>
          }
          footer={
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" disabled={submitting} onClick={() => save('draft')} style={ghostBtnStyle}>💾 حفظ كمسودة</button>
              <button type="button" disabled={submitting} onClick={() => save('published')} style={primaryBtnStyle}>🚀 نشر الآن</button>
            </div>
          }
        />
      )}

      {bulkModalOpen && (
        <BulkRouteModal
          onClose={() => setBulkModalOpen(false)}
          onCreated={(data) => {
            setBulkModalOpen(false);
            setBanner({ type: 'success', text: `✅ اتعمل ${data.created} مسار جديد (كمسودة) — ${data.skippedExisting} كانوا موجودين بالفعل واتجاهلوا` });
            setPage(1);
            load();
          }}
        />
      )}

      {matrixModalOpen && (
        <RouteMatrixModal
          onClose={() => setMatrixModalOpen(false)}
          onQuickCreate={openCreatePrefilled}
        />
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 12 };
const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '9px 11px',
  background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 14,
};
const primaryBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', flex: 1,
};
const ghostBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx, fontSize: 13.5, cursor: 'pointer', flex: 1,
};
const primarySmallBtnStyle = {
  padding: '8px 14px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const ghostSmallBtnStyle = {
  padding: '8px 14px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const filterSelectStyle = {
  padding: '9px 14px', borderRadius: 10, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, fontSize: 13,
};
const bulkBarStyle = {
  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
  background: ADMIN_COLORS.bg2, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13,
};
function bannerStyle(type) {
  const color = type === 'error' ? ADMIN_COLORS.red : type === 'success' ? ADMIN_COLORS.teal : ADMIN_COLORS.blue;
  const bg = type === 'error' ? ADMIN_COLORS.redBg : type === 'success' ? ADMIN_COLORS.tealGlow : ADMIN_COLORS.blueBg;
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    color, background: bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13,
  };
}
const bannerCloseStyle = { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 13, padding: 0 };
