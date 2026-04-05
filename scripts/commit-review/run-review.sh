#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SPW_REPO_ROOT_OVERRIDE:-$(git rev-parse --show-toplevel 2>/dev/null || { cd "$SCRIPT_DIR/../.." && pwd; })}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib/agent-context.sh"

spw_commit_review_cgrep() {
  local content="$1" pattern="$2" count
  count=$(printf '%s\n' "$content" | grep -c "$pattern" 2>/dev/null) || count=0
  printf '%s\n' "$count"
}

spw_commit_review_run() {
  local staged_all total report warnings errors
  local ts_files spw_files agent_spw strata_spw golden
  local f content bad ac hs hw ho sc fw g1 gm gv hf hs2 hb hr gc

  spw_resolve_agent_context "$REPO_ROOT"
  REVIEW_AGENT="${SPW_COMMIT_REVIEW_AGENT:-$AGENT_CONTEXT_ACTOR}"
  REVIEW_AGENT_SOURCE="${AGENT_CONTEXT_SOURCE:-heuristic}"
  REVIEW_AGENT_CONFIDENCE="${AGENT_CONTEXT_CONFIDENCE:-low}"
  REVIEW_STAGED_ALL="$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)"

  if [ -z "$REVIEW_STAGED_ALL" ]; then
    REVIEW_TOTAL=0
    REVIEW_WARNINGS=0
    REVIEW_ERRORS=0
    REVIEW_REPORT=""
    return 0
  fi

  total=$(printf '%s\n' "$REVIEW_STAGED_ALL" | sed '/^$/d' | wc -l | tr -d ' ')
  report=""
  warnings=0
  errors=0

  ts_files=$(printf '%s\n' "$REVIEW_STAGED_ALL" | grep -E '\.(ts|tsx|js|jsx)$' || true)
  if [ -n "$ts_files" ]; then
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      content=$(git show ":$f" 2>/dev/null || true)
      [ -z "$content" ] && continue
      if printf '%s\n' "$f" | grep -q 'lib/spw/'; then
        bad=$(spw_commit_review_cgrep "$content" "from '@/")
        if [ "$bad" -gt 0 ]; then
          report="${report}  ⛔ ${f} — lib/spw imports from @/ (${bad}×)\n"
          errors=$((errors + bad))
        fi
      fi
    done <<< "$ts_files"
  fi

  spw_files=$(printf '%s\n' "$REVIEW_STAGED_ALL" | grep '\.spw$' | grep -v '__tests__/snapshots/' || true)
  agent_spw=$(printf '%s\n' "$spw_files" | grep '\.agents/' || true)
  strata_spw=$(printf '%s\n' "$spw_files" | grep -v '\.agents/' || true)

  if [ -n "$agent_spw" ]; then
    ac=$(printf '%s\n' "$agent_spw" | sed '/^$/d' | wc -l | tr -d ' ')
    report="${report}  ── .agents plans ($ac) ──\n"
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      content=$(git show ":$f" 2>/dev/null || true)
      [ -z "$content" ] && continue
      hs=$(spw_commit_review_cgrep "$content" '^\^')
      hw=$(spw_commit_review_cgrep "$content" '^>>')
      ho=$(spw_commit_review_cgrep "$content" '^?')
      report="${report}  ✓  ${f} (sections:${hs} stream:${hw} open:${ho})\n"
    done <<< "$agent_spw"
  fi

  if [ -n "$strata_spw" ]; then
    sc=$(printf '%s\n' "$strata_spw" | sed '/^$/d' | wc -l | tr -d ' ')
    report="${report}  ── .spw ($sc) ──\n"
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      content=$(git show ":$f" 2>/dev/null || true)
      [ -z "$content" ] && continue
      fw=""
      g1=$(spw_commit_review_cgrep "$content" '^\^"')
      [ "$g1" -gt 0 ] && fw="${fw}    ⚠  Gen 1: ${g1}× ^\"\n" && warnings=$((warnings + g1))
      gm=$(spw_commit_review_cgrep "$content" '@domain:')
      [ "$gm" -gt 0 ] && fw="${fw}    ○  Gen 2 meta: ${gm}× @domain:\n" && warnings=$((warnings + gm))
      gv=$(spw_commit_review_cgrep "$content" '~#')
      [ "$gv" -gt 0 ] && fw="${fw}    ○  Gen 2 valence: ${gv}× ~#\n" && warnings=$((warnings + gv))
      if [ -n "$fw" ]; then
        report="${report}  📄 ${f}\n${fw}"
      else
        hf=$(spw_commit_review_cgrep "$content" '\. *{')
        hs2=$(spw_commit_review_cgrep "$content" '#\[')
        hb=$(spw_commit_review_cgrep "$content" ' = ')
        hr=$(spw_commit_review_cgrep "$content" '\[reg=')
        if [ "$hf" -gt 0 ] || [ "$hs2" -gt 0 ]; then
          report="${report}  ✓  ${f} (.{}×${hf} #[]×${hs2} =×${hb} [reg=]×${hr})\n"
        else
          report="${report}  ✓  ${f}\n"
        fi
      fi
    done <<< "$strata_spw"
  fi

  golden=$(printf '%s\n' "$REVIEW_STAGED_ALL" | grep '__tests__/snapshots/' || true)
  if [ -n "$golden" ]; then
    gc=$(printf '%s\n' "$golden" | sed '/^$/d' | wc -l | tr -d ' ')
    report="${report}  ⚠  Golden snapshots modified: ${gc} file(s)\n"
    warnings=$((warnings + gc))
  fi

  CHECKS_DIR="$(git rev-parse --git-dir)/hooks/checks.d"
  if [ -d "$CHECKS_DIR" ]; then
    for cs in "$CHECKS_DIR"/*.sh; do
      [ -f "$cs" ] || continue
      local check_name check_output
      check_name=$(basename "$cs" .sh)
      check_output=$(STAGED_ALL="$REVIEW_STAGED_ALL" AGENT="$REVIEW_AGENT" bash "$cs" 2>&1) || true
      [ -n "$check_output" ] && report="${report}  ── ${check_name} ──\n${check_output}\n"
    done
  fi

  REVIEW_TOTAL="$total"
  REVIEW_WARNINGS="$warnings"
  REVIEW_ERRORS="$errors"
  REVIEW_REPORT="$report"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  spw_commit_review_run
  printf '%b' "$REVIEW_REPORT"
  exit "$REVIEW_ERRORS"
fi
