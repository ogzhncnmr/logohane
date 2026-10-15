# logohane

Şirket logolarını **SVG, PNG ve WebP** formatlarında, basit ve tahmin
edilebilir dosya yollarıyla sunan açık kaynak bir proje. Bir şirket hakkındaki
bilgilerin yanında, entegrasyon listelerinde, borsa uygulamalarında ya da
hangi şirketten bahsettiğinizi göstermeniz gereken her yerde kullanabilirsiniz.

> **Logolar sahiplerinin markalarıdır.** MIT lisansı bu deponun kodunu ve
> meta verilerini kapsar, logoları kapsamaz. Kullanmadan önce
> [uyarı metnini](DISCLAIMER.tr.md) okuyun.

## Kapsam

1. Borsa İstanbul'da (BIST) işlem gören tüm şirketler (tamamlandı)
2. S&P 500 (devam ediyor)
3. Katkılarla eklenen diğer şirketler

## Kullanım

Her logoya **slug** (küçük harfli şirket adı) ile, `meta.json` dosyasında
kayıtlıysa ayrıca **hisse kodu** ve **ISIN** ile erişilir.

**PNG ve WebP** dosyaları GitHub Pages'ten sunulur:

```
https://ogzhncnmr.github.io/logohane/png/<boyut>/<slug>.png           # orijinal oran, uzun kenar: 256, 512, 1024
https://ogzhncnmr.github.io/logohane/png/square/<boyut>/<slug>.png    # kare: 32, 64, 128, 256, 512
https://ogzhncnmr.github.io/logohane/webp/<boyut>/<slug>.webp         # PNG ile aynı boyutlar
https://ogzhncnmr.github.io/logohane/webp/square/<boyut>/<slug>.webp

https://ogzhncnmr.github.io/logohane/png/512/tickers/BIST/THYAO.png
https://ogzhncnmr.github.io/logohane/png/square/128/tickers/BIST/THYAO.png
https://ogzhncnmr.github.io/logohane/png/512/isin/<ISIN>.png
```

**SVG** dosyaları npm paketinde de bulunur; jsDelivr üzerinden sürüm
sabitlenerek kullanılabilir (örneğin `logohane@0.1`):

```
https://cdn.jsdelivr.net/npm/logohane@0.1/dist/svg/<slug>.svg
https://cdn.jsdelivr.net/npm/logohane@0.1/dist/svg/tickers/<BORSA>/<KOD>.svg
https://cdn.jsdelivr.net/npm/logohane@0.1/dist/svg/isin/<ISIN>.svg
```

GitHub Pages her zaman en güncel logoları sunar; adresler sürümden bağımsızdır.
Tüm logoların listesi: `https://ogzhncnmr.github.io/logohane/index.json`.
SVG yalnızca şirketin vektör logosu varsa vardır (`index.json` içindeki
`vector` alanı); PNG ve WebP her logo için vardır.

**Kare** dosyalar logoyu şeffaf bir karenin ortasına yerleştirir (favicon, liste
ikonu, avatar). Şirketin sembolü varsa karede sembol kullanılır, yoksa logonun
tamamı sığdırılır. **Orijinal oranlı** dosyalar logonun kendi en-boy oranını korur.

Varyantlar bir ek alır: `<slug>-symbol` (isimsiz, yalnızca işaret), `<slug>-dark`
(koyu arka plan için), `<slug>-wordmark` (yazılı logo), `<slug>-mono` (tek renk).

Kaynağı yalnızca resim (PNG) olan logolar hiçbir zaman büyütülmez: kaynak küçükse
büyük boyutları üretilmez, böylece bulanık dosya yoktur. Her logonun hangi
boyutlarda olduğu `index.json` içindeki `sizes` alanında yazar
(`{ "ratio": [256, 512, 1024], "square": [32, 64, 128, 256, 512] }`). `vector`
alanı SVG'nin olup olmadığını, `traced` alanı ise SVG'nin resimden otomatik
çizildiğini gösterir.

### npm

```bash
npm install logohane
```

Paket SVG'leri ve dizin dosyalarını içerir (PNG ve WebP yalnızca GitHub
Pages'tedir). Dosyalar `node_modules/logohane/dist/` altındadır. `dist/index.json` her
logonun adını, web sitesini ve varyantlarını; biliniyorsa marka rengini,
hisse kodlarını, ISIN'ini ve Wikidata kimliğini listeler (bilinmeyenler
`null` ya da boştur). `dist/tickers.json` ve `dist/isin.json` bu kimlikleri
slug'a eşler.

### Şirket bilgileri

Logohane şirket bilgisi değil, yalnızca logo barındırır. Bir kaydın
`wikidata` kimliği varsa (bu alan isteğe bağlıdır, `null` olabilir) kuruluş
tarihi, merkez, kurucular gibi bilgileri verileri CC0 lisanslı olan
[Wikidata](https://www.wikidata.org/)'dan çekebilirsiniz. Wikidata gönüllüler
tarafından düzenlendiği için kapsamı ve doğruluğu şirketten şirkete değişir.

## Depo yapısı

```
logos/<slug>/<slug>.svg        kaynak logo (vektör yoksa <slug>.png)
logos/<slug>/<slug>-dark.svg   isteğe bağlı varyantlar
logos/<slug>/meta.json         ad, web sitesi, kaynak, hisse kodları...
scripts/                       kontrol, derleme ve BIST listesi betikleri
data/bist.json                 BIST şirketleri iş listesi (KAP'tan)
dist/                          sürümde üretilir, depoya eklenmez
```

## Geliştirme

```bash
npm install
npm run validate   # tüm logo klasörlerini kontrol eder
npm run build      # dist/ klasörünü üretir
npm run bist       # data/bist.json iş listesini KAP'tan günceller
npm run sp500      # data/sp500.json iş listesini Wikipedia ve Wikidata'dan günceller
npm test
```

## Katkı

[CONTRIBUTING.tr.md](CONTRIBUTING.tr.md) dosyasına bakın. Logolar şirketin
kendi resmi kaynağından, değiştirilmeden alınmalıdır.

## Lisans

Kod ve meta veriler: [MIT](LICENSE). Logolar: ilgili şirketlere aittir, bkz.
[DISCLAIMER.tr.md](DISCLAIMER.tr.md).
