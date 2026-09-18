import assert from 'node:assert/strict';

const { GET } = await import('../app/impressum/route.js');
const response = GET();
assert.equal(response.status, 200);
assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
const html = await response.text();

assert.match(html, /<html lang="de"/);
assert.match(html, /<title>Impressum | Airpiv<\/title>/);
assert.match(html, /Angaben gemäß § 5 DDG/);
assert.match(html, /Ahmed Alhamayda/);
assert.match(html, /support@airpiv\.com/);
assert.match(html, /24\.07\.2026/);
assert.match(html, /§ 18 Abs\. 2 MStV/);
assert.match(html, /https:\/\/airpiv\.com\/impressum/);