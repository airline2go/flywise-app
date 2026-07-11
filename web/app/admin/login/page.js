'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Two login paths, matching the old admin.js/admin.html exactly:
// owner (password-only, POST /admin/login) and staff (email+password,
// POST /admin/staff-login) — both proxied through
// app/admin/api/login/route.js so the token never touches page JS.
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
        setError(data.error || 'Anmeldung fehlgeschlagen');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Netzwerkfehler — bitte erneut versuchen');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1822', color: '#e6ecef' }}>
      <form onSubmit={handleSubmit} style={{ width: 320, background: '#0f2430', border: '1px solid #1c3644', borderRadius: 14, padding: 28 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Airpiv Admin</h1>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          <button type="button" onClick={() => setStaffMode(false)} style={tabStyle(!staffMode)}>Besitzer</button>
          <button type="button" onClick={() => setStaffMode(true)} style={tabStyle(staffMode)}>Mitarbeiter</button>
        </div>

        {staffMode && (
          <label style={labelStyle}>
            E-Mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} autoComplete="username" />
          </label>
        )}
        <label style={labelStyle}>
          Passwort
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} autoComplete="current-password" />
        </label>

        {error && <div style={{ color: '#f87171', fontSize: 13, marginTop: 6 }}>{error}</div>}

        <button type="submit" disabled={submitting} style={submitStyle}>
          {submitting ? 'Anmelden…' : 'Anmelden'}
        </button>
      </form>
    </main>
  );
}

function tabStyle(active) {
  return {
    flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #1c3644',
    background: active ? '#0fb5a0' : 'transparent', color: active ? '#0a1822' : '#9db3bd',
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
  };
}

const labelStyle = { display: 'block', fontSize: 12.5, color: '#9db3bd', marginTop: 12 };
const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '9px 11px',
  background: '#0a1822', border: '1px solid #1c3644', borderRadius: 8, color: '#e6ecef', fontSize: 14,
};
const submitStyle = {
  width: '100%', marginTop: 20, padding: '10px 0', borderRadius: 8, border: 'none',
  background: '#0fb5a0', color: '#0a1822', fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
