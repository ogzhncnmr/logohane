import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LOGOS_DIR = path.join(ROOT, 'logos');
export const DIST_DIR = path.join(ROOT, 'dist');

// Output sizes in px, for PNG and WebP alike.
// Square: the logo (its symbol, if it has one) centered on a transparent square.
export const SQUARE_SIZES = [32, 64, 128, 256, 512];
// Original aspect ratio: the longer side is this many px.
export const RATIO_SIZES = [256, 512, 1024];
// Share of a square taken by the logo's longer side; the rest is margin.
export const SQUARE_FILL = 0.8;
// A raster source is used up to this much enlargement, so no output is blurry.
export const MAX_UPSCALE = 1.1;
export const MAX_SVG_BYTES = 50 * 1024;
// PNG sources are only for logos with no official vector version.
export const MAX_PNG_BYTES = 1024 * 1024;
export const MIN_PNG_SIDE = 128; // smaller sources only get the sizes they can fill (see build.js)
// Symbols are used small (lists, avatars, ticker icons), so a smaller source is enough.
export const MIN_SYMBOL_SIDE = 128;

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** File name (without extension) for a variant: "default" -> slug, others -> slug-variant. */
export function variantFile(slug, variant) {
  return variant === 'default' ? slug : `${slug}-${variant}`;
}

/** Source file of a variant: "<name>.svg" when present, otherwise "<name>.png", or null. */
export function sourceFile(files, slug, variant) {
  const name = variantFile(slug, variant);
  return [`${name}.svg`, `${name}.png`].find((f) => files.includes(f)) ?? null;
}

/** Reads every logo folder under logos/ and returns { slug, dir, meta, files }. */
export async function loadLogos(logosDir = LOGOS_DIR) {
  if (!existsSync(logosDir)) return [];
  const entries = await readdir(logosDir, { withFileTypes: true });
  const logos = [];
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const dir = path.join(logosDir, entry.name);
    const files = (await readdir(dir)).sort();
    let meta = null;
    let metaError = null;
    if (files.includes('meta.json')) {
      try {
        meta = JSON.parse(await readFile(path.join(dir, 'meta.json'), 'utf8'));
      } catch (err) {
        metaError = err.message;
      }
    }
    logos.push({ slug: entry.name, dir, meta, metaError, files });
  }
  return logos;
}

export async function loadRemoved(root = ROOT) {
  const file = path.join(root, 'removed.json');
  if (!existsSync(file)) return [];
  return JSON.parse(await readFile(file, 'utf8')).map((r) => r.slug);
}
