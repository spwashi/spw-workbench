# Plan: apposition-cache-granules

Make LSP cache invalidation proportional to the edit, keyed on the anchors authors already placed, and make the resulting granule state visible where the author is looking.

## Goal

The document cache invalidates on a whole-file `contentHash`, so one keystroke discards every derived artifact — parse tree, selector hits, annotations, frames, line contexts. Nothing smaller than a file has an identity that survives an edit. Meanwhile the corpus already carries 220 author-placed appositions (`~#lens(…)`, `~#neighbor(…)`) whose bodies are lexed **raw to the matching paren**, which means the full apposition set of a surface is extractable by a scan with no parse at all. That accident of ergonomics — prose in a reading must not be a syntax error — is also a cheap validity probe: compare an apposition envelope against the cached one, and reparse only where it moved.

This plan lands granular invalidation on those anchors, fixes the three confirmed cache defects that make granularity moot, retains the inverted reference index the graph build already computes and discards, and surfaces granule state through `codeLens` — a verb already wired.

Taste note:
- correctness: a cache entry must die with the thing it describes. Today an evicted document leaves its index entries behind; this is demonstrated, not suspected.
- resolution: invalidation proportional to the edit rather than to the file.
- disclosure: cache state visible at the granule, in the editor, without a bespoke probe.

## Scope

- In scope:
  - The three confirmed audit defects: index entries surviving eviction, `getDocument` flattening recency during bulk fan-out, `workspaceAnnotations` O(n) rebuild per save.
  - Frame-level content hashes keyed by apposition name, so derived data survives edits in sibling frames.
  - An apposition scan in `spw-seed` — extract name, body, and span hash without invoking the parser.
  - A validity probe that reuses derived data when a granule's apposition envelope is unchanged.
  - Retaining the `inbound` reference index that `buildReferenceGraph` already computes and throws away.
  - `codeLens` surfacing per-granule tier, volatility, inbound degree, and hash age.
- Out of scope:
  - Incremental parsing and lexer resume. `LexerState` is already a serializable checkpoint and both `tokenize` and `seedNode` are generators, so the affordance exists — but safe-restart-point analysis is its own plan, and this one gets most of the win without it.
  - Stable node identity and subtree fingerprints — owned by `geometric-analysis-tooling`; this plan keys on apposition names instead, which already exist in the source.
  - Beat TTL configuration and `$spw/stateReload` — owned by `spw-beat-diff-precipitation`. See Dependencies; the conflict is real.
  - Two-axis eviction (crossing `tier` with `volatility`). Correct and desirable, but it changes eviction policy while this plan changes eviction *correctness*; sequencing them together would confound both.

## Files

```
[NEW] packages/spw-seed/src/canonical/apposition-scan.ts        parse-free apposition extraction + span hashes
[MOD] packages/spw-seed/src/lexer/matchers/apposition.ts        export the scan-side splitter, no behaviour change
[MOD] packages/spw-seed/src/canonical/index.ts                  export surface
[MOD] packages/spw-seed/src/index.ts                            export surface
[NEW] packages/spw-lsp/src/cache/granule.ts                     frame granules keyed by apposition name
[NEW] packages/spw-lsp/src/cache/validity.ts                    envelope comparison; reuse-or-reparse decision
[NEW] packages/spw-lsp/src/cache/inbound-index.ts               retained target -> referrers index
[MOD] packages/spw-lsp/src/server-index.ts                      evict index entries with the document; peekDocument
[MOD] packages/spw-lsp/src/handlers/reference-graph.ts          publish inbound rather than discarding it
[MOD] packages/spw-lsp/src/handlers/navigation.ts               references reads the inbound index; non-touching reads
[MOD] packages/spw-lsp/src/handlers/display.ts                  codeLens granule state
[MOD] packages/spw-lsp/src/types.ts                             granule + validity types
[NEW] packages/spw-lsp/src/__tests__/cache-eviction.test.ts     pins the demonstrated leak
[NEW] packages/spw-lsp/src/__tests__/cache-granule.test.ts      envelope stability + reuse decisions
[NEW] src/seed/__tests__/apposition-scan.test.ts                scan matches parse on the corpus
```

Craft guard:
- **`server-index.ts` is 1234 lines — already double the 600-line guard.** This plan must not grow it. Granule, validity, and inbound-index logic go in `packages/spw-lsp/src/cache/`; `server-index.ts` receives deletions (the eviction fix) and one small method (`peekDocument`). If it grows net-positive, the plan has failed its own guard.
- `handlers/display.ts` is 400+; codeLens additions should extract rather than append.
- Target <400 lines and <12 imports for each new module.

Axis attribution:
- **resolution** — granule size (frame vs file vs apposition span); how much codeLens discloses per lens.
- **stability** — what an edit is allowed to invalidate; the envelope is the stability boundary.
- **noise** — the reuse threshold: how much envelope drift still counts as unchanged.

Derived from corpus measurement in commit 7, not hand-picked.

## Commits

1. `.[plans] — file apposition-cache-granules`
2. `![spw-lsp] — pin the confirmed cache defects: eviction leak and recency flattening`
3. `&[spw-lsp] — evict a document's index entries with the document`
4. `&[spw-lsp] — peekDocument for bulk reads so fan-out stops flattening recency`
5. `&[spw-lsp] — derive workspaceAnnotations from annotationsByFile, dropping the per-save rebuild`
6. `^seed[spw-seed] — apposition scan: name, body, and span hash without a parse`
7. `^seed[spw-seed] — frame-level content hashes keyed by apposition name`
8. `&[spw-lsp] — retain the inbound reference index the graph build already computes`
9. `&[spw-lsp] — reuse derived data when a granule's apposition envelope is unchanged`
10. `#[spw-lsp] — codeLens surfacing granule tier, volatility, inbound degree, and hash age`
11. `![tests] — scan/parse parity, envelope stability, and invalidation-proportionality suites`

Dependency order: 2 lands first because the defect it pins is already demonstrated and must fail before 3 makes it pass. 3–5 are independent of each other and of the granule work. 6 supplies the scan that 7 and 9 key on. 8 is independent and can run in parallel with 6–7. 10 consumes everything.

Fuzz strategy:
- Explore (commits 2–7): `npm run fuzz:types` plus `npm run test:lsp` and `npm run test:seed` after each.
- Stabilize (commits 8–9): `npm run fuzz:stabilize` — the export surface and reference resolution both move.
- Ship (commits 10–11): `npm run fuzz:ship`, plus `npm run lsp:smoke` for the navigation path touched in commit 8.

## Agentic Hygiene

- Rebase target: `main@f5af9eb3`
- Rebase cadence: before commit 2, before merge
- Hygiene split: **required, and active.** The working tree currently carries in-flight sequence-separator work in `packages/spw-seed/src/grammar/{expressions,containers,seed}.ts`, `types/ast/nodes.ts`, and `canonical/geometry-inspect.ts`, plus an untracked `.scratch/`. `types/ast/nodes.ts` is where `AppositionLabel` lives, so commit 6 borders live edits. Land or park the grammar work before commit 6, and do not begin this plan on a dirty seed tree.
- 76 untracked generated `.d.ts` files under `packages/spw-cli/src/` remain unignored and uncommitted; they are noise in every `git status` this plan will run. Worth a `.gitignore` rule before starting.

## Dependencies

- **`spw-beat-diff-precipitation` — direct conflict.** It plans dynamic beat TTLs and a diffing/precipitation engine *inside* `packages/spw-lsp/src/server-index.ts`, the same file this plan edits for eviction, and both touch `types.ts`. Its commits 2–3 and this plan's commits 3–5 will collide. One must land first; this plan is the better candidate because it fixes correctness that the other plan's TTL work would otherwise inherit and amplify — configurable TTLs over a leaking index tune the rate of a bug.
- `geometric-analysis-tooling` — supplies `shapeFingerprint`, which becomes a second granule key once it exists. Not required here; the two should agree on what a granule *is* before either ships a key format.
- `operational-topography` — `topography-probe.ts` owns `ParseHealth`; the validity probe must reuse it rather than mint a parallel notion of "did this parse".

## Failure Modes

- **Hard**: apposition-keyed granules only cover surfaces that carry appositions. The census is 220 appositions across **182 of 493 surfaces — 63% of the corpus has none**, and would fall back to whole-file invalidation. If the fallback path is not as fast as today's, this is a regression for most of the corpus.
- **Hard**: 5 appositions are anonymous (`~#(…)`), so they anchor a span but supply no key. Granule identity must degrade to span-position for those, which is exactly the identity that does not survive edits.
- **Soft**: envelope comparison produces false "unchanged" readings and serves stale derived data. Mitigation: the probe decides *reuse*, never *correctness* — a reuse miss costs a reparse, and a reuse hit must be verifiable against a full parse in tests.
- **Non-negotiable**: a cache hit and a cold recompute return the same answer. This is `cache.spw`'s own stated taste — *"when they diverge the key was wrong, not the cache"* — and it is the one property this plan must not trade for speed.

## Validation

- **Hypotheses**:
  - An edit inside one frame leaves other frames' apposition span hashes unchanged (falsifiable: if envelopes shift on any edit, the granule boundary is not stable and the plan's premise fails).
  - The apposition scan agrees with the parser on every apposition in the corpus — same names, same bodies, same spans.
  - Scanning is materially cheaper than parsing on the same input; if not, the probe has no reason to exist.
  - Granular invalidation reduces reparse volume on a realistic edit sequence. Measure it; do not assume it.
- **Negative controls**:
  - The eviction test must fail against current `main` and pass after commit 3. It already fails — that is why it is commit 2.
  - `test:lsp` 215/215 must stay green throughout.
  - Whole-file invalidation must remain correct for the 311 surfaces carrying no apposition.
  - `references` results must be identical before and after the inbound index lands — same locations, same order.
- **Demo sequence**:
  1. The eviction probe, red then green.
  2. Edit one frame in a multi-frame surface; show sibling granules retaining derived data.
  3. `references` on a hub surface, before/after the inbound index, with timing.
  4. codeLens on a surface carrying `~#lens(…)`, showing granule tier and hash age.

## Spw Artifact

`.agents/plans/apposition-cache-granules/apposition-cache-granules.spw` — records why the apposition is the right granule: author-declared, parse-free to verify, perspectival by construction (the parens are the `@` container), and already placed 220 times. Warranted because "the reading is the cache boundary" is a design claim that outlives this branch and that `cache.spw` should eventually absorb.
