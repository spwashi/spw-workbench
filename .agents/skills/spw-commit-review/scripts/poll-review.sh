#!/usr/bin/env bash
# poll-review.sh — Fast, repeatable commit-review checks on staged/changed files.
#
# Why:
#   Pre-commit hooks are late feedback. This script lets you poll the same
#   classes of checks continuously while editing.
#
# Usage:
#   bash .agents/skills/spw-commit-review/scripts/poll-review.sh
#   bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed
#   bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=staged --watch --interval=15
#   bash .agents/skills/spw-commit-review/scripts/poll-review.sh --fuzz=ship --fuzz-level=error

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT_DIR"

SCOPE="staged"         # staged | changed
WATCH=0                # 0 | 1
INTERVAL=20            # seconds
FUZZ_PROFILE="stabilize"
FUZZ_LEVEL=""
RUN_FUZZ=1
RUN_SPW=1
RUN_LINT=1
RUN_GEN_HINTS=0

usage() {
  cat <<'EOF'
Usage:
  bash .agents/skills/spw-commit-review/scripts/poll-review.sh [options]

Options:
  --scope=staged|changed     File selection scope (default: staged)
  --watch                    Keep polling in a loop
  --interval=<seconds>       Poll interval for --watch (default: 20)
  --fuzz=<profile>           Fuzz profile for TS files (default: stabilize)
  --fuzz-level=<level>       Optional FUZZ_LEVEL (profile|warn|error)
  --no-fuzz                  Skip fuzz pass
  --no-lint                  Skip base ESLint pass
  --no-spw                   Skip .spw parser/gen checks
  --gen-hints                Show optional Gen 1/2 syntax hints for .spw files
  -h, --help                 Show help
EOF
}

for arg in "$@"; do
  case "$arg" in
    --scope=*) SCOPE="${arg#*=}" ;;
    --watch) WATCH=1 ;;
    --interval=*) INTERVAL="${arg#*=}" ;;
    --fuzz=*) FUZZ_PROFILE="${arg#*=}" ;;
    --fuzz-level=*) FUZZ_LEVEL="${arg#*=}" ;;
    --no-fuzz) RUN_FUZZ=0 ;;
    --no-lint) RUN_LINT=0 ;;
    --no-spw) RUN_SPW=0 ;;
    --gen-hints) RUN_GEN_HINTS=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg"; usage; exit 2 ;;
  esac
done

if [[ "$SCOPE" != "staged" && "$SCOPE" != "changed" ]]; then
  echo "Invalid --scope: $SCOPE (expected staged|changed)"
  exit 2
fi

collect_files() {
  if [[ "$SCOPE" == "staged" ]]; then
    git diff --cached --name-only --diff-filter=ACMR
    return
  fi

  {
    git diff --name-only --diff-filter=ACMR
    git diff --cached --name-only --diff-filter=ACMR
    git ls-files --others --exclude-standard
  } | sort -u
}

collect_matching() {
  local pattern="$1"
  local files=()
  while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    if [[ "$file" =~ $pattern ]]; then
      files+=("$file")
    fi
  done
  printf '%s\n' "${files[@]-}"
}

check_spw_generation() {
  local file="$1"
  local g1_count g2_meta_count g2_valence_count
  g1_count=$(grep -c '^\^"' "$file" 2>/dev/null || true)
  g2_meta_count=$(grep -c '@domain:' "$file" 2>/dev/null || true)
  g2_valence_count=0

  if [[ "$file" != .agents/* ]]; then
    g2_valence_count=$(grep -c '~#' "$file" 2>/dev/null || true)
  fi

  if [[ "$g1_count" -gt 0 || "$g2_meta_count" -gt 0 || "$g2_valence_count" -gt 0 ]]; then
    echo "⚠ syntax-generation hints in $file"
    [[ "$g1_count" -gt 0 ]] && echo "  - Gen 1 (^\"...\"): $g1_count"
    [[ "$g2_meta_count" -gt 0 ]] && echo "  - Gen 2 meta (@domain:): $g2_meta_count"
    [[ "$g2_valence_count" -gt 0 ]] && echo "  - Gen 2 valence (~#): $g2_valence_count"
  fi
}

run_once() {
  local status=0
  local files=()
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    files+=("$line")
  done < <(collect_files | sed '/^$/d' | sort -u)

  echo ""
  echo "== poll-review ($(date '+%Y-%m-%d %H:%M:%S')) scope=$SCOPE =="

  if [[ "${#files[@]}" -eq 0 ]]; then
    echo "No files in scope."
    return 0
  fi

  local ts_files=()
  local spw_files=()
  local golden_files=()

  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    ts_files+=("$line")
  done < <(printf '%s\n' "${files[@]}" | collect_matching '^src/.*\.(ts|tsx|js|jsx)$' | sed '/^$/d')

  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    spw_files+=("$line")
  done < <(printf '%s\n' "${files[@]}" | collect_matching '\.spw$' | sed '/^$/d')

  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    golden_files+=("$line")
  done < <(printf '%s\n' "${files[@]}" | collect_matching '__tests__/snapshots/' | sed '/^$/d')

  if [[ "${#ts_files[@]}" -gt 0 && "$RUN_LINT" -eq 1 ]]; then
    echo "-- eslint (changed source files)"
    if ! npx eslint "${ts_files[@]}"; then
      status=1
    fi
  fi

  if [[ "${#ts_files[@]}" -gt 0 && "$RUN_FUZZ" -eq 1 ]]; then
    echo "-- fuzz ($FUZZ_PROFILE${FUZZ_LEVEL:+, level=$FUZZ_LEVEL})"
    if [[ -n "$FUZZ_LEVEL" ]]; then
      if ! FUZZ="$FUZZ_PROFILE" FUZZ_LEVEL="$FUZZ_LEVEL" npx eslint "${ts_files[@]}"; then
        status=1
      fi
    else
      if ! FUZZ="$FUZZ_PROFILE" npx eslint "${ts_files[@]}"; then
        status=1
      fi
    fi
  fi

  if [[ "${#spw_files[@]}" -gt 0 && "$RUN_SPW" -eq 1 ]]; then
    echo "-- .spw parser checks"
    for file in "${spw_files[@]}"; do
      if [[ "$RUN_GEN_HINTS" -eq 1 ]]; then
        check_spw_generation "$file"
      fi
      if ! npm run lint:spw -- "$file" >/dev/null; then
        echo "⛔ .spw parse failed: $file"
        status=1
      fi
    done
  fi

  if [[ "${#golden_files[@]}" -gt 0 ]]; then
    echo "⚠ golden snapshots modified: ${#golden_files[@]} file(s)"
    printf '  - %s\n' "${golden_files[@]}"
  fi

  if [[ "$status" -eq 0 ]]; then
    echo "✓ poll-review clean"
  else
    echo "⛔ poll-review found issues"
  fi
  return "$status"
}

if [[ "$WATCH" -eq 1 ]]; then
  while true; do
    run_once || true
    sleep "$INTERVAL"
  done
fi

run_once
