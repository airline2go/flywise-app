// Real homepage — same markup/classes as the original index.html (see
// lib/booking/HomeHero.jsx's header comment). SiteChrome's nav "search"
// link points here now (see page-shell.jsx's HOME-IS-NOW-REAL note).
import '../../styles/styles.css';
import HomeHero from '../../lib/booking/HomeHero';
import HomeChrome from '../../lib/booking/HomeChrome';

export const metadata = {
  title: 'Airpiv — Günstige Flüge finden und buchen',
  description: 'Vergleiche Flugpreise von 600+ Airlines und finde die günstigsten Flüge — schnell, transparent, mit voller Garantie.',
};

export default function HomePage() {
  return (
    <HomeChrome lang="de">
      <HomeHero lang="de" />
    </HomeChrome>
  );
}
