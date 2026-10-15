// Builds data/sp500.json, the to-do list for S&P 500 coverage: every constituent
// with its tickers and exchange, suggested slug, official website, Wikidata ID,
// ISIN, sector and whether logos/<slug>/ already exists. The constituent list
// comes from Wikipedia's "List of S&P 500 companies"; websites, exchanges and
// ISINs from Wikidata (CC0), matched by SEC CIK.
//
//   npm run sp500                 refresh the list
//   npm run sp500 -- --offline    only refresh the "logo" flags, no network
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { slugify } from './kap.js';
import { LOGOS_DIR, ROOT } from './lib.js';

export const SP500_FILE = path.join(ROOT, 'data', 'sp500.json');
const EXTENSION_DATA = path.join(ROOT, 'extension', 'companies-sp500.json');

/** Writes data/sp500.json, and the list for the local Chrome extension when it is there. */
async function save(data) {
  await mkdir(path.dirname(SP500_FILE), { recursive: true });
  await writeFile(SP500_FILE, JSON.stringify(data, null, 2) + '\n');
  if (!existsSync(path.dirname(EXTENSION_DATA))) return;
  const forExtension = data.companies.map((c) => ({ tickers: c.tickers.map((t) => t.symbol), name: c.name, websites: c.websites, logo: c.logo }));
  await writeFile(EXTENSION_DATA, JSON.stringify(forExtension) + '\n');
}
const LIST_URL = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies';
const LIST_API = 'https://en.wikipedia.org/w/api.php?action=parse&page=List_of_S%26P_500_companies&prop=text&format=json&formatversion=2';
const SPARQL = 'https://query.wikidata.org/sparql';
const HEADERS = { 'User-Agent': 'logohane-sp500-sync/0.1 (+https://github.com/ogzhncnmr/logohane)' };

// Wikidata exchange items (P414) for US listings, by label.
const EXCHANGES = [
  [/^nasdaq/i, 'NASDAQ'],
  [/^new york stock exchange$|^nyse$/i, 'NYSE'],
  [/nyse american/i, 'NYSEAMERICAN'],
  [/nyse arca/i, 'NYSEARCA'],
  [/cboe|bats/i, 'CBOE'],
];

// Official sites for constituents Wikidata has no website for (new listings, spin-offs).
const WEBSITES = {
  FDXF: 'https://www.fedexfreight.com',
  LITE: 'https://www.lumentum.com',
  NCLH: 'https://www.nclhltd.com',
  PCG: 'https://www.pge.com',
  PODD: 'https://www.insulet.com',
  VYLR: 'https://www.vylor.com',
};

const text = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
const symbolKey = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

const QUOTE_HOSTS = [[/nyse\.com/, 'NYSE'], [/nasdaq\.com/, 'NASDAQ'], [/cboe\.com/, 'CBOE']];

/**
 * Rows of the "constituents" table: { symbol, exchange, name, article, sector,
 * industry, headquarters, added, cik, founded }. The symbol links to its exchange's
 * quote page, the name to the company's Wikipedia article.
 */
export function parseConstituents(html) {
  const start = html.indexOf('id="constituents"');
  if (start < 0) throw new Error('constituents table not found');
  const table = html.slice(start, html.indexOf('</table>', start));
  const rows = [];
  for (const tr of table.split(/<tr[\s>]/).slice(1)) {
    const raw = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (raw.length < 7) continue; // the header row has <th> cells
    const [symbol, name, sector, industry, headquarters, added, cik, founded] = raw.map(text);
    const quote = raw[0].match(/href="([^"]+)"/)?.[1] ?? '';
    const exchange = QUOTE_HOSTS.find(([re]) => re.test(quote))?.[1] ?? null;
    const article = raw[1].match(/href="\/wiki\/([^"#]+)"/)?.[1] ?? null;
    rows.push({ symbol, exchange, name, article, sector, industry, headquarters, added, cik: cik.padStart(10, '0'), founded: founded ?? null });
  }
  return rows;
}

/**
 * Suggested slug for an English company name: legal suffixes and a leading
 * "The" are dropped ("The Walt Disney Company" → walt-disney, "Apple Inc." → apple).
 */
export function usSlug(name) {
  const SUFFIX = /[\s,]+(inc\.?|incorporated|corp\.?|corporation|company|co\.?|ltd\.?|limited|plc|n\.v\.|s\.a\.|l\.p\.|lp|llc|se|ag|the)$/i;
  let n = name.replace(/\(the\)/i, '').replace(/^the\s+/i, '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
  for (let i = 0; i < 3 && SUFFIX.test(n); i++) n = n.replace(SUFFIX, '').trim();
  // "Merck & Co." leaves a trailing "&" once "Co." is gone.
  n = n.replace(/\s*&$|\s+and$/i, '').trim();
  // McDonald's → mcdonalds, not mcdonald-s.
  return slugify(n.replace(/['’]/g, ''));
}

/**
 * The company's main site from Wikidata's official websites: preferred rank, then a
 * domain containing the slug's first word (apple.com, not mac.com), then a bare
 * domain, then .com, then the shortest.
 */
export function mainWebsite(sites, slug = '') {
  const word = slug.split('-')[0];
  const score = ({ url, preferred }) => {
    let u;
    try { u = new URL(url); } catch { return -Infinity; }
    return (preferred ? 100 : 0) + (word.length > 2 && u.hostname.replace(/-/g, '').includes(word) ? 20 : 0)
      + (u.pathname === '/' || u.pathname === '' ? 10 : 0) + (u.hostname.endsWith('.com') ? 3 : 0) - url.length / 100;
  };
  const best = [...sites].sort((a, b) => score(b) - score(a))[0];
  if (!best) return null;
  const u = new URL(best.url);
  return `https://${u.hostname}${u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '')}`;
}

/** Wikidata details keyed by Wikipedia article (match 'article') or SEC CIK (match 'cik'). */
async function wikidata(keys, match) {
  const values = match === 'article'
    ? `VALUES ?key { ${keys.map((a) => `<https://en.wikipedia.org/wiki/${a}>`).join(' ')} } ?key schema:about ?item .`
    : `VALUES ?key { ${keys.map((c) => `"${c}"`).join(' ')} } ?item wdt:P5531 ?key .`;
  const query = `SELECT ?key ?item ?site ?rank ?exLabel ?sym ?isin WHERE {
    ${values}
    OPTIONAL { ?item p:P856 ?st . ?st ps:P856 ?site ; wikibase:rank ?rank . }
    OPTIONAL { ?item p:P414 ?ex_st . ?ex_st ps:P414 ?ex ; pq:P249 ?sym . FILTER NOT EXISTS { ?ex_st pq:P582 ?end } }
    OPTIONAL { ?item wdt:P946 ?isin . }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`;
  const res = await fetch(SPARQL, { method: 'POST', headers: { ...HEADERS, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: `query=${encodeURIComponent(query)}` });
  if (!res.ok) throw new Error(`Wikidata: HTTP ${res.status}`);
  const byCik = new Map();
  for (const b of (await res.json()).results.bindings) {
    const cik = match === 'article' ? `article:${b.key.value.split('/wiki/')[1]}` : b.key.value;
    const e = byCik.get(cik) ?? { items: new Set(), sites: new Map(), listings: new Map(), isins: new Set() };
    e.items.add(b.item.value.split('/').pop());
    if (b.site) e.sites.set(b.site.value, (e.sites.get(b.site.value) ?? false) || b.rank?.value.endsWith('PreferredRank'));
    if (b.sym && b.exLabel) {
      const code = EXCHANGES.find(([re]) => re.test(b.exLabel.value))?.[1];
      if (code) e.listings.set(symbolKey(b.sym.value), code);
    }
    if (b.isin && /^US/.test(b.isin.value)) e.isins.add(b.isin.value);
    byCik.set(cik, e);
  }
  return byCik;
}

/** Groups constituent rows by CIK (share classes such as GOOGL/GOOG) and adds the Wikidata details. */
export function buildCompanies(rows, byCik, logosDir = LOGOS_DIR) {
  const groups = new Map();
  for (const r of rows) groups.set(r.cik, [...(groups.get(r.cik) ?? []), r]);
  return [...groups.values()].map((group) => {
    const first = group[0];
    const wd = byCik.get(`article:${first.article}`) ?? byCik.get(first.cik);
    const symbols = group.map((r) => r.symbol);
    const exchange = first.exchange ?? symbols.map((s) => wd?.listings.get(symbolKey(s))).find(Boolean) ?? null;
    const slug = usSlug(first.name.replace(/\s*\(Class [A-Z]\)/i, ''));
    const website = (wd && mainWebsite([...wd.sites].map(([url, preferred]) => ({ url, preferred })), slug)) ?? WEBSITES[symbols[0]] ?? null;
    return {
      tickers: symbols.map((symbol) => ({ exchange, symbol })),
      name: first.name.replace(/\s*\(Class [A-Z]\)/i, ''),
      slug,
      cik: first.cik,
      wikidata: wd && wd.items.size === 1 ? [...wd.items][0] : null,
      isin: wd && wd.isins.size === 1 ? [...wd.isins][0] : null,
      websites: website ? [website] : [],
      sector: first.sector,
      industry: first.industry,
      headquarters: first.headquarters,
      logo: existsSync(path.join(logosDir, slug)),
    };
  }).sort((a, b) => a.tickers[0].symbol.localeCompare(b.tickers[0].symbol, 'en'));
}

async function main() {
  const { values } = parseArgs({ options: { offline: { type: 'boolean', default: false } } });
  if (values.offline) {
    const data = JSON.parse(await readFile(SP500_FILE, 'utf8'));
    for (const c of data.companies) c.logo = existsSync(path.join(LOGOS_DIR, c.slug));
    await save(data);
    console.log(`Updated logo flags: ${data.companies.filter((c) => c.logo).length}/${data.companies.length} with a logo.`);
    return;
  }
  const page = await (await fetch(LIST_API, { headers: HEADERS })).json();
  const rows = parseConstituents(page.parse.text);
  const byCik = new Map();
  const articles = [...new Set(rows.map((r) => r.article).filter(Boolean))];
  for (let i = 0; i < articles.length; i += 150) {
    for (const [k, v] of await wikidata(articles.slice(i, i + 150), 'article')) byCik.set(k, v);
  }
  // An article that is a redirect has no sitelink; fall back to the SEC CIK.
  const ciks = [...new Set(rows.filter((r) => !byCik.has(`article:${r.article}`)).map((r) => r.cik))];
  for (let i = 0; i < ciks.length; i += 150) {
    for (const [k, v] of await wikidata(ciks.slice(i, i + 150), 'cik')) byCik.set(k, v);
  }
  const companies = buildCompanies(rows, byCik);
  await save({ source: LIST_URL, details: 'https://www.wikidata.org', updated: new Date().toISOString().slice(0, 10), companies });
  const missing = (key) => companies.filter((c) => (key === 'exchange' ? !c.tickers[0].exchange : !c[key] || (Array.isArray(c[key]) && !c[key].length)));
  const dupes = companies.filter((c, i) => companies.findIndex((d) => d.slug === c.slug) !== i);
  console.log(`Wrote ${path.relative(ROOT, SP500_FILE)}: ${companies.length} companies (${rows.length} tickers), ${companies.filter((c) => c.logo).length} with a logo.`);
  console.log(`Without website: ${missing('websites').length}, exchange: ${missing('exchange').length}, Wikidata ID: ${missing('wikidata').length}, ISIN: ${missing('isin').length}, duplicate slugs: ${dupes.length}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
