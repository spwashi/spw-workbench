#!/usr/bin/env bash
# containment-scan.sh — Context loader: UI layout structure and containment health
#
# Primes an agent with:
#   - Application shell structure (component tree)
#   - CSS containment patterns in use
#   - Potential containment issues
#   - Stacking context inventory
#   - Data attributes available for targeting

SPW_SCRIPT_NAME="ContainmentScan"
SPW_SCRIPT_USAGE="[options] [css-target] [ts-target]"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/scripts/spw-lib.sh"

# Script-specific options (parsed before spw_parse_args consumes positionals)
CSS_TARGET="src/styles"
TS_TARGET="src"

# Custom pre-parse for --css / --ts before handing off to spw_parse_args
ARGS=()
while [[ $# -gt 0 ]]; do
  case $1 in
    --css)   CSS_TARGET="$2"; shift 2 ;;
    --css=*) CSS_TARGET="${1#*=}"; shift ;;
    --ts)    TS_TARGET="$2"; shift 2 ;;
    --ts=*)  TS_TARGET="${1#*=}"; shift ;;
    *)       ARGS+=("$1"); shift ;;
  esac
done
spw_parse_args "${ARGS[@]}"

if [ $SPW_HELP -eq 1 ]; then
  spw_print_help "
  Script-specific:
    --css <target>      Target dir for CSS files (default: src/styles)
    --ts <target>       Target dir for TS files (default: src)
"
  exit 0
fi

# Legacy positional arg support
if [ ${#SPW_POSITIONAL[@]} -ge 1 ]; then CSS_TARGET="${SPW_POSITIONAL[0]}"; fi
if [ ${#SPW_POSITIONAL[@]} -ge 2 ]; then TS_TARGET="${SPW_POSITIONAL[1]}"; fi

# ---------------------------------------------------------------------------

spw_seed "$SPW_SCRIPT_NAME" "1.1" "context_loader"
spw_section_open "ui_layout_structure"

spw_set_open "component_tree"
grep -rn 'data-spw-component' "$TS_TARGET" --include='*.ts' 2>/dev/null | grep -o 'data-spw-component="[^"]*"' | sort -u | while read -r attr; do
  echo "    \`$attr\`,"
done
spw_set_close

echo ""
spw_set_open "data_attributes_in_use"
grep -rohn 'data-[a-z-]*' "$TS_TARGET" --include='*.ts' 2>/dev/null | sort -u | head -20 | while read -r attr; do
  echo "    \`$attr\`,"
done
spw_set_close

echo ""
spw_set_open "css_domain_files"
for f in $(find "$CSS_TARGET" -name '*.css' 2>/dev/null | sort); do
  if ! filter_path "$f"; then continue; fi
  lines=$(wc -l < "$f" | tr -d ' ')
  overflow=$(grep -c 'overflow' "$f" 2>/dev/null || echo 0)
  position=$(grep -c 'position' "$f" 2>/dev/null || echo 0)
  zindex=$(grep -c 'z-index' "$f" 2>/dev/null || echo 0)
  echo "    .{ path = \`$f\`, lines = $lines, overflow_rules = $overflow, position_rules = $position, z_index_rules = $zindex },"
done
spw_set_close

echo ""
spw_facet_open "containment_concerns"

# Hardcoded z-index (should use stacking tokens)
zindex=$(grep -rn 'z-index' "$CSS_TARGET" --include='*.css' 2>/dev/null | grep -v 'var(--' || true)
if [ -n "$zindex" ]; then
  count=$(echo "$zindex" | wc -l | tr -d ' ')
  echo "    hardcoded_z_index: #[  /* $count sites — bonk: should use stacking tokens */"
  echo "$zindex" | head -5 | while read -r line; do echo "      \`$line\`,"; done
  echo "    ][reg=set]"
fi

# Negative margins
neg_margin=$(grep -rn 'margin.*-[0-9]' "$CSS_TARGET" --include='*.css' 2>/dev/null || true)
if [ -n "$neg_margin" ]; then
  count=$(echo "$neg_margin" | wc -l | tr -d ' ')
  echo "    negative_margins: #[  /* $count sites — bonk: containment risk */"
  echo "$neg_margin" | head -5 | while read -r line; do echo "      \`$line\`,"; done
  echo "    ][reg=set]"
fi
spw_facet_close
spw_section_close "ui_layout_structure"

spw_affordances_open
spw_affordance "npm run lint:spw" "parse-validate all .spw files"
spw_affordance "npm run audit:ui-selectors" "Selector baseline audit"
spw_affordance "npm run audit:context-panel" "Context panel contract"
spw_affordance "npm run fuzz:runtime" "Layout logic bugs in JS"
spw_affordances_close
