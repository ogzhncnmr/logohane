// Checks every logo folder against the rules in CONTRIBUTING.md.
// Exits with code 1 and prints each problem when any check fails.
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { LOGOS_DIR, MAX_SVG_BYTES, ROOT, SLUG_RE, loadLogos, loadRemoved, variantFile } from './lib.js';

const FORBIDDEN_SVG = [
  [/<script[\s>]/i, 'contains <script>'],
  [/<image[\s>]/i, 'embeds a raster <image>'],
  [/<foreignObject[\s>]/i, 'contains <foreignObject>'],
  [/<text[\s>]/i, 'contains <text>; convert text to paths'],
  [/\son[a-z]+\s*=/i, 'contains an event handler attribute'],
  [/(href|src)\s*=\s*["'](?!#)/i, 'references an external resource'],
  [/@import|@font-face/i, 'loads external CSS or fonts'],
];

export function checkSvg(content) {
  const problems = [];
  if (!/<svg[\s>]/i.test(content)) problems.push('is not an SVG file');
  const root = content.match(/<svg[^>]*>/i)?.[0] ?? '';
  if (!/\sviewBox\s*=/.test(root)) problems.push('has no viewBox');
  if (/\s(width|height)\s*=\s*["'][^"']*\d/.test(root)) problems.push('sets a fixed width/height on <svg>; use viewBox only');
  for (const [re, msg] of FORBIDDEN_SVG) if (re.test(content)) problems.push(msg);
  return problems;
}

export async function validate({ logosDir = LOGOS_DIR, root = ROOT } = {}) {
  const schema = JSON.parse(await readFile(path.join(ROOT, 'schema/meta.schema.json'), 'utf8'));
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const checkMeta = ajv.compile(schema);
  const removed = new Set(await loadRemoved(root));
  const logos = await loadLogos(logosDir);
  const errors = [];
  const seenTickers = new Map();
  const seenIsin = new Map();

  for (const logo of logos) {
    const err = (msg) => errors.push(`logos/${logo.slug}: ${msg}`);
    if (!SLUG_RE.test(logo.slug)) err('folder name is not a valid slug (a-z, 0-9, single hyphens)');
    if (removed.has(logo.slug)) err('this slug is in removed.json at the owner\'s request and must not be re-added');
    if (logo.metaError) { err(`meta.json is not valid JSON: ${logo.metaError}`); continue; }
    if (!logo.meta) { err('meta.json is missing'); continue; }
    if (!checkMeta(logo.meta)) {
      for (const e of checkMeta.errors) err(`meta.json ${e.instancePath || '/'} ${e.message}`);
      continue;
    }
    const { meta } = logo;
    if (meta.slug !== logo.slug) err(`meta.json slug "${meta.slug}" does not match folder name`);

    const expected = new Set(meta.variants.map((v) => `${variantFile(logo.slug, v)}.svg`));
    for (const file of logo.files) {
      if (file === 'meta.json') continue;
      if (!file.endsWith('.svg')) { err(`${file}: only .svg files and meta.json belong here (PNG/WebP are generated)`); continue; }
      if (!expected.has(file)) err(`${file}: not listed in meta.json variants`);
    }
    for (const file of expected) {
      if (!logo.files.includes(file)) { err(`${file}: listed in variants but missing`); continue; }
      const full = path.join(logo.dir, file);
      const { size } = await stat(full);
      if (size > MAX_SVG_BYTES) err(`${file}: ${Math.round(size / 1024)} KB, limit is ${MAX_SVG_BYTES / 1024} KB`);
      for (const p of checkSvg(await readFile(full, 'utf8'))) err(`${file}: ${p}`);
    }

    for (const t of meta.tickers ?? []) {
      const key = `${t.exchange}:${t.symbol}`;
      if (seenTickers.has(key)) err(`ticker ${key} is already used by ${seenTickers.get(key)}`);
      else seenTickers.set(key, logo.slug);
    }
    if (meta.isin) {
      if (seenIsin.has(meta.isin)) err(`ISIN ${meta.isin} is already used by ${seenIsin.get(meta.isin)}`);
      else seenIsin.set(meta.isin, logo.slug);
    }
  }
  return { count: logos.length, errors };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { count, errors } = await validate();
  if (errors.length) {
    console.error(errors.join('\n'));
    console.error(`\n${errors.length} problem(s) in ${count} logo folder(s).`);
    process.exit(1);
  }
  console.log(`All ${count} logo folder(s) are valid.`);
}
