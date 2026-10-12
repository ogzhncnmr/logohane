import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { validate } from '../scripts/validate.js';
import { build } from '../scripts/build.js';

const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));

test('valid fixture passes validation', async () => {
  const { count, errors } = await validate({ logosDir: path.join(fixtures, 'valid') });
  assert.equal(count, 1);
  assert.deepEqual(errors, []);
});

test('invalid fixture reports each problem', async () => {
  const { errors } = await validate({ logosDir: path.join(fixtures, 'invalid') });
  const text = errors.join('\n');
  for (const expected of ['not a valid slug', 'does not match folder name', 'no viewBox', 'fixed width/height', '<script>', 'raster <image>']) {
    assert.match(text, new RegExp(expected.replace(/[<>]/g, '.')), `missing: ${expected}`);
  }
});

test('build writes every format, size and alias', async (t) => {
  const distDir = mkdtempSync(path.join(tmpdir(), 'logohane-'));
  t.after(() => rmSync(distDir, { recursive: true, force: true }));
  const { count } = await build({ logosDir: path.join(fixtures, 'valid'), distDir });
  assert.equal(count, 1);
  const expected = [
    'svg/example-co.svg', 'svg/example-co-dark.svg', 'svg/tickers/BIST/EXMPL.svg', 'svg/isin/TREEXMP00012.svg',
    'png/256/example-co.png', 'png/1024/example-co.png', 'png/512/tickers/BIST/EXMPL.png', 'png/512/tickers/BIST/EXMPL-dark.png',
    'png/square/32/example-co.png', 'png/square/512/tickers/BIST/EXMPL.png', 'png/square/128/example-co-dark.png',
    'webp/256/example-co.webp', 'webp/1024/isin/TREEXMP00012.webp', 'webp/square/64/isin/TREEXMP00012.webp',
    'index.json', 'tickers.json', 'isin.json',
  ];
  for (const f of expected) assert.ok(existsSync(path.join(distDir, f)), `missing dist/${f}`);

  const { width, height, hasAlpha } = await sharp(path.join(distDir, 'png/256/example-co.png')).metadata();
  assert.equal(Math.max(width, height), 256);
  assert.ok(hasAlpha);
  const square = await sharp(path.join(distDir, 'png/square/64/example-co.png')).metadata();
  assert.deepEqual([square.width, square.height], [64, 64]);
  assert.deepEqual(JSON.parse(readFileSync(path.join(distDir, 'tickers.json'))), { 'BIST:EXMPL': 'example-co' });
});

test('PNG sources are validated and build to PNG/WebP only', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'logohane-png-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const logosDir = path.join(root, 'logos');
  const dir = path.join(logosDir, 'png-co');
  mkdirSync(dir, { recursive: true });
  // 300x100 red bar centered on a transparent canvas.
  await sharp({ create: { width: 320, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: { create: { width: 300, height: 100, channels: 4, background: '#e30a17' } }, left: 10, top: 10 }])
    .png().toFile(path.join(dir, 'png-co.png'));
  writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
    name: 'PNG Co', slug: 'png-co', website: 'https://example.com', source: 'https://example.com',
    tickers: [{ exchange: 'BIST', symbol: 'PNGCO' }], variants: ['default'], updated: '2026-10-12',
  }));

  assert.deepEqual((await validate({ logosDir, root })).errors, []);

  const distDir = path.join(root, 'dist');
  await build({ logosDir, distDir });
  // The 320 px source is never enlarged: no 512/1024 px files, no 512 px square.
  assert.ok(existsSync(path.join(distDir, 'png/256/png-co.png')));
  assert.ok(!existsSync(path.join(distDir, 'png/512/png-co.png')));
  assert.ok(existsSync(path.join(distDir, 'webp/square/256/tickers/BIST/PNGCO.webp')));
  assert.ok(!existsSync(path.join(distDir, 'png/square/512/png-co.png')));
  assert.ok(!existsSync(path.join(distDir, 'svg/png-co.svg')));
  const entry = JSON.parse(readFileSync(path.join(distDir, 'index.json')))[0];
  assert.equal(entry.vector, false);
  assert.deepEqual(entry.sizes, { ratio: [256], square: [32, 64, 128, 256] });

  // Opaque background and too-small images are rejected.
  await sharp({ create: { width: 100, height: 40, channels: 4, background: '#ffffff' } }).png().toFile(path.join(dir, 'png-co.png'));
  const text = (await validate({ logosDir, root })).errors.join('\n');
  assert.match(text, /at least 128px/);
  assert.match(text, /background is not transparent/);
});
