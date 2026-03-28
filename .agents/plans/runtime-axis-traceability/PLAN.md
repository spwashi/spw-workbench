# Plan: runtime-axis-traceability

Add axis-traceability markers to the runtime to explicitly link implementation decisions to design axes (timing, stability, disclosure, affect, resolution, noise).

## Goal

The `spw-workbench` uses an instrumentation-first philosophy where design decisions are shaped by specific deformation axes. Currently, these axes are documented in `.spw` files but are often implicit in the TypeScript implementation. This plan adds `@spw:axis` markers and comments to canonical runtime components (for example `RegisterBank`, `Substrate`, and stage orchestration) so those design traces become explicit, improving literature quality and guiding future refactors. Those traces should also be legible enough that release reviewers, site stewards, and DX work can follow how a public behavior inherits from a runtime choice.

## Scope

- **In scope**: audit canonical runtime modules under `packages/spw-runtime/src/` for logic blocks tied to timing, disclosure, stability, affect, resolution, or noise; add `@spw:axis` markers to `RegisterBank`, `Substrate`, and `stages`; update `spw-marker-audit.ts` if needed to better surface these markers; and ensure the traces are readable from the perspective of publish/release governance rather than only runtime maintainers.
- **Out of scope**: Changing runtime logic, refactoring the deformation model itself, or adding runtime overhead for tracking. This is a "literature" and "traceability" pass.

## Files

```text
[MOD] packages/spw-runtime/src/state/register-bank.ts
[MOD] packages/spw-runtime/src/pipeline/substrate.ts
[MOD] packages/spw-runtime/src/pipeline/stages.ts
[MOD] scripts/analyzers/spw-marker-audit.ts
[NEW] .agents/plans/runtime-axis-traceability/runtime-axis-traceability.spw
[NEW] .agents/plans/runtime-axis-traceability/wip.spw
```

## Commits

1. `.[runtime] — trace RegisterBank logic to stability and timing axes`
2. `.[runtime] — trace Substrate and stages to disclosure, noise, and resolution axes`
3. `![infra] — enhance marker audit to recognize @spw:axis traces`

## Agentic Hygiene

- Rebase target: `main@3b1747c4` (updated 2026-03-27)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none recorded in the original branch memory; verify worktree drift before implementation.

## Dependencies

- `ecosystem-surface-governance` should consume these traces as literature-grade justification for public-surface behavior and QA gates.
- `runtime-dx-foundation` should reuse these traces when diagnostic stations explain why runtime behavior looks the way it does.

## Spw Artifact

```text
.agents/plans/runtime-axis-traceability/runtime-axis-traceability.spw
```

## Principal Engineering Orientation

- Ladder position: `bridge`
- Judgment target: make runtime explanations precise enough that code review, DX writing, and release/governance review can all point to the same named axes
- Commit bar: each slice should make one runtime choice more discussable and one future review question easier to ask

## Review Surfaces

- Runtime code: `packages/spw-runtime/src/state/register-bank.ts`, `packages/spw-runtime/src/pipeline/substrate.ts`, `packages/spw-runtime/src/pipeline/stages.ts`
- Audit surface: `scripts/analyzers/spw-marker-audit.ts`
- Planning artifact: `.agents/plans/runtime-axis-traceability/runtime-axis-traceability.spw`

## Recursive Improvement

- Add traces only where they help a reviewer recover why a behavior exists.
- Reuse the same axis phrases across markers, review comments, DX surfaces, and governance notes.
- Audit for ornamental traces; if removing a marker changes nothing about review quality, it should probably not exist.
