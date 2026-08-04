# Plan: skills-instrumentation-utility

Repair and align skill scripts/utilities so Spw integration is consistent across skills and runnable in the current canon rewrite snapshot.

## Goal

Several skill scripts currently depend on a missing shared utility (`scripts/spw-lib.sh`) and reference instrumentation commands or repository paths that no longer exist. This pass will restore the shared utility layer, add compatible instrumentation scripts/aliases, and update skill instructions/scripts to current repository structure (`src/seed`, `src/runtime`, `src/testing`). The desired end state is that skill scripts can run, produce coherent Spw-structured output, and advertise commands that actually exist.
Taste note: improve **correctness** and **layering** with a single shared Spw utility contract across skills.

## Scope

- **In scope**: add `scripts/spw-lib.sh`, add instrumentation analyzers and package script aliases, patch high-impact skill scripts and SKILL.md tool references.
- **Out of scope**: full redesign of every skill workflow, non-skill application/runtime feature changes.

## Files

[NEW] .agents/plans/skills-instrumentation-utility/PLAN.md  
[NEW] .agents/plans/skills-instrumentation-utility/wip.spw  
[NEW] .agents/plans/skills-instrumentation-utility/skills-instrumentation-utility.spw  
[NEW] scripts/spw-lib.sh  
[NEW] scripts/analyzers/spw-marker-audit.ts  
[NEW] scripts/analyzers/perturbation-scan.ts  
[NEW] scripts/analyzers/ui-contract-audit.ts  
[MOD] package.json (add compatibility scripts for audit/analyze/fuzz/lint/test/build)  
[MOD] .agents/skills/spw-semantics-rigor/SKILL.md  
[MOD] .agents/skills/spw-semantics-rigor/scripts/semantics-check.sh  
[MOD] .agents/skills/spw-craft-quality/SKILL.md  
[MOD] .agents/skills/spw-craft-quality/scripts/craft-check.sh  
[MOD] .agents/skills/spw-commit-review/scripts/layer-check.sh

Craft guard:
- Keep utility functions small and composable.
- Keep analyzer scripts single-purpose and dependency-light.
- Avoid introducing network-bound tooling assumptions.

## Commits

1. `.[plans] — scaffold skills-instrumentation-utility planning artifacts`
2. `#[spw-utility] — add shared spw-lib utility and instrumentation analyzers`
3. `.[skills] — align skill scripts/docs to current Spw instrumentation command set`

Fuzz strategy:
- Explore: run each patched skill script with `--help`
- Stabilize: run `npm run audit`, `npm run analyze:perturb`, `bash .agents/skills/spw-semantics-rigor/scripts/semantics-check.sh`
- Ship: `npm run lint:spw` + `npm run lint:v020` + `npm run lint:v020:runtime` + `npm run lint:v020:architecture`

## Agentic Hygiene

- Rebase target: `main@a8d61a0`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

Add a distilled integration note at:
- `.agents/plans/skills-instrumentation-utility/skills-instrumentation-utility.spw`

This records the shared utility contract and expected cross-skill instrumentation affordances.
