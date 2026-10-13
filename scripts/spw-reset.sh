#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "spw-reset: this command must run inside a git worktree."
  exit 1
fi

# Without --force this only previews. The npm script runs it without --force on
# purpose: an agent allowed to run npm scripts must not be able to discard work.
if [[ "${1:-}" != "--force" ]]; then
  echo "spw-reset: preview only. These changes under .spw would be discarded:"
  git status --short -- .spw | sed 's/^/  /'
  echo "(nothing listed means nothing to discard)"
  echo "To discard them, run: bash scripts/spw-reset.sh --force"
  exit 1
fi

git restore --source=HEAD --worktree --staged .spw 2>/dev/null || true
git clean -fd .spw >/dev/null 2>&1 || true

npm run -s spw:format >/dev/null
echo "spw-reset: .spw restored to committed baseline."
