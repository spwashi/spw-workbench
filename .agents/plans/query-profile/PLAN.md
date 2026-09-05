# Plan: query-profile

## Goal
Make slow queries name the entered source and distinguish measured stages. Taste: truthful timing and bounded CLI ownership; stdout and reference semantics remain stable.

## Scope
Opt-in stderr diagnostics only. No parser changes, consumer changes, dependencies, or pin updates.

## Files
[MOD] packages/spw-cli/src/query.ts (pipeline and help)
[MOD] packages/spw-cli/src/args.ts and types.ts (flag)
[NEW] packages/spw-cli/src/query-profile.ts and query-profile.test.ts
[NEW] packages/spw-cli/src/fixtures/query-profile.spw
[MOD] .agents/plans/mounted-consumer-tooling/PLAN.md (observed probe)
Craft guard: query.ts stays below 600 lines and 12 imports; helper owns diagnostics.

## Commits
1. &[cli] — expose query stages and slow sources
Single verified patch as requested; plan recorded before code, included in that patch.

## Agentic Hygiene
Base main@f2e5b61b. Clean initial status. Isolated codex/query-profile worktree; no rebase or concurrent-file edits needed. No merge or push.

## Dependencies
none

## Validation
Explore: inspect fromSource boundaries. Stabilize: subprocess stdout/status parity, report accounting and top-five tests. Ship: scoped tests/build/review and external 15-second consumer probe. No broad fuzz run for diagnostic-only changes.

## Failure Modes
Synchronous stalls prevent final reports: synchronously emit entry markers and completed-stage receipts. Profile read serialization changes scheduling, disclosed in help. Timeout alone does not diagnose a parser defect.
