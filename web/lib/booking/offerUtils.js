import { localeFor } from '../languages';

// Pure helpers over the server's normalizeOffer() shape (see
// flywise-server/src/services/normalizeOffer.js) — {id, al, price,
// currency, outbound:{orig,dest,dep,arr,dur,stops,segs}, inbound:
// {...}|null, allSlices:[...], hasCabin, hasChecked, cabinBagQty,
// checkedBagQty, expires_at, conditions, fare_brand_name,
// cabin_marketing_name, cabin_class, amenities}. This shape already
// supersedes app.js's old client-side duffelToLocal() transform (the
// server now does that flattening itself, including proper multi-city
// support via `allSlices`) — no separate client-side normalization step
// is needed or ported here.

// Legs to render for a card: multi-city uses every slice; round-trip is
// outbound+inbound; one-way is just outbound.
function offerLegs(offer) {
  if (offer.allSlices && offer.allSlices.length > 2) return offer.allSlices;
  const legs = [offer.outbound];
  if (offer.inbound) legs.push(offer.inbound);
  return legs;
}

function offerAirlineCodes(offer) {
  const codes = new Set();
  offerLegs(offer).forEach((leg) => { if (leg && leg.segs) leg.segs.forEach((s) => codes.add(s.al[0])); });
  if (offer.al) codes.add(offer.al[0]);
  return codes;
}

// Worst-case (most stops on any single leg) — the conventional meaning
// of a "direct flights only" filter: every leg of the itinerary must be
// nonstop, not just the outbound.
function offerMaxStops(offer) {
  return offerLegs(offer).reduce((max, leg) => Math.max(max, leg ? leg.stops : 0), 0);
}

function offerTotalDuration(offer) {
  return offerLegs(offer).reduce((sum, leg) => sum + (leg ? leg.dur : 0), 0);
}

function offerIsRefundable(offer) {
  return !!(offer.conditions && offer.conditions.refund_before_departure && offer.conditions.refund_before_departure.allowed);
}

function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function p2(n) {
  return String(n).padStart(2, '0');
}

function fmtTime(iso) {
  const d = new Date(iso);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

// Ports app.js's fmtSegDate() exactly — weekday/day/month in the visitor's
// locale (ar → 'ar', en → 'en-GB', de → 'de-DE', else the language's own
// locale tag), with the same numeric "dd.mm." fallback if Intl throws.
function fmtSegDate(iso, lang) {
  const d = new Date(iso);
  const loc = lang === 'ar' ? 'ar' : lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : localeFor(lang);
  try {
    return d.toLocaleDateString(loc, { weekday: 'short', day: '2-digit', month: 'short' });
  } catch {
    return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.`;
  }
}

// Whole-day difference between two ISO datetimes (calendar days, ignoring
// time-of-day) — ports app.js's dayDiff(), used for the "+1"/"+2" arrival
// day-shift badge in the detail sheet.
function dayDiff(depIso, arrIso) {
  const a = new Date(depIso);
  const b = new Date(arrIso);
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db - da) / 864e5);
}

// Ports app.js's fmt() exactly — always EUR, no decimal places (Duffel
// prices are already whole-euro after margin rounding), not the offer's
// own `currency` field (which fmt() never read either). Locale-aware via
// langLocale() in the original, so it takes the same `lang` argument here
// (defaulting to the platform default) instead of hardcoding 'de-DE'.
function fmtPrice(price, lang = 'de') {
  try {
    return new Intl.NumberFormat(localeFor(lang), { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(price);
  } catch {
    return `€${price}`;
  }
}

// sortMode: 'best' | 'price' | 'dur' — 'best' ports the weighted
// price/duration score from app.js's sortList() (0.6 price weight, 0.4
// duration weight, both normalized against the list's own average).
function sortOffers(offers, mode) {
  if (mode === 'price') return [...offers].sort((a, b) => a.price - b.price);
  if (mode === 'dur') return [...offers].sort((a, b) => offerTotalDuration(a) - offerTotalDuration(b));
  if (!offers.length) return offers;
  const avgPrice = offers.reduce((s, o) => s + o.price, 0) / offers.length;
  const avgDur = offers.reduce((s, o) => s + offerTotalDuration(o), 0) / offers.length || 1;
  return [...offers].sort((a, b) => {
    const scoreA = (a.price / avgPrice) * 0.6 + (offerTotalDuration(a) / avgDur) * 0.4;
    const scoreB = (b.price / avgPrice) * 0.6 + (offerTotalDuration(b) / avgDur) * 0.4;
    return scoreA - scoreB;
  });
}

function defaultFilters(offers) {
  const maxPrice = offers.reduce((max, o) => Math.max(max, o.price), 0);
  return {
    stops: { 0: true, 1: true, 2: true },
    maxPrice: Math.ceil((maxPrice || 1000) / 100) * 100,
    priceCeiling: Math.ceil((maxPrice || 1000) / 100) * 100,
    timeOfDay: { early: true, morning: true, afternoon: true, evening: true },
    airlines: null, // null = all airlines allowed; a Set once the user unchecks any
  };
}

function timeBucket(hour) {
  if (hour < 6) return 'early';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function applyFilters(offers, filters) {
  return offers.filter((o) => {
    const stops = offerMaxStops(o);
    const stopsKey = stops >= 2 ? 2 : stops;
    if (!filters.stops[stopsKey]) return false;
    if (o.price > filters.maxPrice) return false;
    const depHour = new Date(o.outbound.dep).getHours();
    if (!filters.timeOfDay[timeBucket(depHour)]) return false;
    if (filters.airlines) {
      const codes = offerAirlineCodes(o);
      const matchesAny = [...codes].some((c) => filters.airlines.has(c));
      if (!matchesAny) return false;
    }
    return true;
  });
}

export {
  offerLegs, offerAirlineCodes, offerMaxStops, offerTotalDuration, offerIsRefundable,
  fmtDuration, fmtTime, fmtSegDate, dayDiff, fmtPrice, sortOffers, defaultFilters, applyFilters, timeBucket,
};
