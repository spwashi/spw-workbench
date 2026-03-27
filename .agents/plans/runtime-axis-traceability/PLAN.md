# Plan: runtime-axis-traceability

Add axis-traceability markers to the runtime to explicitly link implementation decisions to design axes (timing, stability, disclosure, affect, resolution, noise).

## Goal

The `spw-workbench` uses an "instrumentation-first" philosophy where design decisions are shaped by specific "deformation axes". Currently, these axes are documented in `.spw` files but are often implicit in the TypeScript implementation. This plan adds `@spw:axis` markers and comments to core runtime components (e.g., `RegisterBank`, `Substrate`, `ResonancePipeline`) to make these design traces explicit, improving 'literature quality' and guiding future refactors. Those traces should also be legible enough that release reviewers and surface stewards can follow how a public behavior inherits from a runtime choice.

## Scope

- **In scope**: Audit `src/runtime` for magic numbers or logic blocks tied to performance/disclosure/stability; add `@spw:axis` doc markers to `RegisterBank.ts`, `Substrate.ts`, and `stages.ts`; update `spw-marker-audit.ts` if needed to better surface these markers; and ensure the traces are readable from the perspective of publish/release governance rather than only runtime maintainers.
- **Out of scope**: Changing runtime logic, refactoring the deformation model itself, or adding runtime overhead for tracking. This is a "literature" and "traceability" pass.

## Files

[MOD] `src/runtime/state/register-bank.ts`
[MOD] `src/runtime/pipeline/substrate.ts`
[MOD] `src/runtime/pipeline/stages.ts`
[MOD] `scripts/analyzers/spw-marker-audit.ts`
[NEW] `.agents/plans/runtime-axis-traceability/PLAN.md`
[NEW] `.agents/plans/runtime-axis-traceability/wip.spw`

## Commits

1. `docs[runtime] — trace RegisterBank logic to stability and timing axes`
2. `docs[runtime] — trace Substrate events to disclosure and noise axes`
3. `audit[infra] — enhance marker audit to recognize @spw:axis traces`

## Agentic Hygiene

- Rebase target: historical baseline not recorded in the original branch memory; rebase onto current `main` before commit 1.
- Rebase cadence: before commit 1, before merge
- Hygiene split: none recorded in the original branch memory; verify worktree drift before implementation.

## Dependencies

- `ecosystem-surface-governance` should consume these traces as literature-grade justification for public-surface behavior and QA gates.

## Spw Artifact

None beyond `wip.spw`; the branch memory is the retained operational surface for this plan.
