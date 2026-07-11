'use client';

import { useCallback, useEffect, useState } from 'react';
import LogoutButton from '../../../../lib/admin/LogoutButton';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';

function emptyInvoiceForm() {
  return { companyName: '', companyAddress: '', steuernummer: '', taxMode: 'kleinunternehmer', prefix: 'AIRPIV' };
}

export default function SettingsClient() {
  const [maint, setMaint] = useState({ enabled: false, message: '' });
  const [maintMessage, setMaintMessage] = useState('');
  const [maintBusy, setMaintBusy] = useState(false);
  const [invForm, setInvForm] = useState(emptyInvoiceForm());
  const [invSaving, setInvSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  const load = useCallback(async () => {
    const [maintRes, invRes] = await Promise.all([
      fetch('/admin/api/maintenance-mode'),
      fetch('/admin/api/invoice-config'),
    ]);
    const maintData = await maintRes.json();
    const invData = await invRes.json();
    if (maintData.ok) { setMaint(maintData); setMaintMessage(maintData.message || ''); }
    if (invData.ok) {
      setInvForm({
        companyName: invData.config.companyName || '',
        companyAddress: invData.config.companyAddress || '',
        steuernummer: invData.config.steuernummer || '',
        taxMode: invData.config.taxMode || 'kleinunternehmer',
        prefix: invData.config.prefix || 'AIRPIV',
      });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleMaintenance(enable) {
    const confirmMsg = enable
      ? 'تأكيد: سيتم إغلاق الموقع بالكامل لجميع الزوار فوراً. هل أنت متأكد؟'
      : 'تأكيد: سيتم إعادة تشغيل الموقع وفتحه لجميع الزوار. هل أنت متأكد؟';
    if (!confirm(confirmMsg)) return;
    setMaintBusy(true);
    const res = await fetch('/admin/api/maintenance-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: enable, message: maintMessage }),
    });
    const data = await res.json();
    setMaintBusy(false);
    if (data.ok) {
      setMaint(data);
      setBanner({ type: enable ? 'error' : 'success', text: enable ? '🚨 تم إغلاق الموقع' : '✅ تم إعادة تشغيل الموقع' });
    } else {
      setBanner({ type: 'error', text: data.error || 'فشل تنفيذ العملية' });
    }
  }

  async function saveInvoiceConfig() {
    setInvSaving(true);
    const cfg = {
      companyName: invForm.companyName.trim(),
      companyAddress: invForm.companyAddress.trim(),
      steuernummer: invForm.steuernummer.trim(),
      taxMode: invForm.taxMode,
      prefix: (invForm.prefix.trim() || 'AIRPIV').toUpperCase(),
    };
    const res = await fetch('/admin/api/invoice-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    const data = await res.json();
    setInvSaving(false);
    if (data.ok) setBanner({ type: 'success', text: 'تم حفظ بيانات الفاتورة ✅' });
    else setBanner({ type: 'error', text: data.error || 'فشل الحفظ' });
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>الإعدادات</h1>
        <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>بيانات الفاتورة وإدارة الجلسة</p>
      </div>

      {banner && (
        <div style={{ ...bannerStyle(banner.type), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <Card title="🔐 الجلسة">
        <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2, marginBottom: 10 }}>
          لوحة التحكم متصلة بـ <span style={{ fontFamily: 'monospace', color: ADMIN_COLORS.teal }}>api.airpiv.com</span> مباشرة — لا يوجد اتصال مباشر بقاعدة البيانات من المتصفح.
        </div>
        <LogoutButton />
      </Card>

      <Card title="🚨 إغلاق الموقع بالكامل (حالة طوارئ)" borderColor={ADMIN_COLORS.red}>
        <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2, marginBottom: 14 }}>
          عند التفعيل، سيرى كل زائر للموقع شاشة صيانة فقط — لا يمكن البحث أو الحجز. استخدم هذا فقط في حال وجود مشكلة كبيرة (خلل بالدفع، ثغرة أمنية، إلخ).
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
          {maint.enabled
            ? <span style={{ color: ADMIN_COLORS.red }}>🔴 الموقع مغلق حالياً للزوار</span>
            : <span style={{ color: ADMIN_COLORS.teal }}>🟢 الموقع يعمل بشكل طبيعي</span>}
        </div>
        <label style={labelStyle}>
          رسالة للزوار (اختياري)
          <input type="text" value={maintMessage} onChange={(e) => setMaintMessage(e.target.value)} placeholder="مثال: نعمل على إصلاح مشكلة فنية، نعود قريباً" style={inputStyle} />
        </label>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button type="button" disabled={maintBusy || maint.enabled} onClick={() => toggleMaintenance(true)} style={dangerBtnStyle}>🚨 إغلاق الموقع الآن</button>
          <button type="button" disabled={maintBusy || !maint.enabled} onClick={() => toggleMaintenance(false)} style={ghostBtnStyle}>✅ إعادة تشغيل الموقع</button>
        </div>
      </Card>

      <Card title="🧾 بيانات الفاتورة (Rechnungsdaten)">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <label style={{ ...labelStyle, flex: 1, minWidth: 200 }}>
            الاسم الكامل / اسم النشاط
            <input type="text" value={invForm.companyName} onChange={(e) => setInvForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="مثال: Mohammed Example" style={inputStyle} />
          </label>
          <label style={{ ...labelStyle, flex: 1, minWidth: 200 }}>
            Steuernummer
            <input type="text" value={invForm.steuernummer} onChange={(e) => setInvForm((f) => ({ ...f, steuernummer: e.target.value }))} placeholder="xx/xxx/xxxxx" style={inputStyle} />
          </label>
        </div>
        <label style={labelStyle}>
          العنوان الكامل في ألمانيا
          <textarea value={invForm.companyAddress} onChange={(e) => setInvForm((f) => ({ ...f, companyAddress: e.target.value }))} rows={2} placeholder="Straße, PLZ, Stadt" style={{ ...inputStyle, resize: 'vertical' }} />
        </label>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <label style={{ ...labelStyle, flex: 1, minWidth: 200 }}>
            نظام الضريبة
            <select value={invForm.taxMode} onChange={(e) => setInvForm((f) => ({ ...f, taxMode: e.target.value }))} style={inputStyle}>
              <option value="kleinunternehmer">Kleinunternehmer — §19 UStG (بدون VAT)</option>
              <option value="regular">شركة عادية — تضيف VAT 19%</option>
            </select>
          </label>
          <label style={{ ...labelStyle, flex: 1, minWidth: 200 }}>
            بادئة رقم الفاتورة
            <input type="text" value={invForm.prefix} onChange={(e) => setInvForm((f) => ({ ...f, prefix: e.target.value }))} placeholder="AIRPIV" style={inputStyle} />
          </label>
        </div>
        <button type="button" disabled={invSaving} onClick={saveInvoiceConfig} style={{ ...primaryBtnStyle, marginTop: 14 }}>
          {invSaving ? '...' : '💾 حفظ بيانات الفاتورة'}
        </button>
        <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3, marginTop: 10 }}>
          💡 محفوظة بالسيرفر (admin_config) — متاحة من أي جهاز تسجّل دخول منه.
        </div>
      </Card>
    </div>
  );
}

function Card({ title, borderColor, children }) {
  return (
    <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${borderColor || ADMIN_COLORS.border}`, borderRadius: 12, marginBottom: 16 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, fontWeight: 700, fontSize: 14, color: borderColor || ADMIN_COLORS.tx }}>{title}</div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function bannerStyle(type) {
  const color = type === 'error' ? ADMIN_COLORS.red : type === 'success' ? ADMIN_COLORS.teal : ADMIN_COLORS.blue;
  const bg = type === 'error' ? ADMIN_COLORS.redBg : type === 'success' ? ADMIN_COLORS.tealGlow : ADMIN_COLORS.blueBg;
  return { color, background: bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13 };
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
const ghostBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: 'transparent',
  color: ADMIN_COLORS.tx, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
const dangerBtnStyle = {
  padding: '9px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.red,
  color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
