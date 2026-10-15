import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildCompanies, mainWebsite, parseConstituents, usSlug } from '../scripts/sp500.js';

const row = (quote, symbol, article, name, cik) => `<tr>
<td><a rel="nofollow" class="external text" href="${quote}">${symbol}</a></td>
<td><a href="/wiki/${article}" title="${name}">${name}</a></td>
<td>Information Technology</td><td>Interactive Media &amp; Services</td>
<td><a href="/wiki/Mountain_View">Mountain View, California</a></td><td>2014-04-03</td><td>${cik}</td><td>1998</td></tr>`;
const html = `<table id="constituents"><tbody><tr><th>Symbol</th><th>Security</th></tr>
${row('https://www.nasdaq.com/market-activity/stocks/googl', 'GOOGL', 'Alphabet_Inc.', 'Alphabet Inc. (Class A)', '0001652044')}
${row('https://www.nasdaq.com/market-activity/stocks/goog', 'GOOG', 'Alphabet_Inc.', 'Alphabet Inc. (Class C)', '0001652044')}
${row('https://www.nyse.com/quote/XNYS:BRK.B', 'BRK.B', 'Berkshire_Hathaway', 'Berkshire Hathaway', '1067983')}
</tbody></table><table><tr><td>other</td></tr></table>`;

test('parseConstituents reads symbol, exchange, article and a padded CIK', () => {
  const rows = parseConstituents(html);
  assert.equal(rows.length, 3);
  assert.deepEqual(
    [rows[0].symbol, rows[0].exchange, rows[0].article, rows[0].cik, rows[0].industry],
    ['GOOGL', 'NASDAQ', 'Alphabet_Inc.', '0001652044', 'Interactive Media & Services'],
  );
  assert.deepEqual([rows[2].symbol, rows[2].exchange, rows[2].cik], ['BRK.B', 'NYSE', '0001067983']);
});

test('usSlug drops legal suffixes and a leading "The"', () => {
  assert.equal(usSlug('Apple Inc.'), 'apple');
  assert.equal(usSlug('The Walt Disney Company'), 'walt-disney');
  assert.equal(usSlug('Johnson & Johnson'), 'johnson-and-johnson');
  assert.equal(usSlug('Insulet Corporation'), 'insulet');
  assert.equal(usSlug('Berkshire Hathaway'), 'berkshire-hathaway');
  assert.equal(usSlug('Merck & Co.'), 'merck');
  assert.equal(usSlug('Deere & Company'), 'deere');
  assert.equal(usSlug('Arthur J. Gallagher & Co.'), 'arthur-j-gallagher');
  assert.equal(usSlug("McDonald's"), 'mcdonalds');
  assert.equal(usSlug("O'Reilly Automotive"), 'oreilly-automotive');
  // "and" inside a word stays.
  assert.equal(usSlug('Archer Daniels Midland'), 'archer-daniels-midland');
  assert.equal(usSlug('Ingersoll Rand'), 'ingersoll-rand');
  assert.equal(usSlug('Texas Pacific Land Corporation'), 'texas-pacific-land');
});

test('mainWebsite prefers the preferred rank, then a domain with the company name', () => {
  const sites = [{ url: 'https://mac.com/' }, { url: 'https://apple.com/' }, { url: 'https://apple.com/tr/' }];
  assert.equal(mainWebsite(sites, 'apple'), 'https://apple.com');
  assert.equal(mainWebsite([...sites, { url: 'https://www.apple.com/', preferred: true }], 'apple'), 'https://www.apple.com');
  assert.equal(mainWebsite([], 'apple'), null);
});

test('buildCompanies groups share classes and flags logo folders', (t) => {
  const logosDir = mkdtempSync(path.join(tmpdir(), 'logohane-sp500-'));
  t.after(() => rmSync(logosDir, { recursive: true, force: true }));
  mkdirSync(path.join(logosDir, 'alphabet'));
  const byCik = new Map([['article:Alphabet_Inc.', { items: new Set(['Q20800404']), sites: new Map([['https://abc.xyz/', false]]), listings: new Map(), isins: new Set(['US02079K3059']) }]]);
  const [alphabet, berkshire] = buildCompanies(parseConstituents(html), byCik, logosDir).sort((a, b) => a.slug.localeCompare(b.slug));
  assert.deepEqual(alphabet.tickers, [{ exchange: 'NASDAQ', symbol: 'GOOGL' }, { exchange: 'NASDAQ', symbol: 'GOOG' }]);
  assert.equal(alphabet.name, 'Alphabet Inc.');
  assert.equal(alphabet.slug, 'alphabet');
  assert.equal(alphabet.wikidata, 'Q20800404');
  assert.deepEqual(alphabet.websites, ['https://abc.xyz']);
  assert.equal(alphabet.logo, true);
  assert.equal(berkshire.logo, false);
  assert.equal(berkshire.wikidata, null);
});
