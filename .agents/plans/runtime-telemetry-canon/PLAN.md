# Plan: runtime-telemetry-canon

Amend the upstream runtime metadata work and make substrate events plus resonances first-class in the public pipeline results.

## Goal

The desired end state is a runtime pipeline where `runSpw()` and `collectPrecipitates()` return the telemetry that host apps and ecosystem stewards actually need: immutable substrate events, detected resonances, and register metadata that reflects the current write rather than accumulating stale semantic drift. This folds the useful parts of upstream commit `ea709ac` into a tighter canonical contract so hosts do not need to reconstruct substrate ownership outside the runtime. The quality bar is correctness and clarity in the runtime API rather than more app-side inference. That telemetry should also be publish-meaningful enough to support governance and diagnostics: a host or site steward should be able to tell whether a surface is fresh, grounded, and semantically coherent without reconstructing those judgments from scratch.

**Taste note**: correctness, clarity, layering.

## Scope

- **In scope**: amend upstream valence/register metadata flow, normalize `RegisterMeta` write semantics, thread substrate ownership through the runtime pipeline, return immutable `events` and `resonances` from public runtime results, surface enough freshness/coherence facts to support host-side QA decisions, and add/update focused tests.
 - **Out of scope**: host-app adapter refactors, broader `RegisterBank` metaphysics redesign, new resonance algorithms, semicolon syntax support, and large docs sweeps beyond narrow API notes if needed.

## Files

```text
[NEW] .agents/plans/runtime-telemetry-canon/wip.spw
[NEW] .agents/plans/runtime-telemetry-canon/runtime-telemetry-canon.spw
[MOD] packages/spw-runtime/src/pipeline/types.ts
[MOD] packages/spw-runtime/src/pipeline/run-spw.ts
[MOD] packages/spw-runtime/src/pipeline/stages.ts
[MOD] packages/spw-runtime/src/pipeline/substrate.ts
[MOD] packages/spw-runtime/src/pipeline/resonance.ts
[MOD] packages/spw-runtime/src/interpreter/interpreter.ts
[MOD] packages/spw-runtime/src/state/types.ts
[MOD] packages/spw-runtime/src/state/register-bank.ts
[MOD] packages/spw-runtime/src/index.ts
[MOD] packages/spw-seed/src/normalize.ts
[MOD] packages/spw-seed/src/types/ast/onf.ts
[MOD?] packages/spw-lsp/src/context.ts
[MOD?] src/runtime/__tests__/run-spw.test.ts
[MOD?] src/runtime/__tests__/register-bank.test.ts
[MOD?] src/runtime/__tests__/substrate.test.ts
[MOD?] docs/runtime/spw/runtime-foundation.spw
[DEL] (none)
```

### Craft guard

- `packages/spw-runtime/src/state/register-bank.ts` and `packages/spw-runtime/src/interpreter/interpreter.ts` are already concept-dense; keep the amendment narrow and avoid opportunistic refactors.
- Preserve the dependency direction: seed normalization feeds runtime metadata, but runtime telemetry should not leak live mutable substrate instances back to callers.
- Returned telemetry must be immutable snapshots; hosts should consume facts, not own runtime internals.
- The added telemetry should make readiness judgments easier without turning the runtime contract into a vague product-policy layer.
- Telemetry vocabulary should stay compatible with the DX station model so runtime facts do not fork into a second diagnostic language.

## Commits

Commit 2 hardens the runtime facts. Commit 3 makes those facts consumable by downstream DX/governance surfaces. Commit 4 locks the contract with tests.

1. `.[plans] — stage runtime telemetry canon plan artifacts`
2. `&[runtime] =amend[upstream-valence-metadata] — carry valence and frames as current-write semantics`
3. `&[runtime] =add[telemetry-returns] — return substrate events and resonances from runSpw and collectPrecipitates`
4. `![runtime] =verify[telemetry-contract] — extend tests for valence, events, resonances, and phase telemetry`

## Agentic Hygiene

- Rebase target: `main@3b1747c4` (packages-era baseline; upstream commit remains design lore, not branch base)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

- upstream commit `ea709acf51f0d61db6f8ef58a86ea67c9bd373bb` is the design precursor and should be cherry-picked or recreated in amended form inside this branch.
- `ecosystem-surface-governance` is a downstream consumer; its launch/QA gates should be able to reference runtime freshness and coherence facts rather than inventing a parallel vocabulary.
- `runtime-dx-foundation` should consume the same freshness/coherence facts when it turns runtime conditions into station diagnostics.

## Fuzz Strategy

- Explore: `npm run test:runtime -- src/runtime/__tests__/run-spw.test.ts src/runtime/__tests__/register-bank.test.ts src/runtime/__tests__/substrate.test.ts`
- Stabilize: `npm run test:runtime && npm run build`
- Ship gate: `npm run test:run && npm run audit:full && git diff --check`

## Principal Engineering Orientation

- Ladder position: `service`
- Judgment target: sharpen the difference between runtime facts and downstream interpretation so hosts, DX, and governance can quote the runtime without re-inventing it
- Commit bar: each slice should remove one host-side guess and leave one new immutable fact that other surfaces can reuse unchanged

## Review Surfaces

- Runtime code: `packages/spw-runtime/src/pipeline/run-spw.ts`, `packages/spw-runtime/src/pipeline/types.ts`, `packages/spw-runtime/src/pipeline/substrate.ts`
- Downstream plan surfaces: `runtime-dx-foundation`, `ecosystem-surface-governance`
- Planning artifact: `.agents/plans/runtime-telemetry-canon/runtime-telemetry-canon.spw`

## Recursive Improvement

- Add telemetry only when a downstream consumer can name the judgment it simplifies.
- Preserve the same telemetry terms across runtime return types, editor inspection, DX codes, and governance review.
- Keep public runtime facts factual; let support and policy layers derive their own conclusions on top.

## Spw Artifact

```text
.agents/plans/runtime-telemetry-canon/runtime-telemetry-canon.spw
```
