import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LOGOS_DIR = path.join(ROOT, 'logos');
export const DIST_DIR = path.join(ROOT, 'dist');

export const PNG_SIZES = [64, 128, 256, 512];
export const WEBP_SIZES = [128, 256, 512];
export const MAX_SVG_BYTES = 50 * 1024;

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** File name (without extension) for a variant: "default" -> slug, others -> slug-variant. */
export function variantFile(slug, variant) {
  return variant === 'default' ? slug : `${slug}-${variant}`;
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
