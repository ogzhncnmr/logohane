# logohane

[Türkçe](README.tr.md)

Open-source company logos in **SVG, PNG and WebP**, with simple, predictable
file paths. Use them next to information about a company, in a list of
integrations, in a stock market app or anywhere you need to show which
company you are talking about.

> **Logos are trademarks of their owners.** The MIT license covers this
> repository's code and metadata, not the logos. Read the
> [disclaimer](DISCLAIMER.md) before using them.

## Coverage

1. All companies listed on Borsa Istanbul (BIST), in progress
2. S&P 500, next
3. Any other company, through contributions

## Usage

Every logo is available by its **slug** (lowercase company name) and, for
listed companies, by **ticker** and **ISIN**.

```
https://cdn.jsdelivr.net/npm/logohane@latest/dist/svg/<slug>.svg
https://cdn.jsdelivr.net/npm/logohane@latest/dist/png/<size>/<slug>.png    # size: 64, 128, 256, 512
https://cdn.jsdelivr.net/npm/logohane@latest/dist/webp/<size>/<slug>.webp  # size: 128, 256, 512

https://cdn.jsdelivr.net/npm/logohane@latest/dist/svg/tickers/<EXCHANGE>/<SYMBOL>.svg
https://cdn.jsdelivr.net/npm/logohane@latest/dist/png/256/tickers/BIST/THYAO.png
https://cdn.jsdelivr.net/npm/logohane@latest/dist/svg/isin/<ISIN>.svg
```

Variants add a suffix: `<slug>-wordmark.svg`, `<slug>-dark.svg` (for dark
backgrounds), `<slug>-mono.svg`.

Pin a major version (`logohane@1`) in production so paths never change under you.

### npm

```bash
npm install logohane
```

Files are under `node_modules/logohane/dist/`. `dist/index.json` lists every
logo with its name, website, brand color, tickers, ISIN, Wikidata ID and
variants. `dist/tickers.json` and `dist/isin.json` map identifiers to slugs.

### Company information

Logohane only hosts logos. Each entry has a `wikidata` ID, so you can fetch
facts such as founding date, headquarters or founders from
[Wikidata](https://www.wikidata.org/) (CC0) and show them next to the logo.

## Repository layout

```
logos/<slug>/<slug>.svg        source logo (the only file contributors add)
logos/<slug>/<slug>-dark.svg   optional variants
logos/<slug>/meta.json         name, website, source, tickers, ...
scripts/                       validate and build
dist/                          generated on release, not committed
```

## Development

```bash
npm install
npm run validate   # check every logo folder
npm run build      # generate dist/
npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Logos must come from the company's
own official source, unmodified.

## License

Code and metadata: [MIT](LICENSE). Logos: owned by their respective
companies, see [DISCLAIMER.md](DISCLAIMER.md).
