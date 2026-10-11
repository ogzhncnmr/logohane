# logohane

[English](README.md)

Şirket logolarını **SVG, PNG ve WebP** formatlarında, basit ve tahmin
edilebilir dosya yollarıyla sunan açık kaynak bir proje. Bir şirket hakkındaki
bilgilerin yanında, entegrasyon listelerinde, borsa uygulamalarında ya da
hangi şirketten bahsettiğinizi göstermeniz gereken her yerde kullanabilirsiniz.

> **Logolar sahiplerinin markalarıdır.** MIT lisansı bu deponun kodunu ve
> meta verilerini kapsar, logoları kapsamaz. Kullanmadan önce
> [uyarı metnini](DISCLAIMER.tr.md) okuyun.

## Kapsam

1. Borsa İstanbul'da (BIST) işlem gören tüm şirketler (devam ediyor)
2. S&P 500 (sırada)
3. Katkılarla eklenen diğer şirketler

## Kullanım

Her logoya **slug** (küçük harfli şirket adı) ile, borsada işlem gören
şirketlere ayrıca **hisse kodu** ve **ISIN** ile erişilir.

```
https://cdn.jsdelivr.net/npm/logohane@latest/dist/svg/<slug>.svg
https://cdn.jsdelivr.net/npm/logohane@latest/dist/png/<boyut>/<slug>.png    # boyut: 64, 128, 256, 512
https://cdn.jsdelivr.net/npm/logohane@latest/dist/webp/<boyut>/<slug>.webp  # boyut: 128, 256, 512

https://cdn.jsdelivr.net/npm/logohane@latest/dist/svg/tickers/<BORSA>/<KOD>.svg
https://cdn.jsdelivr.net/npm/logohane@latest/dist/png/256/tickers/BIST/THYAO.png
https://cdn.jsdelivr.net/npm/logohane@latest/dist/svg/isin/<ISIN>.svg
```

Varyantlar bir ek alır: `<slug>-wordmark.svg` (yazılı logo), `<slug>-dark.svg`
(koyu arka plan için), `<slug>-mono.svg` (tek renk).

Canlı ortamda yolların değişmemesi için ana sürümü sabitleyin (`logohane@1`).

### npm

```bash
npm install logohane
```

Dosyalar `node_modules/logohane/dist/` altındadır. `dist/index.json` her
logonun adını, web sitesini, marka rengini, hisse kodlarını, ISIN'ini,
Wikidata kimliğini ve varyantlarını listeler. `dist/tickers.json` ve
`dist/isin.json` bu kimlikleri slug'a eşler.

### Şirket bilgileri

Logohane yalnızca logo barındırır. Her kaydın bir `wikidata` kimliği vardır;
kuruluş tarihi, merkez, kurucular gibi bilgileri
[Wikidata](https://www.wikidata.org/)'dan (CC0) çekip logonun yanında
gösterebilirsiniz.

## Depo yapısı

```
logos/<slug>/<slug>.svg        kaynak logo (katkıcının eklediği tek dosya)
logos/<slug>/<slug>-dark.svg   isteğe bağlı varyantlar
logos/<slug>/meta.json         ad, web sitesi, kaynak, hisse kodları...
scripts/                       kontrol ve build betikleri
dist/                          sürümde üretilir, depoya eklenmez
```

## Geliştirme

```bash
npm install
npm run validate   # tüm logo klasörlerini kontrol eder
npm run build      # dist/ klasörünü üretir
npm test
```

## Katkı

[CONTRIBUTING.tr.md](CONTRIBUTING.tr.md) dosyasına bakın. Logolar şirketin
kendi resmi kaynağından, değiştirilmeden alınmalıdır.

## Lisans

Kod ve meta veriler: [MIT](LICENSE). Logolar: ilgili şirketlere aittir, bkz.
[DISCLAIMER.tr.md](DISCLAIMER.tr.md).
