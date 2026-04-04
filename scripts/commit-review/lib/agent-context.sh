#!/usr/bin/env bash

spw_agent_context_file() {
  local repo_root="${1:-${SPW_REPO_ROOT_OVERRIDE:-}}"
  local git_dir
  local git_path
  if [ -n "$repo_root" ]; then
    git_dir="$(git -C "$repo_root" rev-parse --git-dir 2>/dev/null || true)"
  else
    git_dir="$(git rev-parse --git-dir 2>/dev/null || true)"
  fi
  [ -n "$git_dir" ] || return 1
  case "$git_dir" in
    /*) git_path="$git_dir/spw-agent-context" ;;
    *) git_path="${repo_root:-$(pwd)}/$git_dir/spw-agent-context" ;;
  esac

  if [ -e "$git_path" ] || { mkdir -p "$(dirname "$git_path")" >/dev/null 2>&1 && touch "$git_path" >/dev/null 2>&1; }; then
    [ -f "$git_path" ] || rm -f "$git_path" 2>/dev/null || true
    printf '%s\n' "$git_path"
    return 0
  fi

  printf '%s\n' "${repo_root:-$(pwd)}/.agents/state/runtime/spw-agent-context"
}

spw_detect_agent_heuristic() {
  if [ -n "${SPW_AGENT:-}" ]; then
    printf '%s\n' "$SPW_AGENT"
  elif [ "${__CFBundleIdentifier:-}" = "com.jetbrains.air" ] && { [ -n "${CODEX_THREAD_ID:-}" ] || [ "${CODEX_CI:-0}" = "1" ]; }; then
    printf '%s\n' "codex-air"
  elif [ -n "${CODEX_THREAD_ID:-}" ] || [ "${CODEX_CI:-0}" = "1" ]; then
    printf '%s\n' "codex"
  elif [ -n "${CLAUDE_SESSION_ID:-}" ] || [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    printf '%s\n' "claude"
  elif [ -n "${GEMINI_SESSION_ID:-}" ] || [ -n "${GOOGLE_API_KEY:-}" ]; then
    printf '%s\n' "gemini"
  elif [ -n "${GITHUB_COPILOT:-}" ]; then
    printf '%s\n' "copilot"
  elif [ -n "${ANTIGRAVITY_SESSION:-}" ]; then
    printf '%s\n' "antigravity"
  else
    printf '%s\n' "human"
  fi
}

spw_write_agent_context() {
  local repo_root="${1:-${SPW_REPO_ROOT_OVERRIDE:-$(pwd)}}"
  local actor="${2:-}"
  local source="${3:-explicit-env}"
  local confidence="${4:-high}"
  local context_file

  [ -n "$actor" ] || return 0
  context_file="$(spw_agent_context_file "$repo_root" 2>/dev/null || true)"
  [ -n "$context_file" ] || return 0

  mkdir -p "$(dirname "$context_file")" >/dev/null 2>&1 || return 0
  cat <<EOF > "$context_file" 2>/dev/null || return 0
actor=$actor
source=$source
confidence=$confidence
updated_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
thread_id=${CODEX_THREAD_ID:-}
bundle_id=${__CFBundleIdentifier:-}
EOF
}

spw_read_agent_context() {
  local repo_root="${1:-${SPW_REPO_ROOT_OVERRIDE:-$(pwd)}}"
  local context_file line key value

  AGENT_CONTEXT_ACTOR=""
  AGENT_CONTEXT_SOURCE=""
  AGENT_CONTEXT_CONFIDENCE=""

  context_file="$(spw_agent_context_file "$repo_root" 2>/dev/null || true)"
  [ -n "$context_file" ] || return 1
  [ -f "$context_file" ] || return 1

  while IFS='=' read -r key value; do
    case "$key" in
      actor) AGENT_CONTEXT_ACTOR="$value" ;;
      source) AGENT_CONTEXT_SOURCE="$value" ;;
      confidence) AGENT_CONTEXT_CONFIDENCE="$value" ;;
    esac
  done < "$context_file"

  [ -n "$AGENT_CONTEXT_ACTOR" ] || return 1
  return 0
}

spw_resolve_agent_context() {
  local repo_root="${1:-${SPW_REPO_ROOT_OVERRIDE:-$(pwd)}}"
  local heuristic_actor=""

  AGENT_CONTEXT_ACTOR=""
  AGENT_CONTEXT_SOURCE=""
  AGENT_CONTEXT_CONFIDENCE=""

  if spw_read_agent_context "$repo_root"; then
    return 0
  fi

  heuristic_actor="$(spw_detect_agent_heuristic)"
  AGENT_CONTEXT_ACTOR="$heuristic_actor"
  AGENT_CONTEXT_SOURCE="heuristic"
  if [ "$heuristic_actor" = "human" ]; then
    AGENT_CONTEXT_CONFIDENCE="low"
  else
    AGENT_CONTEXT_CONFIDENCE="medium"
  fi

  if [ -n "${SPW_AGENT:-}" ]; then
    AGENT_CONTEXT_SOURCE="explicit-env"
    AGENT_CONTEXT_CONFIDENCE="high"
    spw_write_agent_context "$repo_root" "$AGENT_CONTEXT_ACTOR" "$AGENT_CONTEXT_SOURCE" "$AGENT_CONTEXT_CONFIDENCE" >/dev/null 2>&1 || true
  elif [ "$heuristic_actor" != "human" ]; then
    spw_write_agent_context "$repo_root" "$AGENT_CONTEXT_ACTOR" "$AGENT_CONTEXT_SOURCE" "$AGENT_CONTEXT_CONFIDENCE" >/dev/null 2>&1 || true
  fi
}

spw_detect_agent() {
  spw_resolve_agent_context "${1:-${SPW_REPO_ROOT_OVERRIDE:-$(pwd)}}"
  printf '%s\n' "$AGENT_CONTEXT_ACTOR"
}
