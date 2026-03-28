#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$REPO_ROOT/.agents/scripts/agent-lib.sh"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    fail "expected output to contain [$needle]"
  fi
}

assert_file_contains() {
  local file="$1"
  local needle="$2"
  if ! grep -Fq "$needle" "$file"; then
    fail "expected $file to contain [$needle]"
  fi
}

setup_temp_repo() {
  local tmpdir
  tmpdir="$(mktemp -d /tmp/spw-agent-tools.XXXXXX)"
  mkdir -p "$tmpdir/.agents/plans/_schema" "$tmpdir/.agents/kb"
  cp "$REPO_ROOT/.agents/plans/_schema/plan-template.md" "$tmpdir/.agents/plans/_schema/plan-template.md"
  cp "$REPO_ROOT/.agents/plans/_schema/wip-template.spw" "$tmpdir/.agents/plans/_schema/wip-template.spw"
  cp "$REPO_ROOT/.agents/kb/"*.spw "$tmpdir/.agents/kb/"
  git -C "$tmpdir" init -q
  git -C "$tmpdir" branch -m main
  git -C "$tmpdir" config user.name codex
  git -C "$tmpdir" config user.email codex@example.com
  printf 'seed\n' > "$tmpdir/README.md"
  git -C "$tmpdir" add README.md
  git -C "$tmpdir" commit -q -m "seed"
  printf '%s' "$tmpdir"
}

with_temp_env() {
  AGENT_REPO_ROOT="$1" \
  AGENT_PLANS_DIR="$1/.agents/plans" \
  AGENT_SCHEMA_DIR="$1/.agents/plans/_schema" \
  AGENT_KB_DIR="$1/.agents/kb" \
  bash -lc "source '$REPO_ROOT/.agents/scripts/agent-lib.sh'; $2"
}

test_plan_init() {
  local tmpdir output
  tmpdir="$(setup_temp_repo)"
  output="$(with_temp_env "$tmpdir" "agent_plan_init demo-plan")"
  assert_contains "$output" "Initialized plan"
  assert_file_contains "$tmpdir/.agents/plans/demo-plan/PLAN.md" "# Plan: demo-plan"
  assert_file_contains "$tmpdir/.agents/plans/demo-plan/wip.spw" '@plan: ~".agents/plans/demo-plan/PLAN.md"'
  assert_file_contains "$tmpdir/.agents/plans/demo-plan/wip.spw" '~#base_ref: "main@'
}

test_plan_stream_dry_run_and_append() {
  local tmpdir before dry_run_output
  tmpdir="$(setup_temp_repo)"
  with_temp_env "$tmpdir" "agent_plan_init demo-plan" >/dev/null
  before="$(cat "$tmpdir/.agents/plans/demo-plan/wip.spw")"
  dry_run_output="$(with_temp_env "$tmpdir" "agent_plan_stream --type decide --message 'path /tmp/demo & keep / stable' --slug demo-plan --dry-run --json")"
  assert_contains "$dry_run_output" '"dry_run":true'
  if [ "$before" != "$(cat "$tmpdir/.agents/plans/demo-plan/wip.spw")" ]; then
    fail "dry run mutated wip.spw"
  fi
  with_temp_env "$tmpdir" "agent_plan_stream --type decide --message 'path /tmp/demo & keep / stable' --slug demo-plan" >/dev/null
  assert_file_contains "$tmpdir/.agents/plans/demo-plan/wip.spw" 'path /tmp/demo & keep / stable'
}

test_plan_stream_recognized_by_check() {
  local tmpdir check_json status_json
  tmpdir="$(setup_temp_repo)"
  with_temp_env "$tmpdir" "agent_plan_init demo-plan" >/dev/null
  with_temp_env "$tmpdir" "agent_plan_stream --type observe --message 'fresh stream entry' --slug demo-plan" >/dev/null
  if ! check_json="$(with_temp_env "$tmpdir" "agent_plan_check --slug demo-plan --json")"; then
    fail "expected plan check to pass after writing a fresh stream entry"
  fi
  assert_contains "$check_json" '"ok":true'
  status_json="$(with_temp_env "$tmpdir" "agent_plan_status --slug demo-plan --json")"
  assert_contains "$status_json" '"actual_last_stream":"'
}

test_plan_status_and_check() {
  local tmpdir status_json check_json
  tmpdir="$(setup_temp_repo)"
  with_temp_env "$tmpdir" "agent_plan_init demo-plan" >/dev/null
  status_json="$(with_temp_env "$tmpdir" "agent_plan_status --slug demo-plan --json")"
  assert_contains "$status_json" '"slug":"demo-plan"'
  assert_contains "$status_json" '"issue_count":'
  perl -0pi -e 's/~#open_count: "0"/~#open_count: "9"/' "$tmpdir/.agents/plans/demo-plan/wip.spw"
  if check_json="$(with_temp_env "$tmpdir" "agent_plan_check --slug demo-plan --json")"; then
    fail "expected plan check to fail on open_count drift"
  fi
  assert_contains "$check_json" '"code":"open_count_drift"'
}

test_kb_and_vibe_json() {
  local tmpdir kb_json search_json vibe_json
  tmpdir="$(setup_temp_repo)"
  kb_json="$(with_temp_env "$tmpdir" "agent_kb --json")"
  assert_contains "$kb_json" '"topic":"layering"'
  search_json="$(with_temp_env "$tmpdir" "agent_kb search boon --json")"
  assert_contains "$search_json" '"topic":"valence"'
  vibe_json="$(with_temp_env "$tmpdir" "agent_vibe --json")"
  assert_contains "$vibe_json" '"branch":"main"'
}

main() {
  bash -n "$REPO_ROOT/scripts/agent-tools.sh" "$REPO_ROOT/.agents/scripts/agent-lib.sh"
  test_plan_init
  test_plan_stream_dry_run_and_append
  test_plan_stream_recognized_by_check
  test_plan_status_and_check
  test_kb_and_vibe_json
  echo "agent-tools tests passed"
}

main "$@"
