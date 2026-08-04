# Plan: bias-resolution-product

Canonicalize `=[axis] anchor { targets }` as a **verb-polymorphic bias edge** —
one neutral ONF product read differently by each consumer verb.

## Goal

Today `=`+body parses cleanly but normalizes to an inert `config` node carrying an
unnamed body coupling — valid, queryable-by-sigil, but semantically dead. This
plan gives it a named product, `bias`, carrying a **neutral directed edge**
`{ anchor, axis, targets, sign }`:

- **subject → anchor** (the biased entity / from-pole; elided = the enclosing
  node, so bare `={ … }` is the reflexive special case)
- **frame `[reg=…]` → axis** (which register is biased)
- **body sequence → targets**, ranked first-strongest (reusing the
  `register_bias: [...]` ordered-array convention in `.spw/biome/ocean/expr/rel.spw`)
- **valence → sign** (boon = forward/apply/attract, bane = inverse/revert/repel)

The move that makes this worth widening: **the product carries no verb.** Meaning
is chosen by whoever reads the edge. This branch ships three consumers over the
*same* product to prove the polymorphism end-to-end:

1. **mount (resolution)** — the edge is a routing pointer; `spw:mount` resolves
   anchor → target.
2. **mutate (rewrite)** — a body-sequence of biases is an ordered patch program;
   `spw:mutate` applies it, `boon` = apply, `bane` = revert.
3. **expand (template)** — a reflexive edge `={ ~"template" }` is *provenance*
   ("expanded from / conforms to this"); `spw:expand` unfolds the template
   (boon) or folds a surface back to its one-line bias (bane) — a specialization
   of mutate against a template edge.

**Taste note**: improves **expressiveness + naming**. An inert `config` body
becomes a named, reusable relation without new glyphs; meaning composes from
existing vocabulary (`~` = locative, valence pentad = sign, ordered array = rank).
The verbose `&self_ref:` key is retired; the rejected self-reference returns,
transformed, as template *provenance* rather than redundant location-declaration.

**Deformation axis**: primarily **resolution** — how a node collapses/resolves —
extended to **stability** (mutate is a state transition) and **affect/valence**
(pentad = sign, never a magic direction). Ranking traces to ordered-array prior
art, never a weight literal.

**Central invariant**: the seed product and `readBias` stay **verb-neutral**. No
consumer word (resolve/rewrite/template) may leak into `normalize.ts` or the
`BiasEdge` shape. Seed emits the edge; CLI verbs interpret it. This is the whole
point — violating it collapses the polymorphism back into a single-purpose tag.

## Scope

- **In scope**:
  - Stamp `product: 'bias'` on `=`+body-only in `normalize.ts`; record anchor
    (subject), axis (frame `[reg=…]`), ranked targets (body sequence), sign
    (valence) on the normalized node — verb-neutral.
  - Add a `product` field to `SpwPattern` and honor it in the query matcher.
  - Add a `BIAS` preset (seed) and register a `bias` CLI selector name.
  - Portable verb-neutral reader `readBias(node)` → `BiasEdge { anchor, axis,
    targets, sign }`.
  - Subject-as-anchor binding — add `=` to the subject allowlist at
    `expressions.ts:278` (anchor rides the subject slot, defaults to enclosing
    node when elided).
  - **Three consumers over the same edge**:
    - `spw:mount` — resolution (anchor → target routing).
    - `spw:mutate` — rewrite (bias-sequence as ordered patch; boon apply / bane revert).
    - `spw:expand` — template unfold/fold (provenance; specializes mutate).
  - Tests: product stamp, roundtrip non-regression, reader, selector,
    subject-binding parse, and one test per consumer proving the *same* edge
    yields three behaviors.
  - Canon + docs: document the verb-polymorphic bias product.

- **Out of scope**:
  - Full `.spw/index.spw` runtime rewrite — mount reads bias, it does not
    restructure the routing table.
  - Deep pack-wizard integration — `spw:expand` proves fold/unfold on a template
    edge; wiring into the curated-pack wizard is a follow-on.
  - Scope-guard subjects (`=(when:…){…}`) — subject stays monovalent (anchor only).
  - Any change to `.`-facet, `#`-set, or other products.

## Files

```
[MOD]  packages/spw-seed/src/normalize.ts             # stamp product 'bias'; anchor/axis/targets/sign
[MOD]  packages/spw-seed/src/query/types.ts           # add product? to SpwPattern
[MOD]  packages/spw-seed/src/query/match.ts           # honor product in matcher
[MOD]  packages/spw-seed/src/query/presets.ts         # BIAS preset
[MOD]  packages/spw-cli/src/selectors.ts              # register `bias` selector name
[NEW]  packages/spw-seed/src/canonical/read-bias.ts   # readBias(node) → BiasEdge (verb-neutral)
[NEW]  packages/spw-seed/src/canonical/read-bias.test.ts
[MOD?] packages/spw-seed/src/index.ts                 # export readBias, BiasEdge, BIAS
[MOD]  packages/spw-seed/src/grammar/expressions.ts   # `=` subject (anchor) allowlist (line ~278)
[MOD]  packages/spw-cli/src/mount.ts                  # resolution consumer
[NEW]  packages/spw-cli/src/bias-apply.ts             # shared edge→ops core for mutate + expand
[MOD]  packages/spw-cli/src/mutate.ts                 # rewrite consumer (bias-sequence patch)
[NEW]  packages/spw-cli/src/expand.ts                 # template consumer (unfold/fold); exports runSpwExpandCli
[NEW]  scripts/spw-expand.ts                          # thin dispatch shim (mirrors scripts/spw-mutate.ts)
[MOD]  package.json                                   # `spw:expand` script + `spw -- expand` help entry
[NEW]  packages/spw-cli/src/bias.test.ts              # three-consumer polymorphism test
[NEW]  .spw/registries/bias-product.spw               # canon surface for the product
[MOD?] docs/ (operator reference)                     # human-facing note
```

### Craft guard

- `normalize.ts` is a core hot file — verify it stays under 600 lines; the change
  is a small branch beside the existing `.`→facet case, and must stay verb-neutral.
- `read-bias.ts` is new and single-purpose (the edge reader, <120 lines).
- `bias-apply.ts` centralizes edge→operation translation so `mutate.ts` and
  `expand.ts` share one core — expand is a *specialization*, not a fork. Watch
  that neither consumer re-implements edge parsing (they call `readBias`).
- No file should cross 12 imports; each consumer imports `readBias` + its own IO.
- Concept-count watch: seed *tags and reads* the edge; CLI verbs *interpret* it.
  The verb-neutral boundary is the single most important layering line here.

## Commits

```
1.  vocab[seed] — neutral `bias` edge product in normalize (anchor·axis·targets·sign)
2.  &[seed-query] — add `product` selector field + honor it in the matcher
3.  &[seed-query] — BIAS preset + register `bias` CLI selector
4.  ^seed[bias] — readBias → BiasEdge { anchor, axis, targets, sign } (verb-neutral)
5.  &[seed-grammar] — allow `=` subject (anchor) binding via expressions.ts:278
6.  &[cli-mount] — resolution consumer: spw:mount honors bias edges
7.  &[cli-mutate] — rewrite consumer: bias-sequence as ordered patch (boon apply / bane revert)
8.  &[cli-expand] — template consumer: unfold/fold against a template edge (specializes mutate)
9.  ![seed-bias] — coverage: product + reader + selector + three consumers
10. .[canon] — document the verb-polymorphic bias product
```

Dependency order: product tag (1) → query field (2) → preset (3) → verb-neutral
reader (4) → grammar widening the anchor form (5) → then the three consumers over
the same edge: mount (6), mutate (7), expand as mutate-specialization (8) → the
polymorphism test proving one edge / three behaviors (9) → canon (10). Each commit
builds green and carries one concern.

### Fuzz strategy

- Explore: `npm run fuzz:types` per commit (tsc gate).
- Stabilize: `npm run fuzz:stabilize` after commits 1, 4, 5 (types + runtime; grammar touch).
- Ship gate: `npm run test:seed` + `npm run test:cli` after commit 7; `npm run fuzz:ship` before merge.

## Agentic Hygiene

- Rebase target: `main@993c0994` (current mainline; clean tree, no drift).
- Rebase cadence: before commit 1, before merge.
- Hygiene split: none — `git diff origin/main...HEAD` is empty.

## Dependencies

none

## Failure Modes

- **Hard**: a verb word leaks into the seed product / `readBias`, collapsing the
  polymorphism into a single-purpose tag. Guard: the empty-grep negative control;
  seed layer emits only `BiasEdge`, never a behavior.
- **Hard**: product id `bias` collides with an existing reg id and downstream
  sigil selectors mis-hit. Mitigation: `bias` is a *product* on the body coupling,
  distinct from `reg:'config'`; verify no existing product uses it.
- **Soft**: `mutate`/`expand` are inherently destructive — an anchor that resolves
  ambiguously (multiple hits) must degrade to plan-only, never a blind rewrite.
  `bias-apply.ts` returns a plan; `--write` is the only path that mutates.
- **Soft**: `product` field not yet honored everywhere a pattern is matched — the
  `BIAS` preset degrades to `{ sigil:'=', withBoundaries:['body'] }` (broader but
  correct superset) rather than failing.
- **Non-negotiable**: any `={ … }` that carried no product before must normalize
  **identically except for the added `product:'bias'` tag** — no roundtrip or
  serialization regression. And no consumer mutates without an explicit `--write`.

## Validation

- **Hypotheses**: every existing `={…}` in the corpus normalizes unchanged but for
  the product tag; bare `=` ops and `=[frame]`-only forms keep `reg:'config'` with
  no product.
- **Negative controls**: `.`-facet and `#`-set products untouched; seed emits no
  verb word (grep `normalize.ts`/`read-bias.ts` for resolve|rewrite|mount|
  template must stay empty — the verb-neutral invariant).
- **Polymorphism proof (the point of widening)**: one fixture edge
  `=~"a"{ ~"b" }`, three consumers, three behaviors:
  - `spw:mount` reports `a` resolves toward `b`;
  - `spw:mutate` (boon) rewrites `a`→`b`, (bane) reverts;
  - `spw:expand` unfolds a template edge / folds a surface back to its bias.
- **Demo sequence**: `spw:select <fixture> --selector bias` hits the edge;
  `readBias(node)` returns the `BiasEdge`; each verb consumes the same edge.

## Spw Artifact

`.spw/registries/bias-product.spw` (commit 6) is the distilled canon surface:
the operator·boundary product definition, its axis/target/sign grammar, and its
relationship to `~` path-refs and the valence pentad. `wip.spw` remains the
retained operational stream.
