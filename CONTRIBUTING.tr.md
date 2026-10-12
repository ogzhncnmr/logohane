# Katkı Rehberi

[English](CONTRIBUTING.md)

## Logo ekleme

1. Logoyu şirketin **resmi** kaynağından bulun: kendi web sitesi, basın kiti,
   marka sayfası, yatırımcı ilişkileri sayfası veya faaliyet raporu. Logoları
   yeniden çizmeyin, renklerini değiştirmeyin ve üçüncü taraf logo
   sitelerinden almayın.
2. `logos/<slug>/` klasörünü oluşturup şunları ekleyin:
   - `<slug>.svg`, ana logo. Şirketin resmi bir vektör logosu yoksa bunun
     yerine `<slug>.png` (aşağıdaki PNG kurallarına bakın).
   - isteğe bağlı varyantlar: `<slug>-wordmark.svg`, `<slug>-dark.svg`,
     `<slug>-light.svg`, `<slug>-mono.svg` ya da `<slug>-wordmark-dark.svg`
     gibi birleşimler
   - `meta.json` (aşağıya bakın)
3. `npm run validate` çalıştırıp pull request açın.

Diğer formatlar otomatik üretilir: SVG kaynaktan SVG, PNG ve WebP; PNG
kaynaktan PNG ve WebP. Bunları ayrıca eklemeyin.

## BIST iş listesi

`data/bist.json`, KAP'taki tüm BIST şirketlerini hisse kodları, önerilen
slug, resmi web siteleri, KAP sayfası ve logosunun eklenip eklenmediği
(`"logo": true/false`) bilgisiyle listeler. Logosu olmayan bir şirket seçin ve
logoyu şirketin web sitesinden, basın kitinden, marka ya da yatırımcı
ilişkileri sayfasından alın. Bazı şirketler KAP'a bağlı ortaklıklarının
sitelerini de yazmıştır; ilk adres her zaman şirketin kendi sitesi değildir,
doğrusunu seçtiğinizden emin olun. `meta.json` içindeki `name`, `website` ve
`tickers` alanlarını bu listeden kopyalayabilirsiniz. Önerilen slug KAP'taki
resmi unvandan türetilir; marka adı daha kısaysa (örneğin `akbank`) onu
kullanın ve listedeki `slug` alanını da güncelleyin.

Şirketin web sitesi dışında iki KAP kaynağı da resmidir: şirketin KAP
sayfasına kendi yüklediği logo ve KAP'a gönderdiği faaliyet ya da entegre
raporları. Logolar üçüncü taraf logo servislerinden **alınmaz**.

Listeyi yenilemek için:

```bash
npm run bist              # yeni şirketleri ekler, kayıtlı web sitelerini korur
npm run bist -- --offline # ağ olmadan sadece "logo" alanlarını günceller
npm run bist -- --refresh # tüm web sitelerini KAP'tan yeniden çeker
```

## Sembol sürümü

"Sembol + isim" logolarında ana dosya ikisini birden içerir; `<slug>-symbol`
yalnızca sembolü taşır (koyu sürüm varsa `<slug>-symbol-dark` de). PNG
sembollerde uzun kenar en az 128 piksel olmalıdır.

## Koyu ve çizilmiş logolar

Koyu zemin için yapılmış tamamen beyaz bir logonun ana dosyası koyu renge
boyanır, beyaz özgün hali `<slug>-dark` olarak saklanır; renkli bir sembolün
yanındaki beyaz yazı için de aynısı geçerlidir. Bulanık PNG logoların bir kısmı,
sonuç aslına çok yakın olduğunda resimden SVG olarak yeniden çizilmiştir;
bunlar resmi vektör olmadığı için `meta.json` içinde `"traced": true` ile
işaretlidir.

## Çıktı boyutları

Derleme her logoyu kare (32, 64, 128, 256, 512) ve orijinal oranlı (uzun kenar
256, 512, 1024) PNG ve WebP olarak üretir. Resim kaynaklar en fazla %10
büyütülür; kaynağın yetmediği boyutlar üretilmez.

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

## PNG kuralları

Yalnızca şirketin resmi bir vektör logosu yoksa kullanılır.

- Şeffaf arka plan; beyaz ya da renkli bir zemin üzerine basılmış logo olmaz.
- Uzun kenar en az 128 piksel, dosya en fazla 1 MB.
- Boş kenarlar kırpılmış olmalı.

## meta.json

Örnek ve alanlar için [CONTRIBUTING.md](CONTRIBUTING.md#metajson) dosyasına
bakın. `name`, `slug`, `website`, `source`, `variants` ve `updated`
zorunludur. Şema: [schema/meta.schema.json](schema/meta.schema.json). Hisse
kodu, ISIN ve Wikidata kimliğini göndermeden önce resmi bir kaynaktan (BIST
şirketleri için KAP) doğrulayın.

## Kabul etmediklerimiz

Kişisel markalar ve bireyler, siyasi partiler, devlet arması ve amblemleri,
dini semboller ve sahibi kaldırılmasını istemiş logolar (`removed.json`).
