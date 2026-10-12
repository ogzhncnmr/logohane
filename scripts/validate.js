// Checks every logo folder against the rules in CONTRIBUTING.md.
// Exits with code 1 and prints each problem when any check fails.
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import sharp from 'sharp';
import { LOGOS_DIR, MAX_PNG_BYTES, MAX_SVG_BYTES, MIN_PNG_SIDE, MIN_SYMBOL_SIDE, ROOT, SLUG_RE, loadLogos, loadRemoved, variantFile } from './lib.js';
import { lightBackgroundProblems, renderSvg } from './image-checks.js';

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

export async function checkPng(buffer, minSide = MIN_PNG_SIDE) {
  let meta;
  try { meta = await sharp(buffer).metadata(); } catch { return ['is not a readable image']; }
  if (meta.format !== 'png') return [`is ${meta.format}, not PNG`];
  const problems = [];
  if (Math.max(meta.width, meta.height) < minSide) problems.push(`is ${meta.width}x${meta.height}px; the longer side must be at least ${minSide}px`);
  if (!meta.hasAlpha) problems.push('has no transparency');
  else {
    // Fully opaque is fine for a logo that is itself a colored box (BİM, Teknosa), but
    // not for one printed on a white or light background: check the outermost pixels.
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = false;
    for (let i = 3; i < data.length && !transparent; i += 4) transparent = data[i] < 16;
    if (!transparent) {
      const { width: w, height: h } = info;
      let border = 0;
      let light = 0;
      for (let x = 0; x < w; x++) {
        for (const y of [0, h - 1]) {
          const i = (y * w + x) * 4;
          border++;
          if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] > 235) light++;
        }
      }
      for (let y = 0; y < h; y++) {
        for (const x of [0, w - 1]) {
          const i = (y * w + x) * 4;
          border++;
          if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] > 235) light++;
        }
      }
      if (light / border > 0.5) problems.push('background is not transparent');
    }
  }
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

    const names = new Set(meta.variants.map((v) => variantFile(logo.slug, v)));
    for (const file of logo.files) {
      if (file === 'meta.json') continue;
      const ext = path.extname(file);
      if (ext !== '.svg' && ext !== '.png') { err(`${file}: only .svg or .png sources and meta.json belong here (other formats are generated)`); continue; }
      if (!names.has(path.basename(file, ext))) err(`${file}: not listed in meta.json variants`);
    }
    for (const name of names) {
      if (logo.files.includes(`${name}.svg`) && logo.files.includes(`${name}.png`)) { err(`${name}: has both .svg and .png; keep only the .svg`); continue; }
      const file = [`${name}.svg`, `${name}.png`].find((f) => logo.files.includes(f));
      if (!file) { err(`${name}.svg: listed in variants but missing`); continue; }
      const full = path.join(logo.dir, file);
      const { size } = await stat(full);
      let rendered;
      if (file.endsWith('.svg')) {
        if (size > MAX_SVG_BYTES) err(`${file}: ${Math.round(size / 1024)} KB, limit is ${MAX_SVG_BYTES / 1024} KB`);
        const svg = await readFile(full, 'utf8');
        const problems = checkSvg(svg);
        for (const p of problems) err(`${file}: ${p}`);
        if (!problems.length) rendered = await renderSvg(svg, 256).catch(() => err(`${file}: cannot be rendered`));
      } else {
        if (size > MAX_PNG_BYTES) err(`${file}: ${Math.round(size / 1024)} KB, limit is ${MAX_PNG_BYTES / 1024} KB`);
        rendered = await readFile(full);
        const minSide = name.slice(logo.slug.length).startsWith('-symbol') ? MIN_SYMBOL_SIDE : MIN_PNG_SIDE;
        for (const p of await checkPng(rendered, minSide)) err(`${file}: ${p}`);
      }
      // Dark variants are meant for dark backgrounds; everything else must show on white.
      if (rendered && !/(^|-)dark$/.test(name.slice(logo.slug.length))) {
        for (const p of await lightBackgroundProblems(rendered)) err(`${file}: ${p} (run npm run process)`);
      }
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { count, errors } = await validate();
  if (errors.length) {
    console.error(errors.join('\n'));
    console.error(`\n${errors.length} problem(s) in ${count} logo folder(s).`);
    process.exit(1);
  }
  console.log(`All ${count} logo folder(s) are valid.`);
}
