'use client';

import { useState } from 'react';
import CrudTable, { Pagination } from '../../../../lib/admin/CrudTable';
import EntityModal from '../../../../lib/admin/EntityModal';
import TranslationsEditor, { translationsSummary } from '../../../../lib/admin/TranslationsEditor';
import useAdminEntityList from '../../../../lib/admin/useAdminEntityList';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'published', label: 'منشور بس' },
  { value: 'draft', label: 'مسودة بس' },
];

function emptyForm() {
  return {
    id: null, iata_code: '', icao_code: '', airport_name: '', city_id: '', country_code: '',
    lat: '', lng: '', status: 'published', distance_to_city_center_km: '',
    transit_options: '', terminal_info: '', traveler_tips: '',
  };
}

export default function AirportsTab() {
  const list = useAdminEntityList({ endpoint: '/admin/api/airports', dataKey: 'airports' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [translations, setTranslations] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function openCreate() {
    setForm(emptyForm());
    setTranslations({});
    setError('');
    setModalOpen(true);
  }

  async function openEdit(airport) {
    setForm({
      id: airport.id, iata_code: airport.iata_code, icao_code: airport.icao_code || '',
      airport_name: airport.airport_name, city_id: airport.city_id || '', country_code: airport.country_code || '',
      lat: airport.latitude != null ? String(airport.latitude) : '', lng: airport.longitude != null ? String(airport.longitude) : '',
      status: airport.status, distance_to_city_center_km: airport.distance_to_city_center_km != null ? String(airport.distance_to_city_center_km) : '',
      transit_options: airport.transit_options || '', terminal_info: airport.terminal_info || '', traveler_tips: airport.traveler_tips || '',
    });
    setError('');
    setModalOpen(true);
    const res = await fetch(`/admin/api/airports/${airport.id}/translations`);
    const data = await res.json();
    setTranslations(data.ok ? data.translations : {});
  }

  async function handleDelete(airport) {
    if (!confirm('تأكيد حذف هذا المطار نهائياً؟ لا يمكن التراجع.')) return;
    const res = await fetch(`/admin/api/airports/${airport.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) list.reload();
    else alert(data.error || 'فشل الحذف');
  }

  async function save() {
    if (!form.airport_name.trim() || (!form.id && !form.iata_code.trim())) { setError('كود IATA والاسم مطلوبان'); return; }
    setSubmitting(true);
    setError('');
    const payload = {
      icao_code: form.icao_code.trim().toUpperCase() || null,
      airport_name: form.airport_name.trim(),
      city_id: form.city_id.trim() || null,
      country_code: form.country_code.trim().toUpperCase() || null,
      latitude: form.lat.trim() || null,
      longitude: form.lng.trim() || null,
      status: form.status,
      distance_to_city_center_km: form.distance_to_city_center_km.trim() || null,
      transit_options: form.transit_options.trim() || null,
      terminal_info: form.terminal_info.trim() || null,
      traveler_tips: form.traveler_tips.trim() || null,
    };
    if (!form.id) payload.iata_code = form.iata_code.trim().toUpperCase();
    const url = form.id ? `/admin/api/airports/${form.id}` : '/admin/api/airports';
    const res = await fetch(url, {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) { setSubmitting(false); setError(data.error || 'فشل الحفظ'); return; }
    const airportId = form.id || data.airport?.id;
    if (airportId && Object.keys(translations).length) {
      await fetch(`/admin/api/airports/${airportId}/translations`, {
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
    { key: 'airport_name', label: 'المطار', render: (r) => r.airport_name },
    { key: 'iata_code', label: 'IATA', render: (r) => <span style={{ fontFamily: 'monospace' }}>{r.iata_code}</span> },
    { key: 'city_id', label: 'المدينة', render: (r) => r.city_id || '—' },
    { key: 'translations_count', label: 'الترجمات', render: (r) => translationsSummary(r.translations_count) },
    { key: 'status', label: 'الحالة', render: (r) => (
      r.status === 'published'
        ? <span style={badgeStyle(ADMIN_COLORS.teal)}>✓ منشور</span>
        : <span style={badgeStyle(ADMIN_COLORS.yellow)}>◔ مسودة</span>
    ) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="text" value={list.search} onChange={(e) => list.setSearch(e.target.value)}
          placeholder="🔍 دوّر باسم مطار أو كود IATA/ICAO..."
          style={{ flex: 1, minWidth: 220, padding: '9px 14px', borderRadius: 10, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg2, color: ADMIN_COLORS.tx, fontSize: 13 }}
        />
        <select value={list.statusFilter} onChange={(e) => { list.setStatusFilter(e.target.value); list.setPage(1); }} style={filterSelectStyle}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="button" onClick={openCreate} style={primaryBtnStyle}>➕ مطار جديد</button>
      </div>

      <CrudTable
        columns={columns}
        rows={list.rows}
        loading={list.loading}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyLabel="لا توجد مطارات بعد"
      />
      <Pagination page={list.page} totalPages={list.totalPages} total={list.total} onPageChange={list.setPage} />

      {modalOpen && (
        <EntityModal
          title={form.id ? 'تعديل مطار' : 'مطار جديد'}
          values={{}}
          onChange={() => {}}
          onClose={() => setModalOpen(false)}
          onSubmit={save}
          submitting={submitting}
          error={error}
          extra={
            <>
              <label style={labelStyle}>
                كود IATA — لا يمكن تعديله بعد الإنشاء
                <input
                  type="text" value={form.iata_code} maxLength={3} disabled={!!form.id}
                  onChange={(e) => setForm((f) => ({ ...f, iata_code: e.target.value }))} placeholder="MUC"
                  style={{ ...inputStyle, textTransform: 'uppercase', ...(form.id ? { color: ADMIN_COLORS.tx2 } : {}) }}
                />
              </label>
              <label style={labelStyle}>
                كود ICAO (اختياري)
                <input type="text" value={form.icao_code} maxLength={4} onChange={(e) => setForm((f) => ({ ...f, icao_code: e.target.value }))} placeholder="EDDM" style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </label>
              <label style={labelStyle}>
                الاسم الإداري
                <input type="text" value={form.airport_name} onChange={(e) => setForm((f) => ({ ...f, airport_name: e.target.value }))} placeholder="Munich Airport" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                city_id (اختياري — يُملأ تلقائياً عادةً)
                <input type="text" value={form.city_id} onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value }))} placeholder="uuid" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                كود الدولة (ISO)
                <input type="text" value={form.country_code} maxLength={2} onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value }))} placeholder="DE" style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ ...labelStyle, flex: 1 }}>
                  خط العرض (lat)
                  <input type="text" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} placeholder="48.3538" style={inputStyle} />
                </label>
                <label style={{ ...labelStyle, flex: 1 }}>
                  خط الطول (lng)
                  <input type="text" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} placeholder="11.7861" style={inputStyle} />
                </label>
              </div>
              <label style={labelStyle}>
                الحالة
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={inputStyle}>
                  <option value="published">منشور</option>
                  <option value="draft">مسودة</option>
                </select>
              </label>
              <label style={labelStyle}>
                المسافة عن مركز المدينة (كم، اختياري)
                <input type="text" value={form.distance_to_city_center_km} onChange={(e) => setForm((f) => ({ ...f, distance_to_city_center_km: e.target.value }))} placeholder="28.5" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                خيارات النقل (اختياري)
                <textarea value={form.transit_options} onChange={(e) => setForm((f) => ({ ...f, transit_options: e.target.value }))} placeholder="قطار سريع كل 20 دقيقة، حوالي 45 دقيقة لوسط المدينة..." style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} />
              </label>
              <label style={labelStyle}>
                معلومات الصالات (اختياري)
                <textarea value={form.terminal_info} onChange={(e) => setForm((f) => ({ ...f, terminal_info: e.target.value }))} placeholder="صالتان T1 وT2، مربوطتان بمكوك مجاني..." style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} />
              </label>
              <label style={labelStyle}>
                نصائح للمسافر (اختياري)
                <textarea value={form.traveler_tips} onChange={(e) => setForm((f) => ({ ...f, traveler_tips: e.target.value }))} placeholder="يُنصح بالوصول قبل ساعتين للرحلات الدولية..." style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} />
              </label>
              <TranslationsEditor values={translations} onChange={setTranslations} label="ترجمات اسم المطار (7 لغات)" />
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
