# Plan: plan-ecology-clustering

Recluster the active plan ecology so execution, curriculum, research, and speculative work can coexist without pretending to share one urgency queue, while still serving a principal-engineering path toward design taste and deep web knowledge.

## Goal

The current planning surface contains real value, but too many plans read as if they are competing for the same notion of "next." This pass introduces a durable cluster model so each active plan carries a clearer role: execution truth, public-interest research, contributor formation, speculative editor future, or rewrite recovery. The aim is not to demote learning work; it is to make learning work easier to justify, easier to discuss, and easier to convert into well-considered commits when external interest is still unknown. The deeper alignment is principal-engineering oriented: design taste, web linguistics, and applied learning science should compound toward stronger Spw language design and eventually toward more coherent component, page, and service design.

Taste note: improve **clarity**, **layering**, **naming**, and **meaningfulness** by making urgency, curriculum value, and research value explicit.

## Scope

- **In scope**: define the cluster taxonomy, define a commit-selection bar, assign every active plan a learning/discussion/research value, align canopy/release/curriculum plans to that map, make explicit the learning-science ladder from language-design study into component, page, and service design, deepen the artifact with concrete pattern-review, web-capability, syntax-testing, and snippet-discovery surfaces, and treat mounted-consumer review as the primary transfer test between workbench doctrine and developing repositories.
- **Out of scope**: archiving large numbers of plans, rewriting every stale plan to packages-era paths, or changing implementation scope for runtime/editor features.

## Direction snapshot — 2026-08-24

Consumers should be able to read direction without recognizing a repository name or reconstructing the workbench's private chronology. The active spine is therefore expressed through five portable contracts:

1. **Compatibility** — identify language edition, syntax/gap profile, parser and product schemas, package/environment contract, CLI protocol, and capability set independently. A scalar release label does not imply that every dimension advanced together.
2. **Intermediate disclosure** — expose stable product identities through staged, progressive, and collapsible views, including explicit parser-product and event policies. Human text, Spw, JSON, and event streams are projections of the same products rather than separately authored meanings.
3. **Mounted authority** — consumer-owned roots and conventions remain authoritative; mounted tooling supplies versioned instruments, diagnostics, and review protocols. Baseline utility requires no Spw annotations.
4. **Evidence** — performance and usability claims carry workloads, revisions, environment receipts, iteration radius, raw samples, outcome classes, and actual instrumentation boundaries. Representative consumer shapes are described by capability, never identity.
5. **Projection** — editor and interface hosts consume parser/runtime truth and remain optional. They owe **depth** (gestures that reach cache, profile, or runtime cost) and **respect parity** (the same questions and evidence fields at comparable truth density). Native form may differ. Host designs are not assumed sound or complete, and they are not sketches of one another. Balancing those implications is a design problem: chrome mimicry is false parity; one deep host and shallow peers is false depth. Metaphors and feature annotations may improve recognizability but do not silently become language law, adoption requirements, or a release gate.

Current execution should strengthen this spine in roughly that order. The gap-affinity and package-iteration-radius plans make semantic spacing, profile migration, reproducible builds, and feedback radius explicit additions to the spine. Landed foundations remain reference material. Editor work is a projection-feedback lane: keep the hosts, take them seriously as peers, and treat missing depth or uneven parity as the next kernel, profile, or runtime question.

## Files

```text
[NEW] .agents/plans/plan-ecology-clustering/PLAN.md
[NEW] .agents/plans/plan-ecology-clustering/wip.spw
[NEW] .agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw
[MOD] .agents/plans/ecosystem-surface-governance/PLAN.md
[MOD] .agents/plans/ecosystem-surface-governance/wip.spw
[MOD] .agents/plans/spw-site-install/PLAN.md
[MOD] .agents/plans/spw-site-install/wip.spw
[MOD] .agents/plans/cli-benchmarking-infra/PLAN.md
[MOD] .agents/plans/cli-benchmarking-infra/wip.spw
[MOD] .agents/plans/curriculum-html-css-mastery/PLAN.md
[MOD] .agents/plans/curriculum-html-svg-mastery/PLAN.md
[MOD] .agents/plans/curriculum-logic-terminal-mastery/PLAN.md
[NEW] .agents/plans/gap-affinity-tooling/PLAN.md
[NEW] .agents/plans/gap-affinity-tooling/wip.spw
[NEW] .agents/plans/gap-affinity-tooling/gap-affinity-tooling.spw
[NEW] .agents/plans/package-iteration-radius/PLAN.md
[NEW] .agents/plans/package-iteration-radius/wip.spw
[NEW] .agents/plans/package-iteration-radius/package-iteration-radius.spw
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

- Rebase target: `main@66ed9a2e`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

- This plan is the directional index for `gap-affinity-tooling` and `package-iteration-radius`; neither depends on the clustering artifact for runtime behavior.

## Spw Artifact

Add a distilled cluster doctrine at:

`.agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw`

It will define the cluster taxonomy, the "well-considered commit" bar, and the per-plan curriculum/discussion/research map for the active ecology.
