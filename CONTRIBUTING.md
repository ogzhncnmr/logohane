# Contributing

[Türkçe](CONTRIBUTING.tr.md)

## Adding a logo

1. Find the logo on the company's **official** source: its own website,
   press kit, brand page, investor relations page or annual report. Do not
   redraw, recolor or trace logos, and do not take them from third-party logo
   sites.
2. Create `logos/<slug>/` and add:
   - `<slug>.svg`, the main logo. If the company has no official vector logo,
     use `<slug>.png` instead (see PNG rules below).
   - optional variants: `<slug>-wordmark.svg`, `<slug>-dark.svg`,
     `<slug>-light.svg`, `<slug>-mono.svg`, or combinations such as
     `<slug>-wordmark-dark.svg`
   - `meta.json` (see below)
3. Run `npm run validate` and open a pull request.

Other formats are generated: SVG sources give SVG, PNG and WebP; PNG sources
give PNG and WebP. Do not add them yourself.

## BIST to-do list

`data/bist.json` lists every BIST company on KAP with its tickers, a
suggested slug, its official website(s), its KAP page and whether its logo
has been added (`"logo": true/false`). Pick a company without a logo and
take the logo from its website, press kit, brand or investor relations page.
Some companies also list their subsidiaries' sites on KAP, so the first
address is not always the company's own; make sure you pick the right one.
You can copy `name`, `website` and `tickers` into `meta.json` from this
list. The suggested slug is derived from the legal name on KAP; if the brand
name is shorter (for example `akbank`), use that and update the `slug`
field in the list too.

Besides the company's website, two KAP sources are official too: the logo a
company uploads to its own KAP page, and the annual or integrated reports it
files on KAP. Logos are **never** taken from third-party logo services.

To refresh the list:

```bash
npm run bist              # add new companies, keep cached websites
npm run bist -- --offline # only update the "logo" flags, no network
npm run bist -- --refresh # re-fetch every website from KAP
```

## Symbol variant

For "symbol + name" logos the main file keeps both; `<slug>-symbol` holds only
the symbol (plus `<slug>-symbol-dark` when there is a dark version). PNG
symbols need a longer side of at least 128 px.

## Dark and traced logos

An all-white logo made for dark backgrounds gets a dark main version, and the
original white one is kept as `<slug>-dark`; the same goes for white text next
to a colored symbol. Some blurry PNG logos were redrawn as SVG from the raster
when the result matched the original closely; they are marked `"traced": true`
in `meta.json`, since they are not official vectors.

## Output sizes

The build writes every logo as square (32, 64, 128, 256, 512) and original
aspect ratio (longer side 256, 512, 1024) PNG and WebP. Raster sources are
enlarged by at most 10%; sizes the source cannot fill are not written.

## Slug rules

- Lowercase `a-z`, digits and single hyphens only.
- Turkish characters are simplified: `ç→c ğ→g ı→i ö→o ş→s ü→u`
  (*Türk Hava Yolları* → `turk-hava-yollari`).
- `&` → `and`, `+` → `plus`, a leading `.` → `dot` (*.NET* → `dotnet`).
- Drop legal suffixes such as `A.Ş.`, `Inc.`, `Ltd.`, unless they are part of
  the brand name.

## SVG rules

- `viewBox` required, no fixed `width`/`height` on `<svg>`.
- No `<script>`, `<image>`, `<foreignObject>`, `<text>` (convert text to
  paths), event handlers, external links, fonts or CSS imports.
- Trim empty space around the logo; at most 50 KB.

## PNG rules

Only when the company has no official vector logo.

- Transparent background; no logos printed on a white or colored box.
- Longer side at least 128 px, file at most 1 MB.
- Empty edges trimmed.

## meta.json

```json
{
  "name": "Türk Hava Yolları",
  "slug": "turk-hava-yollari",
  "website": "https://www.turkishairlines.com",
  "source": "https://<official page the logo was taken from>",
  "guidelines": "https://<brand guidelines, if published>",
  "hex": "C70A0C",
  "aliases": ["Turkish Airlines", "THY"],
  "categories": ["airlines"],
  "tickers": [{ "exchange": "BIST", "symbol": "THYAO" }],
  "isin": "TRATHYAO91M5",
  "wikidata": null,
  "variants": ["default"],
  "updated": "2026-10-11"
}
```

`name`, `slug`, `website`, `source`, `variants` and `updated` are required.
The full schema is in [schema/meta.schema.json](schema/meta.schema.json).
Check tickers, ISIN and Wikidata ID against an official source (KAP for BIST
companies) before submitting.

## What we don't accept

Personal brands and individuals, political parties, state emblems and coats
of arms, religious symbols, and any logo whose owner asked for removal (listed
in `removed.json`).
