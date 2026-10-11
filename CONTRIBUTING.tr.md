# Katkı Rehberi

[English](CONTRIBUTING.md)

## Logo ekleme

1. Logoyu şirketin **resmi** kaynağından bulun: basın kiti, marka sayfası,
   yatırımcı ilişkileri sayfası veya faaliyet raporu. Logoları yeniden
   çizmeyin, renklerini değiştirmeyin ve üçüncü taraf logo sitelerinden almayın.
2. `logos/<slug>/` klasörünü oluşturup şunları ekleyin:
   - `<slug>.svg`, ana logo (zorunlu)
   - isteğe bağlı varyantlar: `<slug>-wordmark.svg`, `<slug>-dark.svg`,
     `<slug>-light.svg`, `<slug>-mono.svg` ya da `<slug>-wordmark-dark.svg`
     gibi birleşimler
   - `meta.json` (aşağıya bakın)
3. `npm run validate` çalıştırıp pull request açın.

PNG ve WebP dosyaları otomatik üretilir, bunları eklemeyin.

## BIST şirketleri için iş listesi

`data/bist.json`, KAP'ta listelenen tüm BIST şirketlerini borsa kodları,
önerilen slug, resmi web sitesi, KAP sayfası ve logosunun eklenip
eklenmediği (`"logo": true/false`) bilgisiyle tutar. Logosu olmayan bir
şirket seçin, logoyu şirketin web sitesindeki basın kiti, marka ya da
yatırımcı ilişkileri sayfasından alın. Bazı şirketler KAP'a bağlı
ortaklıklarının sitelerini de yazmıştır ve listedeki ilk adres her zaman
şirketin kendi sitesi olmayabilir; doğru siteyi seçtiğinizden emin olun. `meta.json` içindeki `name`,
`website` ve `tickers` alanlarını bu listeden doldurabilirsiniz. Önerilen
slug KAP'taki resmi unvandan üretilir; marka adı daha kısaysa (ör.
`akbank`) onu kullanın ve listedeki `slug` alanını da güncelleyin.

Listeyi yenilemek için:

```bash
npm run bist              # yeni şirketleri ekler, kayıtlı web sitelerini korur
npm run bist -- --offline # ağ olmadan sadece "logo" alanlarını günceller
npm run bist -- --refresh # tüm web sitelerini KAP'tan yeniden çeker
```

Logolar KAP'tan veya üçüncü taraf logo servislerinden **alınmaz**, KAP
yalnızca şirketin resmi web sitesini bulmak için kullanılır.

## Slug kuralları

- Yalnızca küçük harf `a-z`, rakam ve tek tire.
- Türkçe karakterler sadeleştirilir: `ç→c ğ→g ı→i ö→o ş→s ü→u`
  (*Türk Hava Yolları* → `turk-hava-yollari`).
- `&` → `and`, `+` → `plus`, baştaki `.` → `dot` (*.NET* → `dotnet`).
- `A.Ş.`, `Inc.`, `Ltd.` gibi şirket ekleri, markanın parçası değilse atılır.

## SVG kuralları

- `viewBox` zorunlu, `<svg>` üzerinde sabit `width`/`height` yok.
- `<script>`, `<image>`, `<foreignObject>`, `<text>` (yazıları path'e
  çevirin), olay öznitelikleri, harici bağlantı, font veya CSS import yok.
- Logonun etrafındaki boşluk kırpılmış olmalı; en fazla 50 KB.

## meta.json

Örnek ve alanlar için [CONTRIBUTING.md](CONTRIBUTING.md#metajson) dosyasına
bakın. `name`, `slug`, `website`, `source`, `variants` ve `updated`
zorunludur. Şema: [schema/meta.schema.json](schema/meta.schema.json). Hisse
kodu, ISIN ve Wikidata kimliğini göndermeden önce resmi bir kaynaktan (BIST
şirketleri için KAP) doğrulayın.

## Kabul etmediklerimiz

Kişisel markalar ve bireyler, siyasi partiler, devlet arması ve amblemleri,
dini semboller ve sahibi kaldırılmasını istemiş logolar (`removed.json`).
