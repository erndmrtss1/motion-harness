# motion: buradan başla

**Bu paket bir motion grafik üretim *sürecidir*.** Kapsadığı adımlar şunlar: kapılar, ölçüm, bağımsız inceleme, raporlar ve onay için durma noktaları (DUR).

**Görsel üslup taşımaz.** Her proje kendi görsel dünyasını (world) look-dev ile kurar. Örnek world'ler yalnız sen açıkça istersen kullanılır.

**Claude Code plugin'i olarak çalışır.** Komutlar `/motion:*` adını taşır; render işini `motion-render` komut satırı aracı yapar.

---

## 1. Kurulum denetimi

Claude Code'da boş bir klasör aç ve şunu yaz:

```
/motion:doctor
```

Tabloda ✗ varsa:

```
/motion:setup
```

Elle kurulum için:

| platform | komut |
|---|---|
| Windows | `powershell -ExecutionPolicy Bypass -File install.ps1` |
| macOS / Linux | `bash install.sh` |

Komutu plugin klasöründe çalıştır, sonra `/motion:doctor`'u tekrarla.

Üretken yapay zekâ kullanacaksan Higgsfield CLI kurulumu şöyle:
1. `npm i -g @higgsfield/cli`
2. Kendi terminalinde `higgsfield auth login`
3. `/motion:doctor`

`.env` dosyası ya da anahtar kopyalamak gerekmez. Bakiye yalnız okunur.

## 2. İlk komut

```
/motion:init              # kısa mülakat (konu, süre, ses, dil, profil, world, bütçe, teslim)
/motion:init brief.md     # brief dosyasının başında ön bilgi (frontmatter) varsa soru sormaz
```

World sorusunda önerilen seçenek **yeni look-dev**'dir.

Ön bilgi alanları `commands/init.md` dosyasında listelidir. Başlıcaları: `konu`, `sure`, `ses`, `dil`, `profil`, `world`, `genai_butce`, `yasaklar`, `teslim`.

## 3. Okuma sırası

1. Bu dosya.
2. Projende `project.md`. `/motion:init` doldurur; §1 brief'in aynen yer aldığı bölümdür.
3. Projende `CLAUDE.md`: bağlayıcı sıra ve daimi kurallar.
4. `skills/motion-core/references/PLAYBOOK.md`: fazlar, kapılar, DUR noktaları, rapor biçimi.
5. `skills/motion-core/references/RULES.md`: SERT ve VARSAYILAN kurallar.
6. `skills/motion-reviewer/SKILL.md`: bağımsız reviewer'ın neye baktığı. §0.6 sekiz madde, UCUZ 11 işaret, karar sözlüğü.
7. Gerektikçe: `MEASURE.md` (ölçüm), `AUDIO.md` (ses), `GENAI.md` (üretken varlık), `skills/motion-world/SKILL.md` (world sözleşmesi), `skills/motion-live/SKILL.md` (canlı profil).

## 4. Akış ve DUR noktaları

Her faz bir rapor ve **DUR** satırıyla biter. DUR'da senden ne beklendiği raporun "Açık kararlar" ya da "Senden gerekenler" bölümünde yazar. Kapı geçerse akış durmadan sürer.

| sıra | komut | ne olur | DUR'da senden beklenen |
|---|---|---|---|
| 1 | `/motion:init` | Proje iskeleti; `project.md` §1–§10, `scenes.json`, `CLAUDE.md`, ledger, `docs/` | Açık kararları cevapla (varsayılanla doldurulan alanlar) |
| 2 | `/motion:faz audio` | Transkript, vuruş haritası (BEATS), shot listesi önerisi, kayma tablosu | Shot sınırlarını onayla |
| 3 | `/motion:faz lookdev` | Gerçekten farklı **3 yön**; ölçümler; bağımsız reviewer (örnek world türevleri elenir) | **Bir yön seç** (ya da birleşim) |
| 4 | `/motion:faz lexicon` | Shot başına nesne sözlüğü; kaynaklı içerik adayları (kaynaktan aynen) | Sözlüğü onayla; aday seç |
| 5 | `/motion:faz P1` (P2, …) | Varyantlar → animatik → reviewer kapısı → tam render → QC → teslim kapısı | İlk perdede animatiği onayla; her perdenin teslimine bak |
| 6 | `/motion:master` | Tek sürekli encode, loudness, dikişler, arşiv, `docs/TESLIM.md`, master kapısı | Teslim dosyalarını onayla |
| 7 | `/motion:promote` | Dersler: world, proje ve paket (öneri dosyası) | Paket önerilerini onayla ya da reddet |
| — | `/motion:gate <birim> <kapı>` | Herhangi bir kapıyı elle yeniden koşar | — |
| — | `/motion:live` | Canlı profil: OBS sayfası, panel, ≥ 60 fps, ≤ 100 ms, düşen kare 0 | Sayfayı OBS'te dene |

**Kapı kuralları:**
- **Taze reviewer.** Her kapıda işi görmemiş yeni bir reviewer açılır. Yalnız çıktıları ve kuralları okur ve kendi yöntemiyle ölçer.
- **Eşikler.** Kapı eşiği full ≥ 7/8, light ≥ 6/8, live ≥ 7/8. UCUZ işaretlerinden biri varsa birim geri döner.
- **Tek düzeltme turu.** Kapı geçmezse bir düzeltme turu yapılır. O da geçmezse **DUR**: render yapılmaz; kontak sayfası ve nedenler sana gelir.
- **Kredi.** Üretken kredi yalnız `project.md` §9 bütçesi içinde harcanır. Tavan aşılacaksa iş durur ve sana sorar.

## 5. Dosyalar nereye gider (proje klasörün)

```
project.md  CLAUDE.md  scenes.json         ← kararlar, kurallar, manifest
world/                                     ← seçilen world (world.json, lessons.md, DECISIONS.md, jsx)
<BİRİM>.dc.html  *.jsx                     ← sahne sayfaları ve kodu
script/                                    ← transkript, BEATS, ses eşlemi
assets/gen/                                ← üretken varlıklar + manifest.json (bütçe defteri)
docs/                                      ← INIT, SOZLUK, KUNYE-*, REVIEWER (reviewer hafızası), RETRO, TESLIM, F*-RAPOR
docs/research/                             ← araştırma çıktıları (atıflı)
out/frames/  out/scenes/  out/master/      ← kareler, sahne videoları, master
out/probe/                                 ← qc / frame-check sonuçları, kontaklar
out/review/  out/measure/                  ← reviewer ve bağımsız ölçüm kanıtları
```

Kullanıcı malzemesi (ses, logo, görsel) yol olarak bağlanır; kopyalanmaz, taşınmaz, silinmez.

## 6. Bir şey ters giderse

| belirti | ne yap |
|---|---|
| `/motion:doctor` ✗ | `/motion:setup`. Hâlâ ✗ ise `install.ps1` / `install.sh` çıktısını oku; "Sık engeller" tablosu `commands/setup.md` içinde |
| `motion-render` bulunamadı | Kurulumdan sonra yeni terminal aç (PATH yenilenir) |
| disk < 40 GB | Render çıkış 6 verir. Yer açmak senin kararın; paket dosya silmez |
| reviewer ajanı bulunamadı | Plugin kurulu mu, `/motion:doctor` ile bak. Komutlar yedek yolu (genel ajan + rol dosyası) kendisi kullanır |
| Bir faz yarıda kesildi | Aynı `/motion:faz …` komutunu ver. Render'lar `--resume` ile kaldığı yerden devam eder |
