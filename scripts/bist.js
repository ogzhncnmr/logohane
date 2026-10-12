// Builds data/bist.json, the to-do list for BIST coverage: every company listed
// on KAP with its tickers, suggested slug, official website(s), KAP page and
// whether logos/<slug>/ already exists. Websites come from each company's KAP
// "Genel Bilgiler" page and are cached in data/bist.json between runs.
//
//   npm run bist                 fetch new companies, keep cached websites
//   npm run bist -- --refresh    re-fetch every company's website
//   npm run bist -- --offline    only refresh the "logo" flags, no network
//   npm run bist -- --limit 10   fetch at most 10 company pages (for testing)
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { KAP_BASE, KAP_LIST_URL, normalizeWebsites, parseCompanyList, parseWebsite, slugify } from './kap.js';
import { LOGOS_DIR, ROOT } from './lib.js';

export const BIST_FILE = path.join(ROOT, 'data', 'bist.json');
const USER_AGENT = 'logohane-bist-sync (+https://github.com/ogzhncnmr/logohane)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, retries = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'tr' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt >= retries) throw new Error(`${url}: ${err.message}`);
      await sleep(5000 * attempt);
    }
  }
}

/** Merges fresh KAP list entries with cached ones and flags existing logo folders. */
export function mergeCompanies(listed, cached, logosDir = LOGOS_DIR) {
  const byPath = new Map(cached.map((c) => [c.kap, c]));
  return listed
    .map((c) => {
      const kap = KAP_BASE + c.kapPath.replace('/ozet/', '/genel/');
      const old = byPath.get(kap);
      // Keep a slug a maintainer has corrected by hand.
      const slug = old?.slug ?? slugify(c.name);
      return {
        tickers: c.tickers,
        name: c.name,
        slug,
        websites: old?.websites ?? null,
        kap,
        logo: existsSync(path.join(logosDir, slug)),
      };
    })
    .sort((a, b) => a.tickers[0].localeCompare(b.tickers[0], 'en'));
}

export const EXTENSION_DATA = path.join(ROOT, 'extension', 'companies.json');

/** Writes data/bist.json, and the company list of the local Chrome extension when it is there. */
export async function save(companies) {
  await mkdir(path.dirname(BIST_FILE), { recursive: true });
  const data = { source: KAP_LIST_URL, updated: new Date().toISOString().slice(0, 10), companies };
  await writeFile(BIST_FILE, JSON.stringify(data, null, 2) + '\n');
  if (!existsSync(path.dirname(EXTENSION_DATA))) return;
  const forExtension = companies.map((c) => ({ tickers: c.tickers, name: c.name, websites: c.websites ?? [], logo: c.logo }));
  await writeFile(EXTENSION_DATA, JSON.stringify(forExtension) + '\n');
}

async function main() {
  const { values } = parseArgs({
    options: {
      refresh: { type: 'boolean', default: false },
      offline: { type: 'boolean', default: false },
      limit: { type: 'string' },
      delay: { type: 'string', default: '1500' },
    },
  });
  const delay = Number(values.delay);
  const cached = existsSync(BIST_FILE) ? JSON.parse(await readFile(BIST_FILE, 'utf8')).companies : [];

  let companies;
  if (values.offline) {
    companies = cached.map((c) => ({ ...c, logo: existsSync(path.join(LOGOS_DIR, c.slug)) }));
  } else {
    const listed = parseCompanyList(await fetchText(KAP_LIST_URL));
    if (listed.length < 100) throw new Error(`Only ${listed.length} companies parsed from KAP; the page layout may have changed.`);
    companies = mergeCompanies(listed, cached);

    const todo = companies.filter((c) => values.refresh || c.websites === null).slice(0, values.limit ? Number(values.limit) : undefined);
    console.log(`${companies.length} companies on KAP, fetching ${todo.length} company page(s)...`);
    for (const [i, c] of todo.entries()) {
      try {
        c.websites = normalizeWebsites(parseWebsite(await fetchText(c.kap)));
      } catch (err) {
        console.warn(`  ${c.tickers[0]}: ${err.message}`);
      }
      if ((i + 1) % 25 === 0) {
        console.log(`  ${i + 1}/${todo.length}`);
        await save(companies); // so an interrupted run can resume
      }
      if (i < todo.length - 1) await sleep(delay);
    }
  }

  await save(companies);
  const withLogo = companies.filter((c) => c.logo).length;
  const noSite = companies.filter((c) => c.websites?.length === 0).length;
  console.log(`Wrote ${path.relative(ROOT, BIST_FILE)}: ${companies.length} companies, ${withLogo} with a logo, ${noSite} without a website on KAP.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
