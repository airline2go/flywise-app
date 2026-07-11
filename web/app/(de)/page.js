// Real homepage (replaces the Phase 0 placeholder) — search form lands
// here per milestone B2. SiteChrome's nav "search" link still points at
// plain "/" (a full-page <a>, not next/link — see page-shell.jsx's
// PLAIN-ANCHORS-INTENTIONAL note), which now correctly resolves to this
// page instead of the old placeholder.
import { stringsFor } from '../../lib/translate';
import SearchForm from '../../lib/booking/SearchForm';

export const metadata = {
  title: 'Airpiv — Günstige Flüge finden und buchen',
  description: 'Vergleiche Flugpreise von 600+ Airlines und finde die günstigsten Flüge — schnell, transparent, mit voller Garantie.',
};

export default function HomePage() {
  const t = stringsFor('de');
  return (
    <main style={{ padding: '48px 20px 60px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, marginBottom: 10 }}>
          Finde Flüge, die sonst niemand findet
        </h1>
        <p style={{ color: 'var(--tx2)', fontSize: 16 }}>600+ Airlines, beste Preise, volle Garantie.</p>
      </div>
      <SearchForm lang="de" t={t} />
    </main>
  );
}
