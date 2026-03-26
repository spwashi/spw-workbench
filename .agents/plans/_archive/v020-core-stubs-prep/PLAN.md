# Plan: v020-core-stubs-prep

Define concrete v0.2.0-alpha core stubs and add release-prep checks so the spec library can move from redirect placeholders to implementable contracts.

## Goal

The v0.2.0-alpha core surface currently relies on redirect stubs, which makes implementation planning ambiguous and hard to lint. This pass will replace the core redirect placeholders with structured, actionable stub contracts and add a lightweight validator so regressions are caught early. The desired end state is a canon-ready core library where each core file states scope, invariants, and implementation hooks for follow-on work.
Taste note: improve clarity and correctness by making core contracts explicit and machine-checkable.

## Scope

- **In scope**: flesh out `lib/spw-v0.2.0-alpha/core/*.md` with structured v0.2.0 stub content, update v0.2.0 library index/status docs, add a lint/check script for core stubs, and wire it into package scripts.
- **Out of scope**: runtime/domain/application stub conversion, parser/runtime behavior changes, extension plugin behavior changes.

## Files

[NEW] .agents/plans/v020-core-stubs-prep/PLAN.md
[NEW] .agents/plans/v020-core-stubs-prep/wip.spw
[MOD] lib/spw-v0.2.0-alpha/core/SPEC.md (replace redirect with v0.2.0 contract stub)
[MOD] lib/spw-v0.2.0-alpha/core/OPERATORS.md (define operator taxonomy/invariants for implementation prep)
[MOD] lib/spw-v0.2.0-alpha/core/SEEDS.md (seed lifecycle and normalization contracts)
[MOD] lib/spw-v0.2.0-alpha/core/CONTAINERS.md (container semantics and ambiguity rules)
[MOD] lib/spw-v0.2.0-alpha/core/CAPSULES.md (capsule intent, composition, and constraints)
[MOD] lib/spw-v0.2.0-alpha/core/BOUNDARIES.md (layer and import boundary contracts)
[MOD] lib/spw-v0.2.0-alpha/core/SAFETY.md (safety posture and fail-fast expectations)
[MOD] lib/spw-v0.2.0-alpha/core/INTEGRITY.md (determinism/integrity and provenance constraints)
[MOD] lib/spw-v0.2.0-alpha/core/CONFORMANCE.md (conformance matrix for parser/kernel outputs)
[MOD] lib/spw-v0.2.0-alpha/core/LAYERS.md (layer ownership and dependency direction)
[MOD] lib/spw-v0.2.0-alpha/README.md (status update for core stub readiness)
[MOD] lib/spw-v0.2.0-alpha/DELTAS.md (record completed core-stub milestone and next targets)
[NEW] scripts/analyzers/v020-core-stub-check.ts (validate required sections/no redirect stubs in core files)
[MOD] package.json (add lint script for v0.2.0 core stub check)

Craft guard:
- No file is expected to exceed 600 lines or 12 imports.
- `scripts/analyzers/v020-core-stub-check.ts` owns one concern: validate v0.2.0 core docs; keep parser logic out.

## Commits

1. `.[plans] — scaffold v020-core-stubs-prep plan artifacts`
2. `.[v020-core] — replace core redirect stubs with actionable v0.2.0 contracts`
3. `#[v020-core] — add core stub lint check and wire release-prep script`

## Agentic Hygiene

- Rebase target: `main@09be6d4`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

Optional follow-up only if this pass introduces a novel protocol beyond stub contracts. Not required for this implementation scope.
