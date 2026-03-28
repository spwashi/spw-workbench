# Plan: ecosystem-surface-governance

Turn the web-domain portfolio into an operable ecosystem contract by tightening surface metadata, launch states, routing semantics, and the adjacent plans that should carry QA, linguistic stability, and contributor-formation responsibilities.

## Goal

The current domain portfolio is rich in voice but thin in execution metadata: it names many surfaces, yet it does not cleanly encode which ones are live, which ones are installable, which require special governance, or which plans own the work needed to make them sustainable. This pass makes the surface registry more truthful, updates the most relevant adjacent plans, and adds a governance artifact that ties branding, literature, interaction design, QA, installability, and team scaling into one readable contract. Governance is the canopy for the current planning wave: site-install, DX, CLI naming, editor startup, release narrative, contributor formation, and public-interest research should be able to run in parallel as long as their readiness claims route back through this registry. Governance also needs cluster semantics: execution truth lanes, contributor-formation lanes, discussion/exhibit lanes, and speculative futures should not compete for one undifferentiated urgency. Taste note: improve clarity, layering, naming, and correctness by making ecosystem growth legible enough to maintain.

## Scope

- **In scope**: tighten `.spw/surfaces/domains.spw` and `.spw/surfaces/index.spw`, add an explicit installable gate to the launch ladder, improve discoverability from `docs/toc.spw`, update the active plans that should absorb ecosystem-governance concerns, define which plan clusters are release-blocking versus contributor-forming or research-oriented, and add a dedicated governance plan artifact under `.agents/plans/ecosystem-surface-governance/`.
- **Out of scope**: registering DNS, launching domains, building publishing pipelines, changing runtime semantics, or implementing new editor/runtime features beyond plan/spec changes.

## Files

```text
[NEW] .agents/plans/ecosystem-surface-governance/PLAN.md
[NEW] .agents/plans/ecosystem-surface-governance/wip.spw
[NEW] .agents/plans/ecosystem-surface-governance/ecosystem-surface-governance.spw
[MOD] .spw/surfaces/domains.spw
[MOD] .spw/surfaces/index.spw
[MOD] docs/toc.spw
[MOD] .agents/plans/spw-site-install/PLAN.md
[MOD] .agents/plans/absorb-spwq-cli/PLAN.md
[MOD] .agents/plans/vscode-lsp-integration/PLAN.md
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

Commit 2 establishes the launch ladder and installable gate. Commits 3-4 then fan governance requirements out across the adjacent planning lanes.

1. `.[plans] — stage ecosystem-surface-governance artifacts`
2. `.[surfaces] — tighten domain portfolio counts, statuses, launch governance, and installable gate semantics`
3. `.[plans] — align site-install, release, DX, CLI, telemetry, and phase-trace plans to ecosystem governance`
4. `.[plans] — align web-platform curriculum to contributor formation and sustainable surface growth`
5. `![plans] — verify spw syntax and navigation coherence for governance surfaces`

## Agentic Hygiene

- Rebase target: `main@3b1747c4` (updated 2026-03-27)
- Rebase cadence: before commit 1, before merge
- Hygiene split: current local drift exists in `.spw/surfaces/domains.spw` and `.spw/surfaces/index.spw`, but it is in scope for this patch set and should be preserved/extended rather than isolated away.

## Dependencies

- `plan-ecology-clustering` — cluster semantics determine which adjacent plans are execution blockers versus curriculum, discussion, or speculative lanes

## Spw Artifact

Add a distilled governance record at:

`.agents/plans/ecosystem-surface-governance/ecosystem-surface-governance.spw`

It will define the launch ladder, status semantics, team/QA expectations, and the codebase-to-surface "spiritual testing path" that connects concepts to shipped domains.
It should explicitly define what "installable" means in the submodule era: a site codebase can mount the surface through `.spw/_workbench` and engage it without inheriting the entire workbench identity.
