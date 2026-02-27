#!/usr/bin/env bash
# privacy-scan.sh — Context loader: data surface and privacy boundaries
#
# Primes an agent with:
#   - Data persistence points (localStorage, clipboard, console)
#   - Data flow map (what data goes where)
#   - Sensitive file paths (.spw probes that may contain agent conversations)
#   - Gating checks (what's behind stage guards)

SPW_SCRIPT_NAME="PrivacyScan"
SPW_SCRIPT_USAGE="[options] [target]"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/scripts/spw-lib.sh"
spw_parse_args "$@"

if [ $SPW_HELP -eq 1 ]; then spw_print_help; exit 0; fi

TARGET="${SPW_POSITIONAL[0]:-src}"
STATE_STATUS="clean"
STATE_SCOPE="$TARGET"
STATE_SOURCE_COUNT=$(spw_count_files "$TARGET" '*.ts' -not -path '*/__tests__/*')
STATE_SPW_COUNT=$(spw_count_files "$TARGET" '*.spw')
STATE_TOTAL_COUNT=$((STATE_SOURCE_COUNT + STATE_SPW_COUNT))
STATE_NEARBY="$TARGET;docs/research"

# ---------------------------------------------------------------------------

spw_seed "$SPW_SCRIPT_NAME" "1.1" "context_loader"
spw_section_open "data_surface_map"

spw_facet_open "persistence_points"

# localStorage / sessionStorage
storage=$(grep -rn 'localStorage\|sessionStorage' "$TARGET" --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v '.test.' || true)
if [ -n "$storage" ]; then
  echo "    browser_storage: #["
  echo "$storage" | while read -r line; do echo "      \`$line\`,"; done
  echo "    ][reg=set]"
else
  echo "    browser_storage: #[]"
fi

# Clipboard
clipboard=$(grep -rn 'clipboard\|execCommand.*copy' "$TARGET" --include='*.ts' 2>/dev/null | grep -v node_modules || true)
if [ -n "$clipboard" ]; then
  echo "    clipboard_access: #["
  echo "$clipboard" | while read -r line; do echo "      \`$line\`,"; done
  echo "    ][reg=set]"
else
  echo "    clipboard_access: #[]"
fi

echo ""

# Console output (potential data leaks)
consolelog=$(grep -rn 'console\.\(log\|warn\|error\|debug\)' "$TARGET" --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v '.test.' || true)
if [ -n "$consolelog" ]; then
  count=$(echo "$consolelog" | wc -l | tr -d ' ')
  echo "    console_output: #["
  # Group by domain
  echo "$consolelog" | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -8 | while read -r c dir; do
    echo "      .{ path = \`$dir/\`, sites = $c },"
  done
  echo "    ][reg=set %note=\`gate behind stage > 0\`]"
else
  echo "    console_output: #[]"
fi
spw_facet_close

echo ""
spw_facet_open "sensitive_content_paths"

# Probe files (may contain agent conversations)
probes=$(find src/lang/seeds/probes/ -name '*.spw' 2>/dev/null | sort || true)
if [ -n "$probes" ]; then
  echo "    agent_probes: #["
  echo "$probes" | while read -r f; do
    if ! filter_path "$f"; then continue; fi
    lines=$(wc -l < "$f" | tr -d ' ')
    echo "      .{ path = \`$f\`, lines = $lines },"
  done
  echo "    ][reg=set]"
fi

echo ""
echo "    research_archives: #["
archives=$(find docs/research/ -name '*.md' -o -name '*.spw' 2>/dev/null | sort || true)
if [ -n "$archives" ]; then
  echo "$archives" | while read -r f; do
    if ! filter_path "$f"; then continue; fi
    echo "      \`$f\`,"
  done
fi
echo "    ][reg=set]"
spw_facet_close

echo ""
spw_facet_open "data_flow_summary"
echo "    Input   = \`keyboard → editor → parser (all in-memory)\`"
echo "    State   = \`src/infra/state/ (RAM, session-scoped)\`"
echo "    Output  = \`clipboard (user-initiated), console (debug)\`"
echo "    Persist = \`localStorage (if used), IndexedDB (if used)\`"
echo "    Network = \`NONE (browser-only, no external requests)\`"
spw_facet_close
spw_section_close "data_surface_map"

spw_affordances_open
spw_affordance "npm run audit" "Extract and classify all @spw: annotation sites"
spw_affordances_close

spw_state_write \
  --id "privacy-scan" \
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
  --writer ".agents/skills/spw-privacy-engineering/scripts/privacy-scan.sh"
