#!/usr/bin/env bash
# .agents/scripts/agent-lib.sh — shared utility helpers for agentic engineering.

: "${AGENT_REPO_ROOT:=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
: "${AGENT_PLANS_DIR:=$AGENT_REPO_ROOT/.agents/plans}"
: "${AGENT_SCHEMA_DIR:=$AGENT_PLANS_DIR/_schema}"
: "${AGENT_KB_DIR:=$AGENT_REPO_ROOT/.agents/kb}"

agent_fail() {
  echo "Error: $*" >&2
  return 1
}

agent_json_escape() {
  local value="${1-}"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  value="${value//$'\t'/\\t}"
  printf '%s' "$value"
}

agent_trim() {
  local value="${1-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

agent_emit_json_bool() {
  if [ "${1-}" = "1" ] || [ "${1-}" = "true" ]; then
    printf 'true'
  else
    printf 'false'
  fi
}

agent_usage_plan_init() {
  cat <<'EOF'
Usage:
  plan:init --slug <slug>
  plan:init <slug>
EOF
}

agent_usage_plan_stream() {
  cat <<'EOF'
Usage:
  plan:stream --type <type> --message <message> [--slug <slug>] [--dry-run] [--json]
  plan:stream <type> <message> [slug]
EOF
}

agent_usage_plan_status() {
  cat <<'EOF'
Usage:
  plan:status [--slug <slug>] [--json]
EOF
}

agent_usage_plan_check() {
  cat <<'EOF'
Usage:
  plan:check [--slug <slug>] [--json]
EOF
}

agent_usage_kb() {
  cat <<'EOF'
Usage:
  kb [--json]
  kb list [--json]
  kb path <topic> [--json]
  kb search <pattern> [--json]

Topics:
  layering
  taxonomy
  valence
EOF
}

agent_validate_slug() {
  local slug="$1"
  [[ "$slug" =~ ^[a-z0-9][a-z0-9-]*$ ]]
}

agent_validate_stream_type() {
  local type="$1"
  [[ "$type" =~ ^[a-z][a-z0-9_-]*$ ]]
}

agent_has_command() {
  command -v "$1" >/dev/null 2>&1
}

agent_current_main_sha() {
  git -C "$AGENT_REPO_ROOT" rev-parse main 2>/dev/null || git -C "$AGENT_REPO_ROOT" rev-parse HEAD 2>/dev/null || echo "unknown"
}

agent_get_active_branch() {
  git -C "$AGENT_REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main"
}

agent_get_plan_slug() {
  local branch
  branch="$(agent_get_active_branch)"
  if [[ "$branch" == feature/* ]]; then
    echo "${branch#feature/}"
  else
    echo ""
  fi
}

agent_get_plan_dir() {
  local slug
  slug="$(agent_get_plan_slug)"
  if [ -n "$slug" ] && [ -d "$AGENT_PLANS_DIR/$slug" ]; then
    echo "$AGENT_PLANS_DIR/$slug"
  else
    echo ""
  fi
}

agent_resolve_repo_path() {
  local relative_path="$1"
  if [ -z "$relative_path" ]; then
    return 1
  fi
  if [[ "$relative_path" = /* ]]; then
    printf '%s' "$relative_path"
  else
    printf '%s/%s' "$AGENT_REPO_ROOT" "$relative_path"
  fi
}

agent_plan_resolve_dir() {
  local explicit_slug="${1-}"
  if [ -n "$explicit_slug" ]; then
    if ! agent_validate_slug "$explicit_slug"; then
      agent_fail "slug must match ^[a-z0-9][a-z0-9-]*$: $explicit_slug"
      return 1
    fi
    printf '%s/%s' "$AGENT_PLANS_DIR" "$explicit_slug"
    return 0
  fi
  agent_get_plan_dir
}

agent_block_lines() {
  local block="$1"
  local file="$2"
  awk -v block="$block" '
    $0 ~ "^\\^\\[\"" block "\"\\]\\{" {
      in_block = 1
      next
    }
    in_block && /^}/ {
      exit
    }
    in_block {
      print
    }
  ' "$file"
}

agent_plan_cache_value() {
  local key="$1"
  local file="$2"
  sed -n "s/^[[:space:]]*~#${key}: \"\\(.*\\)\"/\\1/p" "$file" | head -n 1
}

agent_plan_root_path() {
  local name="$1"
  local file="$2"
  sed -n "s/^[[:space:]]*@${name}: ~\"\\(.*\\)\"/\\1/p" "$file" | head -n 1
}

agent_plan_last_stream_line() {
  local file="$1"
  agent_block_lines stream "$file" | grep -E '^[[:space:]]*>> \[' | tail -n 1 || true
}

agent_plan_last_stream_timestamp() {
  local line="$1"
  sed -n 's/^[[:space:]]*>> \[\([^]]*\)\].*/\1/p' <<<"$line"
}

agent_plan_count_open_questions() {
  local file="$1"
  local count
  count="$(agent_block_lines open "$file" | grep -c '^[[:space:]]*\?\[' || true)"
  printf '%s' "$count"
}

agent_epoch_from_timestamp() {
  local timestamp="$1"
  if [ -z "$timestamp" ]; then
    return 1
  fi
  if date -j -f '%Y-%m-%d %H:%M' "$timestamp" '+%s' >/dev/null 2>&1; then
    date -j -f '%Y-%m-%d %H:%M' "$timestamp" '+%s'
    return 0
  fi
  if date -d "$timestamp" '+%s' >/dev/null 2>&1; then
    date -d "$timestamp" '+%s'
    return 0
  fi
  return 1
}

agent_hours_since_timestamp() {
  local timestamp="$1"
  local then_epoch
  local now_epoch
  then_epoch="$(agent_epoch_from_timestamp "$timestamp")" || return 1
  now_epoch="$(date '+%s')"
  printf '%s' "$(((now_epoch - then_epoch) / 3600))"
}

agent_kb_topics() {
  printf '%s\n' layering taxonomy valence
}

agent_kb_path() {
  local topic="$1"
  case "$topic" in
    layering|taxonomy|valence)
      printf '%s/%s.spw' "$AGENT_KB_DIR" "$topic"
      ;;
    *)
      return 1
      ;;
  esac
}

agent_load_plan_context() {
  local explicit_slug="${1-}"
  local resolved_dir
  local artifact_ref=""
  local actual_last_stream_line=""
  local files_hot_raw=""

  resolved_dir="$(agent_plan_resolve_dir "$explicit_slug")" || return 1
  if [ -z "$resolved_dir" ] || [ ! -d "$resolved_dir" ]; then
    agent_fail "no active feature plan found for current branch"
    return 1
  fi

  AGENT_PLAN_CTX_DIR="$resolved_dir"
  AGENT_PLAN_CTX_SLUG="$(basename "$resolved_dir")"
  AGENT_PLAN_CTX_BRANCH="$(agent_get_active_branch)"
  AGENT_PLAN_CTX_PLAN_FILE="$resolved_dir/PLAN.md"
  AGENT_PLAN_CTX_WIP_FILE="$resolved_dir/wip.spw"

  if [ ! -f "$AGENT_PLAN_CTX_WIP_FILE" ]; then
    agent_fail "wip.spw not found in $resolved_dir"
    return 1
  fi

  AGENT_PLAN_CTX_BASE_REF="$(agent_plan_cache_value base_ref "$AGENT_PLAN_CTX_WIP_FILE")"
  AGENT_PLAN_CTX_STATUS="$(agent_plan_cache_value status "$AGENT_PLAN_CTX_WIP_FILE")"
  AGENT_PLAN_CTX_NEXT_COMMIT="$(agent_plan_cache_value next_commit "$AGENT_PLAN_CTX_WIP_FILE")"
  AGENT_PLAN_CTX_CACHE_OPEN_COUNT="$(agent_plan_cache_value open_count "$AGENT_PLAN_CTX_WIP_FILE")"
  AGENT_PLAN_CTX_CACHE_LAST_STREAM="$(agent_plan_cache_value last_stream "$AGENT_PLAN_CTX_WIP_FILE")"
  AGENT_PLAN_CTX_FILES_HOT="$(agent_plan_cache_value files_hot "$AGENT_PLAN_CTX_WIP_FILE")"
  AGENT_PLAN_CTX_ACTUAL_OPEN_COUNT="$(agent_plan_count_open_questions "$AGENT_PLAN_CTX_WIP_FILE")"
  actual_last_stream_line="$(agent_plan_last_stream_line "$AGENT_PLAN_CTX_WIP_FILE")"
  AGENT_PLAN_CTX_LAST_STREAM_LINE="$actual_last_stream_line"
  AGENT_PLAN_CTX_ACTUAL_LAST_STREAM="$(agent_plan_last_stream_timestamp "$actual_last_stream_line")"
  artifact_ref="$(agent_plan_root_path artifact "$AGENT_PLAN_CTX_WIP_FILE")"
  AGENT_PLAN_CTX_ARTIFACT_REF="$artifact_ref"

  if [ -n "$artifact_ref" ]; then
    AGENT_PLAN_CTX_ARTIFACT_PATH="$(agent_resolve_repo_path "$artifact_ref")"
    if [ -f "$AGENT_PLAN_CTX_ARTIFACT_PATH" ]; then
      AGENT_PLAN_CTX_ARTIFACT_EXISTS=1
    else
      AGENT_PLAN_CTX_ARTIFACT_EXISTS=0
    fi
  else
    AGENT_PLAN_CTX_ARTIFACT_PATH=""
    AGENT_PLAN_CTX_ARTIFACT_EXISTS=0
  fi

  if [ -n "$AGENT_PLAN_CTX_ACTUAL_LAST_STREAM" ]; then
    AGENT_PLAN_CTX_STREAM_AGE_HOURS="$(agent_hours_since_timestamp "$AGENT_PLAN_CTX_ACTUAL_LAST_STREAM" || true)"
  else
    AGENT_PLAN_CTX_STREAM_AGE_HOURS=""
  fi
}

agent_plan_stream_build_line() {
  local type="$1"
  local msg="$2"
  local timestamp="$3"
  printf ' >> [%s] %s — %s' "$timestamp" "$type" "$msg"
}

agent_plan_stream_write() {
  local wip_file="$1"
  local stream_line="$2"
  local tmp_file

  tmp_file="$(mktemp "${TMPDIR:-/tmp}/agent-stream.XXXXXX")"
  if ! awk -v stream_line="$stream_line" '
    BEGIN { in_stream = 0; inserted = 0 }
    /^\^\["stream"\]\{/ {
      in_stream = 1
      print
      next
    }
    in_stream && /^}/ {
      print stream_line
      inserted = 1
      in_stream = 0
      print
      next
    }
    { print }
    END {
      if (!inserted) {
        exit 2
      }
    }
  ' "$wip_file" > "$tmp_file"; then
    rm -f "$tmp_file"
    agent_fail "failed to append to ^[\"stream\"] in $wip_file"
    return 1
  fi

  mv "$tmp_file" "$wip_file"
}

agent_plan_stream_preview_text() {
  echo "Plan Stream Preview"
  echo "Plan: $AGENT_PLAN_CTX_SLUG"
  echo "File: $AGENT_PLAN_CTX_WIP_FILE"
  echo "Entry: $1"
}

agent_plan_stream_preview_json() {
  printf '{'
  printf '"plan":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_SLUG")"
  printf '"wip_file":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_WIP_FILE")"
  printf '"entry":"%s",' "$(agent_json_escape "$1")"
  printf '"dry_run":true'
  printf '}\n'
}

agent_plan_stream_result_json() {
  printf '{'
  printf '"plan":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_SLUG")"
  printf '"wip_file":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_WIP_FILE")"
  printf '"entry":"%s",' "$(agent_json_escape "$1")"
  printf '"dry_run":false'
  printf '}\n'
}

agent_plan_stream() {
  local type=""
  local msg=""
  local slug=""
  local dry_run=0
  local format="text"
  local timestamp=""
  local stream_line=""

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --type)
        type="${2:-}"
        shift 2
        ;;
      --message)
        msg="${2:-}"
        shift 2
        ;;
      --slug)
        slug="${2:-}"
        shift 2
        ;;
      --dry-run)
        dry_run=1
        shift
        ;;
      --json)
        format="json"
        shift
        ;;
      -h|--help)
        agent_usage_plan_stream
        return 0
        ;;
      *)
        if [ -z "$type" ]; then
          type="$1"
        elif [ -z "$msg" ]; then
          msg="$1"
        elif [ -z "$slug" ]; then
          slug="$1"
        else
          agent_usage_plan_stream >&2
          return 1
        fi
        shift
        ;;
    esac
  done

  if [ -z "$type" ] || [ -z "$msg" ]; then
    agent_usage_plan_stream >&2
    return 1
  fi
  if ! agent_validate_stream_type "$type"; then
    agent_fail "stream type must match ^[a-z][a-z0-9_-]*$: $type"
    return 1
  fi
  if [[ "$msg" == *$'\n'* ]]; then
    agent_fail "stream message must be a single line"
    return 1
  fi

  agent_load_plan_context "$slug" || return 1
  timestamp="$(date '+%Y-%m-%d %H:%M')"
  stream_line="$(agent_plan_stream_build_line "$type" "$msg" "$timestamp")"

  if [ "$dry_run" -eq 1 ]; then
    if [ "$format" = "json" ]; then
      agent_plan_stream_preview_json "$stream_line"
    else
      agent_plan_stream_preview_text "$stream_line"
    fi
    return 0
  fi

  agent_plan_stream_write "$AGENT_PLAN_CTX_WIP_FILE" "$stream_line" || return 1
  if [ "$format" = "json" ]; then
    agent_plan_stream_result_json "$stream_line"
  else
    echo "Appended stream entry to $AGENT_PLAN_CTX_WIP_FILE"
    echo "$stream_line"
  fi
}

agent_plan_init() {
  local slug=""
  local target_dir
  local today
  local base_sha
  local plan_template="$AGENT_SCHEMA_DIR/plan-template.md"

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --slug)
        slug="${2:-}"
        shift 2
        ;;
      -h|--help)
        agent_usage_plan_init
        return 0
        ;;
      *)
        if [ -n "$slug" ]; then
          agent_usage_plan_init >&2
          return 1
        fi
        slug="$1"
        shift
        ;;
    esac
  done

  if [ -z "$slug" ]; then
    agent_usage_plan_init >&2
    return 1
  fi
  if ! agent_validate_slug "$slug"; then
    agent_fail "slug must match ^[a-z0-9][a-z0-9-]*$: $slug"
    return 1
  fi

  target_dir="$AGENT_PLANS_DIR/$slug"
  if [ -d "$target_dir" ]; then
    agent_fail "plan directory $slug already exists"
    return 1
  fi
  if [ ! -f "$plan_template" ]; then
    agent_fail "plan template not found: $plan_template"
    return 1
  fi

  today="$(date '+%Y-%m-%d')"
  base_sha="$(agent_current_main_sha)"

  mkdir -p "$target_dir"
  cp "$plan_template" "$target_dir/PLAN.md"
  cp "$AGENT_SCHEMA_DIR/wip-template.spw" "$target_dir/wip.spw"

  sed -i '' \
    -e "s/<slug>/$slug/g" \
    "$target_dir/PLAN.md"
  sed -i '' \
    -e "s/<slug>/$slug/g" \
    -e "s/<YYYY-MM-DD>/$today/g" \
    -e "s/main@<sha>/main@$base_sha/g" \
    "$target_dir/wip.spw"

  echo "Initialized plan in $target_dir"
}

agent_plan_check_add_issue() {
  local severity="$1"
  local code="$2"
  local message="$3"
  if [ -n "${AGENT_PLAN_CHECK_ISSUES-}" ]; then
    AGENT_PLAN_CHECK_ISSUES="${AGENT_PLAN_CHECK_ISSUES}
${severity}|${code}|${message}"
  else
    AGENT_PLAN_CHECK_ISSUES="${severity}|${code}|${message}"
  fi
  AGENT_PLAN_CHECK_COUNT=$((AGENT_PLAN_CHECK_COUNT + 1))
}

agent_plan_check_files_hot() {
  local raw="$1"
  local old_ifs="$IFS"
  local part=""
  local trimmed=""
  local resolved=""

  IFS=','
  for part in $raw; do
    trimmed="$(agent_trim "$part")"
    if [ -z "$trimmed" ]; then
      continue
    fi
    resolved="$(agent_resolve_repo_path "$trimmed")"
    if [ ! -e "$resolved" ]; then
      agent_plan_check_add_issue "high" "missing_hot_file" "hot file does not exist: $trimmed"
    fi
  done
  IFS="$old_ifs"
}

agent_plan_check_base_ref() {
  local base_ref="$1"
  local ref_name=""
  local ref_sha=""

  if [ -z "$base_ref" ]; then
    agent_plan_check_add_issue "high" "missing_base_ref" "cache base_ref is empty"
    return
  fi
  if [[ "$base_ref" != *@* ]]; then
    agent_plan_check_add_issue "medium" "invalid_base_ref" "base_ref does not include ref@sha: $base_ref"
    return
  fi

  ref_name="${base_ref%%@*}"
  ref_sha="${base_ref#*@}"

  if [ "$ref_sha" = "unknown" ]; then
    agent_plan_check_add_issue "low" "unknown_base_ref" "base_ref is unknown"
    return
  fi
  if ! git -C "$AGENT_REPO_ROOT" cat-file -e "${ref_sha}^{commit}" 2>/dev/null; then
    agent_plan_check_add_issue "high" "missing_base_commit" "base_ref commit does not exist locally: $ref_sha"
    return
  fi
  if [ "$ref_name" = "main" ] || [ "$ref_name" = "origin/main" ]; then
    if ! git -C "$AGENT_REPO_ROOT" merge-base --is-ancestor "$ref_sha" main 2>/dev/null; then
      agent_plan_check_add_issue "high" "stale_base_ref" "base_ref is not on current main ancestry: $base_ref"
    fi
  fi
}

agent_plan_collect_issues() {
  AGENT_PLAN_CHECK_ISSUES=""
  AGENT_PLAN_CHECK_COUNT=0

  if [ ! -f "$AGENT_PLAN_CTX_PLAN_FILE" ]; then
    agent_plan_check_add_issue "high" "missing_plan_md" "PLAN.md is missing"
  fi
  if [ -z "$AGENT_PLAN_CTX_ACTUAL_LAST_STREAM" ]; then
    agent_plan_check_add_issue "medium" "stream_silence" "stream has no entries"
  elif [ -n "$AGENT_PLAN_CTX_STREAM_AGE_HOURS" ] && [ "$AGENT_PLAN_CTX_STREAM_AGE_HOURS" -gt 48 ]; then
    agent_plan_check_add_issue "medium" "stream_silence" "last stream entry is older than 48h (${AGENT_PLAN_CTX_STREAM_AGE_HOURS}h)"
  fi
  if [ "$AGENT_PLAN_CTX_CACHE_OPEN_COUNT" != "$AGENT_PLAN_CTX_ACTUAL_OPEN_COUNT" ]; then
    agent_plan_check_add_issue "low" "open_count_drift" "cache open_count=${AGENT_PLAN_CTX_CACHE_OPEN_COUNT:-empty} actual=${AGENT_PLAN_CTX_ACTUAL_OPEN_COUNT}"
  fi
  if [ "$AGENT_PLAN_CTX_CACHE_LAST_STREAM" != "$AGENT_PLAN_CTX_ACTUAL_LAST_STREAM" ]; then
    agent_plan_check_add_issue "low" "last_stream_drift" "cache last_stream=${AGENT_PLAN_CTX_CACHE_LAST_STREAM:-empty} actual=${AGENT_PLAN_CTX_ACTUAL_LAST_STREAM:-empty}"
  fi
  if [ -n "$AGENT_PLAN_CTX_ARTIFACT_REF" ] && [ "$AGENT_PLAN_CTX_ARTIFACT_EXISTS" -ne 1 ]; then
    agent_plan_check_add_issue "medium" "missing_artifact" "artifact ref does not resolve: $AGENT_PLAN_CTX_ARTIFACT_REF"
  fi
  agent_plan_check_base_ref "$AGENT_PLAN_CTX_BASE_REF"
  if [ -n "$AGENT_PLAN_CTX_FILES_HOT" ]; then
    agent_plan_check_files_hot "$AGENT_PLAN_CTX_FILES_HOT"
  fi
}

agent_plan_status_print_text() {
  echo "Plan Status"
  echo "Plan: $AGENT_PLAN_CTX_SLUG"
  echo "Branch: $AGENT_PLAN_CTX_BRANCH"
  echo "Dir: $AGENT_PLAN_CTX_DIR"
  echo "Base Ref: ${AGENT_PLAN_CTX_BASE_REF:-none}"
  echo "Status: ${AGENT_PLAN_CTX_STATUS:-none}"
  echo "Next Commit: ${AGENT_PLAN_CTX_NEXT_COMMIT:-none}"
  echo "Open Questions: cache=${AGENT_PLAN_CTX_CACHE_OPEN_COUNT:-none} actual=${AGENT_PLAN_CTX_ACTUAL_OPEN_COUNT:-0}"
  echo "Last Stream: cache=${AGENT_PLAN_CTX_CACHE_LAST_STREAM:-none} actual=${AGENT_PLAN_CTX_ACTUAL_LAST_STREAM:-none}"
  if [ -n "$AGENT_PLAN_CTX_STREAM_AGE_HOURS" ]; then
    echo "Stream Age Hours: $AGENT_PLAN_CTX_STREAM_AGE_HOURS"
  else
    echo "Stream Age Hours: unknown"
  fi
  if [ -n "$AGENT_PLAN_CTX_ARTIFACT_REF" ]; then
    echo "Artifact: $AGENT_PLAN_CTX_ARTIFACT_REF"
  else
    echo "Artifact: none"
  fi
  if [ "${AGENT_PLAN_CHECK_COUNT:-0}" -eq 0 ]; then
    echo "Health: ok"
  else
    echo "Health: ${AGENT_PLAN_CHECK_COUNT} issue(s)"
  fi
}

agent_plan_status_print_json() {
  printf '{'
  printf '"slug":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_SLUG")"
  printf '"branch":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_BRANCH")"
  printf '"dir":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_DIR")"
  printf '"base_ref":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_BASE_REF")"
  printf '"status":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_STATUS")"
  printf '"next_commit":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_NEXT_COMMIT")"
  printf '"cache_open_count":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_CACHE_OPEN_COUNT")"
  printf '"actual_open_count":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_ACTUAL_OPEN_COUNT")"
  printf '"cache_last_stream":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_CACHE_LAST_STREAM")"
  printf '"actual_last_stream":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_ACTUAL_LAST_STREAM")"
  printf '"artifact_ref":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_ARTIFACT_REF")"
  printf '"artifact_exists":'
  agent_emit_json_bool "$AGENT_PLAN_CTX_ARTIFACT_EXISTS"
  printf ','
  printf '"issue_count":%s' "${AGENT_PLAN_CHECK_COUNT:-0}"
  printf '}\n'
}

agent_plan_status() {
  local slug=""
  local format="text"

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --slug)
        slug="${2:-}"
        shift 2
        ;;
      --json)
        format="json"
        shift
        ;;
      -h|--help)
        agent_usage_plan_status
        return 0
        ;;
      *)
        agent_usage_plan_status >&2
        return 1
        ;;
    esac
  done

  agent_load_plan_context "$slug" || return 1
  agent_plan_collect_issues
  if [ "$format" = "json" ]; then
    agent_plan_status_print_json
  else
    agent_plan_status_print_text
  fi
}

agent_plan_check_print_text() {
  echo "Plan Check"
  echo "Plan: $AGENT_PLAN_CTX_SLUG"
  if [ "${AGENT_PLAN_CHECK_COUNT:-0}" -eq 0 ]; then
    echo "✓ no issues"
    return 0
  fi
  while IFS='|' read -r severity code message; do
    [ -z "$severity" ] && continue
    echo "- [$severity] $code: $message"
  done <<<"$AGENT_PLAN_CHECK_ISSUES"
}

agent_plan_check_print_json() {
  local first=1
  printf '{'
  printf '"slug":"%s",' "$(agent_json_escape "$AGENT_PLAN_CTX_SLUG")"
  printf '"ok":'
  if [ "${AGENT_PLAN_CHECK_COUNT:-0}" -eq 0 ]; then
    printf 'true'
  else
    printf 'false'
  fi
  printf ',"issue_count":%s,"issues":[' "${AGENT_PLAN_CHECK_COUNT:-0}"
  while IFS='|' read -r severity code message; do
    [ -z "$severity" ] && continue
    if [ "$first" -eq 0 ]; then
      printf ','
    fi
    first=0
    printf '{"severity":"%s","code":"%s","message":"%s"}' \
      "$(agent_json_escape "$severity")" \
      "$(agent_json_escape "$code")" \
      "$(agent_json_escape "$message")"
  done <<<"$AGENT_PLAN_CHECK_ISSUES"
  printf ']}\n'
}

agent_plan_check() {
  local slug=""
  local format="text"

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --slug)
        slug="${2:-}"
        shift 2
        ;;
      --json)
        format="json"
        shift
        ;;
      -h|--help)
        agent_usage_plan_check
        return 0
        ;;
      *)
        agent_usage_plan_check >&2
        return 1
        ;;
    esac
  done

  agent_load_plan_context "$slug" || return 1
  agent_plan_collect_issues
  if [ "$format" = "json" ]; then
    agent_plan_check_print_json
  else
    agent_plan_check_print_text
  fi

  if [ "${AGENT_PLAN_CHECK_COUNT:-0}" -eq 0 ]; then
    return 0
  fi
  return 1
}

agent_kb_list_text() {
  echo "Agent KB"
  while IFS= read -r topic; do
    echo "- $topic  $(agent_kb_path "$topic")"
  done < <(agent_kb_topics)
}

agent_kb_list_json() {
  local first=1
  local topic
  printf '['
  while IFS= read -r topic; do
    if [ "$first" -eq 0 ]; then
      printf ','
    fi
    first=0
    printf '{"topic":"%s","path":"%s"}' \
      "$(agent_json_escape "$topic")" \
      "$(agent_json_escape "$(agent_kb_path "$topic")")"
  done < <(agent_kb_topics)
  printf ']\n'
}

agent_kb_path_output() {
  local format="$1"
  local topic="$2"
  local path
  if ! path="$(agent_kb_path "$topic")"; then
    agent_fail "unknown kb topic: $topic"
    return 1
  fi
  if [ "$format" = "json" ]; then
    printf '{"topic":"%s","path":"%s"}\n' \
      "$(agent_json_escape "$topic")" \
      "$(agent_json_escape "$path")"
  else
    printf '%s\n' "$path"
  fi
}

agent_kb_search_file() {
  local pattern="$1"
  local file="$2"
  if agent_has_command rg; then
    rg -n -i --no-heading --no-filename "$pattern" "$file" 2>/dev/null || true
  else
    grep -ni "$pattern" "$file" 2>/dev/null || true
  fi
}

agent_kb_search_text() {
  local pattern="$1"
  local topic
  local file
  local match
  local line_no
  local text
  local found=0

  while IFS= read -r topic; do
    file="$(agent_kb_path "$topic")"
    while IFS= read -r match; do
      [ -z "$match" ] && continue
      found=1
      line_no="${match%%:*}"
      text="${match#*:}"
      echo "$topic:$line_no: $text"
    done < <(agent_kb_search_file "$pattern" "$file")
  done < <(agent_kb_topics)

  if [ "$found" -eq 0 ]; then
    echo "No KB matches for: $pattern"
  fi
}

agent_kb_search_json() {
  local pattern="$1"
  local first=1
  local topic
  local file
  local match
  local line_no
  local text

  printf '['
  while IFS= read -r topic; do
    file="$(agent_kb_path "$topic")"
    while IFS= read -r match; do
      [ -z "$match" ] && continue
      line_no="${match%%:*}"
      text="${match#*:}"
      if [ "$first" -eq 0 ]; then
        printf ','
      fi
      first=0
      printf '{"topic":"%s","path":"%s","line":"%s","text":"%s"}' \
        "$(agent_json_escape "$topic")" \
        "$(agent_json_escape "$file")" \
        "$(agent_json_escape "$line_no")" \
        "$(agent_json_escape "$text")"
    done < <(agent_kb_search_file "$pattern" "$file")
  done < <(agent_kb_topics)
  printf ']\n'
}

agent_kb() {
  local format="text"
  local subcommand=""
  local arg1=""

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --json)
        format="json"
        shift
        ;;
      -h|--help|help)
        agent_usage_kb
        return 0
        ;;
      *)
        if [ -z "$subcommand" ]; then
          subcommand="$1"
        elif [ -z "$arg1" ]; then
          arg1="$1"
        else
          agent_usage_kb >&2
          return 1
        fi
        shift
        ;;
    esac
  done

  if [ -z "$subcommand" ] || [ "$subcommand" = "list" ]; then
    if [ "$format" = "json" ]; then
      agent_kb_list_json
    else
      agent_kb_list_text
    fi
    return 0
  fi

  case "$subcommand" in
    path)
      if [ -z "$arg1" ]; then
        agent_usage_kb >&2
        return 1
      fi
      agent_kb_path_output "$format" "$arg1"
      ;;
    search)
      if [ -z "$arg1" ]; then
        agent_usage_kb >&2
        return 1
      fi
      if [ "$format" = "json" ]; then
        agent_kb_search_json "$arg1"
      else
        agent_kb_search_text "$arg1"
      fi
      ;;
    *)
      if agent_kb_path "$subcommand" >/dev/null 2>&1; then
        agent_kb_path_output "$format" "$subcommand"
      else
        agent_usage_kb >&2
        return 1
      fi
      ;;
  esac
}

agent_vibe() {
  local format="text"
  local slug
  local plan_dir
  local wip_file
  local last_stream=""
  local staged=0
  local unstaged=0
  local untracked=0
  local line=""
  local first=1

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --json)
        format="json"
        shift
        ;;
      -h|--help)
        echo "Usage: vibe [--json]"
        return 0
        ;;
      *)
        echo "Usage: vibe [--json]" >&2
        return 1
        ;;
    esac
  done

  slug="$(agent_get_plan_slug)"
  plan_dir="$(agent_get_plan_dir)"
  if [ -n "$plan_dir" ]; then
    wip_file="$plan_dir/wip.spw"
    if [ -f "$wip_file" ]; then
      last_stream="$(agent_plan_last_stream_line "$wip_file")"
    fi
  fi

  while IFS= read -r line; do
    case "${line:0:2}" in
      '??')
        untracked=$((untracked + 1))
        ;;
      *)
        if [ "${line:0:1}" != " " ]; then
          staged=$((staged + 1))
        fi
        if [ "${line:1:1}" != " " ]; then
          unstaged=$((unstaged + 1))
        fi
        ;;
    esac
  done < <(git -C "$AGENT_REPO_ROOT" status --short)

  if [ "$format" = "json" ]; then
    printf '{'
    printf '"branch":"%s",' "$(agent_json_escape "$(agent_get_active_branch)")"
    printf '"plan":"%s",' "$(agent_json_escape "$slug")"
    printf '"staged":%s,' "$staged"
    printf '"unstaged":%s,' "$unstaged"
    printf '"untracked":%s,' "$untracked"
    printf '"last_stream":"%s",' "$(agent_json_escape "$last_stream")"
    printf '"recent_episodes":['
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      if [ "$first" -eq 0 ]; then
        printf ','
      fi
      first=0
      printf '"%s"' "$(agent_json_escape "$line")"
    done < <(git -C "$AGENT_REPO_ROOT" log -n 3 --pretty=format:'%h %s' | grep -v 'Merge branch' || true)
    printf ']}\n'
    return 0
  fi

  echo "--- Agent Context ---"
  echo "Active Branch: $(agent_get_active_branch)"
  if [ -n "$slug" ]; then
    echo "Active Plan: $slug"
  else
    echo "Active Plan: None (on main?)"
  fi
  echo "Working Tree: staged=$staged unstaged=$unstaged untracked=$untracked"
  if [ -n "$last_stream" ]; then
    echo "Last Stream: $last_stream"
  else
    echo "Last Stream: none"
  fi
  echo "Recent Episodes:"
  git -C "$AGENT_REPO_ROOT" log -n 3 --pretty=format:'- %h %s' | grep -v 'Merge branch' || true
  echo
  echo "--------------------"
}
