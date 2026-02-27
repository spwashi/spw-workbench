#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

SKIP_BUILD=0
BEST_EFFORT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1; shift ;;
    --best-effort) BEST_EFFORT=1; shift ;;
    *) echo "Unknown option: $1"; exit 2 ;;
  esac
done

VERSION="$(node --input-type=module -e 'import fs from "node:fs";console.log(JSON.parse(fs.readFileSync("package.json","utf8")).version)')"
RELEASE_DIR="${RELEASE_DIR:-release/v${VERSION}}"
OUT_DIR="$RELEASE_DIR/extensions"
mkdir -p "$OUT_DIR"

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "Building extensions (npm run build:extensions)..."
  if ! npm run build:extensions; then
    if [ "$BEST_EFFORT" -eq 1 ]; then
      echo "build:extensions failed; continuing in best-effort mode"
    else
      exit 1
    fi
  fi
fi

VSCODE_TAR="$OUT_DIR/vscode-spw-${VERSION}.tar.gz"
if [ -d "extensions/vscode-spw/dist" ]; then
  tar -czf "$VSCODE_TAR" \
    -C "extensions/vscode-spw" \
    package.json README.md language-configuration.json syntaxes src dist
  echo "Created: $VSCODE_TAR"
else
  echo "VS Code dist output not found at extensions/vscode-spw/dist"
fi

INTELLIJ_FOUND=0
for zip in extensions/intellij-spw/build/distributions/*.zip; do
  if [ -f "$zip" ]; then
    cp "$zip" "$OUT_DIR/"
    echo "Copied: $zip -> $OUT_DIR/"
    INTELLIJ_FOUND=1
  fi
done

if [ "$INTELLIJ_FOUND" -eq 0 ]; then
  echo "IntelliJ distribution zip not found under extensions/intellij-spw/build/distributions"
fi

MANIFEST="$OUT_DIR/manifest-${VERSION}.txt"
{
  echo "Spw extension bundle manifest"
  echo "version: $VERSION"
  echo "generated_at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo ""
  find "$OUT_DIR" -maxdepth 1 -type f -print | sort
} > "$MANIFEST"

echo "Manifest: $MANIFEST"
