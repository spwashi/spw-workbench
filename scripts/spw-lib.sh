#!/usr/bin/env bash
# spw-lib.sh — shared utility helpers for skill instrumentation scripts.

SPW_TOOL_ROOT_DEFAULT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPW_TOOL_ROOT="${SPW_TOOL_ROOT_OVERRIDE:-$SPW_TOOL_ROOT_DEFAULT}"
SPW_REPO_ROOT="${SPW_REPO_ROOT_OVERRIDE:-$SPW_TOOL_ROOT}"
SPW_HELP=0
SPW_POSITIONAL=()
SPW_MATCH=()
SPW_EXCLUDE=(".git" "node_modules" "dist" "release")
SPW_LINT_SCRIPT=""
SPW_STATE_ENABLED=1
SPW_STATE_DIR=".agents/state/runtime"
SPW_STATE_BUS_FILE="$SPW_STATE_DIR/register-bus.state.spw"
SPW_STATE_WRITE_WARNED=0
SPW_STATE_VALIDATE_MODE="${SPW_STATE_VALIDATE_MODE:-fast}"   # off | fast | strict
SPW_STATE_KEEP_BACKUP="${SPW_STATE_KEEP_BACKUP:-0}"          # 0 | 1
SPW_STATE_LOCK_RETRIES="${SPW_STATE_LOCK_RETRIES:-40}"
SPW_STATE_LOCK_STALE_SECONDS="${SPW_STATE_LOCK_STALE_SECONDS:-120}"

spw_parse_args() {
  SPW_HELP=0
  SPW_POSITIONAL=()
  SPW_MATCH=()
  SPW_STATE_ENABLED=1
  SPW_STATE_VALIDATE_MODE="${SPW_STATE_VALIDATE_MODE:-fast}"
  SPW_STATE_KEEP_BACKUP="${SPW_STATE_KEEP_BACKUP:-0}"
  SPW_STATE_LOCK_RETRIES="${SPW_STATE_LOCK_RETRIES:-40}"
  SPW_STATE_LOCK_STALE_SECONDS="${SPW_STATE_LOCK_STALE_SECONDS:-120}"

  local args=("$@")
  local i=0
  while [ $i -lt ${#args[@]} ]; do
    local arg="${args[$i]}"
    case "$arg" in
      -h|--help)
        SPW_HELP=1
        ;;
      -m|--match)
        i=$((i + 1))
        if [ $i -lt ${#args[@]} ]; then
          SPW_MATCH+=("${args[$i]}")
        fi
        ;;
      --match=*)
        SPW_MATCH+=("${arg#*=}")
        ;;
      -e|--exclude)
        i=$((i + 1))
        if [ $i -lt ${#args[@]} ]; then
          SPW_EXCLUDE+=("${args[$i]}")
        fi
        ;;
      --exclude=*)
        SPW_EXCLUDE+=("${arg#*=}")
        ;;
      --lint-script)
        i=$((i + 1))
        if [ $i -lt ${#args[@]} ]; then
          SPW_LINT_SCRIPT="${args[$i]}"
        fi
        ;;
      --lint-script=*)
        SPW_LINT_SCRIPT="${arg#*=}"
        ;;
      --state-dir)
        i=$((i + 1))
        if [ $i -lt ${#args[@]} ]; then
          SPW_STATE_DIR="${args[$i]}"
          SPW_STATE_BUS_FILE="$SPW_STATE_DIR/register-bus.state.spw"
        fi
        ;;
      --state-dir=*)
        SPW_STATE_DIR="${arg#*=}"
        SPW_STATE_BUS_FILE="$SPW_STATE_DIR/register-bus.state.spw"
        ;;
      --no-state)
        SPW_STATE_ENABLED=0
        ;;
      --state-validate)
        i=$((i + 1))
        if [ $i -lt ${#args[@]} ]; then
          SPW_STATE_VALIDATE_MODE="${args[$i]}"
        fi
        ;;
      --state-validate=*)
        SPW_STATE_VALIDATE_MODE="${arg#*=}"
        ;;
      --state-keep-backup)
        SPW_STATE_KEEP_BACKUP=1
        ;;
      --state-lock-retries)
        i=$((i + 1))
        if [ $i -lt ${#args[@]} ]; then
          SPW_STATE_LOCK_RETRIES="${args[$i]}"
        fi
        ;;
      --state-lock-retries=*)
        SPW_STATE_LOCK_RETRIES="${arg#*=}"
        ;;
      --state-lock-stale)
        i=$((i + 1))
        if [ $i -lt ${#args[@]} ]; then
          SPW_STATE_LOCK_STALE_SECONDS="${args[$i]}"
        fi
        ;;
      --state-lock-stale=*)
        SPW_STATE_LOCK_STALE_SECONDS="${arg#*=}"
        ;;
      --)
        i=$((i + 1))
        while [ $i -lt ${#args[@]} ]; do
          SPW_POSITIONAL+=("${args[$i]}")
          i=$((i + 1))
        done
        break
        ;;
      -*)
        # Unknown flag: keep for caller handling.
        SPW_POSITIONAL+=("$arg")
        ;;
      *)
        SPW_POSITIONAL+=("$arg")
        ;;
    esac
    i=$((i + 1))
  done
}

spw_print_help() {
  local extra="${1:-}"
  echo "${SPW_SCRIPT_NAME:-SpwScript}"
  echo "Usage: ${SPW_SCRIPT_USAGE:-[options]}"
  echo ""
  echo "Common options:"
  echo "  -h, --help             Show help"
  echo "  -m, --match <pattern>  Include only paths containing pattern"
  echo "  -e, --exclude <path>   Exclude paths containing pattern"
  echo "  --lint-script <name>   Override lint script used by utility wrappers"
  echo "  --state-dir <path>     Override runtime state directory"
  echo "  --no-state             Skip runtime state snapshot writes"
  echo "  --state-validate <m>   Validation mode: off|fast|strict (default: fast)"
  echo "  --state-keep-backup    Keep .bak file after successful install"
  echo "  --state-lock-retries N Lock retry attempts for resilient writes"
  echo "  --state-lock-stale N   Seconds before stale lockdir eviction"
  if [ -n "$extra" ]; then
    echo ""
    echo "$extra"
  fi
}

filter_path() {
  local target="$1"

  local ex
  for ex in "${SPW_EXCLUDE[@]}"; do
    if [ -n "$ex" ] && [[ "$target" == *"$ex"* ]]; then
      return 1
    fi
  done

  if [ ${#SPW_MATCH[@]} -eq 0 ]; then
    return 0
  fi

  local m
  for m in "${SPW_MATCH[@]}"; do
    if [[ "$target" == *"$m"* ]]; then
      return 0
    fi
  done

  return 1
}

spw_count_files() {
  local root="$1"
  shift || true

  if [ ! -d "$root" ]; then
    echo "0"
    return
  fi

  local expr=()
  local expect_value=0
  local token
  for token in "$@"; do
    if [ "$expect_value" -eq 1 ]; then
      expr+=("$token")
      expect_value=0
      continue
    fi

    case "$token" in
      -name|-path|-iname|-ipath|-regex|-iregex|-type|-maxdepth|-mindepth)
        expr+=("$token")
        expect_value=1
        ;;
      -not|!|\(|\)|-o|-a)
        expr+=("$token")
        ;;
      -*)
        expr+=("$token")
        ;;
      *)
        expr+=("-name" "$token")
        ;;
    esac
  done

  local result
  result=$(find "$root" -type f "${expr[@]}" 2>/dev/null | wc -l | tr -d ' ')
  echo "${result:-0}"
}

spw_files() {
  local root="$1"
  shift || true
  if [ ! -d "$root" ]; then
    return 0
  fi

  local expr=()
  local expect_value=0
  local token
  for token in "$@"; do
    if [ "$expect_value" -eq 1 ]; then
      expr+=("$token")
      expect_value=0
      continue
    fi

    case "$token" in
      -name|-path|-iname|-ipath|-regex|-iregex|-type|-maxdepth|-mindepth)
        expr+=("$token")
        expect_value=1
        ;;
      -not|!|\(|\)|-o|-a)
        expr+=("$token")
        ;;
      -*)
        expr+=("$token")
        ;;
      *)
        expr+=("-name" "$token")
        ;;
    esac
  done

  find "$root" "${expr[@]}" 2>/dev/null
}

spw_count() {
  wc -l | awk '{print $1}'
}

spw_seed() {
  local name="$1"
  local version="$2"
  local mode="$3"
  echo "# ${name}"
  echo "# version: ${version}"
  echo "# mode: ${mode}"
  echo "# generated_at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo ""
}

spw_section_open() { echo "^\"$1\"{"; }
spw_section_close() { echo "}"; }

spw_set_open() { echo "  $1: #["; }
spw_set_close() {
  local suffix="${1:-}"
  echo "  ]${suffix:+ $suffix}"
}

spw_facet_open() { echo "  $1: .{"; }
spw_facet_close() { echo "  }[reg=facet]"; }

spw_affordances_open() { echo ""; echo "^\"affordances\"{"; }
spw_affordance() {
  local command="$1"
  local description="$2"
  echo "  .{ run = \`$command\`, note = \`$description\` }"
}
spw_affordances_close() { echo "}"; }

spw_boon() { echo "✓ $*"; }
spw_bone() { echo "○ $*"; }
spw_bonk() { echo "⛔ $*"; }
spw_honk() { echo "⚡ $*"; }
spw_dim() { echo "  $*"; }

spw_bool_token() {
  if [ "${1:-0}" = "1" ] || [ "${1:-false}" = "true" ]; then
    echo "true"
  else
    echo "false"
  fi
}

spw_relpath() {
  local target="$1"
  if [[ "$target" == "$SPW_REPO_ROOT/"* ]]; then
    echo "${target#$SPW_REPO_ROOT/}"
  else
    echo "$target"
  fi
}

spw_relpath_from_dir() {
  local base_dir="$1"
  local target="$2"
  local base_abs="$base_dir"
  local target_abs="$target"
  local rel=""
  local i common=0
  local -a base_parts=()
  local -a target_parts=()

  if [[ "$base_abs" != /* ]]; then
    base_abs="$SPW_REPO_ROOT/$base_abs"
  fi
  if [[ "$target_abs" != /* ]]; then
    target_abs="$SPW_REPO_ROOT/$target_abs"
  fi

  base_abs="${base_abs%/}"
  target_abs="${target_abs%/}"

  if [ "$base_abs" = "$target_abs" ]; then
    echo "."
    return
  fi

  IFS='/' read -r -a base_parts <<< "${base_abs#/}"
  IFS='/' read -r -a target_parts <<< "${target_abs#/}"

  while [ "$common" -lt "${#base_parts[@]}" ] && [ "$common" -lt "${#target_parts[@]}" ] && [ "${base_parts[$common]}" = "${target_parts[$common]}" ]; do
    common=$((common + 1))
  done

  for ((i=common; i<${#base_parts[@]}; i++)); do
    [ -n "${base_parts[$i]}" ] || continue
    rel="../$rel"
  done
  rel="${rel%/}"

  for ((i=common; i<${#target_parts[@]}; i++)); do
    [ -n "${target_parts[$i]}" ] || continue
    if [ -n "$rel" ]; then
      rel="$rel/${target_parts[$i]}"
    else
      rel="${target_parts[$i]}"
    fi
  done

  [ -n "$rel" ] || rel="."
  echo "$rel"
}

spw_path_ref() {
  local target="$1"
  local base_dir="${2:-$SPW_REPO_ROOT}"
  local rel
  rel="$(spw_relpath_from_dir "$base_dir" "$target")"
  case "$rel" in
    ./*|../*)
      echo "~\"$rel\""
      ;;
    .)
      echo "~\".\""
      ;;
    *)
      echo "~\"./$rel\""
      ;;
  esac
}

spw_repo_rel_from_dir() {
  local dir="$1"
  local abs="$dir"
  local rel
  local out=""
  local part

  if [[ "$abs" != /* ]]; then
    abs="$SPW_REPO_ROOT/$abs"
  fi
  abs="${abs%/}"

  if [ "$abs" = "$SPW_REPO_ROOT" ]; then
    echo "."
    return
  fi

  rel="${abs#$SPW_REPO_ROOT/}"
  IFS='/' read -r -a parts <<< "$rel"
  for part in "${parts[@]}"; do
    [ -n "$part" ] || continue
    out="../$out"
  done

  out="${out%/}"
  [ -n "$out" ] || out="."
  echo "$out"
}

spw_stat_epoch() {
  local target="$1"
  if stat -f '%m' "$target" >/dev/null 2>&1; then
    stat -f '%m' "$target"
    return
  fi
  stat -c '%Y' "$target" 2>/dev/null || echo "0"
}

spw_stat_size() {
  local target="$1"
  if stat -f '%z' "$target" >/dev/null 2>&1; then
    stat -f '%z' "$target"
    return
  fi
  stat -c '%s' "$target" 2>/dev/null || echo "0"
}

spw_state_warn_once() {
  local message="$1"
  if [ "${SPW_STATE_WRITE_WARNED:-0}" -eq 0 ]; then
    spw_bone "state write skipped: $message"
    SPW_STATE_WRITE_WARNED=1
  fi
}

spw_validate_spw_file() {
  local file="$1"
  local mode="${SPW_STATE_VALIDATE_MODE:-fast}"
  local file_abs="$file"
  local parser_entry=""
  local node_args=()
  [ -s "$file" ] || return 1

  if [[ "$file_abs" != /* ]]; then
    file_abs="$SPW_REPO_ROOT/$file_abs"
  fi

  case "$mode" in
    off)
      return 0
      ;;
    fast)
      if ! grep -q '^\^"' "$file" 2>/dev/null; then
        return 1
      fi
      local opens closes
      opens=$(grep -o '{' "$file" 2>/dev/null | wc -l | tr -d ' ')
      closes=$(grep -o '}' "$file" 2>/dev/null | wc -l | tr -d ' ')
      [ "${opens:-0}" = "${closes:-1}" ] || return 1
      return 0
      ;;
    strict)
      ;;
    *)
      return 1
      ;;
  esac

  if ! command -v node >/dev/null 2>&1; then
    return 0
  fi

  if [ -f "$SPW_TOOL_ROOT/packages/spw-seed/src/index.ts" ]; then
    parser_entry="./packages/spw-seed/src/index.ts"
    node_args=(--import tsx)
  elif [ -d "$SPW_TOOL_ROOT/src/seed" ] || [ -f "$SPW_TOOL_ROOT/src/seed/index.ts" ]; then
    parser_entry="./src/seed"
    node_args=(--import tsx)
  elif [ -f "$SPW_TOOL_ROOT/parser.js" ]; then
    parser_entry="./parser.js"
  else
    return 1
  fi

  if (
    cd "$SPW_TOOL_ROOT" &&
    if [ "${#node_args[@]}" -gt 0 ]; then
      node "${node_args[@]}" -e "import { readFileSync } from 'node:fs'; import { parse } from '${parser_entry}'; const source = readFileSync(process.argv[1], 'utf8'); const out = parse(source); if (!out.success || out.errors.length) process.exit(1);" "$file_abs" >/dev/null 2>&1
    else
      node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parse } from '${parser_entry}'; const source = readFileSync(process.argv[1], 'utf8'); const out = parse(source); if (!out.success || out.errors.length) process.exit(1);" "$file_abs" >/dev/null 2>&1
    fi
  ); then
    return 0
  fi

  return 1
}

spw_resilient_install_file() {
  local tmp_file="$1"
  local dest_file="$2"
  local kind="${3:-plain}"
  local lock_dir="${dest_file}.lockdir"
  local backup_file="${dest_file}.bak"
  local attempts=0
  local max_attempts="${SPW_STATE_LOCK_RETRIES:-40}"
  local stale_after="${SPW_STATE_LOCK_STALE_SECONDS:-120}"
  local lock_mtime now_epoch lock_age

  while ! mkdir "$lock_dir" 2>/dev/null; do
    if [ -d "$lock_dir" ]; then
      lock_mtime="$(spw_stat_epoch "$lock_dir")"
      now_epoch="$(date +%s)"
      lock_age=$((now_epoch - lock_mtime))
      if [ "$lock_age" -ge "$stale_after" ]; then
        rm -rf "$lock_dir" 2>/dev/null || true
      fi
    fi
    attempts=$((attempts + 1))
    if [ "$attempts" -ge "$max_attempts" ]; then
      spw_state_warn_once "timed out acquiring lock for $dest_file"
      rm -f "$tmp_file" 2>/dev/null || true
      return 1
    fi
    sleep 0.05
  done

  if [ "$kind" = "spw" ]; then
    if ! spw_validate_spw_file "$tmp_file"; then
      spw_state_warn_once "validation failed for $dest_file"
      rm -f "$tmp_file" 2>/dev/null || true
      rmdir "$lock_dir" 2>/dev/null || true
      return 1
    fi
  fi

  if [ -f "$dest_file" ]; then
    cp "$dest_file" "$backup_file" 2>/dev/null || true
  fi

  if mv "$tmp_file" "$dest_file" 2>/dev/null; then
    if [ "${SPW_STATE_KEEP_BACKUP:-0}" -ne 1 ]; then
      rm -f "$backup_file" 2>/dev/null || true
    fi
    rmdir "$lock_dir" 2>/dev/null || true
    return 0
  fi

  spw_state_warn_once "cannot move snapshot into $dest_file"
  if [ -f "$backup_file" ]; then
    mv "$backup_file" "$dest_file" 2>/dev/null || true
  fi
  rm -f "$tmp_file" 2>/dev/null || true
  rmdir "$lock_dir" 2>/dev/null || true
  return 1
}

spw_extract_quoted_field() {
  local target="$1"
  local field="$2"
  local line
  line="$(grep -E "^[[:space:]]*$field:[[:space:]]*\"[^\"]*\"" "$target" 2>/dev/null | head -n 1 || true)"
  if [ -n "$line" ]; then
    printf '%s\n' "$line" | sed -E 's/^[^"]*"([^"]*)".*/\1/'
    return
  fi
  echo ""
}

spw_extract_number_field() {
  local target="$1"
  local field="$2"
  local line
  line="$(grep -E "^[[:space:]]*$field:[[:space:]]*[0-9]+" "$target" 2>/dev/null | head -n 1 || true)"
  if [ -n "$line" ]; then
    printf '%s\n' "$line" | sed -E 's/^[^0-9]*([0-9]+).*/\1/'
    return
  fi
  echo ""
}

spw_extract_bool_field() {
  local target="$1"
  local field="$2"
  local line
  line="$(grep -E "^[[:space:]]*$field:[[:space:]]*(true|false)" "$target" 2>/dev/null | head -n 1 || true)"
  if [ -n "$line" ]; then
    printf '%s\n' "$line" | sed -E 's/^[^:]*:[[:space:]]*(true|false).*/\1/'
    return
  fi
  echo ""
}

spw_nearby_refs_count() {
  local target="$1"
  local count
  count=$(grep -c ' path: "' "$target" 2>/dev/null || true)
  echo "${count:-0}"
}

spw_normalized_summary_payload() {
  local target="$1"
  local n_status n_scope n_watch n_interval
  local n_total n_source n_spw n_golden
  local n_lint n_fuzz n_spw_parse n_golden_check n_nearby

  n_status="$(spw_extract_quoted_field "$target" "status")"
  n_scope="$(spw_extract_quoted_field "$target" "scope")"
  n_watch="$(spw_extract_bool_field "$target" "watch")"
  n_interval="$(spw_extract_number_field "$target" "interval_seconds")"
  n_total="$(spw_extract_number_field "$target" "total_files")"
  n_source="$(spw_extract_number_field "$target" "source_files")"
  n_spw="$(spw_extract_number_field "$target" "spw_files")"
  n_golden="$(spw_extract_number_field "$target" "golden_files")"
  n_lint="$(spw_extract_quoted_field "$target" "lint")"
  n_fuzz="$(spw_extract_quoted_field "$target" "fuzz")"
  n_spw_parse="$(spw_extract_quoted_field "$target" "spw_parse")"
  n_golden_check="$(spw_extract_quoted_field "$target" "golden")"
  n_nearby="$(spw_nearby_refs_count "$target")"

  [ -n "$n_status" ] || n_status="unknown"
  [ -n "$n_scope" ] || n_scope="unknown"
  [ -n "$n_watch" ] || n_watch="false"
  [ -n "$n_interval" ] || n_interval="0"
  [ -n "$n_total" ] || n_total="0"
  [ -n "$n_source" ] || n_source="0"
  [ -n "$n_spw" ] || n_spw="0"
  [ -n "$n_golden" ] || n_golden="0"
  [ -n "$n_lint" ] || n_lint="unknown"
  [ -n "$n_fuzz" ] || n_fuzz="unknown"
  [ -n "$n_spw_parse" ] || n_spw_parse="unknown"
  [ -n "$n_golden_check" ] || n_golden_check="unknown"
  [ -n "$n_nearby" ] || n_nearby="0"

  echo "{ status: \"$n_status\", scope: \"$n_scope\", watch: $n_watch, interval_seconds: $n_interval, total_files: $n_total, source_files: $n_source, spw_files: $n_spw, golden_files: $n_golden, lint: \"$n_lint\", fuzz: \"$n_fuzz\", spw_parse: \"$n_spw_parse\", golden: \"$n_golden_check\", nearby_refs: $n_nearby }"
}

spw_path_in_scope() {
  local target="$1"
  local refs_string="${2:-}"
  local refs=()
  local ref abs

  if [ -z "$refs_string" ]; then
    return 0
  fi

  IFS=';' read -r -a refs <<< "$refs_string"
  for ref in "${refs[@]}"; do
    [ -n "$ref" ] || continue
    abs="$ref"
    if [[ "$abs" != /* ]]; then
      abs="$SPW_REPO_ROOT/$abs"
    fi

    if [ -d "$abs" ]; then
      if [[ "$target" == "$abs" || "$target" == "$abs/"* ]]; then
        return 0
      fi
      continue
    fi

    if [ -f "$abs" ]; then
      if [ "$target" = "$abs" ]; then
        return 0
      fi
      continue
    fi
  done

  return 1
}

spw_emit_nearby_candidate() {
  local file="$1"
  local ref_base_dir="${2:-$SPW_STATE_DIR}"
  [ -n "$file" ] || return 0
  [ -f "$file" ] || return 0
  [[ "$file" == *.spw ]] || return 0

  if printf '%s\n' "$SPW_NEARBY_SEEN" | grep -Fxq "$file"; then
    return 0
  fi

  SPW_NEARBY_SEEN="${SPW_NEARBY_SEEN}${file}"$'\n'
  local rel ref lines
  rel="$(spw_relpath "$file")"
  ref="$(spw_path_ref "$file" "$ref_base_dir")"
  lines=$(wc -l < "$file" | tr -d ' ')
  echo "    { path: \"$rel\", ref: $ref, lines: ${lines:-0}, status: \"present\" },"
  SPW_NEARBY_EMITTED=$((SPW_NEARBY_EMITTED + 1))
  if [ "$SPW_NEARBY_EMITTED" -ge "$SPW_NEARBY_MAX" ]; then
    return 2
  fi
  return 0
}

spw_emit_nearby_spw_entries() {
  local refs_string="${1:-}"
  local max_refs="${2:-8}"
  local ref_base_dir="${3:-$SPW_STATE_DIR}"
  local refs=()
  local ref abs candidates file changed dir parent depth emit_status

  SPW_NEARBY_MAX="$max_refs"
  SPW_NEARBY_EMITTED=0
  SPW_NEARBY_SEEN=""

  # 1) Prioritize changed files within scope (dynamic to current edits).
  if command -v git >/dev/null 2>&1 && git -C "$SPW_REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    while IFS= read -r changed; do
      [ -n "$changed" ] || continue
      abs="$SPW_REPO_ROOT/$changed"
      if ! spw_path_in_scope "$abs" "$refs_string"; then
        continue
      fi

      if [ -f "$abs" ] && [[ "$abs" == *.spw ]]; then
        if spw_emit_nearby_candidate "$abs" "$ref_base_dir"; then
          emit_status=0
        else
          emit_status=$?
        fi
        if [ "$emit_status" -eq 2 ]; then return 0; fi
        continue
      fi

      dir="$(dirname "$abs")"
      depth=0
      while [ "$depth" -lt 3 ]; do
        if [ -d "$dir" ]; then
          while IFS= read -r file; do
            [ -n "$file" ] || continue
            if spw_emit_nearby_candidate "$file" "$ref_base_dir"; then
              emit_status=0
            else
              emit_status=$?
            fi
            if [ "$emit_status" -eq 2 ]; then return 0; fi
          done < <(find "$dir" -maxdepth 1 -type f -name '*.spw' 2>/dev/null | sort)
        fi
        if [ "$dir" = "$SPW_REPO_ROOT" ]; then
          break
        fi
        parent="$(dirname "$dir")"
        if [ "$parent" = "$dir" ]; then
          break
        fi
        dir="$parent"
        depth=$((depth + 1))
      done
    done < <(
      {
        git -C "$SPW_REPO_ROOT" diff --name-only --diff-filter=ACMR
        git -C "$SPW_REPO_ROOT" diff --cached --name-only --diff-filter=ACMR
        git -C "$SPW_REPO_ROOT" ls-files --others --exclude-standard
      } | sed '/^$/d' | sort -u
    )
  fi

  # 2) Fill remaining slots from scanned scope roots/files.
  IFS=';' read -r -a refs <<< "$refs_string"
  for ref in "${refs[@]}"; do
    [ -n "$ref" ] || continue
    abs="$ref"
    if [[ "$abs" != /* ]]; then
      abs="$SPW_REPO_ROOT/$abs"
    fi

    candidates=""
    if [ -f "$abs" ] && [[ "$abs" == *.spw ]]; then
      candidates="$abs"
    elif [ -d "$abs" ]; then
      candidates="$(find "$abs" -maxdepth 4 -type f -name '*.spw' 2>/dev/null | sort)"
    else
      continue
    fi

    while IFS= read -r file; do
      [ -n "$file" ] || continue
      if spw_emit_nearby_candidate "$file" "$ref_base_dir"; then
        emit_status=0
      else
        emit_status=$?
      fi
      if [ "$emit_status" -eq 2 ]; then return 0; fi
    done <<< "$candidates"
  done

  return 0
}

spw_state_update_bus() {
  local writer="${1:-spw.script}"
  local last_status="${2:-unknown}"

  if [ "${SPW_STATE_ENABLED:-1}" -ne 1 ]; then
    return
  fi

  if ! mkdir -p "$SPW_STATE_DIR" 2>/dev/null; then
    spw_state_warn_once "cannot create $SPW_STATE_DIR"
    return
  fi

  local tmp_bus
  if ! tmp_bus="$(mktemp "${TMPDIR:-/tmp}/spw-register-bus.XXXXXX")"; then
    spw_state_warn_once "cannot allocate temporary register-bus file"
    return
  fi

  local run_stamp
  run_stamp="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  local repo_ref_root
  repo_ref_root="$(spw_repo_rel_from_dir "$SPW_STATE_DIR")"
  local entries=()
  local file
  while IFS= read -r file; do
    [ -n "$file" ] || continue
    entries+=("$file")
  done < <(find "$SPW_STATE_DIR" -maxdepth 1 -type f -name '*.state.spw' ! -name "$(basename "$SPW_STATE_BUS_FILE")" 2>/dev/null | sort)

  {
    echo "# register bus runtime state"
    echo "# generated by scripts/spw-lib.sh"
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
      local rel ref skill_id mtime_epoch bytes summary
      rel="$(spw_relpath "$file")"
      ref="$(spw_path_ref "$file" "$SPW_STATE_DIR")"
      skill_id="$(basename "$file" '.state.spw')"
      mtime_epoch="$(spw_stat_epoch "$file")"
      bytes="$(spw_stat_size "$file")"
      summary="$(spw_normalized_summary_payload "$file")"
      echo "    { id: \"$skill_id\", path: \"$rel\", ref: $ref, mtime_epoch: $mtime_epoch, bytes: $bytes, status: \"present\", summary: $summary },"
    done
    echo "  ]"
    echo "}"
    echo ""
    echo "^\"writer\"{"
    echo "  source: \"$writer\","
    echo "  last_status: \"$last_status\""
    echo "}"
  } > "$tmp_bus"

  if ! spw_resilient_install_file "$tmp_bus" "$SPW_STATE_BUS_FILE" "spw"; then
    spw_state_warn_once "cannot install register bus snapshot into $SPW_STATE_BUS_FILE"
  fi
}

spw_state_write() {
  if [ "${SPW_STATE_ENABLED:-1}" -ne 1 ]; then
    return
  fi

  local id=""
  local schema="spw.skill-state.v1"
  local status="unknown"
  local scope="default"
  local watch="0"
  local interval="0"
  local total="0"
  local source="0"
  local spw="0"
  local golden_files="0"
  local lint="unknown"
  local fuzz="unknown"
  local spw_parse="unknown"
  local golden="unknown"
  local nearby=""
  local writer=""
  local arg

  while [ $# -gt 0 ]; do
    arg="$1"
    case "$arg" in
      --id) id="${2:-}"; shift 2 ;;
      --schema) schema="${2:-}"; shift 2 ;;
      --status) status="${2:-}"; shift 2 ;;
      --scope) scope="${2:-}"; shift 2 ;;
      --watch) watch="${2:-0}"; shift 2 ;;
      --interval) interval="${2:-0}"; shift 2 ;;
      --total) total="${2:-0}"; shift 2 ;;
      --source) source="${2:-0}"; shift 2 ;;
      --spw) spw="${2:-0}"; shift 2 ;;
      --golden-files) golden_files="${2:-0}"; shift 2 ;;
      --lint) lint="${2:-unknown}"; shift 2 ;;
      --fuzz) fuzz="${2:-unknown}"; shift 2 ;;
      --spw-parse) spw_parse="${2:-unknown}"; shift 2 ;;
      --golden) golden="${2:-unknown}"; shift 2 ;;
      --nearby) nearby="${2:-}"; shift 2 ;;
      --writer) writer="${2:-}"; shift 2 ;;
      *) shift ;;
    esac
  done

  if [ -z "$id" ]; then
    id="$(echo "${SPW_SCRIPT_NAME:-spw-script}" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"
    id="${id#-}"
    id="${id%-}"
  fi
  if [ -z "$writer" ]; then
    writer="$id"
  fi

  if ! mkdir -p "$SPW_STATE_DIR" 2>/dev/null; then
    spw_state_warn_once "cannot create $SPW_STATE_DIR (use --no-state to silence)"
    return
  fi

  local state_file="$SPW_STATE_DIR/$id.state.spw"
  local repo_ref_root
  repo_ref_root="$(spw_repo_rel_from_dir "$SPW_STATE_DIR")"
  local tmp_state
  if ! tmp_state="$(mktemp "${TMPDIR:-/tmp}/spw-state-${id}.XXXXXX")"; then
    spw_state_warn_once "cannot allocate temporary state file for $id"
    return
  fi

  {
    echo "# $id runtime state"
    echo "# generated by $writer"
    echo ""
    echo "^\"roots\"{"
    echo "  @repo: ~\"$repo_ref_root\""
    echo "}"
    echo ""
    echo "^\"register_state\"{"
    echo "  runtime: \"$id\","
    echo "  schema: \"$schema\","
    echo "  updated_at: \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\","
    echo "  hot_reload_token: \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\","
    echo "  scope: \"$scope\","
    echo "  watch: $(spw_bool_token "$watch"),"
    echo "  interval_seconds: $interval,"
    echo "  status: \"$status\""
    echo "}"
    echo ""
    echo "^\"inventory\"{"
    echo "  total_files: $total,"
    echo "  source_files: $source,"
    echo "  spw_files: $spw,"
    echo "  golden_files: $golden_files"
    echo "}"
    echo ""
    echo "^\"checks\"{"
    echo "  lint: \"$lint\","
    echo "  fuzz: \"$fuzz\","
    echo "  spw_parse: \"$spw_parse\","
    echo "  golden: \"$golden\""
    echo "}"
    echo ""
    echo "^\"nearby_spw\"{"
    echo "  files: ["
    spw_emit_nearby_spw_entries "$nearby" 8 "$SPW_STATE_DIR"
    echo "  ]"
    echo "}"
  } > "$tmp_state"

  if ! spw_resilient_install_file "$tmp_state" "$state_file" "spw"; then
    spw_state_warn_once "cannot install state snapshot into $state_file"
    return
  fi

  spw_state_update_bus "$writer" "$status"
}
