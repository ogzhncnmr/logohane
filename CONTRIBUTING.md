# Contributing

[Türkçe](CONTRIBUTING.tr.md)

## Adding a logo

1. Find the logo on the company's **official** source: press kit, brand
   page, investor relations page or annual report. Do not redraw, recolor or
   trace logos, and do not take them from third-party logo sites.
2. Create `logos/<slug>/` and add:
   - `<slug>.svg`, the main logo (required)
   - optional variants: `<slug>-wordmark.svg`, `<slug>-dark.svg`,
     `<slug>-light.svg`, `<slug>-mono.svg`, or combinations such as
     `<slug>-wordmark-dark.svg`
   - `meta.json` (see below)
3. Run `npm run validate` and open a pull request.

PNG and WebP files are generated automatically. Do not add them.

## BIST to-do list

`data/bist.json` lists every BIST company on KAP with its tickers, a
suggested slug, its official website(s), its KAP page and whether its logo
has been added (`"logo": true/false`). Pick a company without a logo and
take the logo from the press kit, brand or investor relations page on its
website. Some companies also list their subsidiaries' sites on KAP, so the
first address is not always the company's own; make sure you pick the right
one. You can copy `name`, `website` and `tickers` into `meta.json` from
this list. The suggested slug is derived from the legal name on KAP; if the
brand name is shorter (for example `akbank`), use that and update the
`slug` field in the list too.

To refresh the list:

```bash
npm run bist              # add new companies, keep cached websites
npm run bist -- --offline # only update the "logo" flags, no network
npm run bist -- --refresh # re-fetch every website from KAP
```

Logos are **never** taken from KAP or third-party logo services. KAP is only
used to find each company's official website.

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
