'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await fetch('/admin/api/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{ background: 'transparent', border: '1px solid #1c3644', color: '#9db3bd', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
    >
      Abmelden
    </button>
  );
}
