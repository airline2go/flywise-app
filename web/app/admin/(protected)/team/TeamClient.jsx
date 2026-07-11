'use client';

import { useCallback, useEffect, useState } from 'react';
import EntityModal from '../../../../lib/admin/EntityModal';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

function emptyForm() {
  return { id: null, name: '', email: '', password: '', role: 'staff' };
}

export default function TeamClient() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/admin/api/staff');
    const data = await res.json();
    if (data.ok) setStaff(data.staff || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  }

  function openEdit(member) {
    setForm({ id: member.id, name: member.name, email: member.email, password: '', role: member.role });
    setError('');
    setModalOpen(true);
  }

  async function toggleActive(member) {
    const res = await fetch(`/admin/api/staff/${member.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !member.active }),
    });
    const data = await res.json();
    if (data.ok) load();
    else alert(data.error || 'فشل التحديث');
  }

  async function handleDelete(member) {
    if (!confirm('تأكيد حذف هذا الموظف نهائياً؟')) return;
    const res = await fetch(`/admin/api/staff/${member.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) load();
    else alert(data.error || 'فشل الحذف');
  }

  async function save() {
    if (!form.name.trim() || !form.email.trim()) { setError('الاسم والبريد الإلكتروني مطلوبان'); return; }
    if (!form.id && !form.password) { setError('كلمة المرور مطلوبة للحساب الجديد'); return; }
    setSubmitting(true);
    setError('');
    const url = form.id ? `/admin/api/staff/${form.id}` : '/admin/api/staff';
    const payload = form.id
      ? { name: form.name.trim(), role: form.role, password: form.password || undefined }
      : { name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role };
    const res = await fetch(url, {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!data.ok) { setError(data.error || 'فشل الحفظ'); return; }
    setModalOpen(false);
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>الفريق</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>حسابات الموظفين اللي عندهم دخول للوحة التحكم</p>
        </div>
        <button type="button" onClick={openCreate} style={primaryBtnStyle}>+ إضافة موظف</button>
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: ADMIN_COLORS.bg3 }}>
              <th style={thStyle}>الاسم</th>
              <th style={thStyle}>البريد الإلكتروني</th>
              <th style={thStyle}>الصلاحية</th>
              <th style={thStyle}>الحالة</th>
              <th style={thStyle}>تاريخ الإضافة</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={emptyCellStyle}>...جارٍ التحميل</td></tr>}
            {!loading && staff.length === 0 && <tr><td colSpan={6} style={emptyCellStyle}>لا يوجد موظفون بعد</td></tr>}
            {!loading && staff.map((s) => (
              <tr key={s.id} style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
                <td style={tdStyle}>{s.name}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{s.email}</td>
                <td style={tdStyle}>{s.role === 'admin' ? <span style={badgeStyle(ADMIN_COLORS.teal)}>مدير</span> : <span style={badgeStyle(ADMIN_COLORS.tx2)}>موظف</span>}</td>
                <td style={tdStyle}>{s.active ? <span style={badgeStyle(ADMIN_COLORS.teal)}>✓ فعّال</span> : <span style={badgeStyle(ADMIN_COLORS.red)}>✕ معطّل</span>}</td>
                <td style={tdStyle}>{s.created_at ? new Date(s.created_at).toLocaleDateString('ar') : '—'}</td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => openEdit(s)} style={linkBtnStyle}>تعديل</button>
                  <button type="button" onClick={() => toggleActive(s)} style={{ ...linkBtnStyle, marginInlineStart: 10 }}>{s.active ? 'تعطيل' : 'تفعيل'}</button>
                  <button type="button" onClick={() => handleDelete(s)} style={{ ...linkBtnStyle, color: ADMIN_COLORS.red, marginInlineStart: 10 }}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <EntityModal
          title={form.id ? 'تعديل الموظف' : 'موظف جديد'}
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
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="اسم الموظف" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                البريد الإلكتروني
                <input
                  type="email" value={form.email} disabled={!!form.id}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="staff@airpiv.com"
                  style={{ ...inputStyle, ...(form.id ? { color: ADMIN_COLORS.tx2 } : {}) }}
                />
              </label>
              <label style={labelStyle}>
                كلمة المرور (٨ أحرف على الأقل)
                <input
                  type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={form.id ? 'اتركها فارغة لعدم التغيير' : '••••••••'} style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                الصلاحية
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={inputStyle}>
                  <option value="staff">موظف — بدون هوامش ربح أو رصيد</option>
                  <option value="admin">مدير كامل الصلاحيات</option>
                </select>
              </label>
            </>
          }
          footer={
            <button type="button" disabled={submitting} onClick={save} style={{ ...primaryBtnStyle, width: '100%', marginTop: 20 }}>
              {submitting ? '...' : '✅ حفظ'}
            </button>
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
const primaryBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const thStyle = { textAlign: 'right', padding: '10px 14px', color: ADMIN_COLORS.tx2, fontWeight: 600, fontSize: 12.5 };
const tdStyle = { padding: '10px 14px', color: ADMIN_COLORS.tx };
const emptyCellStyle = { padding: '24px 14px', textAlign: 'center', color: ADMIN_COLORS.tx2 };
const linkBtnStyle = { background: 'none', border: 'none', color: ADMIN_COLORS.teal, cursor: 'pointer', fontSize: 13, padding: 0 };
