# Plan: bias-resolution-product

Canonicalize `={ target }` as a named **resolution-bias** ONF product.

## Goal

Today `=`+body parses cleanly but normalizes to an inert `config` node carrying an
unnamed body coupling — the shape is valid and queryable-by-sigil, but nothing
downstream knows it means anything. This plan gives `=`+body a named product,
`bias`, so it becomes a first-class, addressable surface: `={ target }` reads as
"on collapse, resolve toward `target`." The frame slot `[reg=…]` names the axis
(which register is biased); a body **sequence** ranks targets (first strongest,
matching the existing `register_bias: [...]` ordered-array convention in
`.spw/biome/ocean/expr/rel.spw`); the target is typically a `~`-path; and valence
signs direction (boon = attractor, bane = repeller). No new glyphs, no grammar
surgery for the core — every form already parses.

**Taste note**: improves **expressiveness + naming**. An inert `config` body
becomes a named product without touching the grammar; meaning is carried by the
operator (`=` = lean toward) composed with existing vocabulary (`~` = locative,
valence pentad = sign, ordered array = rank). The verbose `&self_ref:` key is
retired in favor of the operator saying what it means.

**Deformation axis**: primarily **resolution** — the product governs how a node
collapses/resolves. Direction attributes to the **affect/valence** axis (pentad),
never a magic sign. Ranking attributes to ordered-array prior art, never a weight
literal.

## Scope

- **In scope**:
  - Stamp `product: 'bias'` on `=`+body-only in `normalize.ts`.
  - Record the axis (from frame `[reg=…]`) and ranked targets (body sequence) on
    the normalized node.
  - Add a `product` field to `SpwPattern` and honor it in the query matcher.
  - Add a `BIAS` preset (seed) and register a `bias` CLI selector name.
  - A portable `readBias(node)` consumer in seed → `{ axis, targets, sign }`.
  - Tests: normalize product stamp, roundtrip non-regression, reader, selector.
  - Canon + docs: document the bias resolution product on the operator surface.

- **Out of scope**:
  - Wiring bias into `spw:mount` / `.spw/index.spw` runtime resolution (deferred;
    `readBias` is the honoring seam a resolver would later call).
  - Subject-binding `="reg"{ … }` — tracked as an optional stretch only.
  - Any change to `.`-facet, `#`-set, or other products.

## Files

```
[MOD]  packages/spw-seed/src/normalize.ts            # stamp product 'bias'; axis from frame; ranked body
[MOD]  packages/spw-seed/src/query/types.ts          # add product? to SpwPattern
[MOD]  packages/spw-seed/src/query/match.ts          # honor product in matcher
[MOD]  packages/spw-seed/src/query/presets.ts        # BIAS preset
[MOD]  packages/spw-cli/src/selectors.ts             # register `bias` selector name
[NEW]  packages/spw-seed/src/canonical/read-bias.ts  # readBias(node) → { axis, targets, sign }
[NEW]  packages/spw-seed/src/canonical/read-bias.test.ts
[MOD?] packages/spw-seed/src/index.ts                # export readBias + BIAS
[NEW]  .spw/registries/bias-product.spw              # canon surface for the product
[MOD?] docs/ (operator reference)                    # human-facing note
[MOD?] packages/spw-seed/src/grammar/expressions.ts  # STRETCH: `=` subject allowlist (line ~278)
```

### Craft guard

- `normalize.ts` is a core hot file — verify it stays under 600 lines after the
  product stamp; the change is a small branch beside the existing `.`→facet case.
- `read-bias.ts` is new and single-purpose (one reader, <120 lines expected).
- No file should cross 12 imports; `presets.ts` (80 lines) and `types.ts` gain
  one field each — trivial.
- Concept-count watch: keep axis/target/sign extraction in `read-bias.ts`, not
  smeared into `normalize.ts` (normalize only *tags* the product; the reader
  *interprets* it).

## Commits

```
1. vocab[seed] — name the `=`+body ONF product `bias` in normalize
2. &[seed-query] — add `product` selector field + honor it in the matcher
3. &[seed-query] — BIAS preset + register `bias` CLI selector
4. ^seed[bias] — readBias consumer: axis / ranked targets / valence sign
5. ![seed-bias] — normalize + reader + selector coverage
6. .[canon] — document the bias resolution product (operator surface + docs)
```

Dependency order: product tag (1) → query field it can match on (2) → preset that
uses the field (3) → interpreter that reads the product (4) → tests (5) → canon (6).
Each commit builds green and carries one concern.

### Fuzz strategy

- Explore: `npm run fuzz:types` per commit (tsc gate).
- Stabilize: `npm run fuzz:stabilize` after commits 1, 4 (types + runtime).
- Ship gate: `npm run test:seed` after commit 5; `npm run fuzz:ship` before merge.

## Agentic Hygiene

- Rebase target: `main@993c0994` (current mainline; clean tree, no drift).
- Rebase cadence: before commit 1, before merge.
- Hygiene split: none — `git diff origin/main...HEAD` is empty.

## Dependencies

none

## Failure Modes

- **Hard**: product id `bias` collides with an existing reg id and downstream
  sigil selectors mis-hit. Mitigation: `bias` is a *product* name on the body
  coupling, distinct from `reg:'config'`; verify no existing product uses it.
- **Soft**: `product` field not yet honored everywhere a pattern is matched — the
  `BIAS` preset degrades to `{ sigil:'=', withBoundaries:['body'] }` (broader but
  correct superset) rather than failing.
- **Non-negotiable**: any `={ … }` that carried no product before must normalize
  **identically except for the added `product:'bias'` tag** — no roundtrip or
  serialization regression. This is the negative control for the test suite.

## Validation

- **Hypotheses**: every existing `={…}` in the corpus normalizes unchanged but for
  the product tag; bare `=` ops and `=[frame]`-only forms keep `reg:'config'` with
  no product.
- **Negative controls**: `.`-facet product untouched; `#`-set product untouched.
- **Demo sequence**: `spw:select <fixture> --selector bias` hits the
  `={ ~"…" }` node; `readBias(node)` returns `{ axis, targets, sign }`.

## Spw Artifact

`.spw/registries/bias-product.spw` (commit 6) is the distilled canon surface:
the operator·boundary product definition, its axis/target/sign grammar, and its
relationship to `~` path-refs and the valence pentad. `wip.spw` remains the
retained operational stream.
