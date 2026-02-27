#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" != "--force" ]]; then
  echo "Usage: bash scripts/spw-reset.sh --force"
  echo "This will discard local changes under .spw and remove untracked files there."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "spw-reset: this command must run inside a git worktree."
  exit 1
fi

git restore --source=HEAD --worktree --staged .spw 2>/dev/null || true
git clean -fd .spw >/dev/null 2>&1 || true

npm run -s spw:format >/dev/null
echo "spw-reset: .spw restored to committed baseline."
