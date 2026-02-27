#!/usr/bin/env bash
# craft-check.sh — Context loader + verification loop
#
# Modes:
#   context — Output codebase structure for decision priming (default)
#   quick   — lint + test (fast feedback)
#   full    — lint + test + build + fuzz:all + audit

SPW_SCRIPT_NAME="CraftCheck"
SPW_SCRIPT_USAGE="[options] [context|quick|full]"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/scripts/spw-lib.sh"
spw_parse_args "$@"

if [ $SPW_HELP -eq 1 ]; then spw_print_help; exit 0; fi

MODE="${SPW_POSITIONAL[0]:-context}"
LINT_SCRIPT="${SPW_LINT_SCRIPT:-lint:spw}"
STATE_STATUS="clean"
STATE_SCOPE="$MODE"
STATE_LINT="none"
STATE_FUZZ="none"
STATE_SPW_PARSE="none"
STATE_SOURCE_COUNT=$(spw_count_files "src" '*.ts' -not -path '*/__tests__/*')
STATE_SPW_COUNT=$(spw_count_files "src" '*.spw')
STATE_TOTAL_COUNT=$((STATE_SOURCE_COUNT + STATE_SPW_COUNT))
STATE_NEARBY="src"

# ---------------------------------------------------------------------------

case "$MODE" in
  context)
    spw_seed "$SPW_SCRIPT_NAME" "1.1" "context_loader"
    spw_section_open "context"

    spw_set_open "domain_sizes"
    while IFS= read -r domain; do
      if ! filter_path "$domain"; then continue; fi
      if [ -d "src/$domain" ]; then
        ts=$(spw_count_files "src/$domain" '*.ts' -not -path '*/__tests__/*')
        tests=$(spw_count_files "src/$domain" '*.test.ts')
        spw=$(spw_count_files "src/$domain" '*.spw')
        echo "    .{ domain = \`$domain\`, ts = $ts, tests = $tests, spw = $spw },"
      fi
    done < <(find src -mindepth 1 -maxdepth 1 -type d -print | xargs -n1 basename | sort)
    spw_set_close

    echo ""
    spw_set_open "debt_markers"
    total=$(grep -r '@spw:' src/ --include='*.ts' 2>/dev/null | wc -l | tr -d ' ' || echo 0)
    grep -r '@spw:' src/ --include='*.ts' 2>/dev/null | grep -o '@spw:[a-z]*' | sort | uniq -c | sort -rn | while read -r c marker; do
      echo "    .{ marker = \`$marker\`, count = $c },"
    done
    spw_set_close "%total=$total"

    echo ""
    spw_set_open "test_gaps"
    while IFS= read -r domain; do
      if ! filter_path "$domain"; then continue; fi
      if [ -d "src/$domain" ]; then
        ts=$(spw_count_files "src/$domain" '*.ts' -not -path '*/__tests__/*' -not -name '*.test.ts')
        tests=$(spw_count_files "src/$domain" '*.test.ts')
        if [ "$ts" -gt 0 ] && [ "$tests" -eq 0 ]; then
          echo "    .{ domain = \`$domain\`, source_files = $ts, tests = 0, state = \`untested\` },"
        fi
      fi
    done < <(find src -mindepth 1 -maxdepth 1 -type d -print | xargs -n1 basename | sort)
    spw_set_close

    spw_section_close "context"

    spw_affordances_open
    spw_affordance "bash $0 quick" "lint + test"
    spw_affordance "bash $0 full" "lint + test + build + fuzz + audit"
    spw_affordance "npm run audit:md" "Full audit in markdown"
    spw_affordances_close
    ;;

  quick)
    spw_honk "Running: lint + test..."
    if npm run "$LINT_SCRIPT"; then
      STATE_LINT="pass"
    else
      STATE_LINT="fail"
      STATE_STATUS="issue"
    fi
    if npm run test:run; then
      :
    else
      STATE_STATUS="issue"
    fi
    if [ "$STATE_STATUS" = "clean" ]; then
      spw_boon "Quick check passed"
    else
      spw_bonk "Quick check found issues"
    fi
    ;;

  full)
    spw_honk "Running: lint + test + build + fuzz + audit..."
    if npm run "$LINT_SCRIPT"; then
      STATE_LINT="pass"
    else
      STATE_LINT="fail"
      STATE_STATUS="issue"
    fi
    if npm run test:run; then
      :
    else
      STATE_STATUS="issue"
    fi
    if [ "${SKIP_BUILD:-}" != "1" ]; then
      if ! npm run build; then
        STATE_STATUS="issue"
      fi
    fi
    if npm run fuzz:all; then
      STATE_FUZZ="pass"
    else
      STATE_FUZZ="warn"
    fi
    if ! npm run audit:md; then
      spw_bone "audit:md returned non-zero (non-blocking)"
    fi
    if [ "$STATE_STATUS" = "clean" ]; then
      spw_boon "Full check complete"
    else
      spw_bonk "Full check found issues"
    fi
    ;;

  *)
    echo "Usage: $0 [context|quick|full]"
    STATE_STATUS="issue"
    ;;
esac

spw_state_write \
  --id "craft-check" \
  --schema "spw.skill-state.v1" \
  --status "$STATE_STATUS" \
  --scope "$STATE_SCOPE" \
  --watch 0 \
  --interval 0 \
  --total "$STATE_TOTAL_COUNT" \
  --source "$STATE_SOURCE_COUNT" \
  --spw "$STATE_SPW_COUNT" \
  --golden-files 0 \
  --lint "$STATE_LINT" \
  --fuzz "$STATE_FUZZ" \
  --spw-parse "$STATE_SPW_PARSE" \
  --golden "clear" \
  --nearby "$STATE_NEARBY" \
  --writer ".agents/skills/spw-craft-quality/scripts/craft-check.sh"
