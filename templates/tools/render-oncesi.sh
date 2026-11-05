#!/usr/bin/env bash
# tools/render-oncesi.sh — render / encode öncesi makine denetimi (motion paketi şablonu; motion-render init kopyalar). Yalnız okuma. Linux / macOS (bash 3.2+).
#   bash tools/render-oncesi.sh [--klon-head <sha|etiket>] [--klon <dizin>] [--izinli a/,b.mjs] [--sessiz] [--surecsiz]
# Denetimler (çıkış 0 temiz · 1 engel · 2 kullanım):
#   (i)  kurulu harness klonu (motion-render'ın koştuğu dizin) HEAD'i beklenen tabanda mı ve ağacı temiz mi. İzinli yollardaki
#        değişiklik uyarıdır (render/probe/encode yoluna girmeyen dosyalar), dışındaki her değişiklik engel.
#        Taban: --klon-head ya da proje dosyası tools/harness-taban.txt (ilk dolu satır: SHA ya da etiket; '#' yorum). Taban yoksa (i) bilgi olarak atlanır.
#        Klon: --klon → MOTION_HARNESS_CLONE → 'motion-render --where' → 'npm prefix -g' bağı (lib/node_modules/@motion/harness → <klon>/render).
#   (ii) başka bir Playwright Chromium (ms-playwright yolu) / chrome-headless-shell / ffmpeg süreci var mı (ps). Kullanıcının kendi Chrome'u engel değildir.
# Çıktı: son satır tek satırlık özet; engel varsa öncesinde süreç satırları (kullanıcı dizini ~ ile maskeli; --sessiz ile basılmaz).
# --surecsiz: (ii) atlanır (yalnız klon denetimi; tanı ve test için — render kapısı olarak kullanılmaz). Windows: tools/render-oncesi.ps1.
set -u
KH=""; KLON=""; IZ=""; SESSIZ=0; SURECSIZ=0
while [ $# -gt 0 ]; do
  case "$1" in
    --klon-head|--klon|--izinli)
      [ $# -ge 2 ] || { echo "render-oncesi: $1 değer ister" >&2; exit 2; }
      case "$1" in --klon-head) KH="$2" ;; --klon) KLON="$2" ;; --izinli) IZ="$2" ;; esac; shift 2 ;;
    --sessiz) SESSIZ=1; shift ;;
    --surecsiz) SURECSIZ=1; shift ;;
    -h|--help) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "render-oncesi: bilinmeyen argüman: $1 (--help)" >&2; exit 2 ;;
  esac
done
PROJE="$(cd "$(dirname "$0")/.." && pwd)"
TILDE='~'   # değişkenle: yerine koyma metninde ~ genişlemesin
maskele() { local s="$1"; if [ -n "${HOME:-}" ] && [ "$HOME" != "/" ]; then s="${s//"$HOME"/$TILDE}"; fi; printf '%s' "$s"; }

# ── (i) kurulu klon ─────────────────────────────────────────────────────────────
KDIR=""; KYOL="bulunamadı"
if [ -n "$KLON" ]; then KDIR="$KLON"; KYOL="parametre"
elif [ -n "${MOTION_HARNESS_CLONE:-}" ]; then KDIR="$MOTION_HARNESS_CLONE"; KYOL="MOTION_HARNESS_CLONE"
else
  if command -v motion-render >/dev/null 2>&1; then
    w="$(motion-render --where 2>/dev/null | head -n 1)"
    if [ -n "$w" ] && [ -d "$w/render" ]; then KDIR="$w"; KYOL="motion-render --where"; fi
  fi
  if [ -z "$KDIR" ] && command -v npm >/dev/null 2>&1; then
    pre="$(npm prefix -g 2>/dev/null)"
    for p in "$pre/lib/node_modules/@motion/harness" "$pre/node_modules/@motion/harness"; do
      if [ -n "$pre" ] && [ -e "$p" ]; then r="$(cd "$p" 2>/dev/null && pwd -P)"; if [ -n "$r" ]; then KDIR="$(dirname "$r")"; KYOL="npm prefix -g"; break; fi; fi
    done
  fi
fi
TABAN="$KH"; TKAYNAK="--klon-head"
if [ -z "$TABAN" ] && [ -f "$PROJE/tools/harness-taban.txt" ]; then
  TABAN="$(sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' "$PROJE/tools/harness-taban.txt" | tr -d '\r' | grep -v '^#' | grep -v '^$' | head -n 1)"; TKAYNAK="tools/harness-taban.txt"
fi
ENGEL=""; UYARI=""; KOZET=""
ekle() { if [ -n "$ENGEL" ]; then ENGEL="$ENGEL · $1"; else ENGEL="$1"; fi; }
GIT=0; command -v git >/dev/null 2>&1 && GIT=1
KGIT=0; [ -n "$KDIR" ] && [ "$GIT" = 1 ] && [ -e "$KDIR/.git" ] && KGIT=1
NDEG=0; NDIS=0; DISLIST=""; H="?"; DAL="?"
if [ "$KGIT" = 1 ]; then
  H="$(git -C "$KDIR" rev-parse --short HEAD 2>/dev/null)"; DAL="$(git -C "$KDIR" rev-parse --abbrev-ref HEAD 2>/dev/null)"
  CH="$(git -C "$KDIR" status --porcelain 2>/dev/null)"
  while IFS= read -r l; do
    [ -z "$l" ] && continue
    p="${l:3}"; case "$p" in *' -> '*) p="${p##* -> }" ;; esac; p="${p#\"}"; p="${p%\"}"
    NDEG=$((NDEG + 1)); ok=0
    if [ -n "$IZ" ]; then
      OLDIFS="$IFS"; IFS=','; for pre in $IZ; do [ -n "$pre" ] && case "$p" in "$pre"*) ok=1 ;; esac; done; IFS="$OLDIFS"
    fi
    if [ "$ok" = 0 ]; then NDIS=$((NDIS + 1)); [ "$NDIS" -le 6 ] && DISLIST="${DISLIST:+$DISLIST, }$p"; fi
  done <<EOF
$CH
EOF
fi
KM="$(maskele "$KDIR")"
if [ -z "$TABAN" ]; then
  if [ "$KGIT" = 1 ]; then KOZET="klon bilgi: taban yok (tools/harness-taban.txt ya da --klon-head) → denetim atlandı · $KM ($KYOL) · dal $DAL · HEAD $H · değişen $NDEG"
  else KOZET="klon bilgi: taban yok (tools/harness-taban.txt ya da --klon-head) → denetim atlandı · klon $KYOL"; fi
elif [ "$KGIT" = 0 ]; then
  ekle "klon denetlenemedi (${KM:+$KM, }$KYOL$([ "$GIT" = 0 ] && printf ', git yok')) · taban $TABAN ($TKAYNAK)"
else
  HEAD_="$(git -C "$KDIR" rev-parse HEAD 2>/dev/null)"; BEK="$(git -C "$KDIR" rev-parse --verify --quiet "$TABAN^{commit}" 2>/dev/null)"
  if [ -z "$BEK" ]; then ekle "taban çözülemedi: $TABAN ($TKAYNAK; klonda böyle bir SHA/etiket yok)"
  elif [ "$HEAD_" != "$BEK" ]; then ekle "KURULU KLON DEĞİŞTİ: HEAD $H ≠ taban $TABAN ($TKAYNAK)"; fi
  [ "$NDIS" -gt 0 ] && ekle "klonda izinli dışı değişiklik $NDIS: $DISLIST"
  [ "$NDEG" -gt "$NDIS" ] && UYARI="izinli yolda değişiklik $((NDEG - NDIS)) (render yolu dışı)"
  KOZET="klon $KM ($KYOL) · dal $DAL · HEAD $H (taban $TABAN) · değişen $NDEG (izinli dışı $NDIS)"
fi

# ── (ii) süreçler ───────────────────────────────────────────────────────────────
SOZET="süreç taraması atlandı (--surecsiz)"
if [ "$SURECSIZ" = 0 ]; then
  # ps çıktısı önce değişkene alınır (süzgecin kendi komut satırı listeye girmesin)
  if ! PSO="$(ps -eo pid=,args= 2>/dev/null)"; then
    ekle "süreç listesi alınamadı (ps -eo; Windows'ta tools/render-oncesi.ps1)"; SOZET="süreç taraması yapılamadı"
  else
    # satır: tür (F ffmpeg · C Playwright Chromium · U kullanıcı Chrome) <TAB> pid <TAB> komut satırı
    BUL="$(printf '%s\n' "$PSO" | awk -v me="$$" '{ if ($1 == me) next; n = split($2, a, "/"); b = a[n]; args = substr($0, index($0, $2)); t = "";
      if (b == "ffmpeg") t = "F"; else if (b == "chrome-headless-shell" || b == "headless_shell" || index($0, "ms-" "playwright") > 0) t = "C";
      else if (b == "chrome" || b == "google-chrome" || index($0, "Google Chrome") > 0) t = "U";
      if (t != "") print t "\t" $1 "\t" args }')"
    NF_="$(printf '%s\n' "$BUL" | grep -c '^F')"; NC_="$(printf '%s\n' "$BUL" | grep -c '^C')"; NU_="$(printf '%s\n' "$BUL" | grep -c '^U')"
    SOZET="ffmpeg $NF_ · Playwright Chromium $NC_ · kullanıcı Chrome $NU_ (engel değil)"
    if [ "$NF_" -gt 0 ] || [ "$NC_" -gt 0 ]; then
      ekle "başka render/encode süreci var"
      if [ "$SESSIZ" = 0 ]; then
        TAB="$(printf '\t')"
        printf '%s\n' "$BUL" | grep -E '^(F|C)' | while IFS="$TAB" read -r t pid args; do
          printf 'ENGEL %s %s :: %s\n' "$pid" "$([ "$t" = F ] && echo ffmpeg || echo chromium)" "$(maskele "$args" | cut -c1-140)"
        done
      fi
    fi
  fi
fi
[ -n "$UYARI" ] && [ "$SESSIZ" = 0 ] && echo "uyarı: $UYARI"
if [ -n "$ENGEL" ]; then echo "render-oncesi: ENGEL → render yok, DUR · $ENGEL · $SOZET"; exit 1; fi
echo "render-oncesi: temiz · $KOZET · $SOZET"; exit 0
