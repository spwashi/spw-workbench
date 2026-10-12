# Plan: audit-fuzz-truthfulness

Make the audit and fuzz surfaces truthful, local-first, and explicit about what they actually verify.

## Goal

The desired end state is an audit surface whose command names, coverage, and output formats match reality. `audit:*` should say what they scan, `fuzz:*` should map to explicit local runner profiles (`explore`, `stabilize`, `ship`), and the outputs should be structured enough to rank severity and diff across runs. The immediate next step is to publish a truthful package-script map and contributor guidance before adding the aggregated audit runner on top of it.

**Taste note**: clarity, correctness, expressiveness.

## Scope

- **In scope**: truthful package script mapping, local-only audit orchestration, structured audit output, `fuzz:*` profile cleanup, broader scan coverage (`src`, `scripts`, `extensions`, docs/skills), and contributor/skill docs that describe the real surface.
- **Out of scope**: introducing external SaaS tooling, networked indexing, the `RegisterBank` chemistry redesign, or a full marker-schema rewrite in the same branch.

## Decisions Locked

- Command names must describe coverage and method, not aspirations.
- Audit runners must remain local-only and avoid hidden network assumptions.
- `fuzz:*` profiles should express staged intent (`explore`, `stabilize`, `ship`) rather than alias unrelated scripts.
- Documented script names are the contract; legacy aliases may remain temporarily, but they should resolve through the truthful names rather than define the surface themselves.

## Files

```text
[MOD] package.json
[MOD] scripts/analyzers/spw-marker-audit.ts
[MOD] scripts/analyzers/ui-contract-audit.ts
[MOD] scripts/analyzers/spw-syntax-validate.ts
[NEW] scripts/analyzers/audit-full.ts
[NEW] scripts/analyzers/fuzz-profile-runner.ts
[MOD] docs/contributing/md/common-tasks.md
[MOD?] .agents/skills/spw-craft-quality/SKILL.md
[MOD?] .agents/skills/spw-typescript-affordances/SKILL.md
[MOD] .agents/plans/audit-fuzz-truthfulness/wip.spw
[MOD] .agents/plans/audit-fuzz-truthfulness/PLAN.md
[DEL] (none)
```

### Craft guard

- Keep audit orchestration small and composable; do not turn `audit-full.ts` into another monolith that mixes scanning, policy, and reporting without seams.
- Keep analyzer logic portable and local-only.
- If extension build checks are included, make them explicit and opt-in rather than hidden defaults.

## Commits

Landed: commit 1 in b28ffcb8, commit 2 in 0921e6f7, commit 3 in 234aa5c5. Remaining:

4. `&[fuzz] — rename or retire fuzz:complexity, fuzz:dead, fuzz:naming (aliases of audit:markers:md) and fuzz:async, fuzz:boonhonk (aliases of test:runtime); add scripts/analyzers/fuzz-profile-runner.ts only if a stage needs more than an npm script`
5. `.[docs] — align spw-craft-quality and spw-fix-planning skills to the surviving fuzz and lint names`

## Agentic Hygiene

- Rebase target: historical baseline `07ffc5a17a55340c3f7000313df68cf0453a7b10` (not on rewritten main)
- Rebase cadence: before commit 1, before merge
- Hygiene split: keep unrelated untracked drift in `src/runtime/state/register-helpers.ts` out of this branch.

## Dependencies

none

## Spw Artifact

A distilled artifact is warranted to preserve the audit contract:

`.agents/plans/audit-fuzz-truthfulness/audit-fuzz-truthfulness.spw`

## Fuzz Strategy

- Explore: `npm run audit:markers:json && npm run fuzz:explore`
- Stabilize: `npm run audit && npm run fuzz:stabilize`
- Ship gate: `npm run build && npm run test:run && npm run lint && npm run audit:markers:json`
