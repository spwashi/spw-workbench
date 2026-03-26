# Plan: referential-integrity-cleanup

Clarify historical commit references in plan artifacts after the published history rewrite.

## Goal

The desired end state is that plan artifacts use `main@<sha>` only for commits
that actually remain on rewritten `main`, while lore-era or missing historical
bases are labeled honestly instead of pretending to be current mainline anchors.
This improves correctness and clarity for humans and for any tooling that scans
plan references. The taste note is clarity and correctness.

## Scope

- **In scope**: plan/schema wording, planning-skill guidance, and existing plan
  artifacts whose `main@...` or `origin/main@...` references no longer match
  rewritten `main`.
- **Out of scope**: broader documentation provenance cleanup outside
  `.agents/plans`, remote branch surgery, or recovering missing historical
  objects.

## Files

Predicted files:

```text
[NEW] .agents/plans/referential-integrity-cleanup/PLAN.md
[NEW] .agents/plans/referential-integrity-cleanup/wip.spw
[MOD] .agents/plans/_schema/plan.md
[MOD] .agents/plans/_schema/wip-template.spw
[MOD] .agents/skills/spw-feature-planning/SKILL.md
[MOD] .agents/plans/**/PLAN.md
[MOD] .agents/plans/**/wip.spw
```

### Craft guard

Keep the rewrite narrow and semantic: do not churn unrelated prose. Prefer a
small vocabulary (`main@`, `historical@`, `historical-missing@`) over bespoke
phrasing that will drift again.

## Commits

1. .[plans] — clarify referential integrity for historical plan baselines

## Agentic Hygiene

- Rebase target: `main@8437947a2c08`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none
