#!/usr/bin/env bash
# poll-review.sh — Fast, repeatable commit-review checks on staged/changed files.
#
# Why:
#   Pre-commit hooks are late feedback. This script lets you poll the same
#   classes of checks continuously while editing, with Spw-style summaries.
#
# Usage:
#   bash .agents/skills/spw-commit-review/scripts/poll-review.sh
#   bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed
#   bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=staged --watch --interval=15
#   bash .agents/skills/spw-commit-review/scripts/poll-review.sh --fuzz=ship --fuzz-level=error

set -euo pipefail

WORKBENCH_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
ROOT_DIR="${SPW_REPO_ROOT_OVERRIDE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
SCRIPT_PATH=".agents/skills/spw-commit-review/scripts/poll-review.sh"

SPW_SCRIPT_NAME="CommitReview.Poll"
SPW_SCRIPT_USAGE="[options]"
export SPW_REPO_ROOT_OVERRIDE="$ROOT_DIR"
export SPW_TOOL_ROOT_OVERRIDE="${SPW_TOOL_ROOT_OVERRIDE:-$WORKBENCH_ROOT}"
source "${SPW_TOOL_ROOT_OVERRIDE}/scripts/spw-lib.sh"
# shellcheck source=/dev/null
source "${SPW_TOOL_ROOT_OVERRIDE}/scripts/commit-review/lib/agent-context.sh"
# shellcheck source=/dev/null
source "${SPW_TOOL_ROOT_OVERRIDE}/scripts/commit-review/run-review.sh"
spw_parse_args "$@"

cd "$ROOT_DIR"
spw_resolve_agent_context "$ROOT_DIR"
AGENT_CONTEXT_LABEL="${AGENT_CONTEXT_ACTOR:-human}"
AGENT_CONTEXT_SOURCE_LABEL="${AGENT_CONTEXT_SOURCE:-heuristic}"
AGENT_CONTEXT_CONFIDENCE_LABEL="${AGENT_CONTEXT_CONFIDENCE:-low}"

SCOPE="staged"         # staged | changed
WATCH=0                # 0 | 1
INTERVAL=20            # seconds
FUZZ_PROFILE="stabilize"
FUZZ_LEVEL=""
RUN_FUZZ=1
RUN_SPW=1
RUN_LINT=1
RUN_SYNTAX_REVIEW=1
SHOW_AFFORDANCES=1
WRITE_STATE="${SPW_STATE_ENABLED:-1}"
STATE_DIR=".agents/state/runtime"
STATE_FILE="$STATE_DIR/poll-review.state.spw"
STATE_HISTORY_FILE="$STATE_DIR/poll-review.history.tsv"
STATE_BUS_FILE="$STATE_DIR/register-bus.state.spw"
STATE_MAX_RECENT=8
STATE_WRITE_WARNED=0

usage() {
  spw_print_help "$(cat <<'EOF'
Poll-review options:
  --scope=staged|changed     File selection scope (default: staged)
  --watch                    Keep polling in a loop
  --interval=<seconds>       Poll interval for --watch (default: 20)
  --fuzz=<profile>           Fuzz profile for source files (default: stabilize)
  --fuzz-level=<level>       Optional FUZZ_LEVEL (profile|warn|error)
  --no-fuzz                  Skip fuzz pass
  --no-lint                  Skip base ESLint pass
  --no-spw                   Skip .spw parser/gen checks
  --syntax-review            Force syntax review on .spw files (default: on)
  --no-syntax-review         Skip profile-based syntax review for .spw files
  --no-affordances           Skip affordance command hints
  --no-state                 Skip writing runtime register snapshots
EOF
)"
}

for arg in "${SPW_POSITIONAL[@]-}"; do
  [[ -n "$arg" ]] || continue
  case "$arg" in
    --scope=*) SCOPE="${arg#*=}" ;;
    --watch) WATCH=1 ;;
    --interval=*) INTERVAL="${arg#*=}" ;;
    --fuzz=*) FUZZ_PROFILE="${arg#*=}" ;;
    --fuzz-level=*) FUZZ_LEVEL="${arg#*=}" ;;
    --no-fuzz) RUN_FUZZ=0 ;;
    --no-lint) RUN_LINT=0 ;;
    --no-spw) RUN_SPW=0 ;;
    --syntax-review|--gen-hints) RUN_SYNTAX_REVIEW=1 ;;
    --no-syntax-review) RUN_SYNTAX_REVIEW=0 ;;
    --no-affordances) SHOW_AFFORDANCES=0 ;;
    --no-state) WRITE_STATE=0 ;;
    -h|--help) SPW_HELP=1 ;;
    *)
      echo "Unknown option: $arg"
      usage
      exit 2
      ;;
  esac
done

if [ $SPW_HELP -eq 1 ]; then
  usage
  exit 0
fi

if [[ "$SCOPE" != "staged" && "$SCOPE" != "changed" ]]; then
  spw_bonk "Invalid --scope: $SCOPE (expected staged|changed)"
  exit 2
fi

collect_files() {
  local path

  if [[ "$SCOPE" == "staged" ]]; then
    git diff --cached --name-only --diff-filter=ACMR | while IFS= read -r path; do
      [[ -n "$path" ]] || continue
      if filter_path "$path"; then
        printf '%s\n' "$path"
      fi
    done
    return
  fi

  {
    git diff --name-only --diff-filter=ACMR
    git diff --cached --name-only --diff-filter=ACMR
    git ls-files --others --exclude-standard
  } | sed '/^$/d' | sort -u | while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    if filter_path "$path"; then
      printf '%s\n' "$path"
    fi
  done
}

collect_matching() {
  local pattern="$1"
  local file
  local files=()
  while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    if [[ "$file" =~ $pattern ]]; then
      files+=("$file")
    fi
  done
  printf '%s\n' "${files[@]-}"
}

summarize_agent_spw_file() {
  local file="$1"
  local sections stream open
  sections=$(grep -c '^\^' "$file" 2>/dev/null || true)
  stream=$(grep -c '^>>' "$file" 2>/dev/null || true)
  open=$(grep -c '^?' "$file" 2>/dev/null || true)
  spw_boon ".agents plan surface: $file (sections:${sections:-0} stream:${stream:-0} open:${open:-0})"
}

run_syntax_review() {
  local review_scope="$1"
  shift

  [[ "$RUN_SYNTAX_REVIEW" -eq 1 ]] || return 0
  [[ "$#" -gt 0 ]] || return 0

  local output
  local syntax_loader="${SPW_TOOL_ROOT_OVERRIDE}/node_modules/tsx/dist/loader.mjs"
  local syntax_entry="${SPW_TOOL_ROOT_OVERRIDE}/.agents/skills/spw-commit-review/scripts/spw-syntax-review.ts"
  if ! output="$(node --import "$syntax_loader" "$syntax_entry" --scope="$review_scope" --format=text -- "$@" 2>&1)"; then
    spw_bonk "syntax review failed"
    printf '%s\n' "$output"
    return 1
  fi

  if [[ -n "$output" ]]; then
    printf '%s\n' "$output"
  fi
}

emit_affordances() {
  if [[ "$SHOW_AFFORDANCES" -ne 1 ]]; then
    return
  fi

  spw_affordances_open
  spw_affordance "bash $SCRIPT_PATH --scope=changed" "single-pass changed-file review"
  spw_affordance "bash $SCRIPT_PATH --scope=staged" "pre-commit staged-file review"
  spw_affordance "bash $SCRIPT_PATH --scope=changed --watch --interval=15" "continuous review loop"
  spw_affordance "bash $SCRIPT_PATH --scope=staged --fuzz=ship --fuzz-level=error" "strict release-profile pass"
  local match_count=0
  local exclude_count=0
  if [[ "${SPW_MATCH+set}" == "set" ]]; then
    match_count=${#SPW_MATCH[@]}
  fi
  if [[ "${SPW_EXCLUDE+set}" == "set" ]]; then
    exclude_count=${#SPW_EXCLUDE[@]}
  fi

  if [[ "$match_count" -gt 0 || "$exclude_count" -gt 4 ]]; then
    spw_affordance "bash $SCRIPT_PATH --scope=changed --match=seed --exclude=docs" "scope probes with shared filters"
  fi
  spw_affordances_close
}

bool_token() {
  if [[ "$1" -eq 1 ]]; then
    echo "true"
  else
    echo "false"
  fi
}

stat_epoch() {
  local target="$1"
  if stat -f '%m' "$target" >/dev/null 2>&1; then
    stat -f '%m' "$target"
    return
  fi
  stat -c '%Y' "$target" 2>/dev/null || echo "0"
}

stat_size() {
  local target="$1"
  if stat -f '%z' "$target" >/dev/null 2>&1; then
    stat -f '%z' "$target"
    return
  fi
  stat -c '%s' "$target" 2>/dev/null || echo "0"
}

extract_quoted_field() {
  local target="$1"
  local field="$2"
  local line
  line="$(grep -E "^[[:space:]]*$field:[[:space:]]*\"[^\"]*\"" "$target" 2>/dev/null | head -n 1 || true)"
  if [[ -n "$line" ]]; then
    printf '%s\n' "$line" | sed -E 's/^[^"]*"([^"]*)".*/\1/'
    return
  fi
  echo ""
}

extract_number_field() {
  local target="$1"
  local field="$2"
  local line
  line="$(grep -E "^[[:space:]]*$field:[[:space:]]*[0-9]+" "$target" 2>/dev/null | head -n 1 || true)"
  if [[ -n "$line" ]]; then
    printf '%s\n' "$line" | sed -E 's/^[^0-9]*([0-9]+).*/\1/'
    return
  fi
  echo ""
}

extract_bool_field() {
  local target="$1"
  local field="$2"
  local line
  line="$(grep -E "^[[:space:]]*$field:[[:space:]]*(true|false)" "$target" 2>/dev/null | head -n 1 || true)"
  if [[ -n "$line" ]]; then
    printf '%s\n' "$line" | sed -E 's/^[^:]*:[[:space:]]*(true|false).*/\1/'
    return
  fi
  echo ""
}

normalized_summary_payload() {
  local target="$1"
  local n_status n_scope n_watch n_interval
  local n_total n_source n_spw n_golden
  local n_lint n_fuzz n_spw_parse n_golden_check n_nearby

  n_status="$(extract_quoted_field "$target" "status")"
  n_scope="$(extract_quoted_field "$target" "scope")"
  n_watch="$(extract_bool_field "$target" "watch")"
  n_interval="$(extract_number_field "$target" "interval_seconds")"
  n_total="$(extract_number_field "$target" "total_files")"
  n_source="$(extract_number_field "$target" "source_files")"
  n_spw="$(extract_number_field "$target" "spw_files")"
  n_golden="$(extract_number_field "$target" "golden_files")"
  n_lint="$(extract_quoted_field "$target" "lint")"
  n_fuzz="$(extract_quoted_field "$target" "fuzz")"
  n_spw_parse="$(extract_quoted_field "$target" "spw_parse")"
  n_golden_check="$(extract_quoted_field "$target" "golden")"
  n_nearby="$(grep -c ' path: "' "$target" 2>/dev/null || true)"

  [[ -n "$n_status" ]] || n_status="unknown"
  [[ -n "$n_scope" ]] || n_scope="unknown"
  [[ -n "$n_watch" ]] || n_watch="false"
  [[ -n "$n_interval" ]] || n_interval="0"
  [[ -n "$n_total" ]] || n_total="0"
  [[ -n "$n_source" ]] || n_source="0"
  [[ -n "$n_spw" ]] || n_spw="0"
  [[ -n "$n_golden" ]] || n_golden="0"
  [[ -n "$n_lint" ]] || n_lint="unknown"
  [[ -n "$n_fuzz" ]] || n_fuzz="unknown"
  [[ -n "$n_spw_parse" ]] || n_spw_parse="unknown"
  [[ -n "$n_golden_check" ]] || n_golden_check="unknown"
  [[ -n "$n_nearby" ]] || n_nearby="0"

  echo "{ status: \"$n_status\", scope: \"$n_scope\", watch: $n_watch, interval_seconds: $n_interval, total_files: $n_total, source_files: $n_source, spw_files: $n_spw, golden_files: $n_golden, lint: \"$n_lint\", fuzz: \"$n_fuzz\", spw_parse: \"$n_spw_parse\", golden: \"$n_golden_check\", nearby_refs: $n_nearby }"
}

warn_state_skip() {
  if [[ "$STATE_WRITE_WARNED" -eq 0 ]]; then
    spw_bone "state write skipped: $1"
    STATE_WRITE_WARNED=1
  fi
}

persist_register_bus() {
  local run_stamp="$1"
  local run_status="$2"
  local tmp_bus
  local entries=()
  local file
  local repo_ref_root

  repo_ref_root="$(spw_repo_rel_from_dir "$STATE_DIR")"

  if ! tmp_bus="$(mktemp "${TMPDIR:-/tmp}/poll-review-bus.XXXXXX")"; then
    warn_state_skip "cannot allocate temporary register-bus file"
    return
  fi

  while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    entries+=("$file")
  done < <(find "$STATE_DIR" -maxdepth 1 -type f -name '*.state.spw' ! -name "$(basename "$STATE_BUS_FILE")" | sort)

  {
    echo "# register bus runtime state"
    echo "# generated by $SCRIPT_PATH"
    echo ""
    echo "^\"roots\"{"
    echo "  @repo: ~\"$repo_ref_root\""
    echo "}"
    echo ""
    echo "^\"register_bus\"{"
    echo "  runtime: \"agents.state.bus\","
    echo "  schema: \"spw.register-bus.v1\","
    echo "  updated_at: \"$run_stamp\","
    echo "  hot_reload_token: \"$run_stamp\","
    echo "  entries: ${#entries[@]}"
    echo "}"
    echo ""
    echo "^\"sources\"{"
    echo "  files: ["
    for file in "${entries[@]}"; do
      local rel
      local ref
      local skill_id
      local mtime_epoch
      local bytes
      local summary
      rel="${file#$ROOT_DIR/}"
      ref="$(spw_path_ref "$file" "$STATE_DIR")"
      skill_id="$(basename "$file" '.state.spw')"
      mtime_epoch="$(stat_epoch "$file")"
      bytes="$(stat_size "$file")"
      summary="$(normalized_summary_payload "$file")"
      echo "    { id: \"$skill_id\", path: \"$rel\", ref: $ref, mtime_epoch: $mtime_epoch, bytes: $bytes, status: \"present\", summary: $summary },"
    done
    echo "  ]"
  echo "}"
    echo ""
    echo "^\"writer\"{"
    echo "  source: \"commit-review.poll\","
    echo "  last_status: \"$run_status\""
    echo "}"
  } > "$tmp_bus"

  if ! spw_resilient_install_file "$tmp_bus" "$STATE_BUS_FILE" "spw"; then
    warn_state_skip "cannot install register bus snapshot into $STATE_BUS_FILE"
  fi
}

persist_poll_state() {
  if [[ "$WRITE_STATE" -ne 1 ]]; then
    return
  fi

  local run_stamp="$1"
  local run_status="$2"
  local total="$3"
  local source_count="$4"
  local spw_count="$5"
  local golden_count="$6"
  local lint_state="$7"
  local fuzz_state="$8"
  local spw_state="$9"
  local golden_state="${10}"
  local nearby_refs="${11}"
  local repo_ref_root

  repo_ref_root="$(spw_repo_rel_from_dir "$STATE_DIR")"

  if ! mkdir -p "$STATE_DIR" 2>/dev/null; then
    warn_state_skip "cannot create $STATE_DIR (use --no-state to silence)"
    return
  fi

  local tmp_history
  if ! tmp_history="$(mktemp "${TMPDIR:-/tmp}/poll-review-history.XXXXXX")"; then
    warn_state_skip "cannot allocate temporary history file"
    return
  fi
  {
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$run_stamp" "$run_status" "$SCOPE" "$WATCH" "$INTERVAL" \
      "$total" "$source_count" "$spw_count" "$golden_count" \
      "$lint_state" "$fuzz_state" "$spw_state" "$golden_state"
    if [[ -f "$STATE_HISTORY_FILE" ]]; then
      cat "$STATE_HISTORY_FILE"
    fi
  } | head -n "$STATE_MAX_RECENT" > "$tmp_history"
  if ! spw_resilient_install_file "$tmp_history" "$STATE_HISTORY_FILE" "plain"; then
    warn_state_skip "cannot install history cache into $STATE_HISTORY_FILE"
    return
  fi

  local tmp_state
  if ! tmp_state="$(mktemp "${TMPDIR:-/tmp}/poll-review-state.XXXXXX")"; then
    warn_state_skip "cannot allocate temporary state file"
    return
  fi
  {
    echo "# poll-review runtime state"
    echo "# generated by $SCRIPT_PATH"
    echo ""
    echo "^\"roots\"{"
    echo "  @repo: ~\"$repo_ref_root\""
    echo "}"
    echo ""
    echo "^\"register_state\"{"
    echo "  runtime: \"commit-review.poll\","
    echo "  schema: \"spw.poll-state.v1\","
    echo "  updated_at: \"$run_stamp\","
    echo "  hot_reload_token: \"$run_stamp\","
    echo "  scope: \"$SCOPE\","
    echo "  watch: $(bool_token "$WATCH"),"
    echo "  interval_seconds: $INTERVAL,"
    echo "  status: \"$run_status\""
    echo "}"
    echo ""
    echo "^\"inventory\"{"
    echo "  total_files: $total,"
    echo "  source_files: $source_count,"
    echo "  spw_files: $spw_count,"
    echo "  golden_files: $golden_count"
    echo "}"
    echo ""
    echo "^\"checks\"{"
    echo "  lint: \"$lint_state\","
    echo "  fuzz: \"$fuzz_state\","
    echo "  spw_parse: \"$spw_state\","
    echo "  golden: \"$golden_state\""
    echo "}"
    echo ""
    echo "^\"nearby_spw\"{"
    echo "  files: ["
    spw_emit_nearby_spw_entries "$nearby_refs" 8 "$STATE_DIR"
    echo "  ]"
    echo "}"
    echo ""
    echo "^\"recent_runs\"{"
    echo "  entries: ["
    while IFS=$'\t' read -r h_at h_status h_scope h_watch h_interval h_total h_source h_spw h_golden h_lint h_fuzz h_spw_state h_golden_state; do
      [[ -n "$h_at" ]] || continue
      echo "    { at: \"$h_at\", status: \"$h_status\", scope: \"$h_scope\", watch: $(bool_token "$h_watch"), interval_seconds: $h_interval, total_files: $h_total, source_files: $h_source, spw_files: $h_spw, golden_files: $h_golden, lint: \"$h_lint\", fuzz: \"$h_fuzz\", spw_parse: \"$h_spw_state\", golden: \"$h_golden_state\" },"
    done < "$STATE_HISTORY_FILE"
    echo "  ]"
    echo "}"
  } > "$tmp_state"
  if ! spw_resilient_install_file "$tmp_state" "$STATE_FILE" "spw"; then
    warn_state_skip "cannot install state snapshot into $STATE_FILE"
    return
  fi

  persist_register_bus "$run_stamp" "$run_status"
}

run_once() {
  local status=0
  local run_stamp_iso
  local shared_review_status="skipped"
  run_stamp_iso="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  local files=()
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    files+=("$line")
  done < <(collect_files | sed '/^$/d' | sort -u)
  local nearby_refs
  nearby_refs="$(printf '%s\n' "${files[@]-}" | sed '/^$/d' | awk -F/ 'NF { print $1 }' | sort -u | paste -sd';' -)"
  if [[ -z "$nearby_refs" ]]; then
    nearby_refs="src;docs;lib;.agents"
  fi

  echo ""
  spw_section_open "poll_review"
  spw_facet_open "run"
  echo "    at = \`$run_stamp_iso\`"
  echo "    scope = \`$SCOPE\`"
  echo "    watch = $WATCH"
  echo "    actor = \`$AGENT_CONTEXT_LABEL\`"
  echo "    actor_source = \`$AGENT_CONTEXT_SOURCE_LABEL\`"
  echo "    actor_confidence = \`$AGENT_CONTEXT_CONFIDENCE_LABEL\`"
  echo "    fuzz_profile = \`$FUZZ_PROFILE${FUZZ_LEVEL:+:$FUZZ_LEVEL}\`"
  spw_facet_close

  if [[ "${#files[@]}" -eq 0 ]]; then
    spw_bone "No files in scope."
    persist_poll_state "$run_stamp_iso" "idle" 0 0 0 0 "none" "none" "none" "clear" "$nearby_refs"
    spw_section_close
    return 0
  fi

  local ts_files=()
  local spw_files=()
  local agent_spw_files=()
  local strata_spw_files=()
  local golden_files=()
  local lint_status="disabled"
  local fuzz_status="disabled"
  local spw_status="disabled"
  local golden_status="clear"

  if [[ "$RUN_LINT" -eq 1 ]]; then lint_status="none"; fi
  if [[ "$RUN_FUZZ" -eq 1 ]]; then fuzz_status="none"; fi
  if [[ "$RUN_SPW" -eq 1 ]]; then spw_status="none"; fi

  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    ts_files+=("$line")
  done < <(printf '%s\n' "${files[@]}" | collect_matching '^src/.*\.(ts|tsx|js|jsx)$' | sed '/^$/d')

  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    spw_files+=("$line")
    if [[ "$line" == .agents/* ]]; then
      agent_spw_files+=("$line")
    else
      strata_spw_files+=("$line")
    fi
  done < <(printf '%s\n' "${files[@]}" | collect_matching '\.spw$' | sed '/^$/d')

  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    golden_files+=("$line")
  done < <(printf '%s\n' "${files[@]}" | collect_matching '__tests__/snapshots/' | sed '/^$/d')

  spw_set_open "scope_inventory"
  echo "    .{ total = ${#files[@]}, source = ${#ts_files[@]}, spw = ${#spw_files[@]}, golden = ${#golden_files[@]} }"
  spw_set_close

  if [[ "$SCOPE" == "staged" ]]; then
    SPW_COMMIT_REVIEW_AGENT="$AGENT_CONTEXT_LABEL" spw_commit_review_run
    if [[ "${REVIEW_TOTAL:-0}" -gt 0 ]]; then
      spw_honk "shared commit gate review (${REVIEW_TOTAL} files)"
      printf '%b' "${REVIEW_REPORT:-}"
      if [[ "${REVIEW_ERRORS:-0}" -gt 0 ]]; then
        shared_review_status="fail"
        status=1
      elif [[ "${REVIEW_WARNINGS:-0}" -gt 0 ]]; then
        shared_review_status="warn"
      else
        shared_review_status="pass"
      fi
    else
      shared_review_status="idle"
    fi
  fi

  if [[ "${#ts_files[@]}" -gt 0 && "$RUN_LINT" -eq 1 ]]; then
    spw_honk "eslint source pass (${#ts_files[@]} files)"
    if ! npx eslint "${ts_files[@]}"; then
      lint_status="fail"
      status=1
    else
      lint_status="pass"
    fi
  fi

  if [[ "${#ts_files[@]}" -gt 0 && "$RUN_FUZZ" -eq 1 ]]; then
    spw_honk "fuzz pass ($FUZZ_PROFILE${FUZZ_LEVEL:+, level=$FUZZ_LEVEL})"
    if [[ -n "$FUZZ_LEVEL" ]]; then
      if ! FUZZ="$FUZZ_PROFILE" FUZZ_LEVEL="$FUZZ_LEVEL" npx eslint "${ts_files[@]}"; then
        fuzz_status="fail"
        status=1
      else
        fuzz_status="pass"
      fi
    else
      if ! FUZZ="$FUZZ_PROFILE" npx eslint "${ts_files[@]}"; then
        fuzz_status="fail"
        status=1
      else
        fuzz_status="pass"
      fi
    fi
  fi

  if [[ "${#spw_files[@]}" -gt 0 && "$RUN_SPW" -eq 1 ]]; then
    if [[ "${#agent_spw_files[@]}" -gt 0 && "$SCOPE" != "staged" ]]; then
      spw_honk ".agents plan surfaces (${#agent_spw_files[@]} files)"
      for file in "${agent_spw_files[@]}"; do
        summarize_agent_spw_file "$file"
      done
      if [[ "$spw_status" != "fail" ]]; then
        spw_status="pass"
      fi
    fi

    if [[ "${#strata_spw_files[@]}" -gt 0 ]]; then
      spw_honk ".spw parser checks (${#strata_spw_files[@]} files)"
      for file in "${strata_spw_files[@]}"; do
        if ! SPW_STATE_VALIDATE_MODE=strict spw_validate_spw_file "$file"; then
          spw_status="fail"
          spw_bonk ".spw parse failed: $file"
          status=1
        elif [[ "$spw_status" != "fail" ]]; then
          spw_status="pass"
        fi
      done
    fi

    if [[ "$spw_status" != "fail" && "$RUN_SYNTAX_REVIEW" -eq 1 ]]; then
      spw_honk ".spw syntax review (${#spw_files[@]} files)"
      if ! run_syntax_review "$SCOPE" "${spw_files[@]}"; then
        spw_status="fail"
        status=1
      elif [[ "$spw_status" == "none" ]]; then
        spw_status="pass"
      fi
    fi
  fi

  if [[ "${#golden_files[@]}" -gt 0 && "$SCOPE" != "staged" ]]; then
    golden_status="warn"
    spw_bone "golden snapshots modified: ${#golden_files[@]} file(s)"
    printf '  - %s\n' "${golden_files[@]}"
  fi

  if [[ "$status" -eq 0 ]]; then
    spw_boon "poll-review clean"
    persist_poll_state \
      "$run_stamp_iso" "clean" \
      "${#files[@]}" "${#ts_files[@]}" "${#spw_files[@]}" "${#golden_files[@]}" \
      "$lint_status" "$fuzz_status" "$spw_status" "$golden_status" "$nearby_refs"
  else
    spw_bonk "poll-review found issues"
    persist_poll_state \
      "$run_stamp_iso" "issue" \
      "${#files[@]}" "${#ts_files[@]}" "${#spw_files[@]}" "${#golden_files[@]}" \
      "$lint_status" "$fuzz_status" "$spw_status" "$golden_status" "$nearby_refs"
  fi
  spw_section_close
  return "$status"
}

spw_seed "$SPW_SCRIPT_NAME" "1.2" "review_probe"
spw_facet_open "settings"
echo "    scope = \`$SCOPE\`"
echo "    watch = $WATCH"
echo "    interval_seconds = $INTERVAL"
echo "    run_lint = $RUN_LINT"
echo "    run_fuzz = $RUN_FUZZ"
echo "    run_spw = $RUN_SPW"
echo "    syntax_review = $RUN_SYNTAX_REVIEW"
echo "    write_state = $WRITE_STATE"
if [[ "$WRITE_STATE" -eq 1 ]]; then
  echo "    state_file = \`$STATE_FILE\`"
  echo "    state_bus_file = \`$STATE_BUS_FILE\`"
fi
spw_facet_close
emit_affordances

if [[ "$WATCH" -eq 1 ]]; then
  while true; do
    run_once || true
    sleep "$INTERVAL"
  done
fi

run_once
