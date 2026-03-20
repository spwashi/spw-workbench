#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node --input-type=module -e 'import fs from "node:fs";console.log(JSON.parse(fs.readFileSync("package.json","utf8")).version)')"
RELEASE_DIR="${RELEASE_DIR:-release/v${VERSION}}"
mkdir -p "$RELEASE_DIR"

bash ./scripts/release/bundle-srcdist.sh
bash ./scripts/release/bundle-jsdist.sh
bash ./scripts/release/bundle-docs.sh
bash ./scripts/release/bundle-extensions.sh "$@"

echo "Release bundle complete: $RELEASE_DIR"
