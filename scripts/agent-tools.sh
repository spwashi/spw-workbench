#!/usr/bin/env bash
# scripts/agent-tools.sh — CLI entry point for agentic engineering tools.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source the agent library
source "$REPO_ROOT/.agents/scripts/agent-lib.sh"

agent_tools_usage() {
  cat <<'EOF'
Usage:
  scripts/agent-tools.sh plan:init --slug <slug>
  scripts/agent-tools.sh plan:init <slug>
  scripts/agent-tools.sh plan:stream --type <type> --message <message> [--slug <slug>]
  scripts/agent-tools.sh plan:stream <type> <message> [slug]
  scripts/agent-tools.sh plan:status [--slug <slug>] [--json]
  scripts/agent-tools.sh plan:check [--slug <slug>] [--json]
  scripts/agent-tools.sh kb [--json] [list|path <topic>|search <pattern>|<topic>]
  scripts/agent-tools.sh vibe [--json]
EOF
}

if [ "$#" -eq 0 ]; then
  agent_tools_usage
  exit 1
fi

COMMAND="$1"
shift

case "$COMMAND" in
  plan:init)
    agent_plan_init "$@"
    ;;
  plan:stream)
    agent_plan_stream "$@"
    ;;
  plan:status)
    agent_plan_status "$@"
    ;;
  plan:check)
    agent_plan_check "$@"
    ;;
  kb)
    agent_kb "$@"
    ;;
  vibe)
    agent_vibe "$@"
    ;;
  -h|--help|help)
    agent_tools_usage
    ;;
  *)
    agent_tools_usage
    exit 1
    ;;
esac
