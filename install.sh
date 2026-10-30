#!/usr/bin/env bash
# motion-harness kurulumu (macOS / Linux) — idempotent; her adım ✓/✗ basar.
# Kullanım (depo kökünde):  bash install.sh [--log kurulum.log] [--skip-smoke] [--from-github owner/motion-harness] [--with-higgsfield]
# Adımlar: 1 Node ≥ 20 + ffmpeg · 2 render/ (npm ci, Playwright Chromium, npm link) · 3 Claude Code plugin kaydı
#          4 Higgsfield oturumu + bakiye (yalnız okuma) · 5 smoke · 6 özet
set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
RENDER="$ROOT/render"
LOG=""; SKIP_SMOKE=0; FROM_GH=""; WITH_HF=0
while [ $# -gt 0 ]; do
  case "$1" in
    --log) LOG="$2"; shift 2 ;;
    --skip-smoke) SKIP_SMOKE=1; shift ;;
    --from-github) FROM_GH="$2"; shift 2 ;;
    --with-higgsfield) WITH_HF=1; shift ;;
    *) echo "bilinmeyen seçenek: $1"; exit 2 ;;
  esac
done
FAILS=0; T0=$(date +%s)
say() { echo "$1"; [ -n "$LOG" ] && echo "$1" >> "$LOG"; return 0; }
ok() { say "  ✓ $1"; }
bad() { say "  ✗ $1"; FAILS=$((FAILS+1)); }
info() { say "  – $1"; }
have() { command -v "$1" >/dev/null 2>&1; }
run() { if [ -n "$LOG" ]; then "$@" >> "$LOG" 2>&1; else "$@" >/dev/null 2>&1; fi; }

[ -n "$LOG" ] && echo "motion-harness kurulum · $(date -u +%FT%TZ)" > "$LOG"
say "motion-harness kurulumu — $ROOT"

say "[1/6] Node ve ffmpeg"
if ! have node; then
  if have brew; then info "Node yok → brew install node"; run brew install node; fi
fi
if have node; then
  NV="$(node -v | sed 's/^v//')"
  if [ "${NV%%.*}" -ge 20 ]; then ok "Node $NV"; else bad "Node $NV < 20 (https://nodejs.org)"; fi
else bad "Node bulunamadı (https://nodejs.org, >= 20)"; fi

say "[2/6] render/ paketi (@motion/harness)"
cd "$RENDER" || exit 1
if [ -f package-lock.json ]; then run npm ci --no-audit --no-fund; else run npm install --no-audit --no-fund; fi && ok "npm bağımlılıkları" || bad "npm ci başarısız"
run npx playwright install chromium && ok "Playwright Chromium" || bad "Playwright Chromium indirilemedi"
if run npm link --no-audit --no-fund; then ok "npm link → motion-render"
else
  # /usr/local izin vermezse kullanıcı öneki
  mkdir -p "$HOME/.npm-global" && npm config set prefix "$HOME/.npm-global" && run npm link --no-audit --no-fund && export PATH="$HOME/.npm-global/bin:$PATH" \
    && ok "npm link (önek ~/.npm-global; PATH'e ekleyin: export PATH=\$HOME/.npm-global/bin:\$PATH)" || bad "npm link başarısız"
fi
cd "$ROOT"
if have motion-render; then ok "motion-render: $(motion-render --version)"; else bad "motion-render PATH'te değil"; fi

CAPS="$(motion-render doctor --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const f=JSON.parse(s).ffmpeg;console.log(f.libx264&&f.prores_ks&&f.ffv1&&f.loudnorm?"ok":"eksik")}catch{console.log("eksik")}})' 2>/dev/null)"
if [ "$CAPS" = "ok" ]; then ok "ffmpeg özellikleri (libx264, prores_ks, ffv1, loudnorm)"
else
  info "ffmpeg-static eksik özellik bildirdi → sistem ffmpeg"
  if ! have ffmpeg; then if have brew; then run brew install ffmpeg; elif have apt-get; then run sudo apt-get install -y ffmpeg; fi; fi
  if have ffmpeg; then FF="$(command -v ffmpeg)"; export MOTION_FFMPEG="$FF"
    grep -q MOTION_FFMPEG "$HOME/.profile" 2>/dev/null || echo "export MOTION_FFMPEG=\"$FF\"" >> "$HOME/.profile"
    ok "MOTION_FFMPEG = $FF"
  else bad "ffmpeg bulunamadı"; fi
fi

say "[3/6] Claude Code plugin kaydı"
if ! have claude; then bad "claude CLI yok (https://code.claude.com)"
else
  SRC="$ROOT"; [ -n "$FROM_GH" ] && SRC="$FROM_GH"
  OUT="$(claude plugin marketplace add "$SRC" --scope user 2>&1)"; RC=$?
  if [ $RC -eq 0 ] || echo "$OUT" | grep -qi already; then ok "marketplace: motion-harness ← $SRC"; else bad "marketplace add başarısız (özel depo: gh auth login; gh auth setup-git)"; fi
  # HK-40: kurulu sürüm plugin.json ile karşılaştırılır; eskiyse marketplace + plugin güncellenir, aynıysa "güncel"
  EXP="$(node -e 'try{console.log(require(process.argv[1]).version)}catch{}' "$ROOT/.claude-plugin/plugin.json" 2>/dev/null)"
  pver() { claude plugin list 2>/dev/null | awk '/motion@motion-harness/{f=1;next} f&&/Version:/{print $2; exit}'; }
  claude plugin marketplace update motion-harness >/dev/null 2>&1
  V0="$(pver)"
  if [ -z "$V0" ] && ! claude plugin list 2>/dev/null | grep -q "motion@motion-harness"; then
    OUT="$(claude plugin install motion@motion-harness --scope user -y 2>&1)"; RC=$?
    if [ $RC -eq 0 ] || echo "$OUT" | grep -qi already; then ok "plugin: motion@motion-harness kuruldu"; else bad "plugin install başarısız"; fi
  elif [ -n "$EXP" ] && [ "$V0" != "$EXP" ]; then
    if claude plugin update motion@motion-harness --scope user >/dev/null 2>&1; then ok "plugin: motion güncellendi $V0 → $EXP (yeni oturumda yüklenir)"; else bad "plugin update başarısız ($V0 → $EXP)"; fi
  else ok "plugin: motion $V0 (güncel)"; fi
  # PN-104: sürüm aynı kalınca (dal ucu, -dev) önbellek yenilenmez → plugin metinleri (commands/, skills/, agents/, templates/) bu checkout'tan eşitlenir
  OUT="$(node "$RENDER/bin/motion-render.mjs" plugin-sync 2>&1)"; RC=$?
  say "  $OUT"; [ $RC -eq 0 ] || FAILS=$((FAILS+1))
  V1="$(pver)"
  if ! claude plugin list 2>/dev/null | grep -q "motion@motion-harness"; then bad "doğrulama: plugin listede yok"
  elif [ -n "$EXP" ] && [ "$V1" != "$EXP" ]; then bad "doğrulama: kurulu sürüm $V1, depo sürümü $EXP"
  else ok "doğrulama: claude plugin list → motion@motion-harness $V1"; fi
fi

say "[4/6] Higgsfield (üretken varlık; isteğe bağlı)"
if ! have higgsfield && [ $WITH_HF -eq 1 ]; then run npm i -g @higgsfield/cli; fi
if have higgsfield; then
  CR="$(higgsfield account status --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.credits!=null?j.credits+" kredi ("+j.subscription_plan_type+")":"")}catch{console.log("")}})')"
  if [ -n "$CR" ]; then ok "oturum açık · bakiye $CR"; else info "Higgsfield CLI var, oturum yok → higgsfield auth login → /motion:doctor"; fi
else info "Higgsfield CLI yok (gerekirse: npm i -g @higgsfield/cli → higgsfield auth login)"; fi

say "[5/6] smoke"
if [ $SKIP_SMOKE -eq 1 ]; then info "atlandı (--skip-smoke)"
elif have motion-render; then
  S0=$(date +%s)
  if run motion-render smoke; then ok "smoke: 12 kare 960×540 → qc → contact ($(( $(date +%s)-S0 )) s)"; else bad "smoke başarısız — log"; fi
else bad "smoke: motion-render yok"; fi

say "[6/6] özet"
TOT=$(( $(date +%s)-T0 ))
if [ $FAILS -eq 0 ]; then
  ok "kurulum tamam ($TOT s)"
  say ""
  say "  Yeni projede: boş bir klasörde Claude Code'u aç, \"START.md'yi oku, /motion:init\" de."
  say "  START.md: $ROOT/START.md"
  exit 0
else bad "$FAILS adım başarısız ($TOT s) — README > Sorun giderme; /motion:doctor"; exit 1; fi
