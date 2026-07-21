#!/usr/bin/env bash
# semantics-check.sh — Context loader: semantic vocabulary and operator coverage
#
# Primes an agent with:
#   - Operator documentation coverage
#   - Branded type inventory
#   - Metaphor term distribution (which terms bridge .spw ↔ .ts)
#   - Theory file locations
#   - Vocabulary consistency

SPW_SCRIPT_NAME="Semantics.Audit"
SPW_SCRIPT_USAGE="[options]"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/scripts/spw-lib.sh"
spw_parse_args "$@"

if [ $SPW_HELP -eq 1 ]; then spw_print_help; exit 0; fi

# ---------------------------------------------------------------------------

STATE_STATUS="clean"
STATE_SCOPE="context_loader"
STATE_PACKAGE_COUNT=$(spw_count_files "packages" '*.ts' -not -path '*/__tests__/*')
STATE_LEGACY_COUNT=$(spw_count_files "src" '*.ts' -not -path '*/__tests__/*')
STATE_SOURCE_COUNT=$((STATE_PACKAGE_COUNT + STATE_LEGACY_COUNT))
STATE_SPW_COUNT=$(spw_count_files "docs/theory/spw" '*.spw')
STATE_TOTAL_COUNT=$((STATE_SOURCE_COUNT + STATE_SPW_COUNT))
STATE_NEARBY="docs/theory/spw;packages;src;lib/spw-v0.3.0"

spw_seed "$SPW_SCRIPT_NAME" "1.1" "context_loader"
spw_section_open "vocabulary_map"

spw_set_open "theory_files"
for f in docs/theory/spw/*.spw; do
  [ -f "$f" ] || continue
  if ! filter_path "$f"; then continue; fi
  lines=$(wc -l < "$f" | tr -d ' ')
  echo "    .{ path = \`$f\`, lines = $lines }"
done
spw_set_close

echo ""
spw_set_open "operator_coverage"
operators=('!' '^' '~' '?' '*' '=' '@' '#' '.' '&' '$' '%' '<>')
names=('action' 'ascension' 'potential' 'wonder' 'value' 'configuration' 'perspective' 'vibration' 'ground' 'subject' 'substrate' 'measure' 'coupling')

i=0
for op in "${operators[@]}"; do
  name="${names[$i]}"
  if grep -qF "$op" docs/theory/spw/operators.spw 2>/dev/null; then
    in_ops="\`✓ boon\`"
  else
    in_ops="\`⚠ bonk\`"
  fi
  ts_count=$(grep -rlF "$op" packages/ src/ --include='*.ts' 2>/dev/null | wc -l | tr -d ' ' || echo 0)
  echo "    .{ operator = \`$op\`, name = \`$name\`, docs = $in_ops, ts_refs = $ts_count }"
  i=$((i + 1))
done
spw_set_close

echo ""
spw_set_open "branded_types"
if [ -f "packages/spw-seed/src/types/token.ts" ]; then
  grep -E 'export type (OperatorKind|ModifierKind|ConnectorKind|ContainerKind|TokenType)' packages/spw-seed/src/types/token.ts 2>/dev/null | sed 's/export type \([^ =]*\).*/    `\1`,/' || true
fi
if [ -f "src/runtime/state/types.ts" ]; then
  grep -E 'export type (RegisterAccessMode|ContainerAffinity)' src/runtime/state/types.ts 2>/dev/null | sed 's/export type \([^ =]*\).*/    `\1`,/' || true
fi
spw_set_close

echo ""
echo "  metaphor_bridge: #[  /* term distribution: .spw vs .ts */"
for term in valence register facet stratum cascade perspective operator container quality layer region context; do
  in_spw=$(grep -rl "$term" docs/ --include='*.spw' 2>/dev/null | wc -l | tr -d ' ' || echo 0)
  in_ts=$(grep -rl "$term" packages/ src/ --include='*.ts' 2>/dev/null | wc -l | tr -d ' ' || echo 0)
  echo "    .{ term = \`$term\`, spw_count = $in_spw, ts_count = $in_ts }"
done
spw_set_close

echo ""
spw_facet_open "normalization_pipeline"
echo "    SNF  = \`implemented lexer output (packages/spw-seed/src/lexer/)\`"
echo "    SiNF = \`partial AST-to-ONF projection; fixity reducers proposed\`"
echo "    SeNF = \`cross-sigil semantic normalization (proposed research)\`"
spw_facet_close

spw_section_close "vocabulary_map"
spw_affordances_open
spw_affordance "npm run lint:spw" "parse-validate all .spw files"
spw_affordance "npm run lint:v020:architecture" "library architecture/theory bridge integrity"
spw_affordance "npm run lint:v020:runtime" "runtime contract + naming integrity"
spw_affordance "npm run audit:spw-garden" ".spw structural health"
spw_affordance "npm run analyze:perturb" "What changes when X changes"
spw_affordance "npm run audit" "Extract and classify all @spw: annotation sites"
spw_affordances_close

if [ ! -f "docs/theory/spw/operators.spw" ]; then
  STATE_STATUS="issue"
fi

spw_state_write \
  --id "semantics-check" \
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
  --writer ".agents/skills/spw-semantics-rigor/scripts/semantics-check.sh"
