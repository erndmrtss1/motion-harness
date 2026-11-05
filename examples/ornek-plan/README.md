# ornek-plan — `motion-render plan-check` örneği

8 saniyelik, iki shot'lık, iki cümlelik uydurma bir olay planı (kelimeler yer tutucu). Storyboard'dan önce, render olmadan sayılır.

```bash
motion-render plan-check examples/ornek-plan/events.json --rules examples/ornek-plan/kurallar.json --fps 60
```

Beklenen: kusur 0, uyarı 0 (çıkış 0). Bir kusuru görmek için `e02` kaleminin `out.t` değerini `2.0` yapın (alet evreleri sıralı değil) ya da
`e06` girişini `"dur": 0.2` yapın (giriş < 0,4 s). Şema: `render/lib/plan-check.mjs` başlığı; kurallar: proje world.json `plan` bloğu ‖ `--rules`.
