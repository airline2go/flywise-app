'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_COLORS } from '../../../../lib/admin/theme';
import { buildInvoicePdf, downloadPdfBytes, mergePdfBuffers } from '../../../../lib/admin/invoicePdf';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function invoiceToRecord(r) {
  return {
    invoiceNumber: r.invoice_number, issuedAt: r.created_at, bookingRef: r.booking_reference,
    customerName: r.customer_name, customerAddress: r.customer_address,
    amount: Number(r.amount) || 0, fields: r.fields || {},
  };
}

export default function InvoicesClient() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [batchFrom, setBatchFrom] = useState(todayISO());
  const [batchTo, setBatchTo] = useState(todayISO());
  const [batchBusy, setBatchBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [invRes, cfgRes] = await Promise.all([
      fetch('/admin/api/invoices?limit=300'),
      fetch('/admin/api/invoice-config'),
    ]);
    const invData = await invRes.json();
    const cfgData = await cfgRes.json();
    if (invData.ok) setInvoices(invData.invoices || []);
    if (cfgData.ok) setConfig(cfgData.config);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const configComplete = !!(config && config.companyName && config.companyAddress && config.steuernummer);

  const f = search.trim().toLowerCase();
  const visible = f
    ? invoices.filter((r) => `${r.invoice_number} ${r.booking_reference || ''} ${r.customer_name}`.toLowerCase().includes(f))
    : invoices;

  function setBatchRange(kind) {
    const now = new Date();
    if (kind === 'today') {
      const d = now.toISOString().slice(0, 10);
      setBatchFrom(d); setBatchTo(d);
    } else {
      setBatchFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setBatchTo(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
    }
  }

  function invoicesInRange() {
    if (!batchFrom || !batchTo) return [];
    const from = new Date(`${batchFrom}T00:00:00`);
    const to = new Date(`${batchTo}T23:59:59`);
    return invoices.filter((r) => { const d = new Date(r.created_at); return d >= from && d <= to; }).map(invoiceToRecord);
  }
  const batchCount = invoicesInRange().length;

  async function redownload(invoiceNumber) {
    const row = invoices.find((r) => r.invoice_number === invoiceNumber);
    if (!row) { setBanner({ type: 'error', text: 'سجل الفاتورة غير موجود' }); return; }
    try {
      const bytes = await buildInvoicePdf(invoiceToRecord(row), config);
      downloadPdfBytes(bytes, `${invoiceNumber}.pdf`);
    } catch {
      setBanner({ type: 'error', text: 'خطأ أثناء إعادة التوليد' });
    }
  }

  async function downloadBatchMerged() {
    const list = invoicesInRange();
    if (!list.length) { setBanner({ type: 'error', text: 'لا توجد فواتير في هذا المدى' }); return; }
    setBatchBusy(true);
    setBanner({ type: 'info', text: 'جارٍ تجهيز الملف...' });
    try {
      const buffers = [];
      for (const record of list) buffers.push(await buildInvoicePdf(record, config));
      const merged = await mergePdfBuffers(buffers);
      downloadPdfBytes(merged, `airpiv-rechnungen-${batchFrom}_${batchTo}.pdf`);
      setBanner({ type: 'success', text: `تم تنزيل ${list.length} فاتورة في ملف واحد ✅` });
    } catch {
      setBanner({ type: 'error', text: 'خطأ أثناء الدمج' });
    } finally {
      setBatchBusy(false);
    }
  }

  async function downloadBatchSeparate() {
    const list = invoicesInRange();
    if (!list.length) { setBanner({ type: 'error', text: 'لا توجد فواتير في هذا المدى' }); return; }
    setBatchBusy(true);
    setBanner({ type: 'info', text: 'جارٍ تجهيز الملفات...' });
    try {
      for (const record of list) {
        const bytes = await buildInvoicePdf(record, config);
        downloadPdfBytes(bytes, `${record.invoiceNumber}.pdf`);
        await new Promise((r) => setTimeout(r, 250));
      }
      setBanner({ type: 'success', text: `تم تنزيل ${list.length} فاتورة منفصلة ✅` });
    } catch {
      setBanner({ type: 'error', text: 'خطأ أثناء التنزيل' });
    } finally {
      setBatchBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>الفواتير الضريبية</h1>
          <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 4 }}>Rechnungen — إصدار وتصدير فواتير §19 UStG (Kleinunternehmer)</p>
        </div>
        <button type="button" onClick={() => router.push('/admin/settings')} style={ghostBtnStyle}>⚙️ بيانات الفاتورة</button>
      </div>

      {!loading && !configComplete && (
        <div style={{ ...bannerStyle('info'), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ لازم تعبّي بياناتك (الاسم، العنوان، Steuernummer) قبل إصدار أي فاتورة</span>
          <button type="button" onClick={() => router.push('/admin/settings')} style={primaryBtnStyle}>تعبئة البيانات</button>
        </div>
      )}

      <div style={{ background: ADMIN_COLORS.card, border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18 }}>⚠️</span>
        <div style={{ fontSize: 12, color: ADMIN_COLORS.tx2, lineHeight: 1.7 }}>
          <strong style={{ color: ADMIN_COLORS.yellow }}>تنبيه قانوني:</strong>
          {' '}هذا القالب تقني فقط وغير معتمد قانونياً تلقائياً. لازم يراجعه Steuerberater (محاسب ضرائب ألماني مرخص) قبل الاستخدام الفعلي مع العملاء، خصوصاً تصنيف الخدمة (وسيط حجوزات) ومعاملتها الضريبية.
          <br /><br />
          <strong style={{ color: ADMIN_COLORS.teal }}>✓ ترقيم الفواتير:</strong> الرقم المتسلسل الآن مُولَّد بشكل ذرّي من قاعدة البيانات (Postgres SEQUENCE)، لا يتكرر ولا تفوته فجوة حتى مع عدة طلبات متزامنة من أكثر من جهاز — تم اختباره فعلياً تحت تزامن حقيقي.
        </div>
      </div>

      {banner && (
        <div style={{ ...bannerStyle(banner.type), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, fontWeight: 700, fontSize: 14 }}>📦 تصدير دفعة فواتير</div>
        <div style={{ padding: '18px 20px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          <label style={labelStyle}>
            من تاريخ
            <input type="date" value={batchFrom} onChange={(e) => setBatchFrom(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            إلى تاريخ
            <input type="date" value={batchTo} onChange={(e) => setBatchTo(e.target.value)} style={inputStyle} />
          </label>
          <button type="button" onClick={() => setBatchRange('today')} style={ghostBtnStyle}>اليوم</button>
          <button type="button" onClick={() => setBatchRange('month')} style={ghostBtnStyle}>هذا الشهر</button>
          <button type="button" disabled={batchBusy} onClick={downloadBatchMerged} style={primaryBtnStyle}>📥 ملف PDF واحد مدمج</button>
          <button type="button" disabled={batchBusy} onClick={downloadBatchSeparate} style={ghostBtnStyle}>📥 كل فاتورة ملف منفصل</button>
        </div>
        <div style={{ padding: '0 20px 16px', fontSize: 11, color: ADMIN_COLORS.tx3 }}>
          {batchCount > 0 ? `${batchCount} فاتورة في هذا المدى` : 'لا توجد فواتير صادرة في هذا المدى'}
        </div>
      </div>

      <div style={{ background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 12 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ADMIN_COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>سجل الفواتير الصادرة</div>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 ابحث برقم الفاتورة أو الحجز..."
            style={{ minWidth: 220, padding: '7px 12px', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`, background: ADMIN_COLORS.bg, color: ADMIN_COLORS.tx, fontSize: 13 }}
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: ADMIN_COLORS.bg3 }}>
                <th style={thStyle}>رقم الفاتورة</th>
                <th style={thStyle}>التاريخ</th>
                <th style={thStyle}>العميل</th>
                <th style={thStyle}>رقم الحجز</th>
                <th style={thStyle}>المبلغ</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={emptyCellStyle}>...جارٍ التحميل</td></tr>}
              {!loading && visible.length === 0 && <tr><td colSpan={6} style={emptyCellStyle}>لا توجد فواتير صادرة بعد — أصدر فاتورة من تفاصيل أي حجز مؤكد</td></tr>}
              {!loading && visible.map((r) => (
                <tr key={r.invoice_number} style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{r.invoice_number}</td>
                  <td style={tdStyle}>{new Date(r.created_at).toLocaleDateString('ar')}</td>
                  <td style={tdStyle}>{r.customer_name || '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{r.booking_reference || '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: ADMIN_COLORS.blue }}>€{(Number(r.amount) || 0).toFixed(2)}</td>
                  <td style={tdStyle}>
                    <button type="button" onClick={() => redownload(r.invoice_number)} style={linkBtnStyle}>📥 إعادة تنزيل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function bannerStyle(type) {
  const color = type === 'error' ? ADMIN_COLORS.red : type === 'success' ? ADMIN_COLORS.teal : ADMIN_COLORS.blue;
  const bg = type === 'error' ? ADMIN_COLORS.redBg : type === 'success' ? ADMIN_COLORS.tealGlow : ADMIN_COLORS.blueBg;
  return { color, background: bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13 };
}

const labelStyle = { display: 'block', fontSize: 12.5, color: ADMIN_COLORS.tx2, margin: 0 };
const inputStyle = {
  display: 'block', marginTop: 4, padding: '9px 11px',
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
const thStyle = { textAlign: 'right', padding: '10px 14px', color: ADMIN_COLORS.tx2, fontWeight: 600, fontSize: 12.5 };
const tdStyle = { padding: '10px 14px', color: ADMIN_COLORS.tx };
const emptyCellStyle = { padding: '24px 14px', textAlign: 'center', color: ADMIN_COLORS.tx2 };
const linkBtnStyle = { background: 'none', border: 'none', color: ADMIN_COLORS.teal, cursor: 'pointer', fontSize: 13, padding: 0 };
