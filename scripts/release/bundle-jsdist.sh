#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node --input-type=module -e 'import fs from "node:fs";console.log(JSON.parse(fs.readFileSync("package.json","utf8")).version)')"
RELEASE_DIR="${RELEASE_DIR:-release/v${VERSION}}"
OUT_DIR="$RELEASE_DIR/bundles"
mkdir -p "$OUT_DIR"

OUT_FILE="$OUT_DIR/spw-js-dist-${VERSION}.tar.gz"

if [ ! -f "dist/package.json" ]; then
  npm run build:jsdist
fi

printf 'Bundling JS dist into %s\n' "$OUT_FILE"
tar -czf "$OUT_FILE" dist

printf 'Created: %s\n' "$OUT_FILE"
