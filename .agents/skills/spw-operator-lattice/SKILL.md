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
   - `npm run spw:ls -- --seq '?~@&*^' --braces '<>{}' --model lattice --root .spw --top 20 --json`
3. Add label-centric filter when needed:
   - `npm run spw:ls -- --seq '?_query' --label query --root .spw --top 20`
4. Add liminal probe expression when sequencing concept -> material transition:
   - `npm run spw:ls -- --seq '?~@' --probe '?(subject).[' --equiv soft --root .spw --top 20`
5. Run a negative control or narrower label query before treating high coverage as useful; common generated wonder blocks can saturate operator/brace scores.
6. Promote only human-reviewed, revision-addressed files into probe targets and update `.spw/harness/probes/probe-loop.spw`.
7. Optionally restore a prior runtime memory state:
   - `npm run spw:mem:load -- --dump-root /tmp/spw-mem-dumps --wipe`

## Current Tool Boundary

- CLI `OPERATOR_SET` does not yet include Seed's adjacent `<>` operator; angle characters are counted only by the raw brace stream.
- The default `hybrid` match chooses the better of ordered and multiset coverage, so `--seq` is not necessarily an adjacency or full-order assertion. Use `--mode ordered --strict` when order is required and still inspect contributions.
- Raw operator/brace scans can count strings and comments and do not prove well-nested pairs. AST mode may still inherit parser recovery. Do not label either structured E0 evidence without a complete-parse and pair-identity predicate.
- Ranking currently compares probe score and aggregate coverage before `strictHit`; exact-first ranking is a target, not current behavior.
- `--model` currently changes explanatory hints, not the ranking formula.

## Output Contract

- Produce one concise probe run note containing:
  - operator/braces/labels query used
  - top files ranked by coverage
  - workspace revision, explicit root, profile/model, equivalence mode, and corpus exclusions
  - exact versus approximate tier and score contributions available from the current tool
  - one counterexample or negative control
  - one proposed projection/lens update
  - one memory-state dump id used for replay
- Do not describe coverage as an emergent law, physical invariant, style quality, or semantic similarity.
- A repo-local agent sample must retain relative file path, source span when available, query/profile identity, revision, cost, and exclusions. Prefer compact evidence packets over copied corpus excerpts.

## Dialect Tuning Guidance

- Treat `_` as intrinsic operator carrier for labeled semantics.
- Favor labeled operator forms (`?_label`) for query dispositions.
- Favor labeled brace symmetry (`{_x ... }_x`) when block identity must survive projection.
- Treat uncompleted scripts as dangling registers; use `--equiv soft` when testing `&` as dangling-register reference.
- Use `--model lattice` for symmetry/consistency optimization, `--model fluid` for exploratory breadth.
- Treat model hints as named ranking profiles, not runtime physics.
- Keep exact selection and approximate ranking distinct. If soft equivalence is used, report it explicitly and preserve exact hits first.
- In mounted consumers, run from verified consumer authority and exclude `.spw/_workbench/**` unless infrastructure is the explicit target.

## Nutritious Sample Guidance

A dense result is nutritious only when each included field changes orientation, comparison, falsification, or the next safe move. Prefer a bounded packet containing:

- both consumer and workbench revisions where mounted;
- query, model, equivalence, roots, limits, and exclusions;
- exact hits, near hits, and at least one counterexample;
- relative paths and source spans rather than decontextualized snippets;
- score components and scan cost where implemented;
- an explicit statement of what the current tool cannot infer.

## Scripts

- `bash .agents/skills/spw-operator-lattice/scripts/probe-loop.sh [seq] [model] [root] [label] [dump_label]`
- `bash .agents/skills/spw-operator-lattice/scripts/probe-loop.sh [seq] [model] [root] [label] [dump_label] [probe_expr] [equiv_mode]`

## References

- Read `.agents/skills/spw-operator-lattice/references/query-recipes.md` for repeatable combinatoric query recipes.
