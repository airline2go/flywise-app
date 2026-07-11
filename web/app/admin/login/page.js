'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_COLORS } from '../../../lib/admin/theme';

// Two login paths, matching the old admin.js/admin.html exactly (same
// Arabic copy, same fallback-to-raw-server-error behavior — the server's
// error strings are German, e.g. "Falsches Passwort"; the old UI just
// displayed them as-is when present, only falling back to the Arabic
// default when the server gave no message at all): owner (password-only,
// POST /admin/login) and staff (email+password, POST /admin/staff-login)
// — both proxied through app/admin/api/login/route.js so the token never
// touches page JS.
export default function AdminLoginPage() {
  const router = useRouter();
  const [staffMode, setStaffMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffMode ? { mode: 'staff', email, password } : { mode: 'owner', password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'كلمة مرور خاطئة');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('خطأ في الاتصال بالسيرفر');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ADMIN_COLORS.bg, color: ADMIN_COLORS.tx }}>
      <form onSubmit={handleSubmit} style={{ width: 320, background: ADMIN_COLORS.card, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 14, padding: 28 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>تسجيل الدخول</h1>
        <p style={{ fontSize: 12.5, color: ADMIN_COLORS.tx2, marginBottom: 18 }}>
          {staffMode ? 'أدخل بريدك وكلمة المرور الخاصة بحساب الموظف' : 'أدخل كلمة مرور لوحة التحكم'}
        </p>

        {staffMode && (
          <label style={labelStyle}>
            البريد الإلكتروني
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} autoComplete="username" />
          </label>
        )}
        <label style={labelStyle}>
          كلمة المرور
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} autoComplete="current-password" />
        </label>

        {error && <div style={{ color: ADMIN_COLORS.red, fontSize: 13, marginTop: 8 }}>{error}</div>}

        <button type="submit" disabled={submitting} style={submitStyle}>
          {submitting ? '...' : 'دخول'}
        </button>
        <button type="button" onClick={() => setStaffMode((v) => !v)} style={toggleStyle}>
          {staffMode ? 'تسجيل دخول كمدير' : 'تسجيل دخول كموظف'}
        </button>
      </form>
    </main>
  );
}

const labelStyle = { display: 'block', fontSize: 12.5, color: ADMIN_COLORS.tx2, marginTop: 12 };
const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '9px 11px',
  background: ADMIN_COLORS.bg, border: `1px solid ${ADMIN_COLORS.border}`, borderRadius: 8, color: ADMIN_COLORS.tx, fontSize: 14,
};
const submitStyle = {
  width: '100%', marginTop: 20, padding: '10px 0', borderRadius: 8, border: 'none',
  background: ADMIN_COLORS.teal, color: ADMIN_COLORS.bg, fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
const toggleStyle = {
  width: '100%', marginTop: 8, padding: '10px 0', borderRadius: 8, border: `1px solid ${ADMIN_COLORS.border}`,
  background: 'transparent', color: ADMIN_COLORS.tx2, fontSize: 13, cursor: 'pointer',
};
