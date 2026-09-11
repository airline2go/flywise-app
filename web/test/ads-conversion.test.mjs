// [ADS-CONVERSION] Behaviour tests for the Google Ads + GA4 purchase helpers
// in public/app.js. Because app.js is a single browser bundle with heavy DOM
// dependencies, we extract ONLY the self-contained conversion block (the real
// shipped source, between its markers) and evaluate it in a small sandbox with
// window / localStorage / gtag / trackEvent stubs. This tests the exact code
// that ships — not a reimplementation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

const START = 'var _airpivPurchaseMem = {};';
const END = 'trackGoogleAdsPurchase({ transactionId: transactionId, value: value, currency: currency });\n}';
const sIdx = src.indexOf(START);
const eIdx = src.indexOf(END);
assert.ok(sIdx !== -1 && eIdx !== -1, 'conversion block markers must be present in app.js');
const block = src.slice(sIdx, eIdx + END.length);

// Build a fresh sandbox per scenario so localStorage/dedup state is isolated.
function makeEnv({ adConsent = true, config = { GOOGLE_ADS_CONVERSION_ID: 'AW-18336159187', GOOGLE_ADS_PURCHASE_LABEL: '6phDCL3BqvAcENOrrqdE' }, hasGtag = true } = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  };
  const gtagCalls = [];
  const trackCalls = [];
  const win = {
    APP_CONFIG: config,
    airpivHasAdConsent: () => adConsent,
  };
  const location = { hostname: 'test.local' };
  const gtag = hasGtag ? (...a) => gtagCalls.push(a) : undefined;
  function trackEvent(name, params) { trackCalls.push({ name, params }); }
  // Expose helpers out of the block.
  const factory = new Function(
    'window', 'localStorage', 'location', 'gtag', 'trackEvent', 'console',
    block + '\nreturn { trackGoogleAdsPurchase, fireBookingPurchase };'
  );
  const api = factory(win, localStorage, location, gtag, trackEvent, { log() {} });
  return { api, gtagCalls, trackCalls, win };
}

function adsConversions(gtagCalls) {
  return gtagCalls.filter((c) => c[0] === 'event' && c[1] === 'conversion');
}
function ga4Purchases(trackCalls) {
  return trackCalls.filter((c) => c.name === 'purchase');
}

// TEST 1 — happy path: one Ads conversion + one GA4 purchase, correct value/currency/txn.
test('TEST1 booking success → 1 Google Ads conversion + 1 GA4 purchase with server value', () => {
  const { api, gtagCalls, trackCalls } = makeEnv();
  const resp = { ok: true, booking_reference: 'ABC123', order_id: 'ord_1', total_amount: 149.9, currency: 'EUR' };
  api.fireBookingPurchase(resp, { customerTotal: 999 /* stale cache — must be ignored */ }, 'cs_sess_1');

  const ads = adsConversions(gtagCalls);
  const ga = ga4Purchases(trackCalls);
  assert.equal(ads.length, 1);
  assert.equal(ga.length, 1);
  assert.deepEqual(ads[0][2], {
    send_to: 'AW-18336159187/6phDCL3BqvAcENOrrqdE',
    value: 149.9, currency: 'EUR', transaction_id: 'ABC123',
  });
  assert.equal(ga[0].params.transaction_id, 'ABC123');
  assert.equal(ga[0].params.value, 149.9);
  assert.equal(typeof ga[0].params.value, 'number');
  assert.equal(ga[0].params.currency, 'EUR');
});

// TEST 3 — refresh / re-entry: second call for the same booking fires nothing more.
test('TEST3/4/5/6 duplicate dispatch for same transaction → no extra conversions', () => {
  const { api, gtagCalls, trackCalls } = makeEnv();
  const resp = { ok: true, booking_reference: 'ABC123', total_amount: 149.9, currency: 'EUR' };
  api.fireBookingPurchase(resp, null, 'cs_sess_1');
  // refresh (no cache), poll re-entry, already:true — all resolve to same booking_reference
  api.fireBookingPurchase({ ok: true, already: true, booking_reference: 'ABC123', total_amount: 149.9, currency: 'EUR' }, null, 'cs_sess_1');
  api.fireBookingPurchase(resp, null, 'cs_sess_1');

  assert.equal(adsConversions(gtagCalls).length, 1);
  assert.equal(ga4Purchases(trackCalls).length, 1);
});

// already:true path still carries an authoritative value (never 0).
test('TEST6 already:true with server customer_paid → value is used, not 0', () => {
  const { api, gtagCalls } = makeEnv();
  api.fireBookingPurchase({ ok: true, already: true, booking_reference: 'REF9', total_amount: 77.5, currency: 'EUR' }, null, 'cs_x');
  const ads = adsConversions(gtagCalls);
  assert.equal(ads.length, 1);
  assert.equal(ads[0][2].value, 77.5);
  assert.equal(ads[0][2].transaction_id, 'REF9');
});

// TEST7 — advertising consent denied: no Ads conversion, but GA4 analytics may still run.
test('TEST7 advertising consent denied → 0 Google Ads conversions', () => {
  const { api, gtagCalls, trackCalls } = makeEnv({ adConsent: false });
  api.fireBookingPurchase({ ok: true, booking_reference: 'ABC123', total_amount: 149.9, currency: 'EUR' }, null, 'cs_1');
  assert.equal(adsConversions(gtagCalls).length, 0);
  // GA4 purchase is gated by analytics consent (Consent Mode), not ad consent,
  // so the GA4 event is still emitted here.
  assert.equal(ga4Purchases(trackCalls).length, 1);
});

// No value available anywhere → never send a 0-value Ads conversion.
test('no real value → Google Ads conversion skipped (never value=0)', () => {
  const { api, gtagCalls } = makeEnv();
  api.fireBookingPurchase({ ok: true, booking_reference: 'NOVAL' }, null, 'cs_noval');
  assert.equal(adsConversions(gtagCalls).length, 0);
});

// transaction_id priority: booking_reference > order_id > session_id.
test('transaction_id prefers booking_reference, then order_id, then session_id', () => {
  let env = makeEnv();
  env.api.fireBookingPurchase({ booking_reference: 'BR', order_id: 'OID', total_amount: 10, currency: 'EUR' }, null, 'SID');
  assert.equal(adsConversions(env.gtagCalls)[0][2].transaction_id, 'BR');

  env = makeEnv();
  env.api.fireBookingPurchase({ order_id: 'OID', total_amount: 10, currency: 'EUR' }, null, 'SID');
  assert.equal(adsConversions(env.gtagCalls)[0][2].transaction_id, 'OID');

  env = makeEnv();
  env.api.fireBookingPurchase({ total_amount: 10, currency: 'EUR' }, null, 'SID');
  assert.equal(adsConversions(env.gtagCalls)[0][2].transaction_id, 'SID');
});

// config missing → skipped gracefully (no throw, no conversion).
test('missing Google Ads config → conversion skipped, no throw', () => {
  const { api, gtagCalls } = makeEnv({ config: {} });
  api.fireBookingPurchase({ booking_reference: 'ABC', total_amount: 10, currency: 'EUR' }, null, 's');
  assert.equal(adsConversions(gtagCalls).length, 0);
});

// gtag missing → skipped gracefully.
test('missing gtag → conversion skipped, no throw', () => {
  const { api, gtagCalls } = makeEnv({ hasGtag: false });
  api.fireBookingPurchase({ booking_reference: 'ABC', total_amount: 10, currency: 'EUR' }, null, 's');
  assert.equal(gtagCalls.length, 0);
});
