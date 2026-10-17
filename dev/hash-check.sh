#!/usr/bin/env bash
# Kaynak ağaçlar salt okunur kanıtı: yeni manifest al → before ile karşılaştır → değişeni yazan session'a ata.
# Kullanım: bash dev/hash-check.sh <etiket> [--full]
#   varsayılan hızlı mod (boyut+mtime aynıysa önceki SHA); --full tam yeniden hash (H5).
# Kökler, oynak bölgeler, transkriptler: dev/sources.local.json (git dışı; makineye özgü yollar).
set -uo pipefail
cd "$(dirname "$0")/.."
TAG="${1:?etiket gerekli, örn. H1}"
MODE="${2:-}"
CFG=dev/sources.local.json
[ -f "$CFG" ] || { echo "✗ $CFG yok"; exit 2; }
mapfile -t ROOTS < <(node -e 'const c=require("./'"$CFG"'");for(const[k,v]of Object.entries(c.roots))console.log(k+"="+v)')
VOL=$(node -e 'console.log(require("./'"$CFG"'").volatile.join(","))')
TRS=$(node -e 'console.log(require("./'"$CFG"'").transcripts.join(","))')
SCR=$(node -e 'console.log(require("./'"$CFG"'").scripts.join(","))')
REUSE="--reuse=evidence/source-hashes-before.json"
[ "$MODE" = "--full" ] && REUSE=""
mkdir -p evidence
node dev/hash-manifest.mjs "evidence/source-hashes-$TAG.json" "${ROOTS[@]}" --volatile="$VOL" $REUSE 2> "evidence/hash-$TAG.log"
tail -1 "evidence/hash-$TAG.log"
node dev/hash-diff.mjs evidence/source-hashes-before.json "evidence/source-hashes-$TAG.json" \
  --json="evidence/hash-diff-$TAG.json" | tee "evidence/hash-diff-$TAG.txt"
# Kararlı bölgede değişen her dosya, kaynağı yazan canlı session'ın çağrısına bağlanmalı (atfedilemeyen = 0).
node dev/hash-attribute.mjs "evidence/hash-diff-$TAG.json" "$TRS" --scripts="$SCR" \
  --json="evidence/hash-attribute-$TAG.json" | tee -a "evidence/hash-diff-$TAG.txt"
