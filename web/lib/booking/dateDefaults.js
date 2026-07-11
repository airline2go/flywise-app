// A bare `/search/{PAIR}` deep link never carries a date (route-page
// CTAs and quick-pick "recent search" cards alike) — app.js's
// handleUrlAutoSearch() defaulted to +21 days out (+28 for the return
// leg), giving Duffel a real future date to price against instead of
// failing validation. Ported verbatim as a small server-side helper so
// both the (de) and [lang] results routes can share it.
function addDaysIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function resolveDeepLinkDates(sp, trip) {
  return {
    departDate: sp.depart || addDaysIso(21),
    returnDate: trip === 'rr' ? (sp.return || addDaysIso(28)) : null,
  };
}

export { resolveDeepLinkDates };
