import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeWebsites, parseCompanyList, parseWebsite, slugify } from '../scripts/kap.js';
import { mergeCompanies } from '../scripts/bist.js';

const fixture = (name) => readFileSync(fileURLToPath(new URL(`./fixtures/kap/${name}`, import.meta.url)), 'utf8');

test('parseCompanyList reads ticker, name, city and KAP path', () => {
  const companies = parseCompanyList(fixture('list.html'));
  assert.equal(companies.length, 2);
  assert.deepEqual(companies[1], {
    name: 'TÜRK HAVA YOLLARI A.O.',
    tickers: ['THYAO'],
    city: 'İSTANBUL',
    kapPath: '/tr/sirket-bilgileri/ozet/1107-turk-hava-yollari-a-o',
  });
});

test('parseCompanyList splits multiple codes', () => {
  const html = '<tr class="x"><td class="a"><a href="/tr/sirket-bilgileri/ozet/1-x"><div>ALBRK</div><div> ALK</div></a></td><td class="b"><a href="/tr/sirket-bilgileri/ozet/1-x">ALBARAKA TÜRK KATILIM BANKASI A.Ş.</a></td><td class="c">İSTANBUL</td></tr>';
  assert.deepEqual(parseCompanyList(html)[0].tickers, ['ALBRK', 'ALK']);
});

test('parseWebsite reads the "İnternet Adresi" item', () => {
  assert.equal(parseWebsite(fixture('genel.html')), 'www.turkishairlines.com / http://investor.turkishairlines.com');
  assert.equal(parseWebsite('<html></html>'), null);
});

test('normalizeWebsites returns https URLs without duplicates', () => {
  assert.deepEqual(normalizeWebsites('www.turkishairlines.com / http://investor.turkishairlines.com'), [
    'https://www.turkishairlines.com',
    'https://investor.turkishairlines.com',
  ]);
  assert.deepEqual(normalizeWebsites('https://www.akbank.com/, www.akbank.com; WWW.AKBANK.COM'), ['https://www.akbank.com']);
  assert.deepEqual(normalizeWebsites('www.example.com.tr/yatirimci-iliskileri'), ['https://www.example.com.tr/yatirimci-iliskileri']);
  assert.deepEqual(normalizeWebsites('www.erdemir.com.tr Erdemir Romania S.R.L. www.erdemir.ro T.A.Ş.'), [
    'https://www.erdemir.com.tr',
    'https://www.erdemir.ro',
  ]);
  assert.deepEqual(normalizeWebsites('-'), []);
  assert.deepEqual(normalizeWebsites(null), []);
});

test('slugify follows CONTRIBUTING.md rules', () => {
  assert.equal(slugify('TÜRK HAVA YOLLARI A.O.'), 'turk-hava-yollari');
  assert.equal(slugify('EREĞLİ DEMİR VE ÇELİK FABRİKALARI T.A.Ş.'), 'eregli-demir-ve-celik-fabrikalari');
  assert.equal(slugify('İŞ GİRİŞİM SERMAYESİ YATIRIM ORTAKLIĞI A.Ş.'), 'is-girisim-sermayesi-yatirim-ortakligi');
  assert.equal(slugify('A1 CAPİTAL YATIRIM MENKUL DEĞERLER A.Ş.'), 'a1-capital-yatirim-menkul-degerler');
  assert.equal(slugify('D&R'), 'd-and-r');
  assert.equal(slugify('.NET'), 'dotnet');
});

test('mergeCompanies keeps cached websites and slugs and flags logo folders', (t) => {
  const logosDir = mkdtempSync(path.join(tmpdir(), 'logohane-logos-'));
  t.after(() => rmSync(logosDir, { recursive: true, force: true }));
  mkdirSync(path.join(logosDir, 'thy'));

  const listed = [
    { name: 'TÜRK HAVA YOLLARI A.O.', tickers: ['THYAO'], city: 'İSTANBUL', kapPath: '/tr/sirket-bilgileri/ozet/1107-turk-hava-yollari-a-o' },
    { name: 'AKBANK T.A.Ş.', tickers: ['AKBNK'], city: 'İSTANBUL', kapPath: '/tr/sirket-bilgileri/ozet/1-akbank-t-a-s' },
  ];
  const cached = [{
    tickers: ['THYAO'], name: 'TÜRK HAVA YOLLARI A.O.', slug: 'thy', websites: ['https://www.turkishairlines.com'],
    kap: 'https://www.kap.org.tr/tr/sirket-bilgileri/genel/1107-turk-hava-yollari-a-o', logo: false,
  }];
  const [akbank, thy] = mergeCompanies(listed, cached, logosDir);

  assert.deepEqual(akbank, {
    tickers: ['AKBNK'], name: 'AKBANK T.A.Ş.', slug: 'akbank', websites: null,
    kap: 'https://www.kap.org.tr/tr/sirket-bilgileri/genel/1-akbank-t-a-s', logo: false,
  });
  assert.equal(thy.slug, 'thy');
  assert.deepEqual(thy.websites, ['https://www.turkishairlines.com']);
  assert.equal(thy.logo, true);
});
