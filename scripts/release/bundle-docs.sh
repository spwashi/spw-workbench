#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node --input-type=module -e 'import fs from "node:fs";console.log(JSON.parse(fs.readFileSync("package.json","utf8")).version)')"
RELEASE_DIR="${RELEASE_DIR:-release/v${VERSION}}"
OUT_DIR="$RELEASE_DIR/bundles"
mkdir -p "$OUT_DIR"

OUT_FILE="$OUT_DIR/spw-docs-${VERSION}.tar.gz"

INCLUDE=("docs" "docs-seed" "Writerside")
printf 'Bundling docs into %s\n' "$OUT_FILE"
tar -czf "$OUT_FILE" "${INCLUDE[@]}"

printf 'Created: %s\n' "$OUT_FILE"
