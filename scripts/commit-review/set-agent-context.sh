#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SPW_REPO_ROOT_OVERRIDE:-$(git rev-parse --show-toplevel 2>/dev/null || { cd "$SCRIPT_DIR/../.." && pwd; })}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib/agent-context.sh"

ACTOR="${1:-${SPW_AGENT:-}}"
SOURCE="${2:-manual}"
CONFIDENCE="${3:-high}"

if [ -z "$ACTOR" ]; then
  cat >&2 <<'EOF'
usage: scripts/commit-review/set-agent-context.sh <actor> [source] [confidence]

Examples:
  scripts/commit-review/set-agent-context.sh codex-air wrapper high
  SPW_AGENT=codex-air scripts/commit-review/set-agent-context.sh
EOF
  exit 2
fi

spw_write_agent_context "$REPO_ROOT" "$ACTOR" "$SOURCE" "$CONFIDENCE"
CONTEXT_FILE="$(spw_agent_context_file "$REPO_ROOT")"
printf 'spw-agent-context: actor=%s source=%s confidence=%s path=%s\n' \
  "$ACTOR" "$SOURCE" "$CONFIDENCE" "$CONTEXT_FILE"
