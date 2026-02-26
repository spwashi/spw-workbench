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
LINT_SCRIPT="${SPW_LINT_SCRIPT:-lint:changed}"

# ---------------------------------------------------------------------------

case "$MODE" in
  context)
    spw_seed "$SPW_SCRIPT_NAME" "1.1" "context_loader"
    spw_section_open "context"

    spw_set_open "domain_sizes"
    for domain in core infra design ui lang viz runtime features debug cli app platform; do
      if ! filter_path "$domain"; then continue; fi
      if [ -d "src/$domain" ]; then
        ts=$(spw_count_files "src/$domain" '*.ts' -not -path '*/__tests__/*')
        tests=$(spw_count_files "src/$domain" '*.test.ts')
        spw=$(spw_count_files "src/$domain" '*.spw')
        echo "    .{ domain = \`$domain\`, ts = $ts, tests = $tests, spw = $spw },"
      fi
    done
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
    for domain in core infra design ui lang viz runtime features debug cli app platform; do
      if ! filter_path "$domain"; then continue; fi
      if [ -d "src/$domain" ]; then
        ts=$(spw_count_files "src/$domain" '*.ts' -not -path '*/__tests__/*' -not -name '*.test.ts')
        tests=$(spw_count_files "src/$domain" '*.test.ts')
        if [ "$ts" -gt 0 ] && [ "$tests" -eq 0 ]; then
          echo "    .{ domain = \`$domain\`, source_files = $ts, tests = 0, state = \`untested\` },"
        fi
      fi
    done
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
    npm run "$LINT_SCRIPT"
    npm run test:run
    spw_boon "Quick check passed"
    ;;

  full)
    spw_honk "Running: lint + test + build + fuzz + audit..."
    npm run "$LINT_SCRIPT"
    npm run test:run
    if [ "${SKIP_BUILD:-}" != "1" ]; then
      npm run build
    fi
    npm run fuzz:all || true
    npm run audit:md || true
    spw_boon "Full check complete"
    ;;

  *)
    echo "Usage: $0 [context|quick|full]"
    ;;
esac
