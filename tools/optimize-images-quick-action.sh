#!/usr/bin/env bash
# Wrapper para Acciones rápidas de macOS (Automator).
# No ejecutar a mano salvo pruebas; usa optimize-images.sh desde el terminal.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OPTIMIZER="${SCRIPT_DIR}/optimize-images.sh"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

notify() {
  /usr/bin/osascript -e "display notification \"$2\" with title \"$1\"" 2>/dev/null || true
}

if [[ ! -x "$OPTIMIZER" ]]; then
  notify "Optimizar imágenes" "No se encuentra optimize-images.sh"
  exit 1
fi

if [[ $# -eq 0 ]]; then
  notify "Optimizar imágenes" "Selecciona archivos o una carpeta en Finder"
  exit 0
fi

LOG="$(mktemp "${TMPDIR:-/tmp}/optimg-qa.XXXXXX.log")"
if "$OPTIMIZER" "$@" >"$LOG" 2>&1; then
  count=$(grep -c '^→ ' "$LOG" 2>/dev/null || echo 0)
  notify "Optimizar imágenes" "Listo (${count} archivo(s)). Ver optimized/ junto a cada original."
else
  err=$(tail -3 "$LOG" | tr '\n' ' ')
  notify "Optimizar imágenes" "Error: ${err:-revisa ImageMagick (brew install imagemagick)}"
  exit 1
fi

rm -f "$LOG"
