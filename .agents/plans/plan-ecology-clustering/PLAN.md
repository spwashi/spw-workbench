# Plan: plan-ecology-clustering

Recluster the active plan ecology so execution, curriculum, research, and speculative work can coexist without pretending to share one urgency queue, while still serving a principal-engineering path toward design taste and deep web knowledge.

## Goal

The current planning surface contains real value, but too many plans read as if they are competing for the same notion of "next." This pass introduces a durable cluster model so each active plan carries a clearer role: execution truth, public-interest research, contributor formation, speculative editor future, or rewrite recovery. The aim is not to demote learning work; it is to make learning work easier to justify, easier to discuss, and easier to convert into well-considered commits when external interest is still unknown. The deeper alignment is principal-engineering oriented: design taste, web linguistics, and applied learning science should compound toward stronger Spw language design and eventually toward more coherent component, page, and service design.

Taste note: improve **clarity**, **layering**, **naming**, and **meaningfulness** by making urgency, curriculum value, and research value explicit.

## Scope

- **In scope**: define the cluster taxonomy, define a commit-selection bar, assign every active plan a learning/discussion/research value, align canopy/release/curriculum plans to that map, make explicit the learning-science ladder from language-design study into component, page, and service design, and deepen the artifact with concrete pattern-review, web-capability, syntax-testing, and snippet-discovery surfaces.
- **Out of scope**: archiving large numbers of plans, rewriting every stale plan to packages-era paths, or changing implementation scope for runtime/editor features.

## Files

```text
[NEW] .agents/plans/plan-ecology-clustering/PLAN.md
[NEW] .agents/plans/plan-ecology-clustering/wip.spw
[NEW] .agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw
[MOD] .agents/plans/ecosystem-surface-governance/PLAN.md
[MOD] .agents/plans/ecosystem-surface-governance/wip.spw
[MOD] .agents/plans/v030-release-prep/PLAN.md
[MOD] .agents/plans/v030-release-prep/wip.spw
[MOD] .agents/plans/curriculum-html-css-mastery/PLAN.md
[MOD] .agents/plans/curriculum-html-svg-mastery/PLAN.md
[MOD] .agents/plans/curriculum-logic-terminal-mastery/PLAN.md
```

### Craft guard

- Keep the cluster model readable in one pass; avoid taxonomy theater.
- Clusters should explain urgency, discussion value, and commit judgment; they should not replace the underlying plans.
- Curricular and research uplift must be concrete enough to change how a commit is justified.

## Commits

1. `.[plans] — stage plan-ecology-clustering artifacts`
2. `.[plans] — define cluster taxonomy, commit bar, and per-plan learning/research map`
3. `.[plans] — align governance and release plans to clustered urgency and discussion value`
4. `.[plans] — reframe curriculum plans as contributor-formation and research lanes`
5. `![plans] — verify clustering language stays coherent across active planning surfaces`

Fuzz strategy:
- Explore: `npm run lint:spw`
- Stabilize: `npm run lint:spw && npm run lint:docs`
- Ship: `bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed --no-state`

## Agentic Hygiene

- Rebase target: `main@32859b93`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

Add a distilled cluster doctrine at:

`.agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw`

It will define the cluster taxonomy, the "well-considered commit" bar, and the per-plan curriculum/discussion/research map for the active ecology.
