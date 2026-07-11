'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_COLORS } from './theme';
import { buildInvoicePdf, downloadPdfBytes, extractInvoiceFields } from './invoicePdf';

// [ADMIN-INVOICE] Issuing always immediately generates and downloads the
// PDF client-side right after the server reserves the real, atomic
// invoice number (issue_invoice() Postgres function — the only place a
// number is ever assigned) — matches admin.js's confirmIssueInvoice()
// exactly, including checking invoice-config completeness first and
// redirecting to Settings if it's missing.
export default function InvoiceIssueModal({ booking, onClose, onIssued }) {
  const router = useRouter();
  const [config, setConfig] = useState(null);
  const [checking, setChecking] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fields = extractInvoiceFields(booking);

  useEffect(() => {
    (async () => {
      const res = await fetch('/admin/api/invoice-config');
      const data = await res.json();
      if (data.ok) setConfig(data.config);
      setChecking(false);
      setCustomerName(fields.customerName);
      setCustomerAddress(fields.customerAddress);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configComplete = !!(config && config.companyName && config.companyAddress && config.steuernummer);

  if (checking) return null;

  if (!configComplete) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
          <p style={{ color: ADMIN_COLORS.red, fontSize: 13, marginBottom: 16 }}>
            عبّي بيانات الفاتورة (الاسم/العنوان/Steuernummer) في الإعدادات أولاً
          </p>
          <button type="button" onClick={() => router.push('/admin/settings')} style={primaryBtnStyle}>الذهاب للإعدادات</button>
        </div>
      </div>
    );
  }

  async function confirmIssue() {
    if (!customerName.trim()) { setError('أدخل اسم العميل'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/admin/api/invoices/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id || null,
          booking_reference: fields.pnr,
          customer_name: customerName.trim(),
          customer_address: customerAddress.trim(),
          amount: fields.amount,
          currency: booking.currency || 'EUR',
          fields: { ...fields, customerName: customerName.trim(), customerAddress: customerAddress.trim() },
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error || 'فشل إصدار الفاتورة'); setSubmitting(false); return; }

      const invoiceNumber = data.invoice.invoice_number;
      const record = {
        invoiceNumber,
        issuedAt: data.invoice.created_at,
        bookingRef: fields.pnr,
        customerName: customerName.trim(),
        customerAddress: customerAddress.trim(),
        amount: fields.amount,
        fields: { ...fields, customerName: customerName.trim(), customerAddress: customerAddress.trim() },
      };
      const pdfBytes = await buildInvoicePdf(record, config);
      downloadPdfBytes(pdfBytes, `${invoiceNumber}.pdf`);
      setSubmitting(false);
      onIssued(invoiceNumber);
    } catch {
      setSubmitting(false);
      setError('خطأ أثناء إصدار الفاتورة أو توليد PDF');
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>إصدار فاتورة</h2>
          <button type="button" onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginBottom: 4 }}>رقم الفاتورة</div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: ADMIN_COLORS.tx3, marginBottom: 16 }}>
          سيُحدَّد تلقائياً وبشكل متسلسل عند الإصدار — لا تكرار ولا فجوات (مُولَّد من السيرفر)
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>تأكد/عدّل بيانات العميل قبل الإصدار</div>
        <label style={labelStyle}>
          اسم العميل
          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="اسم العميل الكامل" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          عنوان العميل
          <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} placeholder="Straße, PLZ, Stadt" style={{ ...inputStyle, resize: 'vertical' }} />
        </label>

        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 20, marginBottom: 8 }}>تفاصيل الخدمة</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
          <DetailItem label="المسار" value={fields.route || '—'} />
          <DetailItem label="شركة الطيران" value={fields.airline || '—'} />
          <DetailItem label="PNR" value={fields.pnr || '—'} mono />
          <DetailItem label="المبلغ" value={`€${fields.amount.toFixed(2)}`} />
        </div>

        {error && <div style={{ color: ADMIN_COLORS.red, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button type="button" disabled={submitting} onClick={confirmIssue} style={{ ...primaryBtnStyle, width: '100%' }}>
          {submitting ? '...' : '🧾 إصدار الفاتورة'}
        </button>
      </div>
    </div>
  );
}

function DetailItem({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: ADMIN_COLORS.tx3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex',
  alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto', zIndex: 60,
};
const modalStyle = {
  width: '100%', maxWidth: 480, background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: 14, padding: 24,
};
const closeBtnStyle = { background: 'none', border: 'none', color: ADMIN_COLORS.tx2, cursor: 'pointer', fontSize: 16 };
const labelStyle = { display: 'block', fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 10 };
const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '9px 11px',
  background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 14,
};
const primaryBtnStyle = {
  padding: '10px 16px', borderRadius: 8, border: 'none', background: ADMIN_COLORS.teal,
  color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
