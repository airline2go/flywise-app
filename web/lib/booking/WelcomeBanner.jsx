'use client';

// Ports index.html's #auth-welcome-banner + maybeShowWelcomeBanner() — the
// full-screen "🎁 Jetzt registrieren & 10€ Willkommensguthaben" rewards popup
// that appears ~1.4s after load for logged-out visitors who haven't dismissed
// it (localStorage 'fw_auth_banner_dismissed'), and closes on ✕ or backdrop.
// Markup/inline-styles copied verbatim from index.html.
//
// Since customer auth (Supabase) is milestone B6, every visitor is currently
// "logged out", so this shows for everyone — matching the original's
// logged-out experience. The "Jetzt registrieren" CTA will open the auth
// modal once B6 lands; for now it dismisses the banner (visual parity, the
// registration flow itself is not yet wired).
import { useEffect, useState } from 'react';

const STR = {
  de: { title: 'Jetzt registrieren & 10€ Willkommensguthaben sichern', sub: 'Werde Mitglied im Treueprogramm und sammle bei jeder Buchung Punkte', cta: 'Jetzt registrieren' },
  en: { title: 'Sign up & get €10 welcome credit', sub: 'Join our rewards program and earn points on every booking', cta: 'Sign up now' },
  ar: { title: 'سجّل حسابك واحصل على 10€ رصيد ترحيبي', sub: 'انضم لبرنامج المكافآت واكسب نقاط مع كل حجز', cta: 'سجّل الآن' },
  es: { title: 'Regístrate ahora y consigue 10€ de crédito de bienvenida', sub: 'Únete a nuestro programa de fidelidad y gana puntos en cada reserva', cta: 'Registrarse ahora' },
  fr: { title: "Inscrivez-vous maintenant et obtenez 10€ de crédit de bienvenue", sub: 'Rejoignez notre programme de fidélité et gagnez des points à chaque réservation', cta: "S'inscrire maintenant" },
  it: { title: 'Registrati ora e ottieni 10€ di credito di benvenuto', sub: 'Unisciti al nostro programma fedeltà e guadagna punti a ogni prenotazione', cta: 'Registrati ora' },
  nl: { title: 'Registreer je nu en ontvang €10 welkomstkrediet', sub: 'Word lid van ons spaarprogramma en verdien punten bij elke boeking', cta: 'Nu registreren' },
};

export default function WelcomeBanner({ lang }) {
  const s = STR[lang] || STR.de;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem('fw_auth_banner_dismissed') === '1'; } catch { /* ignore */ }
    if (dismissed) return undefined;
    const t = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setOpen(false);
    try { localStorage.setItem('fw_auth_banner_dismissed', '1'); } catch { /* ignore */ }
  }

  if (!open) return null;

  return (
    <div
      id="auth-welcome-banner"
      style={{ display: 'flex', position: 'fixed', inset: 0, zIndex: 550, alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(5,14,20,.78)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy2))', borderRadius: 22, padding: '30px 24px 26px', maxWidth: 380, width: '100%', boxShadow: '0 24px 70px rgba(0,0,0,.45)', position: 'relative', animation: 'welcomePop .4s cubic-bezier(.34,1.56,.64,1) both' }}>
        <button type="button" aria-label="close" onClick={close} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.1)', border: 'none', color: 'rgba(255,255,255,.6)', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>✕</button>
        <div style={{ position: 'relative', width: 78, height: 78, margin: '0 auto 14px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle,#0fb5a055,transparent 70%)', animation: 'welcomeGlow 2.2s ease-in-out infinite' }} />
          <div style={{ position: 'relative', fontSize: '3.1rem', lineHeight: '78px', textAlign: 'center' }}>🎁</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, lineHeight: 1.35, fontFamily: "'Syne',sans-serif" }}>{s.title}</div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>{s.sub}</div>
        </div>
        <button type="button" onClick={close} style={{ width: '100%', marginTop: 18, background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 18px rgba(15,181,160,.35)' }}>{s.cta}</button>
      </div>
    </div>
  );
}
