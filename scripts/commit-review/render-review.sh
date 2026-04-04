#!/usr/bin/env bash
set -euo pipefail

spw_count_matching_lines() {
  local content="$1" pattern="$2"
  if [ -z "$content" ]; then
    printf '0\n'
    return
  fi
  printf '%s\n' "$content" | grep -E "$pattern" | sed '/^$/d' | wc -l | tr -d ' '
}

spw_render_commit_review() {
  local staged_all="${REVIEW_STAGED_ALL:-}"
  local total="${REVIEW_TOTAL:-0}"
  local agent="${REVIEW_AGENT:-human}"
  local agent_source="${REVIEW_AGENT_SOURCE:-heuristic}"
  local agent_confidence="${REVIEW_AGENT_CONFIDENCE:-low}"
  local report="${REVIEW_REPORT:-}"
  local warnings="${REVIEW_WARNINGS:-0}"
  local errors="${REVIEW_ERRORS:-0}"
  local source_count spw_count docs_count config_count snapshot_count other_count diffstat

  source_count=$(spw_count_matching_lines "$staged_all" '\.(ts|tsx|js|jsx|kt|kts|java|sh|py)$')
  spw_count=$(spw_count_matching_lines "$staged_all" '\.spw$')
  docs_count=$(spw_count_matching_lines "$staged_all" '\.(md|txt|rst)$')
  config_count=$(spw_count_matching_lines "$staged_all" '(^|/)(package\.json|tsconfig(\.[^.]+)?\.json|.*\.ya?ml|.*\.toml|.*\.json|.*\.gradle(\.kts)?)$')
  snapshot_count=$(spw_count_matching_lines "$staged_all" '__tests__/snapshots/')
  other_count=$((total - source_count - spw_count - docs_count - config_count))
  if [ "$other_count" -lt 0 ]; then
    other_count=0
  fi

  diffstat="$(git diff --cached --stat --compact-summary 2>/dev/null || true)"

  echo ""
  echo "┌──────────────────────────────────────────────────────┐"
  printf '│  Pre-Commit Gate  [%s file(s)]  agent=%-10s│\n' "$total" "$agent"
  echo "└──────────────────────────────────────────────────────┘"
  echo ""
  printf '  Summary: source=%s spw=%s docs=%s config=%s snapshot=%s other=%s\n' \
    "$source_count" "$spw_count" "$docs_count" "$config_count" "$snapshot_count" "$other_count"
  printf '  Provenance: actor=%s source=%s confidence=%s\n' \
    "$agent" "$agent_source" "$agent_confidence"
  if [ -n "$diffstat" ]; then
    echo ""
    echo "  Diffstat:"
    printf '%s\n' "$diffstat" | sed 's/^/    /'
  fi
  if [ -n "$report" ]; then
    echo ""
    printf '%b' "$report"
  fi
  echo ""
  if [ "$errors" -gt 0 ]; then
    echo "  ⛔ $errors error(s) found."
  fi
  if [ "$warnings" -gt 0 ]; then
    echo "  ⚠  $warnings warning(s) found."
  fi
  echo ""
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  spw_render_commit_review
fi
