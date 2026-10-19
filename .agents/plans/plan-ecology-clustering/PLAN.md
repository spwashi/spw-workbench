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

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

Fuzz strategy:
- Explore: `npm run lint:spw`
- Stabilize: `npm run lint:spw && npm run lint:docs`
- Ship: `bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed --no-state`

## Agentic Hygiene

- Rebase target: `main@66ed9a2e`
- Rebase cadence: before `stage_cluster_artifacts`, before merge
- Hygiene split: none

## Dependencies

- This plan is the directional index for `gap-affinity-tooling` and `package-iteration-radius`; neither depends on the clustering artifact for runtime behavior.

## Spw Artifact

Add a distilled cluster doctrine at:

`.agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw`

It will define the cluster taxonomy, the "well-considered commit" bar, and the per-plan curriculum/discussion/research map for the active ecology.

## Direction review — 2026-10-19

This review is grounded in workbench revision `0eb1d1c0`. The index passes its structural check; that does not establish that a next move is still useful. The portable seed and runtime roots, shared UTF-8 hash, reader, and workbench browser build have landed. The next question is whether a consumer can use those products with reproducible evidence and whether their supporting tests actually guard the package boundary.

### Choose the next exhibit

| Workstream | Next bounded result | Evidence that closes the slice | Boundary |
| --- | --- | --- | --- |
| Release truth: `parser-releases` | Reconcile existing stamp coverage, then prepare a release receipt | Built files agree with manifest revision, variant, form, kind and digest; a consumer imports a pinned build | Site publication requires a separate site receipt; local tests cannot establish deployment |
| Runtime ownership: `runtime-maintenance` | Move legacy tests into the packages that own their behavior | The same cases are collected and type-checked, fixture paths work, and no consumer of a shim remains before deletion | Preserve public exports pending the open contract decision |
| Reader feedback: `editor-reading-hierarchy` | Retain the hierarchy census before changing presentation | Same fixture, revision, host/settings and counts before and after; errors remain reachable | Owner-dependent palette choices do not block measurement |
| Navigation: `citation-navigation` | Resolve the selected root-anchor form against a retained corpus | Correct targets and failures plus a comparable timing receipt | Treat the existing 186-second observation as a historical sample, not a current benchmark |

These are parallel lanes of value, not a demand to start four implementations. Select one bounded result, record its receipt, then reconsider priority. Prefer release verification when delivery is the question, runtime test ownership when correctness coverage is the question, and the census when reading quality is the question. Research and curriculum remain available without becoming release dependencies.

### Depth contract

Every implementation handoff should name (1) a falsifiable claim, (2) an existing fixture or consumer shape, (3) the smallest intervention, (4) the observable result including failure, and (5) a stop condition. A plan is deeper when it can reject an attractive but unsupported change. Larger taxonomies and more prose are insufficient evidence.

Stop a slice when its named result is reviewable. Reopen it on a failed invariant, changed consumer contract, or measured regression. Do not widen runtime splits merely to meet size targets, add release variants without a consumer, or infer host parity from shared implementation alone.

### Model upgrades should compound value and theory

The owner's intent is that GPT model upgrades improve the value and theory of this codebase. Treat an upgrade as an opportunity to revisit explanations and discover higher-value directions. The existing queue is revisable: completing it faster is only one possible benefit. Spw remains the evolution force and Boonhonk the field of wonder; exhibits, claims and instruments are how stronger reasoning becomes durable repository knowledge.

**Value** means an observable improvement for an author, reader, maintainer or mounted consumer: a new useful capability, less effort or ambiguity, better reliability, or a more revealing instrument. Each proposed gain names its beneficiary and a concrete task. **Theory** means explicit concepts, relations, invariants and explanations that predict behavior across examples. A stronger theory explains an existing anomaly, predicts an unseen case, or replaces several special cases with a justified distinction. Its limits and counterexamples belong beside the claim.

On a model upgrade, select one unresolved question or awkward boundary and retain the current explanation, representative examples and known failures. Ask the stronger model to challenge the framing, propose alternatives and identify a discriminating experiment. Implement the smallest exhibit or instrument that could distinguish those alternatives. Preserve the surviving explanation in canon or a domain artifact, with links to the evidence; revise dependent plans only where the result changes their direction.

Judge the result on two separate axes: what became more useful, and what became better explained or predicted. Record regressions, complexity and unanswered questions as well as gains. An upgrade may yield a useful implementation without a theoretical advance, or a theoretical advance whose product value is still untested. Do not conflate those outcomes. Record model identity/settings when available, repository revision, task context and validation conditions; without comparable trials, describe the improvement as an observed result rather than attributing it causally to the upgrade.

For the current workstreams, this opens deeper questions alongside maintenance: which runtime distinctions deserve separate value algebras; which reader representation explains host differences; and which release capabilities form a coherent consumer contract. A focused probe may supersede a queued cleanup when it promises a more important answer. Retain negative results so later models can improve the theory without repeating failed reasoning.

### Maintenance scope and validation

This pass updates this direction guide, `parser-releases`, `runtime-maintenance`, their cards and append-only streams, and the authored priority frame plus derived index. Existing historical bases and done records remain historical evidence. No source implementation or publication is part of the pass. Validate cards/index, Spw syntax, and documentation; report any baseline diagnostics separately from changed-file defects.

## Theory-to-development pass — 2026-10-19

The next pass reads theory against source and recent episode bodies, then turns the differences into a navigable agent route and four bounded follow-ups. `76e17bd4` establishes rereading, checking and fillable scaffolds as owner direction; `603f6b59`, `b082d500` and `e810b683` add portable reading capabilities; `eb34e6c3` and `7509cbb8` establish shared byte identity. The earlier plan pass is committed as `f8e2308a`.

### Predicted files and commit

- [MOD] `.spw/agents.spw`, `.spw/index.spw`, `.spw/workspace.spw`: task routes and package-root discovery.
- [NEW] `.spw/process/agent-development.spw`: read → distinguish → probe → revise loop, with explicit handoff criteria.
- [NEW] `.spw/harness/probes/creative-seeds.spw`: four optional experiments with owners, controls and useful outputs.
- [NEW] `.spw/harness/runs/2026-10-19-theory-direction.spw`: dated source/history review and actual probe results; no model-comparison claim.
- [MOD] `.spw/harness/claim-protocol.spw`, `.spw/harness/evals/baseline-evals.spw`, `.spw/harness/runs/runs-index.spw`: evidence fields and discoverability.
- [MOD] `relationship-contours`, `geometric-analysis-tooling`, `measure-invariant-generalization`, `form-geometry-editor`: PLAN.md and wip.spw, preserving past observations and dormant scope.
- [MOD] this plan/artifact/card and the authored/derived plan index.

Commit: `.[canon] — connect theory, agent routes and creative probes`. This is a documentation and planning slice; no parser/runtime/editor behavior changes. Keep the new route and probe files individually readable, under 200 lines each. Existing large artifacts get small routing additions rather than another taxonomy.

### Proceed through more plans

1. **Relationship contours: `door_trials`.** Try the new route with a concrete locate-and-explain task; retain missed links, fallbacks and correctness. This slice can run before Spirit counts; the Spirit slice still needs the AST census.
2. **Geometry: `ast_operator_census` only.** The quoted-sigil defect reproduced again in this review. Fix this one truth defect before using counts for Spirit or shape discovery. The rest of the dormant plan stays deferred.
3. **Measurement: `route_self_mass_schemes`.** Use exact, drift, missing and tolerance examples to establish the metric/verdict contract. A status or score cannot grant write authority. A canonical declaration follows only when it measures something useful.
4. **Form editor: prepare `pulse_text_edits`.** Reuse landed text-only form context and establish an explicit baseline for the previously reported mobility failure before mapping preview/apply edits. Reader parity is evidence for one representation, not evidence of safe application.

This is a dependency-aware traversal, not an assertion that all four are active. Door trials and pure measure reconciliation do not need geometry; Spirit does. The existing navigation and reading-hierarchy priorities remain. After each slice, revisit the question and select the next useful result rather than clearing the list mechanically.

### Theory review and creativity

Start with the current theory bridge's implemented/measured/proposed/interpretive distinctions, then form-contour receipts and representational disclosure. Read older operator algebra and probe calculus as research candidates. The review records a reversed set-inclusion example and the need to distinguish pure observation from runtime measurement bookkeeping; it does not rewrite the entire theory or promote illustrative equations to implementation requirements.

Creativity is an optional second pass: try a counterexample cabinet, a silence lens, a cross-domain graft, or a reversible context postcard from the seed surface. Keep the surprising example even if the proposed explanation fails. Promote a surviving result into an existing theory or implementation owner rather than multiplying orphan plans.

Validation: targeted Spw parsing; index/card checks; resolve each new relative path; documentation check; staged review. Retain the geometry reproduction and the four passing form-reader tests as bounded observations, not full-suite claims. New routes are authored workflow scaffolds until a fresh-reader trial measures their usefulness.

### Cognitive surfaces, intermediate representations and memory

The owner is open to redesigning cognitive surfaces and specifically wondering about intermediate representation and memory insights. Add a proposed design brief at `.spw/tooling/cognitive-surfaces.spw`, route it from agents/index/workspace, and connect the existing precipitate and memory surfaces. Expand creative seeds with an IR journey and a cold/warm memory comparison. These are design/probe artifacts, not a claim that a new interface or telemetry exists.

Two more plan owners join the traversal: `precipitate-model-alignment` supplies truthful stage products and failure continuity; `apposition-cache-granules` supplies cache validity and eviction evidence. Their missing facts precede UI confidence. A cognitive surface should answer where a result came from, what changed, what was omitted, and why something was remembered. Unknown provenance remains visible. Compare a minimal artifact passport and a memory-difference view against the current display before choosing a redesign.

Additional files: [NEW] `.spw/tooling/cognitive-surfaces.spw`; [MOD] `.spw/runtime/precipitates.spw`, `.spw/harness/memory-surface.spw`, and the PLAN.md/wip.spw pairs for the two owners above. Keep harness context, LSP derived caches and runtime registers separate even if a future display brings them together.
