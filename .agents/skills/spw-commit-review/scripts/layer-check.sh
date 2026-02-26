#!/usr/bin/env bash
# layer-check.sh — Context loader: domain architecture map
#
# Primes an agent with:
#   - All 12 domains with file counts and key paths
#   - Import violations (if any)
#   - Dependency direction rules
#   - Where to add new code based on domain responsibility

SPW_SCRIPT_NAME="LayerCheck.Audit"
SPW_SCRIPT_USAGE="[options]"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/scripts/spw-lib.sh"
spw_parse_args "$@"

if [ $SPW_HELP -eq 1 ]; then spw_print_help; exit 0; fi

# ---------------------------------------------------------------------------

spw_seed "$SPW_SCRIPT_NAME" "1.1" "context_loader"
spw_section_open "domain_architecture_map"

spw_set_open "layer_inventory"

# Count files per domain
for domain in core infra design ui lang viz runtime features debug cli app platform; do
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
echo "    \`lib/spw\` = \`MUST NOT import from @/ (portable parser core)\`"
echo "    \`core\`    = \`MUST NOT import from infra/design/ui/lang/viz/runtime/features/debug/cli/app/platform\`"
echo "    \`lang\`    = \`MUST NOT import from viz/features/app/platform\`"
echo "    \`runtime\` = \`MUST NOT import from features/app/platform\`"
spw_facet_close
echo ""

spw_set_open "import_violations"

ERRORS=0

violations=$(grep -rn "from '@/" src/lib/spw/ --include='*.ts' 2>/dev/null || true)
if [ -n "$violations" ]; then
  echo "    .{ layer = \`lib/spw\`, violations = ${#violations} },"
  ERRORS=$((ERRORS + $(echo "$violations" | wc -l)))
fi

core_violations=$(grep -rn "from '@/\(infra\|design\|ui\|lang\|viz\|runtime\|features\|debug\|cli\|app\|platform\)" src/core/ --include='*.ts' 2>/dev/null || true)
if [ -n "$core_violations" ]; then
  echo "    .{ layer = \`core\`, violations = ${#core_violations} },"
  ERRORS=$((ERRORS + $(echo "$core_violations" | wc -l)))
fi

spw_set_close "%total=$ERRORS"

if [ $ERRORS -eq 0 ]; then
  spw_boon "No import boundary violations"
else
  spw_bone "$ERRORS import boundary violations found"
fi

echo ""
spw_facet_open "where_to_add_code"
echo "    new_type_branded_primitive = \`src/core/types/\`"
echo "    new_parser_lexer_feature   = \`src/lib/spw/ (no @/ imports)\`"
echo "    new_ui_component           = \`src/ui/elements/ or src/app/components/\`"
echo "    new_visual_ast_renderer    = \`src/viz/\`"
echo "    new_repl_command           = \`src/runtime/repl/\`"
echo "    new_keyboard_shortcut      = \`src/features/keyboard/\`"
echo "    new_css_token              = \`src/design/tokens/\`"
echo "    new_theme                  = \`src/design/themes/\`"
echo "    new_activation_context     = \`src/core/contexts/\`"
echo "    new_spw_doc                = \`docs/<stratum>/spw/ or src/<domain>/docs/\`"
spw_facet_close
spw_section_close "domain_architecture_map"

spw_affordances_open
spw_affordance "bash .agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh" "audit .spw file landscape"
spw_affordance "npm run audit:ui-selectors" "verify UI separation"
spw_affordances_close
