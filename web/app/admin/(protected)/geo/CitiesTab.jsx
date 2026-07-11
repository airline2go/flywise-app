'use client';

import { useState } from 'react';
import CrudTable, { Pagination } from '../../../../lib/admin/CrudTable';
import EntityModal from '../../../../lib/admin/EntityModal';
import TranslationsEditor, { translationsSummary } from '../../../../lib/admin/TranslationsEditor';
import useAdminEntityList from '../../../../lib/admin/useAdminEntityList';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'published', label: 'منشورة بس' },
  { value: 'draft', label: 'مسودة بس' },
];

function emptyForm() {
  return { id: null, name: '', city_slug: '', country_code: '', status: 'published', intro_text: '' };
}

export default function CitiesTab() {
  const list = useAdminEntityList({ endpoint: '/admin/api/cities', dataKey: 'cities' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [translations, setTranslations] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function openCreate() {
    setForm(emptyForm());
    setTranslations({});
    setError('');
    setModalOpen(true);
  }

  async function openEdit(city) {
    setForm({
      id: city.id, name: city.name, city_slug: city.city_slug,
      country_code: city.country_code || '', status: city.status, intro_text: city.intro_text || '',
    });
    setError('');
    setModalOpen(true);
    const res = await fetch(`/admin/api/cities/${city.id}/translations`);
    const data = await res.json();
    setTranslations(data.ok ? data.translations : {});
  }

  async function handleDelete(city) {
    if (!confirm('تأكيد حذف هذه المدينة نهائياً؟ لا يمكن التراجع.')) return;
    const res = await fetch(`/admin/api/cities/${city.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) list.reload();
    else alert(data.error || 'فشل الحذف');
  }

  async function save() {
    if (!form.name.trim() || !form.city_slug.trim()) { setError('الاسم والرابط مطلوبان'); return; }
    setSubmitting(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      city_slug: form.city_slug.trim().toLowerCase(),
      country_code: form.country_code.trim().toUpperCase() || null,
      status: form.status,
      intro_text: form.intro_text.trim() || null,
    };
    const url = form.id ? `/admin/api/cities/${form.id}` : '/admin/api/cities';
    const res = await fetch(url, {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) { setSubmitting(false); setError(data.error || 'فشل الحفظ'); return; }
    const cityId = form.id || data.city?.id;
    if (cityId && Object.keys(translations).length) {
      await fetch(`/admin/api/cities/${cityId}/translations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translations }),
      });
    }
    setSubmitting(false);
    setModalOpen(false);
    list.reload();
  }

  const columns = [
    { key: 'name', label: 'المدينة', render: (r) => (
      <div>{r.name}<div style={{ fontSize: 11, color: ADMIN_COLORS.tx3 }}>{r.city_slug}</div></div>
    ) },
    { key: 'country_code', label: 'الدولة', render: (r) => r.country_code || '—' },
    { key: 'translations_count', label: 'الترجمات', render: (r) => translationsSummary(r.translations_count) },
    { key: 'status', label: 'الحالة', render: (r) => (
      r.status === 'published'
        ? <span style={badgeStyle(ADMIN_COLORS.teal)}>✓ منشورة</span>
        : <span style={badgeStyle(ADMIN_COLORS.yellow)}>◔ مسودة</span>
    ) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="text" value={list.search} onChange={(e) => list.setSearch(e.target.value)}
          placeholder="🔍 دوّر باسم مدينة..."
          style={{ flex: 1, minWidth: 220, padding: '9px 14px', borderRadius: 10, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, fontSize: 13 }}
        />
        <select value={list.statusFilter} onChange={(e) => { list.setStatusFilter(e.target.value); list.setPage(1); }} style={filterSelectStyle}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="button" onClick={openCreate} style={primaryBtnStyle}>➕ مدينة جديدة</button>
      </div>

      <CrudTable
        columns={columns}
        rows={list.rows}
        loading={list.loading}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyLabel="لا توجد مدن بعد"
      />
      <Pagination page={list.page} totalPages={list.totalPages} total={list.total} onPageChange={list.setPage} />

      {modalOpen && (
        <EntityModal
          title={form.id ? 'تعديل مدينة' : 'مدينة جديدة'}
          values={{}}
          onChange={() => {}}
          onClose={() => setModalOpen(false)}
          onSubmit={save}
          submitting={submitting}
          error={error}
          extra={
            <>
              <label style={labelStyle}>
                الاسم الأساسي (الألمانية)
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="München" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                الرابط (city_slug)
                <input type="text" value={form.city_slug} onChange={(e) => setForm((f) => ({ ...f, city_slug: e.target.value }))} placeholder="muenchen" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                كود الدولة (ISO)
                <input type="text" value={form.country_code} maxLength={2} onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value }))} placeholder="DE" style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </label>
              <label style={labelStyle}>
                الحالة
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={inputStyle}>
                  <option value="published">منشورة</option>
                  <option value="draft">مسودة</option>
                </select>
              </label>
              <label style={labelStyle}>
                مقدمة SEO مخصصة (اختياري) — تحل محل النص التلقائي في كل اللغات
                <textarea value={form.intro_text} onChange={(e) => setForm((f) => ({ ...f, intro_text: e.target.value }))} placeholder="اترك فارغاً لاستخدام النص التلقائي" style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
              </label>
              <TranslationsEditor values={translations} onChange={setTranslations} />
            </>
          }
        />
      )}
    </div>
  );
}

function badgeStyle(color) {
  return { display: 'inline-block', fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: '3px 8px', color, background: `${color}22` };
}

const labelStyle = { display: 'block', fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 12 };
const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '9px 11px',
  background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 14,
};
const filterSelectStyle = {
  padding: '9px 14px', borderRadius: 10, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, fontSize: 13,
};
const primaryBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
