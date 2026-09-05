# Plan: construction-worlds

Retain measured construction probes and the proposed portable focus record as Spw research, not as shipped language law.

## Goal

Keep two session claims queryable: a construction should survive lowering, and a selection should keep its source while context changes. Status grades stay measured or proposed.

Taste note: improve **claim discipline** — probes and first patches are named; neither ONF nor inspect/cite/follow behavior changes here.

## Scope

- **In scope**: `construction-worlds` and `navigable-focus` research surfaces; research index and toc; topography `focus_record` handoff; noun-postfix ONF open; ecology registration.
- **Out of scope**: implementing construction-preserving ONF; implementing the focus record; query `--profile`; consumer pin; parser rewrite.

## Files

```
[NEW] .agents/plans/construction-worlds/PLAN.md
[NEW] .agents/plans/construction-worlds/wip.spw
[NEW] docs/research/spw/construction-worlds.spw
[NEW] docs/research/spw/navigable-focus.spw
[MOD] docs/research/index.spw
[MOD] docs/toc.spw
[MOD] .agents/plans/operational-topography/operational-topography.spw
[MOD] .agents/plans/operational-topography/wip.spw
[MOD] .agents/plans/noun-postfix-containers/wip.spw
[MOD] .agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw
```

### Craft guard

Research surfaces stay claim-sized. No parser, runtime, or CLI source edits.

## Commits

```
1. .[research,plans] — record construction worlds and navigable focus
```

Fuzz strategy: parse-validate the new research and plan surfaces. No runtime test run; this branch does not change executables.

## Agentic Hygiene

- Rebase target: stacked on `codex/query-profile@e106b302` (`main@f2e5b61b` plus the query instrument)
- Rebase cadence: after query-profile merges, before this merge
- Hygiene split: query instrument stays on `codex/query-profile`

## Dependencies

`query-profile`. Construction-worlds cites the instrument artifact; do not merge this branch first.

## Failure Modes

- **Hard**: research read as shipped language law — status frames keep measured/proposed/interpretive apart.
- **Soft**: topography and noun-postfix streams carry a handoff they do not implement.
- **Non-negotiable**: no ONF, inspect, cite, or follow behavior change; no source contents; no machine-local paths.

## Validation

- **Hypotheses**: probes named in `construction-worlds.spw` still reproduce on `f2e5b61b`.
- **Negative controls**: current ONF values; current inspect/cite/follow; query stdout.
- **Demo sequence**: read `docs/research/spw/construction-worlds.spw` then `docs/research/spw/navigable-focus.spw`.

## Spw Artifact

The research surfaces are the distilled record:

- `docs/research/spw/construction-worlds.spw`
- `docs/research/spw/navigable-focus.spw`

No third plan-local artifact.
