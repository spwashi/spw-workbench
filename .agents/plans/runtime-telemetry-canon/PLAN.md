# Plan: runtime-telemetry-canon

Amend the upstream runtime metadata work and make substrate events plus resonances first-class in the public pipeline results.

## Goal

The desired end state is a runtime pipeline where `runSpw()` and `collectPrecipitates()` return the runtime telemetry that host apps actually need: immutable substrate events, detected resonances, and register metadata that reflects the current write rather than accumulating stale semantic drift. This folds the useful parts of upstream commit `125a4cb` into a tighter canonical contract so hosts do not need to reconstruct substrate ownership outside the runtime. The quality bar is correctness and clarity in the runtime API rather than more app-side inference.

**Taste note**: correctness, clarity, layering.

## Scope

- **In scope**: amend upstream valence/register metadata flow, normalize `RegisterMeta` write semantics, thread substrate ownership through the runtime pipeline, return immutable `events` and `resonances` from public runtime results, and add/update focused tests.
 - **Out of scope**: host-app adapter refactors, broader `RegisterBank` metaphysics redesign, new resonance algorithms, semicolon syntax support, and large docs sweeps beyond narrow API notes if needed.

## Files

```text
[NEW] .agents/plans/runtime-telemetry-canon/wip.spw
[MOD] src/runtime/pipeline/types.ts
[MOD] src/runtime/pipeline/run-spw.ts
[MOD] src/runtime/pipeline/stages.ts
[MOD] src/runtime/pipeline/substrate.ts
[MOD] src/runtime/pipeline/resonance.ts
[MOD] src/runtime/interpreter/interpreter.ts
[MOD] src/runtime/state/types.ts
[MOD] src/runtime/state/register-bank.ts
[MOD] src/runtime/index.ts
[MOD] src/seed/normalize.ts
[MOD] src/seed/types/ast/onf.ts
[MOD] scripts/lsp/context.ts
[MOD] src/runtime/__tests__/run-spw.test.ts
[MOD] src/runtime/__tests__/register-bank.test.ts
[MOD] src/runtime/__tests__/substrate.test.ts
[MOD?] docs/runtime/spw/runtime-foundation.spw
[DEL] (none)
```

### Craft guard

- `src/runtime/state/register-bank.ts` and `src/runtime/interpreter/interpreter.ts` are already concept-dense; keep the amendment narrow and avoid opportunistic refactors.
- Preserve the dependency direction: seed normalization feeds runtime metadata, but runtime telemetry should not leak live mutable substrate instances back to callers.
- Returned telemetry must be immutable snapshots; hosts should consume facts, not own runtime internals.

## Commits

1. `.[plans] — stage runtime telemetry canon plan artifacts`
2. `&[runtime] =amend[upstream-valence-metadata] — carry valence and frames as current-write semantics`
3. `&[runtime] =add[telemetry-returns] — return substrate events and resonances from runSpw and collectPrecipitates`
4. `![runtime] =verify[telemetry-contract] — extend tests for valence, events, resonances, and phase telemetry`

## Agentic Hygiene

- Rebase target: `main@24865b70d6a8b44d1d4b386915e5c24333c6a0b9`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

- upstream commit `125a4cb54b9a98491df959ac4685ff71d23d17b1` is the design precursor and should be cherry-picked or recreated in amended form inside this branch.

## Fuzz Strategy

- Explore: `npm run test:runtime -- src/runtime/__tests__/run-spw.test.ts src/runtime/__tests__/register-bank.test.ts src/runtime/__tests__/substrate.test.ts`
- Stabilize: `npm run test:runtime && npm run build`
- Ship gate: `npm run test:run && npm run audit:full && git diff --check`
