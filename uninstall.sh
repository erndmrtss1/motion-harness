#!/usr/bin/env bash
# motion-harness kaldırma (macOS / Linux). Projelere ve Higgsfield oturumuna dokunmaz.
ROOT="$(cd "$(dirname "$0")" && pwd)"
if command -v claude >/dev/null 2>&1; then
  claude plugin uninstall motion@motion-harness --scope user >/dev/null 2>&1 && echo "  ✓ plugin kaldırıldı" || echo "  – plugin kurulu değildi"
  claude plugin marketplace remove motion-harness >/dev/null 2>&1 && echo "  ✓ marketplace kaldırıldı" || echo "  – marketplace kayıtlı değildi"
fi
(cd "$ROOT/render" && npm unlink -g @motion/harness >/dev/null 2>&1)
command -v motion-render >/dev/null 2>&1 && echo "  ✗ motion-render hâlâ PATH'te" || echo "  ✓ motion-render kaldırıldı"
echo "  Depo klasörü silinmedi; Playwright önbelleği (~/.cache/ms-playwright) elle silinir."
