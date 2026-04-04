#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SPW_REPO_ROOT_OVERRIDE:-$(git rev-parse --show-toplevel 2>/dev/null || cd "$SCRIPT_DIR/../.." && pwd)}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib/agent-context.sh"

CONTEXT_FILE="$(spw_agent_context_file "$REPO_ROOT")"
if [ -f "$CONTEXT_FILE" ]; then
  rm -f "$CONTEXT_FILE"
  printf 'spw-agent-context: cleared %s\n' "$CONTEXT_FILE"
else
  printf 'spw-agent-context: no context file at %s\n' "$CONTEXT_FILE"
fi
