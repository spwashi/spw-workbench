#!/usr/bin/env bash
# type-audit.sh — Context loader: type landscape and improvement targets
#
# Primes an agent with:
#   - Branded type inventory (what exists, what's missing)
#   - Weak typing hotspots (where to improve)
#   - Type patterns in use (what conventions to follow)
#   - Actionable next improvements

SPW_SCRIPT_NAME="TypeAudit"
SPW_SCRIPT_USAGE="[options] [target]"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/scripts/spw-lib.sh"
spw_parse_args "$@"

if [ $SPW_HELP -eq 1 ]; then spw_print_help; exit 0; fi

TARGET="${SPW_POSITIONAL[0]:-src}"
STATE_STATUS="clean"
STATE_SCOPE="$TARGET"
STATE_SOURCE_COUNT=$(spw_count_files "$TARGET" '*.ts' -not -path '*/__tests__/*')
STATE_SPW_COUNT=$(spw_count_files "docs/theory/spw" '*.spw')
STATE_TOTAL_COUNT=$((STATE_SOURCE_COUNT + STATE_SPW_COUNT))
STATE_NEARBY="$TARGET;src/seed/types;src/runtime/state"

# ---------------------------------------------------------------------------

spw_seed "$SPW_SCRIPT_NAME" "1.1" "context_loader"
spw_section_open "type_landscape"

spw_set_open "branded_types"
if [ -f "src/core/types/branded.ts" ]; then
  grep 'export type' src/core/types/branded.ts 2>/dev/null | sed 's/export type \([^ =]*\).*/    `\1`,/' || true
else
  spw_bonk "src/core/types/branded.ts not found"
  STATE_STATUS="issue"
fi
spw_set_close

echo ""
spw_facet_open "patterns_in_use"

# as const satisfies
asconst=$(grep -rn 'as const satisfies' "$TARGET" --include='*.ts' 2>/dev/null | grep -v node_modules | head -3 || true)
if [ -n "$asconst" ]; then
  echo "    as_const_satisfies: #["
  echo "$asconst" | while read -r line; do echo "      \`$line\`,"; done
  echo "    ][reg=set]"
fi

# assertNever
assertnever=$(grep -rn 'assertNever\|assert.*never' "$TARGET" --include='*.ts' 2>/dev/null | grep -v node_modules | head -3 || true)
if [ -n "$assertnever" ]; then
  echo "    exhaustiveness_guards: #["
  echo "$assertnever" | while read -r line; do echo "      \`$line\`,"; done
  echo "    ][reg=set]"
fi

# Discriminated unions
discunion=$(grep -rn "kind.*:.*'" "$TARGET" --include='*.ts' 2>/dev/null | grep 'type\|interface' | grep -v node_modules | head -3 || true)
if [ -n "$discunion" ]; then
  echo "    discriminated_unions: #["
  echo "$discunion" | while read -r line; do echo "      \`$line\`,"; done
  echo "    ][reg=set]"
fi
spw_facet_close

echo ""
spw_facet_open "improvement_targets"

# Record<string,...> hotspots
record_string=$(grep -rn 'Record<string,' "$TARGET" --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v '.test.' || true)
if [ -n "$record_string" ]; then
  count=$(echo "$record_string" | wc -l | tr -d ' ')
  echo "    record_string_to_brand: #[  /* $count sites */"
  # Group by directory
  echo "$record_string" | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -5 | while read -r c dir; do
    echo "      .{ path = \`$dir/\`, sites = $c },"
  done
  echo "    ][reg=set]"
fi

# any
any_usage=$(grep -rn ': any' "$TARGET" --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v '.test.' | grep -v '// eslint' || true)
if [ -n "$any_usage" ]; then
  count=$(echo "$any_usage" | wc -l | tr -d ' ')
  echo "    explicit_any: #[  /* $count sites */"
  echo "$any_usage" | head -5 | while read -r line; do echo "      \`$line\`,"; done
  echo "    ][reg=set]"
fi

spw_facet_close
spw_section_close "type_landscape"

spw_affordances_open
spw_affordance "npm run lint:spw" "parse-validate all .spw files"
spw_affordance "npm run fuzz:types" "Full type safety scan"
spw_affordance "npm run audit:types" "@spw:types debt markers"
spw_affordance "npm run build" "tsc catches all type errors"
spw_affordances_close

spw_state_write \
  --id "type-audit" \
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
  --writer ".agents/skills/spw-typescript-affordances/scripts/type-audit.sh"
