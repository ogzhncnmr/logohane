// Generates dist/ from logos/: optimized SVG, and PNG and WebP in two families of
// sizes, plus ticker and ISIN lookup paths and index files. Run `npm run validate` first.
//
//   dist/svg/<name>.svg                     vector logos only
//   dist/png/<N>/<name>.png                 original aspect ratio, longer side N (RATIO_SIZES)
//   dist/png/square/<N>/<name>.png          N x N square (SQUARE_SIZES); uses the symbol if there is one
//   dist/webp/...                           the same as PNG
//
// Raster (PNG) sources are never enlarged beyond MAX_UPSCALE, so a logo whose
// source is small simply has no large sizes; index.json lists the sizes each logo has.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { optimize } from 'svgo';
import { DIST_DIR, LOGOS_DIR, MAX_UPSCALE, RATIO_SIZES, SQUARE_FILL, SQUARE_SIZES, loadLogos, sourceFile, variantFile } from './lib.js';

const SVGO_CONFIG = {
  multipass: true,
  plugins: ['preset-default', 'removeDimensions'],
};

async function writeAll(paths, data) {
  for (const p of paths) {
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, data);
  }
}

/** A loaded source: an optimized SVG string, or a PNG buffer with its size. */
async function loadSource(file) {
  if (file.endsWith('.svg')) return { svg: optimize(await readFile(file, 'utf8'), SVGO_CONFIG).data };
  const png = await readFile(file);
  const { width, height } = await sharp(png).metadata();
  return { png, side: Math.max(width, height) };
}

/** Whether `source` can be drawn with its longer side at `px` without visible enlargement. */
const sharpAt = (source, px) => !!source.svg || px <= source.side * MAX_UPSCALE;

/** Renders `source` so its longer side is `size` px, on a transparent background. */
function render(source, size) {
  let input;
  if (source.svg) {
    // Rasterize at about twice the target size: enough for clean edges, and traced
    // SVGs with large coordinates stay within sharp's pixel limit.
    const vb = source.svg.match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
    const side = vb ? Math.max(Number(vb[1]), Number(vb[2])) : 512;
    // CorelDRAW viewBoxes reach 381157 units, so the density goes well below 72.
    input = sharp(Buffer.from(source.svg), { density: Math.min(2400, Math.max(1, (72 * size * 2) / side)) });
  } else {
    input = sharp(source.png);
  }
  return input.resize(size, size, { fit: 'inside' }).ensureAlpha();
}

/** Renders `source` centered on a transparent `size` x `size` square. */
async function renderSquare(source, size) {
  const inner = Math.round(size * SQUARE_FILL);
  const logo = await render(source, inner).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, gravity: 'center' }]);
}

export async function build({ logosDir = LOGOS_DIR, distDir = DIST_DIR } = {}) {
  await rm(distDir, { recursive: true, force: true });
  const logos = await loadLogos(logosDir);
  const index = [];
  const tickers = {};
  const isins = {};

  for (const { slug, dir, meta } of logos) {
    // Extra lookup names for this logo besides its slug.
    const aliases = [];
    for (const t of meta.tickers ?? []) {
      tickers[`${t.exchange}:${t.symbol}`] = slug;
      aliases.push(`tickers/${t.exchange}/${t.symbol}`);
    }
    if (meta.isin) {
      isins[meta.isin] = slug;
      aliases.push(`isin/${meta.isin}`);
    }

    // Every file is written under its slug name and under each alias,
    // e.g. dist/png/512/turk-hava-yollari.png and dist/png/512/tickers/BIST/THYAO.png.
    const names = (variant) => {
      const suffix = variant === 'default' ? '' : `-${variant}`;
      return [variantFile(slug, variant), ...aliases.map((a) => a + suffix)];
    };
    const out = (variant, sub, ext) => names(variant).map((n) => path.join(distDir, sub, `${n}.${ext}`));

    const files = await readdir(dir);
    const sources = {};
    for (const variant of meta.variants) sources[variant] = await loadSource(path.join(dir, sourceFile(files, slug, variant)));
    const sizes = { ratio: [], square: [] };

    for (const [variant, source] of Object.entries(sources)) {
      if (source.svg) await writeAll(out(variant, 'svg', 'svg'), source.svg);
      for (const size of RATIO_SIZES) {
        if (!sharpAt(source, size)) continue;
        const img = render(source, size);
        await writeAll(out(variant, `png/${size}`, 'png'), await img.clone().png({ compressionLevel: 9 }).toBuffer());
        await writeAll(out(variant, `webp/${size}`, 'webp'), await img.webp({ lossless: true }).toBuffer());
        if (variant === 'default') sizes.ratio.push(size);
      }
    }

    // Squares for the main logo and its dark version, from the symbol when there is one.
    for (const variant of ['default', 'dark']) {
      if (!sources[variant]) continue;
      const symbol = sources[variant === 'default' ? 'symbol' : 'symbol-dark'];
      const source = symbol ?? sources[variant];
      for (const size of SQUARE_SIZES) {
        if (!sharpAt(source, size * SQUARE_FILL)) continue;
        const img = await renderSquare(source, size);
        await writeAll(out(variant, `png/square/${size}`, 'png'), await img.clone().png({ compressionLevel: 9 }).toBuffer());
        await writeAll(out(variant, `webp/square/${size}`, 'webp'), await img.webp({ lossless: true }).toBuffer());
        if (variant === 'default') sizes.square.push(size);
      }
    }

    index.push({
      slug,
      name: meta.name,
      website: meta.website,
      guidelines: meta.guidelines ?? null,
      hex: meta.hex ?? null,
      aliases: meta.aliases ?? [],
      categories: meta.categories ?? [],
      tickers: meta.tickers ?? [],
      isin: meta.isin ?? null,
      wikidata: meta.wikidata ?? null,
      variants: meta.variants,
      vector: !!sources.default.svg,
      traced: meta.traced ?? false,
      sizes,
      updated: meta.updated,
    });
  }

  await mkdir(distDir, { recursive: true });
  await writeFile(path.join(distDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  await writeFile(path.join(distDir, 'tickers.json'), JSON.stringify(tickers, null, 2) + '\n');
  await writeFile(path.join(distDir, 'isin.json'), JSON.stringify(isins, null, 2) + '\n');
  return { count: index.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { count } = await build();
  console.log(`Built ${count} logo(s) into dist/.`);
}
