'use client';

import { useState } from 'react';
import CrudTable, { Pagination } from '../../../../lib/admin/CrudTable';
import EntityModal from '../../../../lib/admin/EntityModal';
import useAdminEntityList from '../../../../lib/admin/useAdminEntityList';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'published', label: 'منشورة بس' },
  { value: 'draft', label: 'مسودة بس' },
];

function emptyForm() {
  return { id: null, name: '', iata_code: '', status: 'published', intro_text: '', country_code: '', hub_iata: '' };
}

export default function AirlinesTab() {
  const list = useAdminEntityList({ endpoint: '/admin/api/airlines', dataKey: 'airlines' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function openCreate() {
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  }

  function openEdit(airline) {
    setForm({
      id: airline.id, name: airline.name, iata_code: airline.iata_code, status: airline.status,
      intro_text: airline.intro_text || '', country_code: airline.country_code || '', hub_iata: airline.hub_iata || '',
    });
    setError('');
    setModalOpen(true);
  }

  async function handleDelete(airline) {
    if (!confirm('تأكيد حذف شركة الطيران هذه نهائياً؟ لا يمكن التراجع.')) return;
    const res = await fetch(`/admin/api/airlines/${airline.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) list.reload();
    else alert(data.error || 'فشل الحذف');
  }

  async function save() {
    if (!form.name.trim() || (!form.id && !form.iata_code.trim())) { setError('الاسم وكود IATA مطلوبان'); return; }
    setSubmitting(true);
    setError('');
    const payload = {
      name: form.name.trim(), status: form.status, intro_text: form.intro_text.trim() || null,
      country_code: form.country_code.trim().toUpperCase() || null, hub_iata: form.hub_iata.trim().toUpperCase() || null,
    };
    if (!form.id) payload.iata_code = form.iata_code.trim().toUpperCase();
    const url = form.id ? `/admin/api/airlines/${form.id}` : '/admin/api/airlines';
    const res = await fetch(url, {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!data.ok) { setError(data.error || 'فشل الحفظ'); return; }
    setModalOpen(false);
    list.reload();
  }

  const columns = [
    { key: 'name', label: 'الشركة', render: (r) => r.name },
    { key: 'iata_code', label: 'IATA', render: (r) => <span style={{ fontFamily: 'monospace' }}>{r.iata_code}</span> },
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
          placeholder="🔍 دوّر باسم شركة أو كود IATA..."
          style={{ flex: 1, minWidth: 220, padding: '9px 14px', borderRadius: 10, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, fontSize: 13 }}
        />
        <select value={list.statusFilter} onChange={(e) => { list.setStatusFilter(e.target.value); list.setPage(1); }} style={filterSelectStyle}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="button" onClick={openCreate} style={primaryBtnStyle}>➕ شركة طيران جديدة</button>
      </div>

      <CrudTable
        columns={columns}
        rows={list.rows}
        loading={list.loading}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyLabel="لا توجد شركات طيران بعد"
      />
      <Pagination page={list.page} totalPages={list.totalPages} total={list.total} onPageChange={list.setPage} />

      {modalOpen && (
        <EntityModal
          title={form.id ? 'تعديل شركة طيران' : 'شركة طيران جديدة'}
          values={{}}
          onChange={() => {}}
          onClose={() => setModalOpen(false)}
          onSubmit={save}
          submitting={submitting}
          error={error}
          extra={
            <>
              <label style={labelStyle}>
                الاسم
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Lufthansa" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                كود IATA — لا يمكن تعديله بعد الإنشاء
                <input
                  type="text" value={form.iata_code} maxLength={3} disabled={!!form.id}
                  onChange={(e) => setForm((f) => ({ ...f, iata_code: e.target.value }))} placeholder="LH"
                  style={{ ...inputStyle, textTransform: 'uppercase', ...(form.id ? { color: ADMIN_COLORS.tx2 } : {}) }}
                />
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
              <label style={labelStyle}>
                كود الدولة (ISO، اختياري)
                <input type="text" value={form.country_code} maxLength={2} onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value }))} placeholder="DE" style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </label>
              <label style={labelStyle}>
                مطار المحور الرئيسي (اختياري) — يتجاوز الاستنتاج التلقائي
                <input type="text" value={form.hub_iata} maxLength={3} onChange={(e) => setForm((f) => ({ ...f, hub_iata: e.target.value }))} placeholder="FRA" style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </label>
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
