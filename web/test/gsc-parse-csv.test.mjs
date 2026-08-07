// Tests for the GSC CSV import parser + its end-to-end feed into the report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseGscCsv, parseNum } = require('../lib/seo/parse-gsc-csv.js');
const { buildOpportunityReport } = require('../lib/seo/report.js');

test('parses an English GSC Pages export (comma-delimited, dot decimals)', () => {
  const csv = [
    'Top pages,Clicks,Impressions,CTR,Position',
    'https://airpiv.com/flights/ibiza-frankfurt,0,70,0%,9.31',
    'https://airpiv.com/flights/madrid-ibiza,1,16,6.25%,4.62',
  ].join('\n');
  const { rows, meta } = parseGscCsv(csv);
  assert.equal(meta.rowCount, 2);
  assert.equal(rows[0].url, 'https://airpiv.com/flights/ibiza-frankfurt');
  assert.equal(rows[0].impressions, 70);
  assert.equal(rows[0].position, 9.31);
  assert.equal(rows[1].position, 4.62);
});

test('parses a German GSC export (semicolon-delimited, comma decimals, localized headers)', () => {
  const csv = [
    'Häufigste Seiten;Klicks;Impressionen;CTR;Position',
    'https://airpiv.com/flights/hamburg-barcelona-2;0;109;0,0 %;9,28',
    'https://airpiv.com/flights/hannover-leipzig;0;87;0,0 %;8,70',
  ].join('\r\n');
  const { rows, meta } = parseGscCsv(csv);
  assert.equal(meta.delimiter, ';');
  assert.equal(meta.rowCount, 2);
  assert.equal(rows[0].impressions, 109);
  assert.equal(rows[0].position, 9.28);
  assert.equal(rows[1].position, 8.7);
});

test('parses an Arabic GSC Pages export (localized headers, dot decimals)', () => {
  const csv = [
    'أهم الصفحات,النقرات,عدد الظهور,نسبة النقر إلى الظهور,موضع',
    'https://airpiv.com/,2,8,25%,1',
    'https://airpiv.com/flights/hamburg-barcelona-2,0,116,0%,9.28',
    'https://airpiv.com/flights/madrid-ibiza,1,16,6.25%,4.62',
  ].join('\n');
  const { rows, meta } = parseGscCsv(csv);
  assert.deepEqual(meta.columns, { url: 0, clicks: 1, impressions: 2, position: 4 });
  // The bare "/" home page (no /flights/ slug) is dropped by the normalizer.
  const report = buildOpportunityReport(rows);
  assert.equal(report.length, 2);
  assert.equal(report[0].slug, 'madrid-ibiza'); // BREAKOUT sorts first
  assert.equal(report[0].category, 'BREAKOUT');
  assert.equal(report[1].slug, 'hamburg-barcelona-2');
  assert.equal(report[1].category, 'VERY_HIGH');
});

test('strips a UTF-8 BOM and ignores blank trailing lines', () => {
  const csv = '﻿Top pages,Clicks,Impressions,CTR,Position\n'
    + 'https://airpiv.com/flights/fra-hel,0,9,0%,9.67\n\n';
  const { rows, meta } = parseGscCsv(csv);
  assert.equal(meta.rowCount, 1);
  assert.equal(rows[0].url, 'https://airpiv.com/flights/fra-hel');
});

test('handles quoted fields containing the delimiter', () => {
  const csv = [
    'Query,Page,Clicks,Impressions,CTR,Position',
    '"flug, günstig",https://airpiv.com/flights/berlin-stuttgart,0,16,0%,10.12',
  ].join('\n');
  const { rows } = parseGscCsv(csv);
  assert.equal(rows[0].query, 'flug, günstig');
  assert.equal(rows[0].url, 'https://airpiv.com/flights/berlin-stuttgart');
  assert.equal(rows[0].impressions, 16);
});

test('warns and returns no rows when the Page column is missing (Queries export)', () => {
  const csv = ['Top queries,Clicks,Impressions,CTR,Position', 'flugzeit ibiza,3,120,2.5%,8.1'].join('\n');
  const { rows, meta } = parseGscCsv(csv);
  assert.equal(rows.length, 0);
  assert.match(meta.warnings.join(' '), /PAGES report/i);
});

test('never throws on empty / malformed input', () => {
  assert.deepEqual(parseGscCsv('').rows, []);
  assert.deepEqual(parseGscCsv(null).rows, []);
  assert.deepEqual(parseGscCsv('just one line').rows, []);
});

test('parseNum handles %, German commas, and thousands separators', () => {
  assert.equal(parseNum('9.28'), 9.28);
  assert.equal(parseNum('9,28'), 9.28);
  assert.equal(parseNum('5,19 %'), 5.19);
  assert.equal(parseNum('1,234.5'), 1234.5); // en thousands + decimal
  assert.equal(parseNum('1.234,5'), 1234.5); // de thousands + decimal
  assert.equal(parseNum(''), null);
  assert.equal(parseNum('abc'), null);
});

test('end-to-end: a German Pages CSV classifies + sorts into the report', () => {
  const csv = [
    'Häufigste Seiten;Klicks;Impressionen;CTR;Position',
    'https://airpiv.com/flights/madrid-ibiza;0;16;0 %;4,62',
    'https://airpiv.com/flights/hamburg-barcelona-2;0;109;0 %;9,28',
    'https://airpiv.com/flights/munich-duesseldorf;0;13;0 %;10,85',
  ].join('\n');
  const { rows } = parseGscCsv(csv);
  const report = buildOpportunityReport(rows);
  // Sort order: BREAKOUT (madrid-ibiza) first, then VERY_HIGH, then NORMAL.
  assert.deepEqual(report.map((r) => r.category), ['BREAKOUT', 'VERY_HIGH', 'NORMAL']);
  assert.equal(report[0].slug, 'madrid-ibiza');
  assert.equal(report[1].slug, 'hamburg-barcelona-2');
  // Clicks were 0 in the export → real 0, so CTR is a real 0% here (not n/a).
  assert.equal(report[0].clicks, 0);
  assert.equal(report[0].ctr, 0);
});
