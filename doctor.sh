#!/usr/bin/env bash
# motion-harness ortam denetimi (macOS / Linux): motion-render doctor + plugin kaydı.
if command -v motion-render >/dev/null 2>&1; then motion-render doctor; exit $?; fi
echo "  ✗ motion-render yok → bash install.sh"; exit 1
