#!/usr/bin/env bash
set -euo pipefail

SEQ="${1:-?~@&*^}"
MODEL="${2:-lattice}"
ROOT="${3:-.spw}"
LABEL="${4:-}"
DUMP_LABEL="${5:-probe-loop}"
PROBE_EXPR="${6:-}"
DUMP_ROOT="${SPW_MEM_DUMP_ROOT:-/tmp/spw-mem-dumps}"

npm run -s spw:mem:dump -- --dump-root "$DUMP_ROOT" --label "$DUMP_LABEL" --include-extra >/dev/null

CMD=(npm run -s spw:ls -- --seq "$SEQ" --model "$MODEL" --root "$ROOT" --top 20)
if [[ -n "$LABEL" ]]; then
  CMD+=(--label "$LABEL")
fi
if [[ -n "$PROBE_EXPR" ]]; then
  CMD+=(--probe "$PROBE_EXPR")
fi

"${CMD[@]}"

echo ""
echo "dump_root=$DUMP_ROOT"
echo "dump_label=$DUMP_LABEL"
