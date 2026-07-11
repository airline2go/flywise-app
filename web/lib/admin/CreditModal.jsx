'use client';

import { useState } from 'react';
import { ADMIN_COLORS } from './theme';

// [CREDIT-TOPUP] Owner-only — server also enforces this via
// requireFullAdmin regardless of what this UI shows/hides.
export default function CreditModal({ userId, name, onClose, onDone }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    const numAmount = parseFloat(amount);
    if (!userId || !numAmount || numAmount <= 0) { setError('أدخل مبلغ صحيح'); return; }
    setSubmitting(true);
    setError('');
    const res = await fetch('/admin/api/customers/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, amount: numAmount, reason: reason.trim() || undefined }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!data.ok) { setError(data.error || 'فشلت العملية'); return; }
    onDone(numAmount);
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>إضافة رصيد</h2>
          <button type="button" onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div style={labelStyle}>العميل</div>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>{name}</div>
        <label style={labelStyle}>
          المبلغ (€)
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10" min="0.01" step="0.01" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          السبب (اختياري)
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: تعويض عن تأخير" style={inputStyle} />
        </label>
        {error && <div style={{ color: ADMIN_COLORS.red, fontSize: 13, marginTop: 10 }}>{error}</div>}
        <button type="button" disabled={submitting} onClick={submit} style={submitBtnStyle}>
          {submitting ? '...' : '✅ إضافة الرصيد'}
        </button>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex',
  alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto', zIndex: 50,
};
const modalStyle = {
  width: '100%', maxWidth: 420, background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: 14, padding: 24,
};
const closeBtnStyle = { background: 'none', border: 'none', color: ADMIN_COLORS.tx2, cursor: 'pointer', fontSize: 16 };
const labelStyle = { display: 'block', fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 12 };
const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '9px 11px',
  background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 14,
};
const submitBtnStyle = {
  width: '100%', marginTop: 20, padding: '10px 0', borderRadius: 8, border: 'none',
  background: ADMIN_COLORS.teal, color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
