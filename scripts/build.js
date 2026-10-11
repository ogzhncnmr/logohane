// Generates dist/ from logos/: optimized SVG, PNG and WebP in several sizes,
// ticker and ISIN lookup paths, and index files. Run `npm run validate` first.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { optimize } from 'svgo';
import { DIST_DIR, LOGOS_DIR, PNG_SIZES, WEBP_SIZES, loadLogos, variantFile } from './lib.js';

const SVGO_CONFIG = {
  multipass: true,
  plugins: [
    { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
    'removeDimensions',
  ],
};

async function writeAll(paths, data) {
  for (const p of paths) {
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, data);
  }
}

/** Renders an SVG so its longer side is `size` px, keeping a transparent background. */
function render(svg, size) {
  return sharp(Buffer.from(svg), { density: 600 })
    .resize(size, size, { fit: 'inside' })
    .ensureAlpha();
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
    // e.g. dist/png/256/turk-hava-yollari.png and dist/png/256/tickers/BIST/THYAO.png.
    const names = (variant) => {
      const suffix = variant === 'default' ? '' : `-${variant}`;
      return [variantFile(slug, variant), ...aliases.map((a) => a + suffix)];
    };

    for (const variant of meta.variants) {
      const raw = await readFile(path.join(dir, `${variantFile(slug, variant)}.svg`), 'utf8');
      const svg = optimize(raw, SVGO_CONFIG).data;
      const out = (sub, ext) => names(variant).map((n) => path.join(distDir, sub, `${n}.${ext}`));

      await writeAll(out('svg', 'svg'), svg);
      for (const size of PNG_SIZES) {
        await writeAll(out(`png/${size}`, 'png'), await render(svg, size).png({ compressionLevel: 9 }).toBuffer());
      }
      for (const size of WEBP_SIZES) {
        await writeAll(out(`webp/${size}`, 'webp'), await render(svg, size).webp({ lossless: true }).toBuffer());
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
      updated: meta.updated,
    });
  }

  await mkdir(distDir, { recursive: true });
  await writeFile(path.join(distDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  await writeFile(path.join(distDir, 'tickers.json'), JSON.stringify(tickers, null, 2) + '\n');
  await writeFile(path.join(distDir, 'isin.json'), JSON.stringify(isins, null, 2) + '\n');
  return { count: index.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { count } = await build();
  console.log(`Built ${count} logo(s) into dist/.`);
}
