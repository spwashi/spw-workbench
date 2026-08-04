# Plan: geometric-analysis-tooling

Move geometric analysis off character counting and onto the AST, then build shape-level resonance discovery on top of it.

## Goal

`inspectGeometry` currently emits one report from two incompatible epistemologies: `extractBraceProjection` parses, while `censusOperators` and `nestingStats` iterate raw characters. They disagree in the same output — sigils inside quoted strings are counted as operators, and a `{` inside a string produces a false "unbalanced braces" lesson while the AST-derived brace counts are correct. Everything downstream inherits that noise: the "operator rhythm" is a histogram, which discards order and therefore has no rhythm; and single-file counts have no baseline, so `= at 32.5%` is uninterpretable.

The shape half of this plan is not a new idea — it is an unredeemed one. `types/ast/onf.ts` already states as an ONF invariant that "momentum frames are excluded from semantic hash," and `spw-garden-geometry/formula-variant-geometry-utility.spw` already names "structural: op/brace/frame skeleton — ONF shape hash" as a formula kind. Neither exists: `semanticHash`, `shapeHash`, and `structuralHash` have zero implementations in the tree. ONF is already the normalized positional form (`{ sigil, args[], frames }`) and `'_'` is already its hole sigil, so a label-erased Merkle reduction over ONF needs no new normalization and anti-unified templates are themselves ONF terms rather than a new datatype. This plan puts the census on the AST, adds order and shape as first-class measurements, and gives every number a corpus prior to be surprising against.

Naming: the implementation is the **ONF shape fingerprint** (`shapeFingerprint`), not a hash. `hashString` already means content identity in this codebase — `inputHash` / `outputHash` in `mutation-automata.ts`, `beforeHash` / `afterHash` in `form-geometry.ts`, the source id in `range-transform.ts` — where a collision is a failure. A shape fingerprint is many-to-one *by design*: collision is the finding. Two inverted collision semantics should not share a head noun. The "ONF shape" qualifier is retained so this is recognizably the thing `onf.ts` calls a semantic hash and the garden plan calls an ONF shape hash; commit 5 updates both to the settled term.

Taste note:
- correctness: one epistemology per report — parse, don't scan. A geometry report must not contradict itself.
- expressiveness: rhythm as sequence (n-grams, depth profile) and form as label-erased shape, not as a bag of sigils.
- layering: measurement lives in `spw-seed`; CLI and LSP consume the same report rather than each computing their own.

## Scope

- In scope:
  - Populating `frames.coupling.actPlacement` / `fixity` from parser position (`!x` vs `! x` vs `x!`), which `onf.ts` declares but notes is "often unset", plus container nesting depth in lexer state.
  - AST-backed operator census keyed by sigil × site × fixity × arity, replacing the character scan, reading `coupling` rather than re-deriving roles.
  - Operator n-grams and a depth *profile* (mean, variance, roughness, balance point) replacing `maxDepth` alone.
  - The ONF shape fingerprint: label-erased Merkle reduction over `{ sigil, args[] }` at depth k=1..3, honoring the declared momentum exclusion; cross-file recurrence; anti-unification of near-misses into `'_'`-bearing ONF templates.
  - Reconciling the two existing names for it (`onf.ts` "semantic hash", garden plan "ONF shape hash") onto `shapeFingerprint`, keeping `hash` reserved for content identity.
  - Corpus mode for `spw geometry` via `scanCorpus`, with per-profile baselines and z-scored deviation.
  - Falsifiable lessons (id + measurement + falsify condition), replacing prose lesson strings.
  - Thresholds derived from corpus quantiles instead of hand-picked constants.
  - LSP hover surfacing 5-axis Register Geometry coordinates and diagnostics for non-commutative operator pairings, both reading the shared report.
  - Spectral graph metrics (Laplacian / Fiedler value) over the reference graph in `spw geometry`.
- Out of scope:
  - Capsule `<…>` vs digraph couple `<>` disambiguation. The previous revision scoped this as lexer work; it is already solved structurally — `types/coupling.ts` discriminates `CouplingForm` `'operator' | 'boundary'` over a six-way `PairedBoundaryKind` registry, and `normalize.ts` stamps it. The lexer emitting a bare `<` container token is correct; disambiguation belongs downstream. Consume it, don't re-derive it.
  - Modifying the interpreter execution model in `packages/spw-runtime/`.
  - Extending `packages/spw-seed/src/canonical/form-geometry.ts` (already 1209 lines, over the craft guard) — new site vocabulary imports its `LabelSite` type rather than growing the file.
  - Replacing the hand-written `FORMULA_CATALOG`; discovered shapes sit *beside* it, they do not rewrite it.

## Files

```
[MOD] packages/spw-seed/src/canonical/geometry-inspect.ts        orchestrator only; bump to spw.geometry/2
[NEW] packages/spw-seed/src/canonical/geometry-census.ts         AST census: sigil x site x fixity x arity
[NEW] packages/spw-seed/src/canonical/geometry-rhythm.ts         operator n-grams + depth profile
[NEW] packages/spw-seed/src/canonical/geometry-shape.ts          ONF shape fingerprint (k=1..3) + anti-unification
[NEW] packages/spw-seed/src/canonical/geometry-lessons.ts        falsifiable lessons (id + measure + falsify)
[MOD] packages/spw-seed/src/canonical/geometry-inspect-sigils.ts role table shared with the census
[MOD] packages/spw-seed/src/canonical/index.ts                   export surface
[MOD] packages/spw-seed/src/index.ts                             export surface
[MOD] packages/spw-seed/src/normalize.ts                         stamp actPlacement/fixity from parser position
[MOD?] packages/spw-seed/src/types/ast/onf.ts                    redeem the semantic-hash invariant in doc + type
[MOD?] packages/spw-seed/src/types/coupling.ts                   consumed read-only unless arity needs widening
[MOD] packages/spw-seed/src/lexer/state.ts                       container depth in lexer state
[MOD] packages/spw-seed/src/lexer/tokenize.ts                    carry position for fixity resolution
[MOD] packages/spw-seed/src/lexer/matchers/operators.ts          prefix/medial/suffix tagging
[MOD] packages/spw-cli/src/geometry.ts                           corpus mode, --baseline, --shapes, --ngrams
[NEW] packages/spw-cli/src/geometry-baseline.ts                  corpus distribution, z-scores, derived thresholds
[MOD] packages/spw-lsp/src/handlers/spw-probes.ts                pass through the /2 report
[MOD] packages/spw-lsp/src/handlers/display.ts                   hover: 5-axis Register Geometry coordinates
[MOD] packages/spw-lsp/src/handlers/analysis.ts                  non-commutative pairing diagnostics
[MOD] packages/spw-lsp/src/handlers/semantic-tokens.ts           Layer axis + Runtime Quality colorization
[MOD?] packages/spw-cli/src/ls/run.ts                            AST/ONF structural mode for operator-arity scoring
[MOD?] packages/spw-cli/src/ls/probe.ts                          arity-aware probe scoring
[MOD] src/seed/__tests__/geometry-inspect.test.ts                update for /2 shape
[NEW] src/seed/__tests__/geometry-census.test.ts                 parity + string-immunity cases
[NEW] src/seed/__tests__/geometry-shape.test.ts                  fingerprint stability + recurrence
[NEW] packages/spw-cli/src/geometry-baseline.test.ts             quantile derivation
```

Path corrections folded in from the previous revision: `matchers/operator.ts` → `matchers/operators.ts`, `handlers/hover.ts` → `handlers/display.ts`, `handlers/diagnostics.ts` → `handlers/analysis.ts`, `src/ls/index.ts` → `src/ls/run.ts`; `matchers/containers.ts` dropped with the disambiguation scope. The previous revision also omitted `canonical/geometry-inspect.ts` entirely — the module that actually holds the defect — and `normalize.ts`, where fixity is actually stamped.

Craft guard:
- `geometry-inspect.ts` is 184 lines today. Census + rhythm + shape + lessons landing in place would exceed 400; hence the four-module split, leaving the orchestrator small and each module single-concern.
- `form-geometry.ts` (1209) and `form-ladders.ts` (943) are already over the 600-line guard. Import from them; do not add to them.
- Target <400 lines per new module, <12 imports each.
- Both test roots run: `vitest.seed.config.ts` includes `src/seed/**/*.test.ts` *and* `packages/spw-seed/src/**/*.test.ts`. Seed tests may live in either; keep new geometry tests in `src/seed/__tests__/` alongside the existing `geometry-inspect.test.ts`.

Axis attribution:
- **resolution** — top-N slices, depth-k fingerprint granularity, lesson verbosity.
- **noise** — recurrence threshold separating idiom from accident; z-score cut for "surprising".
- **stability** — fingerprints must be invariant under layout-only rewrites (ties to the existing `pair_preservation` claim in `brace-projection.ts`).

Every one of these derives from a corpus quantile after commit 7; none stays hand-picked.

## Commits

1. `.[plans] — refresh geometric-analysis-tooling scope around AST-census findings`
2. `^seed[spw-seed] — stamp actPlacement/fixity from parser position; carry container depth in lexer state`
3. `^seed[geometry] — move operator census and nesting onto the AST; bump report to spw.geometry/2`
4. `^seed[geometry] — add operator n-grams and depth profile so rhythm carries order`
5. `vocab[geometry] — settle shape fingerprint vs content hash across onf.ts and the garden plan`
6. `^seed[geometry] — implement the ONF shape fingerprint and anti-unified templates`
7. `&[spw-cli] — corpus mode for spw geometry: scanCorpus baseline, z-scored deviation, derived thresholds`
8. `#[spw-lsp] — surface Register Geometry coordinates and non-commutative diagnostics from the /2 report`
9. `&[spw-cli] — spectral graph metrics over the reference graph (Laplacian / Fiedler)`
10. `![tests] — fixity, census parity, fingerprint stability, and corpus baseline suites`

Dependency order: commit 2 supplies the fixity metadata commit 3 keys on; 4 and 6 both read the commit-3 census; 5 lands before 6 so the naming never has to be walked back through an implementation; 7 makes 4 and 6 interpretable; 8 and 9 are consumers and can run in parallel after 7.

Fuzz strategy:
- Explore (commits 2–6): `npm run fuzz:types` after each, plus `npm run test:seed`.
- Stabilize (commit 7): `npm run fuzz:stabilize` — types + runtime, since the export surface changes.
- Ship (commits 8–10): `npm run fuzz:ship` — build + full suite, plus `npm run lint:spw` for surfaces touched by the demo sequence.

## Agentic Hygiene

- Rebase target: `main@d9da60ad`
- Rebase cadence: before commit 1, before merge
- Hygiene split: required. The working tree currently carries unrelated modifications in `packages/spw-lsp/` (`navigation.ts`, `server-index.ts`, `stdio-server.ts`, `types.ts`, `handlers/spw-probes.ts`), `extensions/neovim-spw/`, and `scripts/lsp/smoke-navigation.ts`, plus untracked generated `.d.ts` files across `packages/spw-cli/src/`. `handlers/spw-probes.ts` is a shared hot file between that drift and commit 8 of this plan. Isolate the LSP/neovim drift onto its own branch before commit 2, or explicitly defer this plan's LSP commits until it lands.

## Dependencies

- `spw-beat-diff-precipitation` — untracked plan directory present in the tree; check for overlap on `packages/spw-cli/src/beat.ts` before commit 7.
- `spw-garden-geometry` — read; vocabulary question resolved. Its `formula-variant-geometry-utility.spw` already names this "ONF shape hash" under `~#kinds.structural`, and `onf.ts` calls it a semantic hash. Commit 5 settles all three on `shapeFingerprint`, reserving `hash` for content identity; commit 6 supplies the missing machine for a formula kind that plan already assumes exists. Notify it when the fingerprint lands.
- `operational-topography` — `topography-probe.ts` already owns parse-health and depth snapshots; commit 3 must reuse `ParseHealth` rather than introduce a parallel notion.

## Failure Modes

- **Hard**: lexer fixity tagging breaks existing prefix-only parser recovery.
- **Hard**: the AST census silently drops operators on surfaces that fail to parse (prose-heavy `.spw`), making the report look clean where the char scan was merely noisy. Mitigation: keep the char census as an explicit `fallback: true` path, and a parity test asserting the two agree on well-formed input.
- **Soft**: fingerprinting cost on the full corpus; hover latency on large documents.
- **Soft**: no shape recurs at k=2 across the corpus — the resonance thesis is simply false for this codebase. That is a real outcome; commit 6 should report it rather than lower the threshold until something appears.
- **Non-negotiable**: existing `packages/spw-seed/` tests keep passing; the two `spw.geometry/1` consumers (`packages/spw-cli/src/geometry.ts`, `packages/spw-lsp/src/handlers/spw-probes.ts:403`) migrate in the same commit that bumps the version — no window where a consumer reads a shape that no longer exists.

## Validation

- **Hypotheses**:
  - AST-level operator scoring ranks operators differently than the character census on at least one real surface (falsifiable: if the rankings never differ, the defect is cosmetic and commit 3 is not worth its cost).
  - ONF shape hashes at k=2 recur across ≥3 files in `docs/theory/spw/`.
  - Anti-unified templates from near-miss shapes correspond to rungs a human recognizes as form-ladder material.
  - Fixity is recoverable for a majority of operator nodes from parser position — `onf.ts` says it is "often unset", and if it stays unset after commit 2, the census degrades to sigil × site and commit 6's arity keying loses resolution.
- **Negative controls**:
  - The repro `printf '^[demo]{ "a string with ! and ~ and { unbalanced" }' | spw geometry --stdin` must report `ops=1` and no unbalanced-brace lesson.
  - Whitespace and line-comment tokenization unchanged (assert token stream equality on a fixture corpus).
  - Layout-only rewrites must leave every shape hash unchanged — the same invariant `brace-projection.ts` already claims for pair preservation.
  - Mutating `frames.momentum` must not change any shape fingerprint. This is the exact invariant `onf.ts` already declares; commit 6 is the first code that can be held to it.
- **Demo sequence**:
  1. The repro above, before and after commit 3.
  2. `spw geometry docs/theory/spw/form-ladders.spw --ngrams`
  3. `spw geometry --corpus docs/theory --baseline` — deviation, not raw counts.
  4. `spw geometry --shapes --min-recur 3` — recurring skeletons across files.
  5. LSP hover on `docs/theory/spw/register-geometry.spw`.

## Spw Artifact

`.agents/plans/geometric-analysis-tooling/geometric-analysis-tooling.spw` — records the shape-fingerprint abstraction: label erasure, depth-k granularity, recurrence as the operational definition of resonance, and anti-unification as the path from detection to development. Warranted because the fingerprint primitive is novel to the repo and will outlive this branch.
