#!/usr/bin/env bash
# layer-check.sh — Context loader: domain architecture map
#
# Primes an agent with:
#   - Active source strata with file counts and key paths
#   - Import violations (if any)
#   - Dependency direction rules
#   - Where to add new code based on domain responsibility

SPW_SCRIPT_NAME="LayerCheck.Audit"
SPW_SCRIPT_USAGE="[options]"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/scripts/spw-lib.sh"
spw_parse_args "$@"

if [ $SPW_HELP -eq 1 ]; then spw_print_help; exit 0; fi

# ---------------------------------------------------------------------------

STATE_SCOPE="context_loader"
STATE_SOURCE_COUNT=$(spw_count_files "src" '*.ts' -not -path '*/__tests__/*')
STATE_SPW_COUNT=$(spw_count_files "lib/spw-v0.2.0-alpha" '*.spw')
STATE_TOTAL_COUNT=$((STATE_SOURCE_COUNT + STATE_SPW_COUNT))
STATE_NEARBY="src;lib/spw-v0.2.0-alpha/architecture"

spw_seed "$SPW_SCRIPT_NAME" "1.1" "context_loader"
spw_section_open "domain_architecture_map"

spw_set_open "layer_inventory"

# Count files per source stratum
for domain in $(find src -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort); do
  if ! filter_path "$domain"; then continue; fi
  if [ -d "src/$domain" ]; then
    ts_count=$(spw_count_files "src/$domain" '*.ts' -not -path '*/__tests__/*')
    test_count=$(spw_count_files "src/$domain" '*.test.ts')
    css_count=$(spw_count_files "src/$domain" '*.css')
    spw_count=$(spw_count_files "src/$domain" '*.spw')
    types_file=""
    [ -f "src/$domain/types.ts" ] && types_file="types.ts"
    [ -d "src/$domain/types" ] && types_file="types/"
    index_file=""
    [ -f "src/$domain/index.ts" ] && index_file="index.ts"
    echo "    .{ domain = \`$domain\`, ts_files = $ts_count, test_files = $test_count, css_files = $css_count, spw_files = $spw_count, types_file = \`$types_file\`, index_file = \`$index_file\` },"
  fi
done
spw_set_close

echo ""
spw_facet_open "key_isolation_boundaries"
echo "    \`src/seed\`    = \`MUST remain portable: no @/ imports or UI/platform coupling\`"
echo "    \`src/runtime\` = \`MUST depend on seed/state contracts; avoid UI/platform coupling\`"
echo "    \`src/testing\` = \`MAY depend on seed/runtime for harness and verification\`"
spw_facet_close
echo ""

spw_set_open "import_violations"

ERRORS=0

violations=$(grep -rn "from '@/" src/seed/ --include='*.ts' 2>/dev/null || true)
if [ -n "$violations" ]; then
  echo "    .{ layer = \`seed\`, violations = ${#violations} },"
  ERRORS=$((ERRORS + $(echo "$violations" | wc -l)))
fi

runtime_violations=$(grep -rn "from '@/" src/runtime/ --include='*.ts' 2>/dev/null || true)
if [ -n "$runtime_violations" ]; then
  echo "    .{ layer = \`runtime\`, violations = ${#runtime_violations} },"
  ERRORS=$((ERRORS + $(echo "$runtime_violations" | wc -l)))
fi

spw_set_close "%total=$ERRORS"

if [ $ERRORS -eq 0 ]; then
  spw_boon "No import boundary violations"
else
  spw_bone "$ERRORS import boundary violations found"
fi

echo ""
spw_facet_open "where_to_add_code"
echo "    new_parser_lexer_feature   = \`src/seed/\`"
echo "    new_runtime_state_logic    = \`src/runtime/state/\`"
echo "    new_runtime_pipeline_step  = \`src/runtime/pipeline/\`"
echo "    new_runtime_interpretation = \`src/runtime/interpreter/\`"
echo "    new_dom_harness_probe      = \`src/testing/\`"
echo "    new_spec_contract_doc      = \`lib/spw-v0.2.0-alpha/\`"
echo "    new_theory_bridge_doc      = \`docs/theory/ or lib/spw-v0.2.0-alpha/architecture/\`"
spw_facet_close
spw_section_close "domain_architecture_map"

spw_affordances_open
spw_affordance "bash .agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh" "audit .spw file landscape"
spw_affordance "npm run audit:ui-selectors" "verify UI separation"
spw_affordances_close

STATE_STATUS="clean"
if [ "$ERRORS" -gt 0 ]; then
  STATE_STATUS="issue"
fi

spw_state_write \
  --id "layer-check" \
  --schema "spw.skill-state.v1" \
  --status "$STATE_STATUS" \
  --scope "$STATE_SCOPE" \
  --watch 0 \
  --interval 0 \
  --total "$STATE_TOTAL_COUNT" \
  --source "$STATE_SOURCE_COUNT" \
  --spw "$STATE_SPW_COUNT" \
  --golden-files 0 \
  --lint "none" \
  --fuzz "none" \
  --spw-parse "none" \
  --golden "clear" \
  --nearby "$STATE_NEARBY" \
  --writer ".agents/skills/spw-commit-review/scripts/layer-check.sh"
