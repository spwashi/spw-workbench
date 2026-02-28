---
name: spw-operator-lattice
description: Query Spw files by operator/brace/label combinatorics, snapshot runtime memory lattices, and iterate probe loops for emergent publishing and dialect tuning.
---

# Spw Operator Lattice

Use this skill when the task is about operator-sequence perspective, label symmetry, brace querying, or memory-lattice replay.

## Default Workflow

1. Snapshot runtime memory before probes:
   - `npm run spw:mem:dump -- --dump-root /tmp/spw-mem-dumps --label pre-probe --include-extra`
2. Query operator/brace structure:
   - `npm run spw:ls -- --seq '?~@&*^' --braces '<>{}' --model lattice --root .spw --top 20`
3. Add label-centric filter when needed:
   - `npm run spw:ls -- --seq '?_query' --label query --root .spw --top 20`
4. Add liminal probe expression when sequencing concept -> material transition:
   - `npm run spw:ls -- --seq '?~@' --probe '?(subject).[' --root .spw --top 20`
5. Promote top-ranked files into probe targets and update `.spw/harness/probes/probe-loop.spw`.
6. Optionally restore a prior runtime memory state:
   - `npm run spw:mem:load -- --dump-root /tmp/spw-mem-dumps --wipe`

## Output Contract

- Produce one concise probe run note containing:
  - operator/braces/labels query used
  - top files ranked by coverage
  - one proposed projection/lens update
  - one memory-state dump id used for replay

## Dialect Tuning Guidance

- Treat `_` as intrinsic operator carrier for labeled semantics.
- Favor labeled operator forms (`?_label`) for query dispositions.
- Favor labeled brace symmetry (`{_x ... }_x`) when block identity must survive projection.
- Use `--model lattice` for symmetry/consistency optimization, `--model fluid` for exploratory breadth.

## Scripts

- `bash .agents/skills/spw-operator-lattice/scripts/probe-loop.sh [seq] [model] [root] [label] [dump_label]`
- `bash .agents/skills/spw-operator-lattice/scripts/probe-loop.sh [seq] [model] [root] [label] [dump_label] [probe_expr]`

## References

- Read `.agents/skills/spw-operator-lattice/references/query-recipes.md` for repeatable combinatoric query recipes.
