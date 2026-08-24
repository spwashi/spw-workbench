# Plan: gap-affinity-tooling

Make spacing significant through a versioned gap-and-association contract, make formatting preserve that contract, and let tools request only the parser products and instrumentation needed to answer a question.

## Goal

Establish **binding affinity** as deterministic syntax derived from token gaps, line and bound ports, and declared operator rules, while reserving **spacing resonance** for measured or workspace-configured tooling signals that never silently alter meaning. Replace destructive whitespace preprocessing and heuristic formatting with source-mapped gap products, association-aware differentials, and explicit compatibility receipts. Give CLI, LSP, runtime, and future web projections a shared product spine that can be fast for shallow questions without forking the language kernel.

Taste note: improve **semantic recognizability**, **performance**, **readability**, **interoperability**, and **versioning clarity**. The design should make tight and open forms visibly distinct, keep collapse reversible or explicitly lossy, and expose why a tool performed each phase.

The work crosses the timing, disclosure, stability, resolution, and noise axes. Timing concerns phase cost and first useful output; disclosure concerns progressive products and loss receipts; stability concerns deterministic profile resolution; resolution concerns raw trivia versus gap class; noise concerns event generation and diagnostic volume. Affect remains out of scope and is never inferred from spacing.

## Scope

- **In scope**:
  - Define `tight`, `open`, `cadence`, and `episode` gap classes while retaining raw trivia, spans, and comments as source authority.
  - Define an operator affinity matrix from the left and right gap classes plus begin/end-of-line and bound ports. Unsupported half-spaced forms diagnose rather than falling into unrelated modifier recovery.
  - Give dot an explicit compatibility surface: tight qualified paths (`a.b.c`), open edge chains (`a . b . c`), reserved facet construction (`.{...}`), and profile-gated prefix/postfix shapes.
  - Model repeated open dot and ordinal/common separators as flat products where their laws permit it; do not hide association in arbitrary binary nesting.
  - Replace Spw.l/q source rewriting with a source-mapped gap projection so newline collapse preserves original offsets and product provenance.
  - Add declared association capability/version fields to the surface stack and product identity. Workspace defaults are allowed only when resolved and disclosed as semantic input.
  - Add parser product requests (`tokens`, `structure`, `index`, `semantic`, `trace`) and event policies (`none`, `diagnostics`, `trace`) over one kernel. Product requests may reduce work; they may not change the products they do return.
  - Separate event retention from event generation in benchmarks, then suppress generation only where evidence shows it is safe and valuable.
  - Add association-aware formatting that edits soft width within a gap class by default, emits a semantic migration plan when crossing classes, verifies reparse identity, and produces per-rule receipts.
  - Define a small, human-readable, versioned workspace format policy for indentation, soft gap widths, operator rendering, line/bound placement, clustering, folding, and association-preserving transformations. Resolve built-in, workspace, scoped, and invocation layers deterministically and disclose the winning rule.
  - Classify every configured transformation as `surface`, `structure-preserving`, or `semantic-migration`; preview affected spans, association deltas, and compatibility consequences before application. Semantic migrations require a separate authority path.
  - Model format-profile changes as versioned migration objects with preconditions and explicit plan/apply/verify stages. Dry runs are mandatory; migrations are idempotent, record whether they are reversible, and issue receipts suitable for compatibility windows and team review.
  - Let source documents inform preferences only through explicit, revision-aware registration in a future evidence extension. A path, filename, lexical ordering, or mere presence in the workspace contributes no authority.
  - Produce format-profile migration reports and upgrade receipts so communities can discuss named rules and consequences across repository revisions rather than relying on ambient editor behavior.
  - Reuse the same formatting engine from CLI and LSP; range formatting resolves enclosing parser context before editing.
  - Give the CLI one discoverable policy journey: scaffold a minimal commented profile, inspect effective rules and their provenance, diff profile revisions, plan a migration, apply it with explicit authority, and verify the receipt. Keep command names subordinate to the shared engine and settle them against the CLI sense plan before implementation.
  - Document the surface in three layers: a task-oriented first migration, a rule/profile reference, and decision notes explaining why defaults exist, which conveniences they enable, and how to override or retire them.
  - Add an identity-free corpus census and dual-read migration report covering workbench and mounted-consumer shapes while excluding mounted infrastructure from consumer corpora.
  - Define a two-way, identity-free consumer exchange envelope: the workbench publishes capability, product, migration, cost, and omission receipts; consumers return reproducible gap reports, workload shapes, and missing-question evidence. No consumer grammar or upstream write is implied.
  - Preserve a zero-annotation floor. Lexing, formatting inspection, package analysis, and migration preview work on ordinary source structure; optional Spw annotations may improve recognizability or projection only after demonstrating a concrete task benefit.
  - Expose host-neutral association and cost hints for later HTML/CSS/JS projection planning without implementing a web emitter in this branch.

- **Out of scope**:
  - Assigning runtime evaluation laws to dot, comma, or semicolon beyond typed association products.
  - Shipping tap/hold/drag brace interactions or an HTML/CSS/JS atmospheric renderer.
  - Letting corpus statistics, editor recovery, or performance heuristics select a different semantic interpretation without a declared profile.
  - Reformatting the existing corpus before a dual-read impact report, migration preview, and human review.
  - Learning or applying weighted formatting preferences before deterministic association-preserving formatting and explicit policy resolution are stable.
  - Treating filenames, path position, directory ordering, or unregistered source documents as positive or negative formatting evidence.
  - Inferring authorship, community membership, affect, or cultural value from a formatting profile; the system can disclose shared conventions and consequences, not decide what a culture means.
  - Treating indentation width, font metrics, or raw display columns as universal semantic distance.
  - Declaring a global `v0.4`; the first contract is capability-versioned as `syntax.gap-affinity/1` and may graduate independently.

## Files

```text
[NEW] .agents/plans/gap-affinity-tooling/PLAN.md
[NEW] .agents/plans/gap-affinity-tooling/wip.spw
[NEW] .agents/plans/gap-affinity-tooling/gap-affinity-tooling.spw
[MOD] .agents/plans/operational-topography/PLAN.md
[MOD] .agents/plans/operational-topography/wip.spw
[MOD] .agents/plans/operational-topography/operational-topography.spw
[MOD] .agents/plans/syntax-profile-stack/PLAN.md
[MOD] .agents/plans/syntax-profile-stack/wip.spw
[MOD] .agents/plans/cli-benchmarking-infra/PLAN.md
[MOD] .agents/plans/cli-benchmarking-infra/wip.spw
[MOD] .agents/plans/cli-benchmarking-infra/cli-benchmarking-infra.spw
[MOD] .agents/plans/mounted-consumer-tooling/wip.spw
[MOD] .agents/plans/plan-ecology-clustering/PLAN.md
[MOD] .agents/plans/plan-ecology-clustering/wip.spw
[MOD] .agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw
[NEW] packages/spw-seed/src/types/gaps.ts
[MOD] packages/spw-seed/src/types/lex.ts
[MOD] packages/spw-seed/src/types/state.ts
[MOD] packages/spw-seed/src/types/ast/nodes.ts
[NEW] packages/spw-seed/src/lexer/gaps.ts
[MOD] packages/spw-seed/src/lexer/lex.ts
[MOD] packages/spw-seed/src/lexer/tokenize.ts
[MOD] packages/spw-seed/src/lexer/matchers/identifiers.ts
[MOD?] packages/spw-seed/src/lexer/matchers/operators.ts
[NEW] packages/spw-seed/src/dialect/association-profile.ts
[MOD] packages/spw-seed/src/dialect/types.ts
[MOD] packages/spw-seed/src/dialect/detect.ts
[MOD] packages/spw-seed/src/dialect/syntax-stack.ts
[NEW] packages/spw-seed/src/grammar/associations.ts
[MOD] packages/spw-seed/src/grammar/expressions.ts
[NEW] packages/spw-seed/src/normalize-associations.ts
[MOD?] packages/spw-seed/src/normalize.ts
[NEW] packages/spw-seed/src/parser/products.ts
[MOD] packages/spw-seed/src/parser/parse.ts
[MOD] packages/spw-seed/src/parser/parse-stream.ts
[MOD] packages/spw-seed/src/parser/output.ts
[NEW] packages/spw-seed/src/canonical/association-identity.ts
[NEW] packages/spw-seed/src/canonical/format-spacing.ts
[NEW] packages/spw-seed/src/canonical/format-source.ts
[MOD] packages/spw-seed/src/canonical/format-pulses.ts
[MOD] packages/spw-seed/src/index.ts
[NEW] packages/spw-seed/src/lexer/gaps.test.ts
[NEW] packages/spw-seed/src/grammar/associations.test.ts
[NEW] packages/spw-seed/src/parser/products.test.ts
[NEW] packages/spw-seed/src/canonical/format-spacing.test.ts
[NEW] packages/spw-cli/src/inspect-spacing.ts
[NEW] packages/spw-cli/src/format-policy.ts
[NEW] packages/spw-cli/src/format-migrate.ts
[MOD] packages/spw-cli/src/inspect.ts
[MOD] packages/spw-cli/src/format.ts
[MOD] packages/spw-lsp/src/handlers/editing.ts
[MOD] packages/spw-lsp/src/server-index.ts
[MOD] packages/spw-lsp/src/__tests__/editing.test.ts
[NEW] scripts/analyzers/spw-gap-census.ts
[NEW] scripts/analyzers/spw-gap-census.test.ts
[MOD] docs/theory/spw/operational-topography.spw
[MOD] docs/theory/spw/fixity-brace-phrases.spw
[MOD] docs/theory/spw/syntax-profile-stack.spw
[NEW] docs/guides/format-profile-migrations.md
[NEW] docs/reference/format-policy.md
[MOD] .spw/registries/dialect-spec.spw
[MOD] .spw/registries/syntax-profile-stack.spw
[NEW?] .spw/registries/format-policy.spw
```

### Craft guard

- `grammar/expressions.ts`, `normalize.ts`, `canonicalize.ts`, `spw-cli/src/inspect.ts`, `spw-cli/src/format.ts`, and `spw-lsp/src/server-index.ts` are already near or beyond the 600-line guard. Put affinity, formatting, inspection, and normalization logic in the new focused modules; existing large files receive dispatch/export wiring only.
- Do not add semantic spacing behavior to `canonicalize.ts`, whose current responsibility is deterministic source normalization and hashing. `format-source.ts` composes parser-verified spacing with existing hygiene passes.
- Use const tables plus derived unions for gap classes, affinity positions, product kinds, and event policies. Use discriminated unions for parse-product receipts and exhaustive switches for future variants.
- Preserve the portable Seed boundary: no filesystem, DOM, editor, consumer identity, or runtime adapter imports.
- Keep raw source hash, semantic association hash, and projected/format hash separate. No one hash silently substitutes for another.
- Workspace format rules choose among association-preserving candidates only. They never legalize a semantic rewrite or infer authority from a source path.
- Parse the format-policy surface with a small stable bootstrap profile; a policy cannot change the grammar needed to interpret itself during the same resolution pass.
- Keep migration planning pure and inspectable. Applying a plan is a separate operation; verification reparses the result and binds the receipt to source, policy, and capability revisions.
- One semantic kernel owns meaning. Product and instrumentation requests select work and disclosure, not alternate grammars.
- Each new implementation module targets fewer than 400 lines and one reason to change.

## Commits

1. `.[plans] — define gap-affinity, formatting, product, and migration contracts`
2. `vocab[seed] — add gap, affinity, parse-product, and event-policy types`
3. `^seed[lexer] — preserve token gaps and segment dot identifiers without source loss`
4. `^seed[parser] — resolve declared affinity and normalize qualified, edge, common, and ordinal products`
5. `&[seed] — add question-oriented products and measured instrumentation policies`
6. `&[format] — emit association-aware spacing differentials and identity receipts`
7. `&[cli,lsp] — share spacing inspection and parser-context formatting surfaces`
8. `#[measure] — census compatibility and benchmark product/event policy costs`
9. `![seed,format,lsp] — prove round-trip, profile, migration, and negative-control invariants`
10. `.[theory] — publish capability, formatter, and projection handoff guidance`

Fuzz strategy:

- Explore: `npm run test:seed -- gaps association format-spacing && npm run fuzz:explore`
- Corpus probe: `node --import tsx scripts/analyzers/spw-gap-census.ts -- --root . --json`
- Stabilize: `npm run test:seed && npm run test:lsp && npm run build && npm run fuzz:stabilize`
- Ship: `npm run fuzz:ship && npm run lint:spw && npm run lint:docs`

## Agentic Hygiene

- Rebase target: `main@6b49b60c9c06162402408f5a85339d68831534dd`
- Rebase cadence: create `codex/gap-affinity-tooling` from the reviewed planning commit before implementation commit 2; rebase again before merge.
- Hygiene split: none at plan creation; the worktree was clean. Plan artifacts are the only authorized edits in this pass. Any implementation begins in a dedicated worktree after the plan and migration scope receive review.

## Dependencies

- Landed foundation: `operational-topography` owns spacing/source identity, differential authority, and falsification vocabulary.
- Landed foundation: `syntax-profile-stack` owns deterministic stack resolution and must carry the association capability in product provenance.
- Coordination only: `cli-sense-reorientation` owns the shared progressive product envelope; this plan supplies parse-stage products rather than a second envelope.
- Downstream measurement: `cli-benchmarking-infra` consumes the product/event matrix and must distinguish event generation from retention.
- Downstream transfer test: `mounted-consumer-tooling` supplies authority, exclusion, and two-revision evidence rules for corpus impact reports.
- Parallel portability contract: `package-iteration-radius` supplies environment compatibility, leaf/public product parity, and onboarding-radius receipts.

No unlanded plan must merge before the first lexer/gap prototype; benchmark and consumer-review work consume its receipts after the typed contract stabilizes.

## Failure Modes

- **Hard**: a formatter changes `tight` to `open` or the reverse while reporting a layout-only edit.
- **Hard**: `none`, `diagnostics`, and `trace` event policies return different semantic products for the same declared profile.
- **Hard**: Spw.l/q collapse changes or loses original source spans without a source map and loss receipt.
- **Hard**: dot matcher changes are applied without classifying `a.b`, `a. b`, `a .b`, `a . b`, `a..b`, `.name`, and `.{...}` across the corpus.
- **Hard**: a workspace heuristic changes association without appearing in the resolved stack and product identity.
- **Soft**: disabling event retention reduces memory but not runtime because grammar generators still create every event. Benchmark separately before widening the instrumentation refactor.
- **Soft**: a shallow product cannot answer a query. Escalate deterministically to the next declared product and disclose the additional cost.
- **Soft**: a compatibility profile preserves an old tokenization whose ambiguities remain visible as diagnostics.
- **Soft**: workspace and scoped rules conflict or cannot be resolved. Fall back to the last deterministic profile, name the conflicting rules, and make no edit.
- **Soft**: a migration cannot prove reversibility. Mark it forward-only before application and retain the preview and verification receipt.
- **Soft**: scaffolding hides defaults behind a large generated file. Emit the smallest useful profile, annotate inherited rules through inspection, and let the reference carry exhaustive detail.
- **Non-negotiable**: raw trivia and parser-owned spans remain recoverable from every semantic product.
- **Non-negotiable**: no census, formatter preview, or performance profile mutates consumer or workbench source.
- **Non-negotiable**: budget or projection degradation may remove atmosphere and interaction, never semantic HTML/content or association identity.

## Validation

- **Hypotheses**:
  - Presence/absence plus newline class carries the useful semantic distinction; arbitrary horizontal width can usually collapse within `open` without changing association.
  - A segment-aware dot matcher makes tight paths, half-spaced fixity, range connectors, and facet constructors simultaneously legible.
  - Most CLI/editor questions can request tokens, structure, or indexes without paying for ONF, runtime, or exhaustive trace events.
  - Parser-context formatting can converge CLI and LSP output while reducing unsafe whole-file or isolated-range rewrites.
  - A stable AssociationIR can support HTML-first projection and consumer-owned CSS/JS budgets without importing web concerns into Seed.
  - A compact workspace policy can retune indentation, operator spacing, line placement, and clustering while keeping each rule and its consequences inspectable.
  - Versioned profiles and upgrade receipts can give collaborators a durable vocabulary for discussing convention changes without binding language versions to one repository's release pace.
  - A scaffold → explain → plan → apply → verify journey makes safe conventions easier to adopt than hidden editor defaults while keeping every stage scriptable.
  - Identity-free exchange receipts let multiple independent projects sharpen the workbench without any one project's ontology becoming the shared language.
- **Negative controls**:
  - `a.b.c` and `a . b . c` have distinct association hashes under `syntax.gap-affinity/1`.
  - Replacing two spaces with one inside an `open` gap preserves association identity and changes surface identity.
  - Changing event policy or requested disclosure format preserves every requested product byte-for-byte.
  - Reapplying the same spacing format profile produces no edits.
  - Compatibility mode reproduces the pre-capability token/AST result for migration fixtures.
  - Mounted-consumer census excludes `.spw/_workbench/**` unless infrastructure is the explicit target.
  - An unannotated generated consumer can inspect gaps, preview formatting, and report compatibility; adding then removing optional feature annotations preserves its baseline products.
  - Renaming or moving an unregistered source document does not change resolved format policy or output.
- **Demo sequence**:
  1. Inspect tokens, gaps, resolved profile, and association for the dot/brace fixture matrix.
  2. Compare compatibility and `syntax.gap-affinity/1` products with explicit deltas.
  3. Retune indentation, one operator rule, and one clustering rule in the workspace policy; preview the winning rules and affected spans.
  4. Compare a width-preserving format pass with a class-crossing semantic migration as different effect types and authority paths.
  5. Dry-run, apply, verify, and repeat one versioned profile migration; the second application must be a no-op with a stable receipt.
  6. Ask the CLI to explain one effective rule from built-in default through workspace and scoped overrides, with links to the profile reference and migration decision note.
  7. Run the same question under `none`, `diagnostics`, and `trace`; compare products, latency, memory, and event counts.
  8. Project the AssociationIR to a host-neutral plan showing semantic baseline, optional atmosphere, interaction tier, and budget hints.
- **Falsify**: reject the model if gap classes cannot predict stable association, if formatter idempotence fails, if a performance product changes semantics, if source coordinates cannot be reconstructed, or if consumers require repository-specific grammar to use the contract.

## Spw Artifact

`.agents/plans/gap-affinity-tooling/gap-affinity-tooling.spw`

The artifact defines the gap algebra, affinity matrix, declared-profile boundary, parse-product requests, formatting law, projection handoff, invariants, counterexamples, and falsification probes.
