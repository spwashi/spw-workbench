# Plan: query-profile

Make slow queries name the entered source and distinguish measured stages.

## Goal

A killed query still names the source it entered and the stages that finished. Ordinary stdout and reference semantics stay stable.

Taste note: improve **truthfulness** of timing. Profiling explains a stall; it does not claim a speedup.

## Scope

- **In scope**: opt-in stderr diagnostics; distilled instrument artifact; CLI help; consumer probe record; plan-ecology registration.
- **Out of scope**: parser rewrite; consumer mount/pin; performance fix for the slow source; construction-preserving ONF; portable focus record. Those claims live on `feature/construction-worlds`.

## Files

```
[MOD] packages/spw-cli/src/query.ts
[MOD] packages/spw-cli/src/args.ts
[MOD] packages/spw-cli/src/types.ts
[NEW] packages/spw-cli/src/query-profile.ts
[NEW] packages/spw-cli/src/query-profile.test.ts
[NEW] packages/spw-cli/src/fixtures/query-profile.spw
[MOD] .agents/plans/mounted-consumer-tooling/PLAN.md
[NEW] .agents/plans/query-profile/query-profile.spw
[MOD] .agents/plans/query-profile/PLAN.md
[MOD] .agents/plans/query-profile/wip.spw
[MOD] docs/runtime/spw/cli-command-surface.spw
[MOD] .agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw
```

### Craft guard

`query.ts` stays below 600 lines; diagnostics live in `query-profile.ts`. No new imports beyond the local helper.

## Commits

```
1. &[cli] — expose query stages and slow sources
2. .[plans,cli] — distill query stage receipts
```

Fuzz strategy: explore by inspecting `fromSource` boundaries; stabilize with `packages/spw-cli/src/query-profile.test.ts`; ship with those tests plus parse-validation of the distilled artifact. No broad fuzz for diagnostic-only changes.

## Agentic Hygiene

- Rebase target: `main@f2e5b61b`
- Rebase cadence: before commit 1 (done), before merge
- Hygiene split: construction-worlds and navigable-focus moved to `feature/construction-worlds`. Isolated `codex/query-profile` worktree.

## Dependencies

none.

## Failure Modes

- **Hard**: synchronous stalls prevent a final report — emit enter markers with `writeSync` before parse/evaluate.
- **Soft**: profile read serialization changes scheduling; disclosed in help.
- **Non-negotiable**: stdout and reference semantics unchanged; no source contents; no machine-local paths; timeout is not a parser defect.

## Validation

- **Hypotheses**: stage receipts account for completed work; enter markers survive SIGKILL.
- **Negative controls**: ordinary query stdout/exit; consumer pin.
- **Demo sequence**: `npm run spw -- query --from .spw --selector pathRefs --count --profile 2>query-profile.log`

## Spw Artifact

`.agents/plans/query-profile/query-profile.spw`
