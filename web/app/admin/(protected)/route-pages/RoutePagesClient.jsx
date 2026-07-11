'use client';

import { useCallback, useEffect, useState } from 'react';
import CrudTable, { Pagination } from '../../../../lib/admin/CrudTable';
import EntityModal from '../../../../lib/admin/EntityModal';
import AirportAutocomplete from '../../../../lib/admin/AirportAutocomplete';
import RouteFaqEditor from '../../../../lib/admin/RouteFaqEditor';
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

export default function RoutePagesClient() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    const res = await fetch(`/admin/api/route-pages?${params.toString()}`);
    const data = await res.json();
    if (data.ok) {
      setRows(data.routes || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    }
    setLoading(false);
  }, [page, debouncedSearch, statusFilter]);

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

  const columns = [
    { key: 'route', label: 'المسار', render: (r) => `${r.origin_city} (${r.origin_iata}) → ${r.destination_city} (${r.destination_iata})` },
    { key: 'status', label: 'الحالة', render: (r) => statusBadge(r.status) },
    { key: 'refresh_frequency', label: 'معدل التحديث', render: (r) => REFRESH_OPTIONS.find((o) => o.value === r.refresh_frequency)?.label || r.refresh_frequency },
    { key: 'slug', label: 'الرابط', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>flights/{r.slug}</span> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>صفحات المسارات (SEO)</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>صفحات هبوط لمسارات شائعة بسعر حقيقي محدّث، لجذب زيارات من Google</p>
        </div>
        <button type="button" onClick={openCreate} style={{ ...primaryBtnStyle, flex: 'initial' }}>➕ مسار جديد</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 دوّر باسم مدينة أو كود مطار (زي Berlin أو FRA)..."
          style={{ flex: 1, minWidth: 220, padding: '9px 14px', borderRadius: 10, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, fontSize: 13 }}
        />
        <select
          value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', borderRadius: 10, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, fontSize: 13 }}
        >
          {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <CrudTable
        columns={columns}
        rows={rows}
        loading={loading}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyLabel={search.trim() ? `مفيش نتايج لـ "${search.trim()}"` : 'لا توجد مسارات بعد — اضغط "مسار جديد" للبدء'}
      />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

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
