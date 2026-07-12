'use client';

// Ports app.js's #flex-hint banner (showFlexHint / hideFlexHint + the
// fw_flex_shown localStorage gate). Shown once ever, 2s after the homepage
// mounts, then auto-hidden after 5s; dismissable via the ✕. Same markup and
// the same one-time-only behavior as the original — the only difference is
// the trigger point: the old SPA revealed it 2s after the first search
// completed (with the homepage still behind the results overlay), whereas
// here the homepage is its own route, so it fires 2s after the homepage
// loads. Same localStorage key, so it still only ever appears once.
import { useEffect, useState } from 'react';

export default function FlexHint({ ls }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer;
    let showTimer;
    try {
      if (localStorage.getItem('fw_flex_shown')) return undefined;
      localStorage.setItem('fw_flex_shown', '1');
    } catch {
      return undefined;
    }
    showTimer = setTimeout(() => {
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), 5000);
    }, 2000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, []);

  return (
    <div id="flex-hint" style={{ display: visible ? 'flex' : 'none' }}>
      {ls.flex_hint}
      <button
        type="button"
        onClick={() => setVisible(false)}
        style={{ background: 'none', border: 'none', color: 'var(--teal2)', cursor: 'pointer', fontWeight: 700, marginLeft: 'auto' }}
      >✕</button>
    </div>
  );
}
