import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { validate } from '../scripts/validate.js';
import { build } from '../scripts/build.js';

const fixtures = new URL('./fixtures/', import.meta.url).pathname;

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
    'png/64/example-co.png', 'png/512/example-co.png', 'png/256/tickers/BIST/EXMPL.png', 'png/256/tickers/BIST/EXMPL-dark.png',
    'webp/128/example-co.webp', 'webp/512/isin/TREEXMP00012.webp',
    'index.json', 'tickers.json', 'isin.json',
  ];
  for (const f of expected) assert.ok(existsSync(path.join(distDir, f)), `missing dist/${f}`);

  const { width, height, hasAlpha } = await sharp(path.join(distDir, 'png/256/example-co.png')).metadata();
  assert.equal(Math.max(width, height), 256);
  assert.ok(hasAlpha);
  assert.deepEqual(JSON.parse(readFileSync(path.join(distDir, 'tickers.json'))), { 'BIST:EXMPL': 'example-co' });
});
