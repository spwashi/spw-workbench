# Plan: safety-commit-reconciliation

Reconstruct the multi-model safety checkpoint `a333db8d` as a reviewable sequence rooted at its parent, then replay only the working-tree refinements that survive semantic and compositional review.

## Goal

Replace one 147-file safety commit with dependency-ordered commits whose claims, effects, tests, and ownership boundaries can be reviewed independently. Preserve the original checkout and its uncommitted work while improving correctness, semantic honesty, and operational theory in the isolated worktree. Taste note: optimize for **clarity, correctness, stability, disclosure, and compositional reviewability**.

## Scope

- **In scope**: inventory `a333db8d`; reconstruct it without committing; partition plans/canon, portable Seed kernels, runtime behavior, CLI/analyzers, LSP authority, and editor consumers; repair concrete defects; validate every partition; replay reviewed post-checkpoint form-contour, form-geometry, and liminality work.
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
[MOD] packages/spw-lsp/** (versioned URI-first transport over Seed-owned observations)
[MOD] extensions/vscode-spw/** (separately bundled thin editor navigation surfaces)
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
10. `&[cli,workspace] =repair[mount-role] — keep designated mounts infrastructure`
11. `&[lsp,workspace] =expose[versioned-evidence] — address consumer authority by URI`
12. `&[vscode] =navigate[workspace-evidence] — bundle a URI-native thin client`
13. `.[canon,skills] =align[operational-theory] — restore exhibits after executable behavior exists`
14. `.[plans] =rebase[checkpoint-ecology] — restore plan surfaces and refresh dependency truth`
15. `^seed[form-contours] =project[density] — replay reviewed contour and mobility receipts`
16. `&[runtime,plans] =integrate[liminality-bridge] — replay explicit effects and aligned theory`

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

## Editor, indexing, and query trajectory

The LSP workspace surface and editor presentation are separate partitions. The server first exposes `spw/workspaceManifest/v1` with a closed runtime decoder, URI identity, open-document version, explicit `absent`/`valid`/`invalid`/`unreadable` evidence, canonical/mounted/standalone modes, and blocked roots for unusable authority. Initialization re-anchors to an outer consumer only when the requested root is inside its designated `.spw/_workbench`; an ordinary nested folder remains explicit authority. The deprecated endpoint retains local paths only for one compatibility window and returns `RequestFailed` when v1 authority is blocked.

The VS Code follow-up consumes v1 directly, keeps URIs intact, repairs command contributions, bundles a matching server inside the extension, and verifies an extracted archive without repository-relative source or `tsx`. A Neovim adapter should consume the same wire schema rather than editor-specific state. Configurable index and clustering profiles belong above this contract: saved selectors, exclusions, grouping dimensions, ranking receipts, and explicitly opted-in usage signals may alter a view, but not workspace authority or canonical definitions. Any adaptive view profile must expose its feature schema, signal source, update rule or producer, revision, reset/freeze control, and resulting ranking parameters. These parameters remain inspectable workspace data and cannot alter parsing, authority, identity, or canonical semantics.

Projection and simulation need their own versioned evidence surface. A future projection receipt should declare readiness, base and target URI, source/spec/generator provenance, revision, diagnostics, and whether its payload is observed, derived, or hypothetical. A hypothetical simulator must be capped at `effect.l1.memory` and should return runtime/topography deltas; it cannot imply source mutation or semantic equivalence.

The present selector engine is not ready for arbitrary plugin queries. Audit evidence found that `$@_` consumes only `$`, unknown glyphs and trailing forms can be ignored, `*` collides with the collapse operator, textual brace selectors cover only `[]`, `{}`, and `()`, and the matcher for the selector AST's `seq` node currently behaves as disjunction. Meanwhile, Grok's proposed slice syntax and a range-transform proposal both use `..`, so an ordered-sequence spelling is not settled. A bounded `query-truth-v1` partition must require full-token consumption, reject unknown glyphs and unterminated literals, give `any` a distinct node, expose every boundary-coupling discriminant, define whether an ordered same-parent group requires adjacency or merely source order, and introduce participant/capture evidence. Surface spelling follows a collision and fixity study. The current CLI already applies flat per-file reference selection across roots; a later `spw/workspaceQuery/v1` would add revisioned URI-grouped transport. Ordered groups never cross files implicitly, and a named cross-file graph edge must carry relation kind, endpoints, provenance, and per-file revision.

Seed already distinguishes the `<>` operator coupling from six boundary couplings: Scope `()`, Frame `[]`, Body `{}`, Capsule `<…>`, Stream `<<…>>`, and NRange `((…))`. Query exposure should project those existing discriminants and shared ports; shared coupling structure does not imply shared physical dynamics. Left/right positions, spans, and depth are parser observations, while polarity or “physics” remains named profile interpretation. Core pattern grammar provides `_` and `...@rest`, but query selectors do not yet provide captures; a later selector design may reuse those forms only with explicit participant/capture receipts. Ordered results are match groups within one URI, while multi-file selection returns URI-grouped evidence rather than one fictitious cross-file sequence.

Whitespace, line/block variety, and character-level contour have a measurable base: indentation histograms, delimiter spans, per-line or per-token depth deltas, node/line density, and edit distance. Familiarity, taste, asymmetry, and polarity are profile-scored hypotheses over those observations. Formatting tools may propose candidates with before/after and restore receipts; they may call a change reversible only after verifying an exact inverse. None establishes semantic equivalence without parser, reference, and downstream-probe evidence.

LSP root evidence is not yet a claim that every navigation helper enforces that authority. Before multi-file selection ships, path resolution must reject lexical `@root/../escape` and realpath/symlink escapes while still permitting explicitly declared external roots. The main-only range-transform and form-contour documents remain proposals, not executable query behavior.

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
