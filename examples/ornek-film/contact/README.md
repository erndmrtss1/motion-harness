# contact/ — kontak sayfası örnekleri (yer tutucu)

Bu klasör şimdilik boştur.

**Neden boş.** Kaynak projenin kareleri, kontak sayfaları, kırpımları ve videoları pakete **girmez** (karar D1-13). Bunlar müşteri içeriği ve kaynak projenin görsel üslubunu taşır. Ayrıca pakette örnek olarak durmaları yaratıcılık kuralına (UCUZ #11) aykırıdır.

**Ne gelecek.** Kontak biçim örnekleri H4 değerlendirme (eval) projelerinin kendi çıktılarından üretilip buraya konacak. Örnekler kaynak proje karesi içermeyecek:

| dosya (H4) | komut | gösterdiği |
|---|---|---|
| `<eval>-contact.png` | `motion-render contact <id>` | perde kontağı: her N. kare, 8 sütun, etikette Ø luma % / dolu % |
| `<eval>-varyant.png` | `motion-render contact sheet … a.png=a b.png=b c.png=c` | shot başına 3 varyant still |
| `<eval>-fc-sheet.png` | `motion-render frame-check <id> --sheet` | frame-check kanıt sayfası (kırpım, şerit, `f · t s · ölçü` etiketi) |
| `<eval>-lookdev.png` | `motion-render contact sheet …` | look-dev: üç yön × üç kilit an |
| `<eval>-once-sonra.png` | `motion-render contact sheet …` | düzeltme öncesi/sonrası 1:1 kırpım |

O zamana kadar biçim tarifleri şuralardadır:

- `skills/motion-core/references/MEASURE.md` (kontak ve frame-check);
- `skills/motion-core/references/PLAYBOOK.md` §4.3 ve §4.5 (look-dev ve varyant sayfaları).
