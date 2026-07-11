import '../../styles/styles.css';
import HomeHero from '../../lib/booking/HomeHero';
import { LEGACY_STRINGS } from '../../lib/booking/legacyStrings';
import { stringsFor } from '../../lib/translate';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = stringsFor(lang);
  const ls = LEGACY_STRINGS[lang] || LEGACY_STRINGS.de;
  return { title: `Airpiv — ${ls.hero_title1}`, description: t.footerTagline };
}

export default async function HomePage({ params }) {
  const { lang } = await params;
  return <HomeHero lang={lang} />;
}
