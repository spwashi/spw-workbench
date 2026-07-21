# Plan: safety-commit-reconciliation

Reconstruct the multi-model safety checkpoint `a333db8d` as a reviewable sequence rooted at its parent, then replay only the working-tree refinements that survive semantic and compositional review.

## Goal

Replace one 147-file safety commit with dependency-ordered commits whose claims, effects, tests, and ownership boundaries can be reviewed independently. Preserve the original checkout and its uncommitted work while improving correctness, semantic honesty, and operational theory in the isolated worktree. Taste note: optimize for **clarity, correctness, stability, disclosure, and compositional reviewability**.

## Scope

- **In scope**: inventory `a333db8d`; reconstruct it without committing; partition plans/canon, portable Seed kernels, runtime behavior, CLI/analyzers, and LSP/editor consumers; repair concrete defects; validate every partition; replay reviewed post-checkpoint form-contour, form-geometry, and liminality work.
- **Out of scope**: rewriting upstream history, mutating the dirty `main` checkout, publishing branches, adding unrequested language grammar, or treating biological/physical metaphor as implemented semantics.

Semantic invariants:

1. `packages/spw-seed` remains portable and deterministic, with no runtime/editor imports.
2. Interpretive profiles, measured observations, and operational effects remain separately named and graded.
3. The explicit `<>` couple operator is not conflated with an empty Capsule boundary.
4. No transform may discard source payload while claiming reversibility or semantic equivalence.
5. The reconstructed final tree must disclose every intentional difference from `a333db8d` and from the reviewed dirty-tree delta.
6. Public plans and transports use compact, ordered effect slugs: `effect.l0.measure`, `effect.l1.memory`, `effect.l2.workspace`, and `effect.l3.external`.

Counterexamples include a Seed import from runtime, a build-only verification claim for behavioral code, `^['label']{payload} -> $(label)` without payload storage, or a reduction that cannot identify its omitted evidence.

## Files

The authoritative initial manifest is `git show --name-status a333db8d`. Partition ownership will be recorded in `MANIFEST.md` before the first source commit.

```text
[NEW] .agents/plans/safety-commit-reconciliation/PLAN.md
[NEW] .agents/plans/safety-commit-reconciliation/wip.spw
[NEW] .agents/plans/safety-commit-reconciliation/MANIFEST.md
[MOD] .agents/plans/** (checkpoint plan/canon partitions; exact paths in MANIFEST.md)
[MOD] .agents/skills/** (checkpoint skill changes; exact paths in MANIFEST.md)
[MOD] .spw/** (checkpoint canon changes; exact paths in MANIFEST.md)
[MOD] docs/** (checkpoint and reviewed theory changes)
[MOD] lib/spw-v0.3.0/** (current theory bridge only)
[MOD] packages/spw-seed/** (portable types, normalization, workspace roots, canonical probes)
[MOD] packages/spw-runtime/** (coupling evaluation and explicit register effects)
[MOD] packages/spw-cli/** (navigation, query, pulse, and command wiring)
[MOD] packages/spw-lsp/** (thin transport over Seed-owned observations)
[MOD] extensions/vscode-spw/** (thin editor navigation surfaces)
[MOD] scripts/** (portable analyzers and CLI entry points)
[MOD] src/seed/__tests__/** (Seed and analyzer regression coverage)
[MOD] src/runtime/__tests__/** (runtime/CLI integration coverage)
```

### Craft guard

- `packages/spw-seed/src/canonical/form-geometry.ts`, `form-ladders.ts`, and `mutation-automata.ts`, plus `packages/spw-cli/src/pulse.ts`, exceed 600 lines in the checkpoint or reviewed delta. Treat these as explicit decomposition candidates; do not grow their concept count during reconciliation.
- Before editor reuse, split pulse argument parsing, observation probes, mutation planning, guarded replacement, transport, and rendering behind a pure request/result service. The reconciliation partition may expose a versioned CLI envelope, but it does not claim that console and process-global execution is the final plugin API.
- `packages/spw-seed/src/canonical/index.ts` and package root exports are shared hot files. Change them only with the partition that owns the exported implementation.
- The large garden plan is a separate conceptual surface from executable kernel work and must not share a source commit merely because it was present in the safety checkpoint.
- Stability, disclosure, and resolution are the governing deformation axes; this task introduces no affect or timing constants.

## Commits

1. `.[plans] =scope[safety-commit-reconciliation] — record reconstruction invariants and manifest`
2. `^seed[workspace,coupling,topography] =stabilize[kernels] — restore portable kernels and repair structural invariants`
3. `^seed[topography] =repair[parse-health] — count escaped delimiter parity once`
4. `&[runtime] =integrate[coupling-events] — restore runtime interpretation and relation evidence`
5. `^seed[workspace] =define[manifest-evidence] — make root authority diagnosable`
6. `&[analyzers] =measure[topography] — delegate parse health to Seed evidence`
7. `&[cli,workspace] =orient[mounted-consumers] — anchor navigation in consumer authority`
8. `^seed[mutation] =converge[plans] — reach virtual fixed points`
9. `&[cli,pulse] =preview[mutations] — restore guarded probe and write gates`
10. `&[lsp,vscode] =project[workspace-observations] — restore thin editor transports`
11. `.[canon,skills] =align[operational-theory] — restore exhibits after executable behavior exists`
12. `.[plans] =rebase[checkpoint-ecology] — restore plan surfaces and refresh dependency truth`
13. `^seed[form-contours] =project[density] — replay reviewed contour and mobility receipts`
14. `&[runtime,plans] =integrate[liminality-bridge] — replay explicit effects and aligned theory`

Each commit must pass the smallest relevant build/test/lint gate and contain exactly one `#[episode]{ ... }` block.

Fuzz strategy:

- Explore: focused tests and `poll-review --scope=changed --no-state` per partition.
- Stabilize: `npm run fuzz:complexity`, `npm run fuzz:dead`, and package-specific suites for executable partitions.
- Ship: full build, Seed/runtime/LSP/DOM suites, Spw/docs lint, plan checks, and staged commit review at ship severity.

## Agentic Hygiene

- Reconstruction base: `main@b4832193891b2b89b7e1e20dc0e462e2e4c9236e`, the current-main parent of safety checkpoint `a333db8d`.
- Rebase cadence: do **not** rebase onto current `main` while replacing its tip; compare after every partition, then resolve the final history operation with the human reviewer.
- Hygiene split: work exclusively in `/private/tmp/wt-safety-commit-reconciliation`; leave the dirty main checkout unchanged. Replay its delta only after the checkpoint split is stable, by reviewed file groups rather than wholesale copying.

## Dependencies

- `operational-topography` supplies the semantic kernel being reconciled.
- `form-geometry-editor`, `vscode-lsp-roadmap`, and adjacent plans consume the final contracts but do not own Seed truth.
- Human commit authorization is required before every commit and before replacing any mainline history.

## Workspace-configurable pulse trajectory

This is a planned extension, not behavior shipped by the reconciliation commit.

- A workspace may reference versioned, declarative mutation templates from its `.spw` authority tree. A template names selectors, allowed roots, rules, budgets, accepted terminal states, parse requirements, evidence fields, and one maximum `effect.*` value.
- Workspace configuration may narrow a built-in effect ceiling but never raise it. Templates cannot turn preview-only rules, cross-authority roots, or macro sequences into writes merely by naming them.
- Sequences compose template IDs as an inspectable fold or graph. Arbitrary executable callbacks are not workspace data; executable extensions require a separately reviewed capability boundary.
- Every template and sequence emits a revision/hash receipt so an editor or agent can say which policy produced a tree diff and detect configuration drift before application.
- Approximate matching is a named dimension with threshold, confidence, and ambiguity evidence. Fuzzy selection cannot silently become exact identity.

Macro pulses use explicit scoring policies over tree diffs:

- `pulse_disposition.survey`: no mutation; maximize coverage, topology knowledge, and uncertainty disclosure.
- `pulse_disposition.repair`: reduce parse, reference, diagnostic, and invariant failures while bounding topographic distance.
- `pulse_disposition.explore`: maximize reversible novelty and candidate diversity in preview or a disposable worktree.
- `pulse_disposition.compress`: reduce repetition or surface area while preserving references, structure, and measured behavior.
- `pulse_disposition.elaborate`: add examples, evidence, or scaffolding with provenance and an explicit growth budget.
- `pulse_disposition.rotate`: produce alternate readable projections and compare them without presuming semantic equivalence.
- `pulse_disposition.stress`: generate bounded perturbations and counterexamples; never write the consumer tree directly.
- `pulse_disposition.reconcile`: reduce dialect, schema, or branch disagreement while retaining conflict receipts.
- `pulse_disposition.teach`: stage novice-readable idiom changes and expose downstream consequences rather than silently normalizing them.
- `pulse_disposition.publish`: extract only well-formed, sourced, dimensioned material into a reviewable publication candidate.

The shared instrument is a revision-aware tree diff: stable node identity where available, approximate correspondence with confidence where not, parse/reference health, mutation-vector strata, topographic distance, reversibility, affected roots, and downstream probes. Healing and babbling are therefore readable policies (`pulse_disposition.repair` and `pulse_disposition.explore`), not model moods. Macro application remains preview/patch-bundle only until a recoverable multi-file transaction or disposable-worktree protocol exists.

## Failure Modes

- **Hard**: a partition cannot build from its predecessor; a file is omitted or duplicated; Seed imports an outer layer; source payload is lost.
- **Soft**: documentation temporarily points to a later partition; plan caches drift during reconstruction; a CLI exhibit is unavailable until its consumer partition lands.
- **Non-negotiable**: no mutation of the original checkout, no bypass of the commit hook, no unpublished semantic-equivalence claim, and no silent difference from the target checkpoint.

## Validation

- **Hypothesis**: the safety checkpoint can be expressed as several dependency-ordered, independently testable commits without changing intended observable behavior.
- **Negative controls**: original worktree status and `a333db8d` remain unchanged; final tree difference is captured in a review artifact; no golden snapshot changes without explicit human approval.
- **Demo sequence**: inspect manifest -> apply checkpoint without commit -> partition -> build/test each slice -> compare target trees -> replay reviewed refinements -> run staged review.

## Spw Artifact

`wip.spw` is the retained operational surface. `MANIFEST.md` is the revision map; no additional metaphysical exhibit is warranted until the executable partition graph is known.
