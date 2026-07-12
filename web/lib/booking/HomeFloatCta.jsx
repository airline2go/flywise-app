'use client';

// Ports index.html's #home-float-cta — the floating "🔍 Suchen" button that
// appears (bottom-right, above the bottom nav) once the visitor scrolls past
// the search button (.gobtn) without having searched, and scrolls back up to
// it on click. Same id/markup so styles.css's #home-float-cta / .visible
// rules apply identically.
import { useEffect, useState } from 'react';
import { CHROME_STRINGS } from './chromeStrings';

// The button text reuses the search label ("Suchen"/"Search"/…): index.html
// hardcodes "🔍 Suchen"; we localize the word via the search-card label.
import { LEGACY_STRINGS } from './legacyStrings';

export default function HomeFloatCta({ lang }) {
  const [visible, setVisible] = useState(false);
  const ls = LEGACY_STRINGS[lang] || LEGACY_STRINGS.de;

  useEffect(() => {
    function onScroll() {
      const gobtn = document.querySelector('.gobtn');
      if (!gobtn) return;
      // Visible once the search button has scrolled above the viewport top.
      const past = gobtn.getBoundingClientRect().bottom < 0;
      setVisible(past);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToSearch() {
    const gobtn = document.querySelector('.gobtn');
    if (gobtn) gobtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <button
      id="home-float-cta"
      className={visible ? 'visible' : ''}
      aria-label="Zur Suche"
      onClick={scrollToSearch}
    >🔍 {ls.search_btn}</button>
  );
}
