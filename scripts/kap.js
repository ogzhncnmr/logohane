// Parsers for public KAP (kap.org.tr) pages, used by scripts/bist.js.
// Kept free of network code so they can be tested against fixtures.

export const KAP_BASE = 'https://www.kap.org.tr';
export const KAP_LIST_URL = `${KAP_BASE}/tr/bist-sirketler`;

const TURKISH = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

// Legal-form suffixes dropped from the end of KAP titles, longest first.
const LEGAL_SUFFIXES = ['t.a.ş.', 't.a.o.', 'a.ş.', 'a.o.', 'a.s.', 'aş.', 'aş'];

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Returns the companies in the KAP "BIST Şirketleri" table as
 * { name, tickers, city, kapPath }, one entry per company.
 */
export function parseCompanyList(html) {
  const row = /<tr[^>]*><td[^>]*><a href="(\/tr\/sirket-bilgileri\/ozet\/[^"]+)">((?:<div>[^<]*<\/div>)+)<\/a><\/td><td[^>]*><a[^>]*>([^<]+)<\/a><\/td><td[^>]*>([^<]*)<\/td>/g;
  const companies = new Map();
  for (const [, kapPath, codes, name, city] of html.matchAll(row)) {
    if (companies.has(kapPath)) continue;
    companies.set(kapPath, {
      name: decodeEntities(name).trim(),
      tickers: codes.replace(/<\/?div>/g, ',').split(',').map((c) => c.trim()).filter(Boolean),
      city: decodeEntities(city).trim(),
      kapPath,
    });
  }
  return [...companies.values()];
}

/** Raw "İnternet Adresi" value from a company's KAP "Genel Bilgiler" page, or null. */
export function parseWebsite(html) {
  const m = html.match(/kpy41_acc1_int_addres\\?",\\?"value\\?":\\?"((?:[^"\\]|\\[^"])*)\\?"/);
  if (!m) return null;
  const value = m[1].replace(/\\\\/g, '\\').trim();
  return value || null;
}

/** Splits a free-text website field into normalized https URLs, without duplicates. */
export function normalizeWebsites(raw) {
  if (!raw) return [];
  const urls = [];
  for (let token of raw.split(/[\s,;|]+/)) {
    token = token.replace(/^[^a-z0-9]+|[^a-z0-9/]+$/gi, '');
    // Needs a letter-only TLD so legal abbreviations such as "T.A.Ş." are skipped.
    if (!/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(token)) continue;
    const url = new URL(/^https?:\/\//i.test(token) ? token : `https://${token}`);
    url.protocol = 'https:';
    const s = url.href.replace(/\/$/, '');
    if (!urls.includes(s)) urls.push(s);
  }
  return urls;
}

/** Suggested slug for a company name, following CONTRIBUTING.md. */
export function slugify(name) {
  let s = name.toLocaleLowerCase('tr').trim();
  for (const suffix of LEGAL_SUFFIXES) {
    if (s.endsWith(` ${suffix}`)) {
      s = s.slice(0, -suffix.length).trim();
      break;
    }
  }
  return s
    .replace(/[çğıöşüâîû]/g, (c) => TURKISH[c])
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/^\./, 'dot')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
