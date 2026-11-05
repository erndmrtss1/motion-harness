# KARAR-TARIHI — <PROJE> karar tarihi ve arşivlenen kural metinleri

> **Bu dosya tarihtir (1.4, PLAYBOOK §3.5).** Güncel spec `project.md`'dir; bu dosya bağlayıcı kümenin (çelişki taraması) ve director brief'inin dışındadır.
> - **Faz kararları** (dosyanın sonunda): kullanıcının karar metni **aynen** ve tarihli, `### 11.<faz>` başlığıyla. Güncel özü `project.md`'nin ilgili bölümüne ve §11 tablosuna (id · tarih · öz · durum) yazılır.
> - **Arşivlenen kural metinleri**: `project.md` ya da başka bir bağlayıcı belgede değişen ya da çıkarılan satırın eski hâli **aynen**; yanında geçersiz kılan karar, tarih ve güncel karşılığı. Spec'te üstü çizili satır ya da silinti notu bırakılmaz; eski metin buraya gelir.
> - **Yeni karar:** işe başlamadan önce bu dosyanın **sonuna** (CLAUDE.md "Kararlar önce belgeye"). Önceki girişler düzenlenmez, silinmez; düzeltme yeni girişte yazılır.
> - Uygulama yorumu (ana oturum) karar değildir; karar metninin altında "uygulama notu" olarak ayrı durur.

## Arşivlenen kural metinleri

Girdi biçimi: eski yer · geçersiz kılan karar · tarih · güncel karşılığı (project.md §) → eski metin (aynen).

#### A1 · <belge> §<n> — <konu>

- geçersiz kılan: §11.<faz>-<karar> (<öz>)
- tarih: <YYYY-AA-GG>
- güncel karşılığı: `project.md` §<n>

```text
<eski satır, aynen>
```

## Faz kararları (aynen)

### 11.F0 — F0 kararları (kullanıcı, <YYYY-AA-GG>)

Kullanıcı metni aynen (bağlayıcı):

> <kullanıcının karar metni, harfiyen>

**Uygulama notu (ana oturum; karar değil):**
- <metnin nasıl uygulandığı; eksik ya da belirsiz kalan ayrıntı → açık karar>
- Taşınan metin (aynen): <spec'ten çıkarılan satır, varsa>

<!-- Sonraki kararlar: ### 11.<faz>-karar-<k> — <DUR adı> cevabı: <öz> (kullanıcı, tarih) — KAPALI -->
