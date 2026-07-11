import { stringsFor } from '../../lib/translate';
import SearchForm from '../../lib/booking/SearchForm';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = stringsFor(lang);
  return { title: `Airpiv — ${t.searchLabel}`, description: t.footerTagline };
}

export default async function HomePage({ params }) {
  const { lang } = await params;
  const t = stringsFor(lang);
  return (
    <main style={{ padding: '48px 20px 60px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, marginBottom: 10 }}>
          {t.searchFlightsNow}
        </h1>
        <p style={{ color: 'var(--tx2)', fontSize: 16 }}>{t.footerTagline}</p>
      </div>
      <SearchForm lang={lang} t={t} />
    </main>
  );
}
