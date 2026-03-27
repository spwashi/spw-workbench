# Plan: ecosystem-surface-governance

Turn the web-domain portfolio into an operable ecosystem contract by tightening surface metadata, launch states, routing semantics, and the adjacent plans that should carry QA, linguistic stability, and contributor-formation responsibilities.

## Goal

The current domain portfolio is rich in voice but thin in execution metadata: it names many surfaces, yet it does not cleanly encode which ones are live, which are dormant, which require special governance, or which plans own the work needed to make them sustainable. This pass makes the surface registry more truthful, updates the most relevant adjacent plans, and adds a governance artifact that ties branding, literature, interaction design, QA, and team scaling into one readable contract. Taste note: improve clarity, layering, naming, and correctness by making ecosystem growth legible enough to maintain.

## Scope

- **In scope**: tighten `.spw/surfaces/domains.spw` and `.spw/surfaces/index.spw`, improve discoverability from `docs/toc.spw`, update the active plans that should absorb ecosystem-governance concerns, and add a dedicated governance plan artifact under `.agents/plans/ecosystem-surface-governance/`.
- **Out of scope**: registering DNS, launching domains, building publishing pipelines, changing runtime semantics, or implementing new editor/runtime features beyond plan/spec changes.

## Files

```text
[NEW] .agents/plans/ecosystem-surface-governance/PLAN.md
[NEW] .agents/plans/ecosystem-surface-governance/wip.spw
[NEW] .agents/plans/ecosystem-surface-governance/ecosystem-surface-governance.spw
[MOD] .spw/surfaces/domains.spw
[MOD] .spw/surfaces/index.spw
[MOD] docs/toc.spw
[MOD] .agents/plans/v030-release-prep/PLAN.md
[MOD] .agents/plans/runtime-dx-foundation/PLAN.md
[MOD] .agents/plans/runtime-telemetry-canon/PLAN.md
[MOD] .agents/plans/runtime-axis-traceability/PLAN.md
[MOD] .agents/plans/register-phase-evolution/PLAN.md
[MOD] .agents/plans/curriculum-html-css-mastery/PLAN.md
[DEL] (none)
```

### Craft guard

- Keep the surface registry truthful but compact; prefer status/governance frames over adding many new per-domain fields unless those fields are actually used.
- Preserve in-scope local drift already present in `.spw/surfaces/domains.spw` and `.spw/surfaces/index.spw`; extend it rather than flattening it.
- Keep plan updates focused on governance, QA, linguistic stability, contributor formation, and launch sequencing. Do not reopen unrelated implementation scope.
- New plan/spec artifacts should stay under 260 lines and read like durable operating doctrine rather than brainstorming residue.

## Commits

1. `.[plans] — stage ecosystem-surface-governance artifacts`
2. `.[surfaces] — tighten domain portfolio counts, statuses, and launch governance`
3. `.[plans] — align release, DX, telemetry, and phase-trace plans to ecosystem governance`
4. `.[plans] — align web-platform curriculum to contributor formation and sustainable surface growth`
5. `![plans] — verify spw syntax and navigation coherence for governance surfaces`

## Agentic Hygiene

- Rebase target: `main@0ff461ee7b6b939998d7f25bf406ee7a29a6a799`
- Rebase cadence: before commit 1, before merge
- Hygiene split: current local drift exists in `.spw/surfaces/domains.spw` and `.spw/surfaces/index.spw`, but it is in scope for this patch set and should be preserved/extended rather than isolated away.

## Dependencies

none

## Spw Artifact

Add a distilled governance record at:

`.agents/plans/ecosystem-surface-governance/ecosystem-surface-governance.spw`

It will define the launch ladder, status semantics, team/QA expectations, and the codebase-to-surface "spiritual testing path" that connects concepts to shipped domains.
