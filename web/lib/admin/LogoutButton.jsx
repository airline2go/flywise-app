'use client';

import { useRouter } from 'next/navigation';
import { ADMIN_COLORS } from './theme';

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
      style={{ background: 'transparent', border: `1px solid ${ADMIN_COLORS.border}`, color: ADMIN_COLORS.tx2, borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
    >
      🚪 تسجيل الخروج
    </button>
  );
}
