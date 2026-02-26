#!/usr/bin/env bash
# css-experiment-gate.sh — Context loader: CSS design system state + experiment lifecycle
#
# Modes:
#   prime   — Output the CSS design system state (tokens, themes, contexts)
#   check   — Pre-experiment checklist for a named experiment
#   cleanup — Find leftover artifacts from a named experiment

SPW_SCRIPT_NAME="CSSExperimentGate"
SPW_SCRIPT_USAGE="[options] [check|prime|cleanup] [experiment-name]"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/scripts/spw-lib.sh"

# Custom pre-parse for action/name before handing off
ARGS=()
ACTION="prime"
NAME=""
while [[ $# -gt 0 ]]; do
  case $1 in
    prime|check|cleanup) ACTION="$1"; shift ;;
    -*) ARGS+=("$1"); shift ;;
    *)
      if [ -z "$NAME" ]; then NAME="$1"; fi
      ARGS+=("$1"); shift ;;
  esac
done
spw_parse_args "${ARGS[@]}"

if [ $SPW_HELP -eq 1 ]; then
  spw_print_help "
  Modes:
    prime      Output CSS design system state (default)
    check      Pre-experiment checklist for a named experiment
    cleanup    Post-experiment artifact scan
"
  exit 0
fi

# ---------------------------------------------------------------------------

case "$ACTION" in
  prime)
    spw_seed "$SPW_SCRIPT_NAME.Prime" "1.1" "context_loader"
    spw_section_open "css_design_system_state"

    spw_facet_open "custom_property_namespaces"
    props=$(grep -rohn '\-\-spw-[a-z-]*' src/styles/ src/design/ --include='*.css' 2>/dev/null | sort -u || true)
    if [ -n "$props" ]; then
      echo "$props" | sed 's/--spw-\([a-z]*\)-.*/\1/' | sort | uniq -c | sort -rn | while read -r c prefix; do
        echo "    .{ prefix = \`--spw-${prefix}-*\`, count = $c },"
      done
    fi
    spw_facet_close

    echo ""
    spw_set_open "themes"
    for f in $(find src/design/themes/ -name '*.ts' -o -name '*.css' 2>/dev/null | sort); do
      if ! filter_path "$f"; then continue; fi
      echo "    \`$f\`,"
    done
    spw_set_close

    echo ""
    spw_facet_open "active_data_attributes"
    echo "    activation_context = \`html[data-activation-context]\`"
    echo "    derived_perspective = \`html[data-perspective]\`"
    echo "    intensity_stage = \`html[data-stage]\`"
    echo "    active_theme = \`html[data-theme]\`"
    echo "    semantic_lens = \`html[data-lens]\`"
    spw_facet_close

    echo ""
    echo "  context_textures: #[  /* discipline CSS fragments */"
    for f in $(find src/styles/ -path '*context*' -name '*.css' 2>/dev/null | sort); do
      if ! filter_path "$f"; then continue; fi
      echo "    \`$f\`,"
    done
    spw_set_close

    echo ""
    spw_set_open "cognitive_bridge_tokens"
    if [ -f "src/design/themes/cognitive-bridge.ts" ]; then
      grep -o '[a-z]*:' src/design/themes/cognitive-bridge.ts 2>/dev/null | sort -u | head -10 | while read -r key; do
        echo "    \`${key%:}\`,"
      done
    fi
    spw_set_close
    spw_section_close "css_design_system_state"

    spw_affordances_open
    spw_affordance "bash $0 check <name>" "Pre-experiment checklist"
    spw_affordance "bash $0 cleanup <name>" "Post-experiment artifact scan"
    spw_affordance "npm run lint:spw" "parse-validate all .spw files"
    spw_affordance "npm run fuzz:runtime" "Catch CSS logic bugs in JS"
    spw_affordances_close
    ;;

  check)
    [ -z "$NAME" ] && echo "Usage: $0 check <experiment-name>" && exit 1
    spw_honk "Experiment Pre-Check: $NAME"
    echo ""

    switch=$(grep -rn "data-experiment.*$NAME\|experiment.*$NAME" src/ --include='*.ts' --include='*.css' 2>/dev/null || true)
    if [ -z "$switch" ]; then
      spw_bonk "No experiment gate found for '$NAME'"
      spw_dim "→ Add: data-experiment=\"$NAME\" on a container element"
    else
      spw_boon "Gate found:"
      echo "$switch" | while read -r line; do spw_dim "  $line"; done
    fi

    echo ""
    echo "  Checklist:"
    echo "  [ ] Hypothesis: one sentence describing expected outcome"
    echo "  [ ] Gate: data-experiment=\"$NAME\" on container"
    echo "  [ ] Default path: unchanged when gate is absent"
    echo "  [ ] Metric: one measurable outcome"
    echo "  [ ] Control: one thing that must NOT change"
    echo "  [ ] Exit: keep if metric improves, revert if ambiguous"
    ;;

  cleanup)
    [ -z "$NAME" ] && echo "Usage: $0 cleanup <experiment-name>" && exit 1
    spw_honk "Experiment Cleanup: $NAME"
    echo ""

    leftover=$(grep -rn "$NAME" src/ --include='*.ts' --include='*.css' 2>/dev/null || true)
    if [ -n "$leftover" ]; then
      spw_bonk "Remaining artifacts:"
      echo "$leftover" | while read -r line; do spw_dim "  $line"; done
    else
      spw_boon "Clean — no artifacts for '$NAME'"
    fi
    ;;

  *)
    echo "Usage: $0 [prime|check|cleanup] [experiment-name]"
    ;;
esac
