// Image checks used by validate.js (and by the local logo tools): rendering an
// SVG at a given size and finding logos that do not work on a light background.
import sharp from 'sharp';

export const WHITE = 225; // luminance above which a pixel counts as white
export const WHITE_PARTS = 'white parts, made for dark backgrounds';

export const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export const viewBoxOf = (svg) => svg.match(/<svg[^>]*\sviewBox="([^"]+)"/i)?.[1].trim().split(/[\s,]+/).map(Number) ?? null;

export const isSvg = (buffer) => /<svg[\s>]|<\?xml/i.test(buffer.subarray(0, 1024).toString('utf8'));

/**
 * Density that draws an SVG at about `size` px: sharp sizes an SVG by its viewBox,
 * so a fixed density makes a huge viewBox (CorelDRAW's 381157 units) exceed the
 * pixel limit and a tiny one (24 units) blurry.
 */
export function svgDensity(svg, size) {
  const vb = viewBoxOf(svg);
  const side = vb ? Math.max(vb[2], vb[3]) : 0;
  return side > 0 ? Math.min(Math.max((72 * size) / side, 1), 10000) : 300;
}

/** Renders an SVG string so its longer side is about `size` px. */
export function renderSvg(svg, size = 512) {
  return sharp(Buffer.from(svg), { density: svgDensity(svg, size) }).resize(size, size, { fit: 'inside' }).png().toBuffer();
}

export async function rgba(png, size) {
  const img = sharp(png).ensureAlpha();
  if (size) img.resize(size, size, { fit: 'inside' });
  return img.raw().toBuffer({ resolveWithObject: true });
}

/**
 * Problems that make a logo unusable on a light background: nothing visible, an
 * all-white logo, or white parts touching the transparent background that leave
 * only a narrow strip visible on white (white text next to a colored icon).
 * White inside a colored shape (BİM, Teknosa) never touches the background, and a
 * thin white outline around a colored logo (Baydöner) still leaves it all visible.
 */
export async function lightBackgroundProblems(png) {
  const { data, info } = await rgba(png, 256);
  const { width: w, height: h } = info;
  const alpha = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(y * w + x) * 4 + 3]);
  let visible = 0;
  let total = 0;
  let edge = 0;
  let whiteEdge = 0;
  let [minX, maxX, visMinX, visMaxX] = [w, -1, w, -1]; // all opaque / non-white columns
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 128) continue;
      const l = lum(data[i], data[i + 1], data[i + 2]);
      visible++;
      total += l;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      if (l <= WHITE) {
        visMinX = Math.min(visMinX, x);
        visMaxX = Math.max(visMaxX, x);
      }
      if (alpha(x - 1, y) < 128 || alpha(x + 1, y) < 128 || alpha(x, y - 1) < 128 || alpha(x, y + 1) < 128) {
        edge++;
        if (l > WHITE) whiteEdge++;
      }
    }
  }
  if (!visible) return ['blank'];
  const visibleWidth = visMaxX < 0 ? 0 : (visMaxX - visMinX + 1) / (maxX - minX + 1);
  if (total / visible > WHITE || (whiteEdge / edge > 0.3 && visibleWidth < 0.5)) return [WHITE_PARTS];
  return [];
}
