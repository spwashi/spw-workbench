# Plan: operational-topography

Establish a neutral, measurable topography for Spw source, structure, orientation, querying, hydration, and agent-facing evidence before expanding editor surfaces or runtime metaphor.

## Goal

Define the smallest shared contract that lets a contributor inspect where an operator or container sits, how spacing and nesting shape its surface, which relations and effects it participates in, and how an abstract sequence may become a previewable plan. The contract should support exact and approximate discovery, thin editor clients, repo-local agent contexts, and later script hydration without promoting left/right imagery, taste, or biological metaphor into untested runtime law.

Taste note: improve **semantic honesty**, **layering**, **traceability**, **portability**, and **expressiveness** while preserving local style and interpretive freedom.

## Status (2026-07-21)

**Theory + seed kernel: largely landed.** Remaining work is grammar pair labels, Stream ONF honesty, and **editor projection** (owned by `form-geometry-editor` / LSP ladder, not a second topography model).

| Area | Status | Evidence |
|------|--------|----------|
| Theory topography / devices / composition | landed | `docs/theory/spw/operational-topography.spw`, coupling, operator-brace-composition |
| Coupling ONF + occupancy/payload | landed | `packages/spw-seed/src/types/coupling.ts`, normalize |
| Form / boundary ladders | landed | `canonical/form-ladders.ts` |
| Form geometry (label mobility, HOF) | landed | `canonical/form-geometry.ts` |
| Form contour density / restoration | landed | `canonical/form-contours.ts`, `spw pulse --contour` |
| Mutation automata + pulse CLI | landed | `mutation-automata.ts`, `spw-cli` pulse, `--ladder` / `--geometry` |
| Differentials + topography probes | landed | `differential.ts`, `topography-probe.ts` |
| Register liminality bridge | landed opt-in S1 profile | `spw-runtime` liminality-bridge; syntax alone has no effect |
| Parser pair_id / open_close labels on Frame/Body/Scope | **open** | grammar still uneven |
| LSP/plugin projection | **open** | see `form-geometry-editor` |

## Scope

- **In scope**: revise active plans and theory; define source, structural, relational, temporal, layout, operational, and evidence strata; distinguish render-only orientation from versioned dialect semantics; define parser-checked spacing and indentation as measured topology; specify layout and brace-label differentials, exact-first approximate scans, and mutation profiles; define portable LSP evidence packets for agent contexts; define abstract-plan hydration stages, range/stream contracts, effect grades, and source maps; design a longitudinal whitespace-physics experiment; update relevant skills and probe recipes; predict the implementation and editor integration slices.
- **Out of scope**: changing parser grammar or inventing new runtime physics; making indentation semantic; executing generated scripts; granting background probes write authority; introducing claim, ticket, page, row, genome, or emotion primitives; adding editor panels before a shared LSP response exists; treating a metaphor, mathematical analogy, or model-generated interpretation as an implemented invariant.

## Files

```text
[NEW] .agents/plans/operational-topography/PLAN.md
[NEW] .agents/plans/operational-topography/wip.spw
[NEW] .agents/plans/operational-topography/operational-topography.spw
[NEW] .agents/plans/operational-topography/WHITESPACE-PHYSICS.md
[NEW] docs/theory/spw/operational-topography.spw
[NEW] docs/theory/spw/coupling-constructors.spw
[NEW] docs/theory/spw/operator-brace-composition.spw
[NEW] docs/theory/spw/operational-devices.spw
[NEW] docs/theory/spw/mutation-automata.spw
[NEW] docs/theory/spw/operational-transform.spw
[NEW] docs/theory/spw/form-ladders.spw
[NEW] docs/theory/spw/form-geometry.spw
[NEW] docs/theory/spw/form-contours.spw
[NEW] docs/theory/spw/operator-ladders.spw
[MOD] docs/theory/index.spw
[MOD] docs/theory/spw/operators.spw
[MOD] docs/theory/spw/onf.spw
[MOD] docs/theory/spw/register-geometry.spw
[MOD] lib/spw-v0.3.0/architecture/theory-bridge.spw
[MOD] .spw/registries/brace-physics.spw
[MOD] .agents/skills/spw-semantics-rigor/SKILL.md
[MOD] .agents/skills/spw-semantics-rigor/scripts/semantics-check.sh
[MOD] .agents/skills/spw-operator-lattice/SKILL.md
[MOD] .agents/skills/spw-operator-lattice/references/query-recipes.md
[MOD] .agents/skills/spw-mounted-consumer-review/SKILL.md
[MOD] .agents/skills/spw-research-rigor/SKILL.md
[MOD] .agents/skills/spw-research-rigor/assets/notebook-template.md
[MOD] .agents/skills/spw-math-algorithm-radar/SKILL.md
[MOD] .agents/skills/spw-math-algorithm-radar/references/radar-template.md
[MOD] .agents/plans/spw-garden-geometry/PLAN.md
[MOD] .agents/plans/spw-garden-geometry/wip.spw
[MOD] .agents/plans/spw-garden-geometry/spw-garden-geometry.spw
[MOD] .agents/plans/spw-garden-geometry/editor-surface-physics.spw
[MOD] .agents/plans/spw-garden-geometry/substrate-organelle-physics.spw
[MOD] .agents/plans/spw-garden-geometry/org-static-llm-value.spw
[MOD] .agents/plans/vscode-lsp-roadmap/PLAN.md
[MOD] .agents/plans/vscode-lsp-roadmap/wip.spw
[MOD] .agents/plans/vscode-lsp-roadmap/vscode-lsp-roadmap.spw
[MOD] .agents/plans/vscode-editor-contract/PLAN.md
[MOD] .agents/plans/vscode-editor-contract/wip.spw
[MOD] .agents/plans/vscode-editor-contract/vscode-editor-contract.spw
[MOD] .agents/plans/lsp-custom-request-completions/PLAN.md
[MOD] .agents/plans/lsp-custom-request-completions/wip.spw
[MOD] .agents/plans/vscode-authoring-probe-loop/PLAN.md
[MOD] .agents/plans/vscode-authoring-probe-loop/wip.spw
[MOD] .agents/plans/vscode-authoring-probe-loop/vscode-authoring-probe-loop.spw
[MOD] .agents/plans/vscode-cognitive-surface/PLAN.md
[MOD] .agents/plans/vscode-cognitive-surface/wip.spw
[MOD] .agents/plans/vscode-cognitive-surface/vscode-cognitive-surface.spw
[MOD] .agents/plans/neovim-spw-surfaces/PLAN.md
[MOD] .agents/plans/neovim-spw-surfaces/wip.spw
[MOD] .agents/plans/mounted-workbench-organelle/PLAN.md
[MOD] .agents/plans/mounted-workbench-organelle/wip.spw
[MOD] .agents/plans/mounted-workbench-organelle/mounted-workbench-organelle.spw
[MOD] .agents/plans/mounted-consumer-tooling/mounted-consumer-tooling.spw
[MOD] .agents/plans/spw-site-install/spw-site-install.spw
[MOD] .agents/plans/vscode-workspace-atlas/PLAN.md
[MOD] .agents/plans/vscode-workspace-atlas/vscode-interaction-contract.spw
[MOD] .agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw
[MOD] .agents/plans/plan-ecology-clustering/wip.spw
[MOD] package.json
[NEW] packages/spw-cli/src/pulse.ts
[NEW] scripts/spw-pulse.ts
[MOD] packages/spw-cli/src/query.ts
[NEW] packages/spw-seed/src/types/coupling.ts
[MOD] packages/spw-seed/src/types/index.ts
[MOD] packages/spw-seed/src/types/ast/onf.ts
[MOD] packages/spw-seed/src/index.ts
[MOD] packages/spw-seed/src/normalize.ts
[MOD] packages/spw-runtime/src/state/type-affinities.ts
[MOD] packages/spw-runtime/src/state/register-bank.ts
[MOD] packages/spw-runtime/src/interpreter/interpreter.ts
[MOD] packages/spw-runtime/src/index.ts
[MOD] .spw/registries/register-bank.spw
[NEW] scripts/analyzers/spw-topography-scan.ts
[NEW] scripts/analyzers/spw-flow-scan.ts
[NEW] scripts/analyzers/spw-refactor-check.ts
[NEW] src/seed/__tests__/topography-scan.test.ts
[NEW] src/seed/__tests__/flow-scan.test.ts
[NEW] src/seed/__tests__/refactor-check.test.ts
[NEW] src/seed/__tests__/coupling-profile.test.ts
[NEW] src/runtime/__tests__/coupling-eval.test.ts
[NEW] src/runtime/__tests__/pulse-write.test.ts
[NEW] src/seed/__tests__/mutation-automata.test.ts
[MOD?] packages/spw-seed/src/query/types.ts
[MOD?] packages/spw-seed/src/query/match.ts
[MOD?] packages/spw-seed/src/types/ast/nodes.ts
[MOD?] packages/spw-seed/src/normalize.ts
[MOD] packages/spw-seed/src/canonical/index.ts
[NEW] packages/spw-seed/src/canonical/canonicalize.ts
[NEW] packages/spw-seed/src/canonical/differential.ts
[NEW] packages/spw-seed/src/canonical/mutation-automata.ts
[NEW] packages/spw-seed/src/canonical/operational-transform.ts
[NEW] packages/spw-seed/src/canonical/topography-probe.ts
[NEW] packages/spw-seed/src/canonical/form-ladders.ts
[NEW] packages/spw-seed/src/canonical/form-geometry.ts
[NEW] packages/spw-seed/src/canonical/form-contours.ts
[NEW] packages/spw-seed/src/canonical/operator-ladders.ts
[NEW?] packages/spw-seed/src/canonical/selection.ts
[NEW?] packages/spw-seed/src/__tests__/format-differential.test.ts
[NEW?] packages/spw-lsp/src/protocol.ts
[NEW?] packages/spw-lsp/src/handlers/topography.ts
[NEW?] packages/spw-lsp/src/handlers/formatting.ts
[MOD?] packages/spw-lsp/src/handlers/editing.ts
[MOD?] packages/spw-lsp/src/types.ts
[MOD?] packages/spw-lsp/src/server-index.ts
[MOD?] packages/spw-lsp/src/stdio-server.ts
[NEW?] packages/spw-lsp/src/__tests__/topography.test.ts
[MOD?] packages/spw-lsp/src/__tests__/editing.test.ts
[MOD?] packages/spw-cli/src/ls/types.ts
[MOD?] packages/spw-cli/src/ls/run.ts
[NEW?] packages/spw-cli/src/ls/explain.ts
[MOD?] packages/spw-cli/src/format.ts
[NEW?] packages/spw-cli/src/hydrate/plan.ts
[NEW?] packages/spw-cli/src/hydrate/preview.ts
[MOD?] extensions/vscode-spw/src/custom-requests.ts
[MOD?] extensions/neovim-spw/lua/spw-lsp.lua
```

### Craft guard

- `packages/spw-lsp/src/server-index.ts` and several editor display files already exceed 600 lines. Add only an indexed extraction seam there; put topographic assembly in a dedicated handler or service.
- Keep Seed portable and deterministic. Layout measurements may consume lexer trivia and spans but must not import editor, filesystem, model, or workbench concerns.
- Keep the canonical data model vector-valued. Similarity, discovery priority, mutability, reversibility, authority, cost, and uncertainty must not collapse into one score.
- A spacing or orientation profile may change presentation and approximate ranking; it must not change ONF or runtime effects unless identified as a new dialect version.
- Generated scripts are projections. Use target AST/code generation, parameterized values, source maps, and capability references rather than concatenated executable strings.
- Existing plan files are shared hot surfaces. Preserve their append-only streams and make targeted trajectory revisions rather than wholesale rewrites.

## Current implementation boundary

- The established formatter CLI still follows its older normalization path, but Seed now also exposes source differentials, mutation profiles, fixed-point automata, mutation vectors, topography deltas, and named operational sequences. `spw pulse` previews these plans and may perform an S2 file write only after parse-health, layout-structure, conflict, and stale-source gates. This kernel is not yet the LSP formatting protocol and label-pair operations remain proposed.
- Seed canonicalization has opt-in `indentBraces` and `blankLineBetweenFrames` passes. They are line scanners, not parser-owned transformations, and therefore remain experiments until checked against complete, well-nested parses and adjacency-sensitive syntax.
- `FrameNode`, `BodyNode`, and `ScopeNode` declare `openLabel` and `closeLabel`, but the container grammar does not populate them. They are reserved type affordances, not an implemented brace-label feature.
- `OperationNode.position` is not populated by the current prefix parser. Postfix equivalence and orientation-sensitive rewrites remain proposed.
- Seed now exposes a discriminated coupling projection. `<>` is `form=operator` with arity; paired boundaries are `form=boundary` with kind, occupancy, payload, surface, and placement when known. Physical profile fields and kind-specific boundary evaluation are deliberately not Seed facts.
- Seed also exposes a revisioned semantic-profile contract with exact included kinds, kind-specific port roles, measurable dimensions, dynamics/effect grades, validation, and non-destructive projection. It permits distinct operational physics without placing one profile into the parser kernel as universal meaning.
- `<`, `(`, `[`, and `{` resolve through one open-boundary coordinate after lexical classification while retaining capsule, scope, frame, and body kinds. “Brace” and “bracket” are profile vocabulary rather than the canonical set name.
- `audit:flow` reports matched-token boundary observations under a named interpretive flow profile, including parse health and boundary-set identity. `spw:refactor:check` compares two complete structured AST projections and never certifies a self-reparse or recovered Prose root.
- The stdio server handles `spw/select`, while editor declarations and initialization metadata do not yet share a canonical custom-protocol registry. Protocol truth precedes new topography or formatting requests.
- Raw brace and query scanners can count syntax-like text inside comments or strings and do not prove well-nestedness. An E0 structural result requires parser-owned spans plus an explicit complete/recovered/invalid parse state.
- The read-only `audit:topography` instrument now uses Seed's AST walker, records parse evidence, treats Prose fallback as recovered, measures nested parsed paired containers separately from explicit `<>` operations, and labels recovered-node counts as partial recognized lower bounds. It does not yet provide source selections, relation strata, LSP payloads, or edit authority.
- Seed now carries a revisioned, interpretive Form Ladder catalog over an explicitly disclosed six-kind paired-boundary set plus thirteen operators. Empty boundaries share only `occupancy=empty,payload=void`; kind-specific readings remain profile hypotheses. The `<>` ladder composes with a Frame operand surface while retaining `kind=couple,form=operator`.
- Form contours expose stable catalog indices, role/axis hypotheses, parser evidence, signatures, and dimensional counts. Named reductions report omitted points, roles, axes, and structured evidence; non-identity views claim no semantic equivalence. Expansion reads the retained receipt and can restore the exact input signature. The CLI exposes one-ladder full, endpoint, evidence, axis, and balanced views; source remains untouched.
- Form Geometry includes pure label-mobility rules and compositional programs. “Implemented” means a bounded source function exists, not that the parser/runtime assigns the proposed geometric meaning. Each successful application now returns hashes, before/after parse health, a topography delta, a no-equivalence posture, and inverse status. Editor edits still require revision-addressed differentials and explicit S2 authority; status alone is insufficient.

## Layout, label, and pulse differentials

A differential is a typed proposal from one revision-addressed surface to another. It is not a scalar mutation score and not permission to write.

```text
DifferentialPlan
  identity: uri + documentVersion + contentHash + dialect + profileHash
  selection: exact AST/frame paths + parser-owned source spans
  before: sourceHash + structureFingerprint + layoutVector + labelPairs
  edits: ordered non-overlapping text edits with source-map entries
  after: predicted sourceHash + structureFingerprint + layoutVector + labelPairs
  mutationProfile: { layout, structure, labels, references, semantics, effects }
  checks: completeParse + wellNested + idempotent + required identity equalities
  authority: effectGrade + capability + confirmation requirement
```

- **Layout differential**: normalize or reapply indentation, blank-line cadence, alignment, or boundary spacing. Whitespace is eligible only after the parser classifies it as soft trivia for the active dialect; adjacency-sensitive gaps such as an operator-to-label boundary are hard syntax.
- **Label differential**: add, repair, remove, or reapply a paired container label. It must report pair identity, collisions, affected references, and whether the grammar can represent the result. Until labels parse, this is a design contract only.
- **Context differential**: transform one of `before-open`, `open-boundary`, `inside`, `close-boundary`, or `after-close`. “Around the contents” is a typed port selection, not arbitrary string execution.
- **Category selection**: exact AST kind, annotation, root, frame path, or declared profile may select candidates. Approximate matches are suggestions; each must be promoted by an exact re-resolution before becoming an edit target.
- **Mutation profile**: each axis records `none`, `measured`, or `changed` with evidence. Layout change cannot hide a structural, reference, semantic, or effect change inside a reassuring aggregate score.

The safe pulse is:

```text
select -> measure -> plan -> preview -> confirm S2 tick -> apply one batch
       -> reparse -> compare identities/invariants -> observe -> stop or repeat
```

Stop at a fixed point, budget, parse recovery, identity mismatch, conflict, cancellation, or explicit iteration limit. Format-on-save is opt-in and limited to parser-verified layout-only profiles; learning and familiarity probes remain S0 observations.

## Coupling recommendation

Treat `()`, `[]`, `{}`, and `<...>` as members of one semantic **coupling-constructor family**, while preserving their distinct lexer and AST forms. The existing adjacent `<>` token is already an operator and normalizes with `reg=couple`; that does not require every delimiter glyph to become an `OPERATOR` token.

The smallest implementation is a tagged recursive `Coupling` view over existing nodes. The strongest useful mathematical hypothesis is a colored operad or multicategory: boundary kinds are colors, nested payloads compose, and typed ports constrain substitution. The useful physical interpretation is an interface with boundary conditions between interior and exterior—not an intrinsic left/right charge. A possible common ONF lowering through `<>` remains a tested target, not current behavior; see `docs/theory/spw/coupling-constructors.spw`.

## Rotations, projections, and diff profiles

- **View rotation**: an invertible coordinate change such as outline, transpose, fold, graph, or mirrored orientation. It writes no source and must expose its inverse and source-span map.
- **Projection**: a lossy view optimized for reading, teaching, compact navigation, or review. It declares omitted information and keeps raw source reachable.
- **Layout rewrite**: indentation, alignment, cadence, or line-breaking through a verified differential.
- **Structural rewrite**: extraction, inlining, reordering, wrapping, or unwrapping; it must disclose structure, reference, semantic, and effect changes.

Every transform records its domain, codomain, tool configuration, preserved invariants, inverse or information loss, source map, mutation profile, and cost. Review profiles measure semantic changes per hunk, layout-only noise, stable anchors, moved-region traceability, reviewer time, and reviewer errors. They may not improve a diff by hiding a semantic or effect delta.

## Whitespace-physics research slice

The first experiment holds content and parsed structure constant while varying a declared layout profile. Repeated, counterbalanced pulses measure time-to-orient, navigation actions, selection errors, edit accuracy, delayed recall, and explicit familiarity reports. Familiarity is a longitudinal observation about a person and task, never a property inferred from indentation alone. The reproducible protocol lives in `WHITESPACE-PHYSICS.md`.

## Play-to-promotion and idiom learning

Some churn is useful when its purpose is learning. A learner may babble with operator sequences, layout, labels, transforms, script aesthetics, or conceptual variants inside an S0/S1 scratch universe. The workbench preserves the source, budget, lineage, counterexamples, and observations without implying that every variation belongs in canon.

```text
babble -> candidate pattern -> exact fixture -> impact packet -> steward review
       -> accept | clarify | retain as local dialect | reject with evidence
       -> versioned idiom -> optional migration preview -> longitudinal observation
```

- **Learner role**: explores, names a question, chooses a bounded corpus, and records surprises or explicit enjoyment. “Fun” is a report, not a telemetry inference.
- **Steward role**: explains affected parses, references, queries, projections, scripts, consumers, tests, and style profiles; authority comes from the repository capability and review contract, not from presumed seniority.
- **Impact packet**: before/after examples, exact and approximate occurrences, counterexamples, structure/reference/effect deltas, affected tools, migration recipe, reversibility, uncertainty, and cost.
- **Nuance ledger**: preserve accepted examples, near misses, rejected alternatives, profile-local exceptions, and the reason an idiom was promoted. Canonicalization should not erase useful variation before it is understood.
- **Promotion gate**: no automatic source mutation from a babble sample. Re-resolve exact targets, preview the edit, run the relevant truth rung, and require the declared human or repository authority for S2 changes.

## Commits

1. `.[plans] =scope[operational-topography] — establish trajectory and plan contract`
2. `.[theory] =formalize[operational-topography] — distinguish orientation, layout, and effects`
3. `.[skills] =instrument[topographic-samples] — make probes revision-aware and agent-portable`
4. `vocab[seed,runtime] =model[tagged-coupling] — share boundary kinematics without flattening operational kinds`
5. `^tooling[seed] =measure[parsed-topography] — ship evidence-bearing read-only corpus scans`
6. `^tooling[seed,cli] =contour[expand,reduce] — expose density projections with loss and restoration receipts`
7. `vocab[lsp] =register[protocol] — make custom capability truth canonical and tested`
8. `vocab[seed,lsp] =model[selection-transect,differential] — add typed observations and edit previews`
9. `^seed[lsp,query] =sample[topographic-evidence] — implement exact-first read-only evidence packets`
10. `&[seed,lsp,cli] =preview[layout,label] — expose parser-checked differential plans`
11. `&[runtime,cli] =plan[hydration] — compile abstract sequences into previewable effect plans`
12. `&[vscode,neovim] =project[topography] — render one server-owned contract in thin clients`
13. `![topography] *verify[semantics,portability,cost] — prove invariants and negative controls`

Fuzz strategy:

- Explore: `npm run spw:ls -- --seq '?~@&*^' --braces '<>{}' --model lattice --root .spw --top 20 --json`
- Stabilize: `npm run lint:spw && npm run build && npm run test:seed && npm run test:lsp`
- Inspect: `npm run audit:topography -- --json docs/theory/spw`
- Ship: `npm run fuzz:ship && npm run lint:docs`

## Agentic Hygiene

- Rebase target: `main@b4832193891b2b89b7e1e20dc0e462e2e4c9236e`
- Rebase cadence: before implementation commit 1 and before merge.
- Hygiene split: required before implementation. The current checkout is `main` with pre-existing unstaged and untracked work across mounted tooling, editor plans, documentation, CLI, Seed, and LSP. This planning/theory pass preserves that work in place, does not rebase it, and does not claim branch isolation. A later implementation branch must select reviewed changes deliberately.

## Dependencies

- `mounted-consumer-tooling` — consumer authority, corpus exclusion, and revision-aware evidence.
- `vscode-editor-contract` — server ownership and thin-client projection.
- `lsp-custom-request-completions` — advertised/configured/invoked/observed/tested capability discipline.
- `vscode-plugin-performance` and `typescript-perf-audit-infra` — actual-path timing and toolchain baselines; parallel, not semantic prerequisites.
- Mounted workspace discovery must prefer consumer authority in realistic nested mounts before repo-local sample claims can ship.

## Failure Modes

- **Hard**: a left/right or spacing profile changes parse, ONF, or runtime behavior without a dialect version.
- **Hard**: an agent sample cannot be traced to consumer revision, workbench revision, query profile, and source span.
- **Hard**: hydration emits or executes external effects without preview and explicit capability.
- **Hard**: a formatter applies a layout or label edit after parse recovery, against a stale content hash, or without proving its declared identity equalities.
- **Hard**: an approximate match becomes a mutation target without exact re-resolution.
- **Soft**: approximate ranking is useful only because common generated blocks saturate operator coverage.
- **Soft**: layout measurements reward formatting conventions instead of task relevance.
- **Soft**: editor clients reparse topography and diverge from the LSP response.
- **Non-negotiable**: raw observations and historical runs are append-only; profile changes do not rewrite them.
- **Non-negotiable**: exact matches precede approximate matches; hard authority constraints cannot be averaged away.
- **Non-negotiable**: no emotion, familiarity, mathematical structure, or runtime effect is inferred merely from syntax density or metaphor.

## Validation

- **Hypothesis**: a parser-owned selection transect can answer useful orientation questions without a new AST primitive.
- **Hypothesis**: exact-first structural ranking plus diversity reranking produces compact, non-repetitive evidence packets for human and agent use.
- **Hypothesis**: spacing improves discovery as a disclosed soft feature while semantic identity remains stable.
- **Hypothesis**: abstract sequence hydration is useful as a pure plan and preview before execution exists.
- **Negative control**: formatting-only variants retain the same semantic/plan identity and raw structural coordinates.
- **Negative control**: applying the same layout profile twice produces an empty second differential.
- **Negative control**: label reapplication preserves pair identity and references; a collision or unrepresentable label yields no edit.
- **Negative control**: changing a render-only orientation profile changes labels or ordering only.
- **Negative control**: consumer scans exclude `.spw/_workbench/**` unless infrastructure is the explicit target.
- **Negative control**: every non-identity contour reduction reports information loss, and full expansion restores the exact input view signature without touching source.
- **Demo sequence**: locate selection → measure named strata → preview a layout differential → verify parse/structure identity → retrieve exact and approximate neighbors → explain ranking and cost → compile an abstract sequence → preview a capability-bounded plan → record an immutable observation.
- **Falsify**: reject the contract if either editor returns different semantic JSON, if score contributions cannot reconstruct ranking, if a profile silently changes structure or effects, if a second formatting pass is non-empty, or if a sample cannot be reproduced from its evidence envelope.

## Spw Artifact

`.agents/plans/operational-topography/operational-topography.spw`

The artifact distills strata, orientation, spacing, scan gradients, hydration stages, evidence packets, effects, and trajectory gates into a queryable planning surface.
