#!/usr/bin/env bash
#
# Optimización batch de imágenes para web (macOS).
# Salida siempre JPEG (.jpg). TIFF, PNG, HEIC, WebP, GIF, AVIF → JPG.
#
# Requisitos: ImageMagick 7 (brew install imagemagick)
# Opcional:     jpegoptim (brew install jpegoptim) — pase final sin pérdida extra
#
# Uso:
#   ./tools/optimize-images.sh foto.tiff carpeta/
#   ./tools/optimize-images.sh --out ./listo ./fotos/*.png
#
# Variables de entorno (opcionales):
#   MAX_PX=2225          lado largo máximo (@3x del tema; nunca agranda)
#   MAX_KB=800           peso máximo en KB
#   DPI=72               metadato de densidad
#   MIN_QUALITY=50       calidad mínima si no se alcanza el peso
#   BG_COLOR=white       fondo al aplanar PNG/transparencia (#fff, #f5f5f5…)
#   UNSHARP=1            ligero sharpen tras resize (recomendado)
#   WEBP=1               también generar .webp junto al JPG
#   SRGB_PROFILE=…       ICC sRGB (macOS: /System/Library/ColorSync/Profiles/sRGB Profile.icc)
#   COLOR_INTENT=Relative  conversión ICC desde Adobe RGB u otros perfiles embebidos
#   JPEG_SAMPLING=4:4:4  crominancia JPEG (4:2:0 = más ligero, menos saturación)
#
set -euo pipefail

MAX_PX="${MAX_PX:-2225}"
MAX_KB="${MAX_KB:-800}"
DPI="${DPI:-72}"
MIN_QUALITY="${MIN_QUALITY:-50}"
BG_COLOR="${BG_COLOR:-white}"
UNSHARP="${UNSHARP:-1}"
WEBP="${WEBP:-0}"
SRGB_PROFILE="${SRGB_PROFILE:-/System/Library/ColorSync/Profiles/sRGB Profile.icc}"
COLOR_INTENT="${COLOR_INTENT:-Relative}"
JPEG_SAMPLING="${JPEG_SAMPLING:-4:4:4}"
OUT_DIR=""
SOURCES=()

usage() {
  sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'
  echo ""
  echo "Opciones:"
  echo "  -o, --out DIR   carpeta de salida (por defecto: <origen>/optimized)"
  echo "  -h, --help      esta ayuda"
  echo ""
  echo "Ejemplo: MAX_KB=400 ./tools/optimize-images.sh ./scan.tiff ./foto.png"
}

die() {
  echo "error: $*" >&2
  exit 1
}

need_magick() {
  if ! command -v magick >/dev/null 2>&1; then
    die "ImageMagick no encontrado. Instala con: brew install imagemagick"
  fi
}

filesize_kb() {
  local f="$1"
  echo $(( ($(stat -f%z "$f" 2>/dev/null || stat -c%s "$f") + 1023) / 1024 ))
}

has_alpha() {
  local f="$1"
  local alpha
  alpha="$(magick identify -format '%A' "$f" 2>/dev/null || echo 'False')"
  [[ "$alpha" == "True" || "$alpha" == "Blend" ]]
}

# Lado largo en px tras auto-orient (solo lectura).
image_long_edge() {
  local f="$1"
  magick "$(magick_input "$f")" -auto-orient +repage -format '%[fx:max(w,h)]' info:
}

# Entrada para magick: GIF → primer frame.
magick_input() {
  local f="$1"
  local ext="${f##*.}"
  ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  if [[ "$ext" == "gif" ]]; then
    printf '%s[0]' "$f"
  else
    printf '%s' "$f"
  fi
}

# Prepara raster 8-bit sRGB, sin EXIF. Solo reduce si el lado largo > MAX_PX (nunca agranda).
prepare_base() {
  local in="$1"
  local tmp="$2"
  local input long_edge did_resize=0
  input="$(magick_input "$in")"
  long_edge="$(image_long_edge "$in")"

  local -a magick_args=(
    "$input"
    -auto-orient
    -depth 8
  )

  if [[ -f "$SRGB_PROFILE" ]]; then
    magick_args+=(-intent "$COLOR_INTENT" -profile "$SRGB_PROFILE")
  else
    magick_args+=(-colorspace sRGB)
  fi

  if has_alpha "$in"; then
    magick_args+=(
      -background "$BG_COLOR"
      -alpha remove
      -flatten
    )
  else
    magick_args+=(-alpha off)
  fi

  if (( long_edge > MAX_PX )); then
    magick_args+=(
      -filter Lanczos
      -resize "${MAX_PX}x${MAX_PX}>"
    )
    did_resize=1
  fi

  if [[ "$UNSHARP" == "1" && "$did_resize" == "1" ]]; then
    magick_args+=(-unsharp 0x0.5+0.5+0.008)
  fi

  magick_args+=(-strip -density "$DPI")
  if [[ -f "$SRGB_PROFILE" ]]; then
    magick_args+=(-profile "$SRGB_PROFILE")
  fi
  magick_args+=("$tmp")

  magick "${magick_args[@]}"
  echo "$long_edge:$did_resize"
}

jpeg_write() {
  local in="$1"
  local out="$2"
  local quality="$3"
  local -a args=(
    "$in"
    -quality "$quality"
    -sampling-factor "$JPEG_SAMPLING"
    -interlace Plane
    -define jpeg:fancy-upsampling=off
    -define jpeg:dct-method=float
  )
  if [[ -f "$SRGB_PROFILE" ]]; then
    args+=(-profile "$SRGB_PROFILE")
  fi
  args+=("$out")
  magick "${args[@]}"
}

# Intenta ImageMagick jpeg:extent (ajusta calidad al peso objetivo).
compress_with_extent() {
  local in="$1"
  local out="$2"
  local max_kb="$3"
  local -a args=(
    "$in"
    -quality 85
    -sampling-factor "$JPEG_SAMPLING"
    -interlace Plane
    -define "jpeg:extent=${max_kb}kb"
    -define jpeg:fancy-upsampling=off
  )
  if [[ -f "$SRGB_PROFILE" ]]; then
    args+=(-profile "$SRGB_PROFILE")
  fi
  args+=("$out")
  magick "${args[@]}" 2>/dev/null || return 1
  [[ -f "$out" ]] && (( $(filesize_kb "$out") <= max_kb ))
}

compress_jpeg_to_target() {
  local in="$1"
  local out="$2"
  local max_kb="$3"
  local q=88
  local step=6
  local tmp
  tmp="$(mktemp "${TMPDIR:-/tmp}/optimg.XXXXXX").jpg"

  if compress_with_extent "$in" "$out" "$max_kb"; then
    echo "extent"
    return 0
  fi

  while (( q >= MIN_QUALITY )); do
    jpeg_write "$in" "$tmp" "$q"
    if (( $(filesize_kb "$tmp") <= max_kb )); then
      mv "$tmp" "$out"
      echo "q=$q"
      return 0
    fi
    q=$((q - step))
  done

  rm -f "$tmp"
  return 1
}

shrink_until_fits() {
  local work="$1"
  local out="$2"
  local max_kb="$3"
  local quality_used=""
  local scale=100
  local tmp_work

  tmp_work="$(mktemp "${TMPDIR:-/tmp}/optimg-work.XXXXXX").png"
  cp "$work" "$tmp_work"

  while (( scale >= 55 )); do
    if quality_used="$(compress_jpeg_to_target "$tmp_work" "$out" "$max_kb")"; then
      rm -f "$tmp_work"
      echo "ok ${quality_used} @${scale}%"
      return 0
    fi
    scale=$((scale - 12))
    # Solo reducir respecto al master (nunca >100 %)
    magick "$work" -resize "${scale}%" "$tmp_work"
  done

  rm -f "$tmp_work"
  jpeg_write "$work" "$out" "$MIN_QUALITY"
  echo "warn: $(filesize_kb "$out")KB > ${max_kb}KB" >&2
  return 1
}

final_jpeg_pass() {
  local f="$1"
  local max_kb="$2"
  if ! command -v jpegoptim >/dev/null 2>&1; then
    return 0
  fi
  jpegoptim --strip-all --max="$max_kb" --force "$f" >/dev/null 2>&1 || true
}

format_label() {
  local ext="$1"
  case "$ext" in
    tif|tiff) echo "TIFF→JPG" ;;
    png)      echo "PNG→JPG" ;;
    heic|heif) echo "HEIC→JPG" ;;
    webp)     echo "WebP→JPG" ;;
    gif)      echo "GIF→JPG" ;;
    avif)     echo "AVIF→JPG" ;;
    *)        echo "JPG" ;;
  esac
}

process_one() {
  local src="$1"
  local base ext lower rel out_path out_dir
  local prepared final_log had_transparency=0 prep_meta orig_px resize_note

  [[ -f "$src" ]] || die "no existe: $src"

  base="$(basename "$src")"
  ext="${base##*.}"
  lower="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"

  case "$lower" in
    jpg|jpeg|png|webp|gif|tif|tiff|heic|heif|avif) ;;
    *)
      echo "omitido (no imagen): $src"
      return 0
      ;;
  esac

  if [[ -n "$OUT_DIR" ]]; then
    out_dir="$OUT_DIR"
  else
    out_dir="$(dirname "$src")/optimized"
  fi
  mkdir -p "$out_dir"

  rel="$(basename "${base%.*}")"
  out_path="$out_dir/${rel}.jpg"

  if has_alpha "$src"; then
    had_transparency=1
  fi

  local tag
  tag="$(format_label "$lower")"
  echo "→ $base [$tag]"

  orig_px="$(image_long_edge "$src")"

  prepared="$(mktemp "${TMPDIR:-/tmp}/optimg-pre.XXXXXX").png"
  prep_meta="$(prepare_base "$src" "$prepared")"
  if [[ "${prep_meta##*:}" == "1" ]]; then
    resize_note=", ${orig_px}px→≤${MAX_PX}px"
  else
    resize_note=", ${orig_px}px sin ampliar"
  fi

  final_log="$(shrink_until_fits "$prepared" "$out_path" "$MAX_KB" || true)"
  rm -f "$prepared"

  final_jpeg_pass "$out_path" "$MAX_KB"

  local extra=""
  if (( had_transparency )); then
    extra=", fondo ${BG_COLOR}"
  fi

  if [[ "$WEBP" == "1" ]]; then
    local webp_out="${out_path%.*}.webp"
    magick "$out_path" -quality 82 "$webp_out"
    echo "   $(filesize_kb "$out_path")KB jpg + $(filesize_kb "$webp_out")KB webp ($final_log${resize_note}${extra})"
  else
    echo "   $(filesize_kb "$out_path")KB ($final_log${resize_note}${extra}) → $out_path"
  fi
}

# --- CLI ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    -o|--out)
      OUT_DIR="${2:-}"
      [[ -n "$OUT_DIR" ]] || die "--out requiere carpeta"
      shift 2
      ;;
    --)
      shift
      SOURCES+=("$@")
      break
      ;;
    -*)
      die "opción desconocida: $1 (usa --help)"
      ;;
    *)
      SOURCES+=("$1")
      shift
      ;;
  esac
done

if [[ ${#SOURCES[@]} -eq 0 ]]; then
  die "indica archivos o carpetas. Ejemplo: ./tools/optimize-images.sh ./fotos/"
fi

need_magick

for item in "${SOURCES[@]}"; do
  if [[ -d "$item" ]]; then
    while IFS= read -r -d '' f; do
      process_one "$f"
    done < <(find "$item" -maxdepth 1 -type f \( \
      -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \
      -o -iname '*.tif' -o -iname '*.tiff' -o -iname '*.heic' -o -iname '*.heif' \
      -o -iname '*.gif' -o -iname '*.avif' \) -print0)
  else
    process_one "$item"
  fi
done

echo ""
echo "Listo. Salida: JPG · ${MAX_PX}px · ≤${MAX_KB}KB · ${DPI}dpi"
