// Same fixed-window tier math as computeTieredMargin() in flywise-server's
// server.js — kept manually in sync (per admin.js's own comment); if you
// change one, change the other. Shared by both the ticket-margin (Profit)
// and ancillary seat/baggage-margin pages.
export function getMarginForPrice(price, tiers) {
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const inFrom = price >= t.from;
    const inTo = t.to === null || t.to === undefined || price < t.to;
    if (inFrom && inTo) {
      return { margin: (price * t.pct / 100) + t.fixed, tier: t, index: i };
    }
  }
  if (tiers.length > 0) {
    const last = tiers[tiers.length - 1];
    return { margin: (price * last.pct / 100) + last.fixed, tier: last, index: tiers.length - 1 };
  }
  return { margin: 0, tier: null, index: -1 };
}
