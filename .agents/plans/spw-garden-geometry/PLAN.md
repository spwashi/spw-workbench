# Plan: spw-garden-geometry

Make editor surfaces (VS Code + Neovim via shared `spw-lsp`) teach **measurable operational topography** instead of restating the line under the cursor. Garden, physical, and ecological language becomes an optional presentation profile over neutral coordinates, observations, and effects.

## Goal

Today hover often repeats what the eye already has: kind labels, frame path, ambient braids, co-occurrence lists that restate nearby structure. Resonance and braid UI retell the same ambient field. The desired end state:

1. **Popover geometry** — only show what is *not* readable at the caret (off-screen, cross-file, temporal, combinatorial, mechanical).
2. **File- and garden-level handles** — configure what popovers/inlays may say per file, dialect, or garden bed.
3. **Measurable `.spw` development** — features of the tree and of files become instruments for “how is this garden growing?”
4. **Learnable operations** — same vocabulary in VS Code and Neovim for combinatorics, symmetry, phase, cache age, projection staleness.
5. **Wonder with discipline** — metaphors bind to *measurable* axes and explicit profiles rather than becoming free-floating prose or language law.

**Taste note**: learnability, wonder, evidence discipline, containment, local style, and performance legibility.

## Trajectory revision — 2026-07-20

This plan now follows `operational-topography`. Its durable core is true delta, anti-echo, named depth axes, objective structural measurements, bounded probes, previewable effects, and thin-client projection. Garden, genomic, physical, affective, and left/right vocabulary is optional profile language; it does not own semantic truth, fact eligibility, mutation authority, or evidence status.

The first contract is a read-only selection transect and revision-addressed evidence packet. `spw/gardenStats`, executable pulses, edit-bearing lenses, and taste interpretation wait until the shared observation/effect contract is implemented and measured. Epistemic grades (`E0`–`E2`) are separate from effect grades (`S0`–`S3`).

## Companion surfaces (refined catalog)

See `index.spw` for the authoritative list. Short map:

| Surface | Role |
|---------|------|
| `index.spw` | Catalog, grades, P0–P3 priority |
| `spw-garden-geometry.spw` | Distilled doctrine |
| `editor-surface-physics.spw` | Prose, brace format, select, cache, plugin |
| `path-reference-enhancement.spw` | Ref forest, resolve packet, reverse index |
| `register-token-config.spw` | Registers, tokens/colors, config menus/files |
| `substrate-organelle-physics.spw` | Substrates, beats, liminal memory, blocks, portals |
| `phd-domain-topography.spw` | Discipline map + reference depth |
| `org-static-llm-value.spw` | Static × LLM × org × harness |
| `formula-variant-geometry-utility.spw` | Formulas, variant matrix, workflows |

**Working-tree refine note:** this package is the coherent home for garden/editor doctrine produced alongside `operational-topography` and the VS Code/LSP ladder plans. Prefer E/S grades in new text; treat older G-grade stream lines as historical.

## Ladder position

Sits **across** the editor ladder rather than replacing a single rung:

| Prior | Contribution |
|-------|----------------|
| `operational-topography` | Neutral coordinates, observation/effect grades, spacing, orientation, hydration, and evidence packets |
| `vscode-editor-contract` | Authority: which server-owned facts a client may render |
| `lsp-custom-request-completions` | Earned instruments (`spw/gardenStats`, hover modes) — no phantoms |
| `vscode-plugin-performance` | Timing/cache operations must be cheap and visibility-aware |
| braid/delta index work | True deltas and signatures feed non-redundant popovers |
| `vscode-cognitive-surface` | Copy, disclosure, optional profile, and noise budget for wonder |
| `neovim-spw-surfaces` | Same LSP instruments; native UI only when earned |
| `typescript-perf-audit-infra` | Pattern sibling for *compiler* timing; garden ops measure *Spw* mechanics |

## The popover problem (diagnosed)

Current annotation hover tends to emit:

- kind restatement (`*lens*`) when the sigil is already on the line  
- full ambient/frame path already visible in strip or structure  
- co-occurrence lists that often restate same-file neighbors  
- file lists without ranking by *surprise* (novelty, distance, layer shift)

**Doctrine: anti-echo.** If the reader can obtain the fact by reading the visible line or open structure without scrolling, the popover must not lead with it. Prefer:

| Prefer in popover | Suppress when apparent |
|-------------------|------------------------|
| Off-file support / foreign frames | Local kind name |
| True **Δ** from parent ambient | Full ambient dump |
| Cache tier / beat age / scan cost | “occurrence count” alone |
| Projection lineage & staleness | Restating the frame name |
| Combinatorial rank (signature rarity) | Top co-occur of ubiquitous tags |
| Symmetry / pairing completeness | Listing both atoms already on the line |
| “Garden bed” layer distribution | Duplicate strip text |

## Hover and delta enhancements

### Delta model (index contract)

Today `deltaBraids` is a copy of `localBraids`. Replace with a real novelty model:

```text
DocumentLineContext (enhanced)
  ambient: BraidAtom[]           # inherited from open scopes (ordered)
  local: BraidAtom[]             # declared on this line
  deltaEnter: BraidAtom[]        # local ∖ parentAmbient   (entered novelty)
  deltaExit: BraidAtom[]         # atoms dropped when scope pops (optional, line of close)
  parentSignature: string
  localSignature: string
  # keep ambientBraids/localBraids/deltaBraids as compat aliases during migration
  # deltaBraids := deltaEnter
```

**Atom identity:** normalize by full sigil+name (`#:layer` ≠ `#layer`). Multiset: first occurrence counts for set-diff unless profile asks multiset mode.

**Frame enter lines:** `enteredFrame` + `deltaEnter` are the primary teaching signal.  
**Interior lines with empty local:** hover should not invent delta; show signature rarity / brace metrics / support instead.  
**Close-brace lines:** optional `deltaExit` (“leaving field X”) when `hover.prefer` includes `deltaExit`.

### Hover builder pipeline

```text
facts = gather(context, index, mechanics, grade)
facts = antiEcho(facts, visibleLine, activeInlays, profile)
facts = rank(facts, profile.prefer)
card  = layout(facts, profile.maxLines)
```

Section order default when `whenLocalBlock`:

1. title + rarity  
2. **Δ enter** (E0/E1)  
3. mechanics (if `whenInlays` or profile)  
4. off-screen support / garden bed  
5. actions (handles + **pulse** / **lens-apply** stubs)

### Configurable hover knobs (additive)

| Knob | Values | Role |
|------|--------|------|
| `hover.deltaMode` | `enter` \| `enter+exit` \| `off` | which deltas appear |
| `hover.deltaMinAtoms` | int (default 1) | suppress trivial single-topic noise if desired |
| `hover.atomFormat` | `sigil+name` \| `name` \| `kind-badge` | display density |
| `hover.pulse` | profile id or `off` | attach a named pulse to hover refresh (below) |
| `hover.lens` | lens query id or `off` | “apply this lens preview” action on card |

File/bed profiles may set these via `#:hover #!profile` frames.

### Geometric constraints (popover layout)

Think of the hover card as a **small viewport with a budget**, not a dump:

```text
┌─ title (1 line): atom + rarity rank ─────────────┐
│ Δ / novelty (only if non-empty)                  │  height budget ~4–6 lines default
│ mechanics: cache · timing · projection           │  secondary, collapsible
│ geometry: support · symmetry · bed               │  off-screen facts only
│ actions: 1–2 learnable ops (not a third essay)   │
└──────────────────────────────────────────────────┘
```

Constraints (configurable):

| Handle | Default | Effect |
|--------|---------|--------|
| `hover.maxLines` | 6 | Hard clip; overflow → “open garden card” op |
| `hover.echoPolicy` | `suppress-visible` | Drop facts present in visible line / active inlays |
| `hover.prefer` | `delta,support,mechanics` | Ordered sections |
| `hover.defer` | `ambient,cooccur-filewide` | Only if user expands or file opts in |
| `hover.whenInlays` | `mechanics-only` | If line hints show structure, hover shifts to cache/timing/projection |
| `hover.whenLocalBlock` | `delta-first` | Inside frame: novelty over ambient |
| `file.hoverProfile` | via `#:hover` or garden bed | Per-file / per-directory profile |

### File-level / garden-bed configurability

Profiles live as Spw, not only JSON settings — so the garden teaches its own UI:

```spw
#:hover #!profile
^["garden.hover.author"]{
  maxLines: 5
  prefer: [delta, support, projection]
  suppress: [ambient, kind-label]
  whenInlays: mechanics-only
}
```

Resolution order: caret file profile → parent bed (directory / root manifest) → workspace default → editor settings override.

VS Code: `spw.hover.*` settings mirror profiles.  
Neovim: `vim.g.spw_hover` / buffer-local from same LSP `initializationOptions` + file profile request.

## Measuring the garden (`.spw` tree features)

Instruments should answer *development of the repository*, not only cursor trivia.

### Tree-level features

| Feature | Metaphor | Measure sketch |
|---------|----------|----------------|
| **Bed coverage** | plot map | roots with content vs declared memory locations |
| **Canopy depth** | growth habit | median / p95 `framePath` depth |
| **Species mix** | biodiversity | kind entropy of annotations; dialect Spw.b/l/m/x mix |
| **Symmetry** | bilateral form | lens↔intent pairing rate; mirrored frame names |
| **Grain** | manufacturing finish | operator distribution; brace density; prose vs ONF ratio |
| **Graft points** | extension joints | path-refs out of bed; projection edges; mount surfaces |
| **Weather** | climate | workspace temperature tiers; hot write bands |
| **Phenology** | seasonality | edit cadence / contentHash churn if available |
| **Personality** | voice | dominant spirit phase per bed; monotony score |

### File-level features

| Feature | Use |
|---------|-----|
| local signature rarity | “this braid is unique in the garden” |
| pairing completeness | taste handle for intentional `#:` / `#!` craft |
| projection staleness | manufacturing: mold vs cast |
| parse/index cost (ms) | performance personality |
| wonder density | learnability / teaching surface |

Expose as:

- `spw/gardenStats` (workspace or root)  
- `spw/fileFeatures` (uri)  
- optional CLI: `spw garden status` later  

Not as five more sidebar dumps — as **ops and popover sections**.

## Learnable handles (combinatorics & metaphysical geometry)

“Handles” = named operations a human can practice until they become taste.

| Handle | Question it trains | Op sketch |
|--------|-------------------|-----------|
| **Δ-read** | What did this block *add*? | Show true `deltaEnter` only |
| **support-read** | Who else carries this signature? | Ranked foreign frames |
| **pair-read** | Is the braid complete? | Lens/intent / symmetry check |
| **brace-read** | Is the lattice balanced/rhythmic? | balance, depth, span, plateau |
| **cache-read** | What is warm vs recomputed? | Tier + beatAge + last scan ms |
| **cast-read** | Is the body still true to the mold? | Projection lineage + stale |
| **grain-read** | What is the file’s texture? | Operator / kind entropy |
| **bed-read** | Where am I in the garden? | Root + layer + canopy depth |
| **wonder-read** | What is teachable here? | Nearest wonder / probe attachment |
| **extend-read** | Where can culture grow? | Low-support signatures, open grafts |
| **pulse-run** | Advance a scoped beat sequence | Named pulse profile |
| **lens-preview** | Where does this structure match? | Nested query, no payload |
| **lens-tick** | Apply next batch of effects | Incremental payload apply |

Same ops in:

- VS Code: command palette `Spw: Δ-read`, code lens, hover action links  
- Neovim: `:SpwDelta`, `:SpwGrain`, `vim.lsp.buf` + custom request wrappers  
- Both: driven by **LSP** so culture is portable  

## Operations that describe internal mechanics

Mechanics must be **true** (from index/runtime), not decorative:

| Mechanic | Source | Surface |
|----------|--------|---------|
| Index age / tier | `DocumentState.lastAccessBeat`, `tier` | hover mechanics; garden weather |
| Analyze cost | timed `analyzeFromTokens` / openDocument | optional inlay or hover when `hover.whenInlays=mechanics-only` |
| Scan complete | server log + optional progress | readiness, not popover spam |
| Projection cache | projection entries + status | cast-read |
| Trial / register snapshot | earned `spw/registerSnapshot` | register explorer, not hover dump |
| Compiler timing | separate `audit:ts:perf` | do not mix into Spw garden UI |

**Cached projection** language: mold (spec/frame) vs cast (gen body) vs cold store (archive). Stale cast is a manufacturing defect, not a graph curiosity.

## Metaphor map (bind to axes)

| Metaphor | Axis | Must measure or refuse the word |
|----------|------|----------------------------------|
| Physical manufacturing | mold / cast / grain / graft | projection + signature + entropy |
| Digital vs analog | discrete sigil lattice vs continuous field (ambient) | ambient vs local vs Δ |
| Symmetry | pairing, mirrored frames | pairingRate, name mirrors |
| Higher-order operation | ops on ops (garden stats, probes on probes) | named handles only |
| Learnability | wonder density, progressive disclosure | maxLines, expand |
| Recognizable patterns | signatures, dialects | signature index |
| Extension opportunity | low support + high novelty grafts | extend-read |
| Personality | phase voice, monotony | phase + entropy |
| Performance | timing, cache, scan | mechanics section |

If a metaphor cannot attach to a measure or an op, it stays in research notes — not in the hover path.

## Spw for cultures of emergent texture

Garden practice:

1. **Beds** — roots / subroots as plots with hover profiles and personality targets.  
2. **Pruning** — anti-echo rules and monotony scores as taste feedback.  
3. **Grafting** — path-refs and projections as intentional joins.  
4. **Phenology** — re-measure garden stats after episodes of work.  
5. **Seed exchange** — portable profiles and handles via `.spw` not editor-only state.  
6. **Wonder** — `#>wonder_*` as teaching fruit; hover prefers *how to explore*, not *what you typed*.

Agents and humans share the same instruments: plan ecology already uses episodes; garden stats make texture discussable in review (“this bed went mono-intent”).

## Configurable pulse and loop mechanics

Spw already has process language for this: hot-reload **beats**, loop observation **micro/meso/macro**, ServerIndex **hot/warm/cold** tiers, `spw:dev` beat logs. Editors should expose **named pulses** (cadence + scope + effect grade) rather than ad-hoc timers.

### Vocabulary

| Term | Meaning |
|------|---------|
| **Beat** | smallest state advance (one measured transition) — from `loop-observation.spw` |
| **Pulse** | configured sequence of beats on a **scope** (file, category, bed, workspace) |
| **Loop** | recurring pulse until stop condition (idle, error budget, N iterations, manual) |
| **Category script** | pulse bound by **kind** of path/annotation (e.g. all `#:layer`, all `process/*`) |
| **Specific script** | pulse bound to one uri or one named frame |

### Pulse profile (Spw-shaped)

```spw
#:pulse #!profile
^["garden.pulse.author"]{
  scope: { kind: "category", match: { root: "process", ext: ".spw" } }
  // or: { kind: "specific", uri: ~"./hot.spw" }
  // or: { kind: "lens", lens: ~"./lenses/layer-intent.spw" }

  beats: [
    { id: detect,  effect: watch }
    { id: parse,   effect: reindex }
    { id: measure, effect: gardenStats }
    { id: hint,    effect: impactHints }
    { id: noodle,  effect: wonderRefresh }
  ]

  cadence: { mode: "on-save", debounceMs: 120, maxConcurrent: 1 }
  // mode also: interval | on-idle | manual

  budget: { maxFilesPerBeat: 32, maxMsPerBeat: 50, stopOn: ["error_budget", "user_cancel"] }
  grade: "E0"   // auto-run only up to this grade; E2 requires explicit run
}
```

Align with hot-reload loop beats (detect → canonicalize → parse → impact hints) but make them **selectable and scoped**.

### Editor binding

| Surface | Behavior |
|---------|----------|
| VS Code | `spw.pulse.*` settings; status “pulse: author · beat 2/4”; `Spw: Run pulse` / `Stop` |
| Neovim | `:SpwPulse {name}` / `:SpwPulseStop` |
| Hover | if `hover.pulse` set, last beat snippet (parse_ok, Δ summary) — not full dump |
| LSP | `spw/pulseRun` { profile }; progress notifications |

**Invariant:** pulses never rewrite unrelated files; effects stay scoped to the match set.

### Categorical vs specific scopes

| Scope kind | Match | Use |
|------------|-------|-----|
| `specific` | one uri / frame | deep authoring on a single artifact |
| `category` | root, glob, annotation kind, dialect, layer | bed weather, process/* health |
| `lens` | result of a lens query (below) | effect only where the lens hits |
| `workspace` | all indexed `.spw` | rare; always budgeted |

## Lenses and nested structures as queries (incremental effects)

Lenses in Spw culture (`// lens: …`, optical fields in loop-observation) are **perspectives**. Elevate them to **executable queries** that may carry a **payload** (effect) applied **incrementally** across the codebase.

### Query = structure (+ optional payload)

Reuse seed `SpwPattern` (sigil, brace, modifier, value, depth/depthRange) plus nested combinators:

```text
LensQuery
  match: SpwPattern | { and|or|not|descend|sequence, ... }
  // nested structures as queries:
  //   ^["frame"]{ #:lens #!intent }  → frame with local braid
  //   depthRange [1,3] + sigil '#'   → annotation band

  payload?: Effect
    kind: measure | reindex | diagnose | format | annotate-suggest
          | projection-check | pulse-attach | noop
    args?: { ... }      // empty = query-only
    grade: E0 | E1 | E2

  apply: {
    mode: preview | incremental | batch
    batchSize: 8
    order: "hot-first" | "path" | "rarity"
    dryRun: true        // default true for non-E0
  }
```

**Without payload:** lens is a **read** — hit list, support map, hover “matches N”, atlas filter.  
**With payload:** lens is a **measure/write plan** — still incremental; each tick processes `batchSize` hits.

### Nested structure as query source

1. **Inline pattern** — seed selector / CLI `spw ls` style.  
2. **Frame template** — a small `.spw` snippet whose shape is the query (isomorphic subtrees).  
3. **Named lens file** — `~".spw/lenses/….spw"` referenced from pulse or hover profile.

### Incremental apply protocol

```text
1. compile LensQuery → plan (hit estimate, grade)
2. preview: top-K hits + sample (no mutation)
3. tick: next batchSize hits
     E0: apply (reindex, diagnose)
     E1: measure / soft suggest with confirm
     E2: never auto-mutate; noodle card only
4. report: { done, remaining, errors, metricsDelta }
5. stop: budget, cancel, or complete
```

LSP: `spw/lensPreview`, `spw/lensApplyTick`, `spw/lensCancel`.  
VS Code: progress + “Apply next 8”. Neovim: `:SpwLensPreview` / `:SpwLensTick`.

### Safety

- Default **dryRun** for edits.  
- Workspace-wide E0 format requires explicit profile flag.  
- Mutating effects → **workspace edit preview** before apply.  
- Align with vscode-spw quality bar: reversible, inspectable, quieter than blind churn.  
- E2 cannot ride a E0 pulse auto-beat.

### Utility link

Lens hits feed **support-read** and **extend-read**. Hover action “preview lens at caret” uses local nested structure as template; payload optional.

## Brace symmetry

Braces are the **primary structural lattice** of Spw (brace-first language). Symmetry here is not only math-group beauty; it is **matchability, rhythm, and manufacturable shape**.

### Layers of brace symmetry (objective → taste)

| Layer | Kind | Definition | Existing foothold |
|-------|------|------------|-------------------|
| **Balance** | objective | every `{` has a matching `}` outside strings/comments; stack empty at EOF | `spw-physics` diagnostics in `analysis.ts` |
| **Depth budget** | objective+policy | max nesting ≤ N (currently warn at ≥5) | same diagnostics |
| **Nesting rhythm** | semi-verifiable | depth profile over lines (open/close cadence, plateau length) | inlay depth labels; `$%[brace.nesting_rhythm]` in wonder blocks |
| **Span symmetry** | objective | for each matched pair, compare left/right **span weight** (lines, tokens, annotations) | partial: valence composition scan after frames |
| **Side mirror** | semi-verifiable | left-of-brace intent vs right-of-brace body (seed/effect, mold/cast) | symmetry apps (`ops.brace.sides`); not yet a first-class index field |
| **Frame bilateralism** | taste + measure | sibling frames with mirrored names/ops under a parent | garden `symmetry` feature |
| **Operator brace co-rhythm** | semi-verifiable | operator density vs brace events along the line stream | `spw ls --probe` / brace streams in CLI |

**Handle:** `brace-read` (or fold into **pair-read** for sigils and **grain-read** for rhythm).

Popover utility when brace-aware:

- Never restate “this is a `{`” — the glyph is visible.  
- Prefer: **unmatched risk nearby**, **depth vs budget**, **span imbalance** (left heavy / right heavy), **plateau** (long monodepth body), **mirror score** if side annotations exist.  
- When inlays already show `│frame` depth, hover shifts to **span symmetry + mechanics**, not depth again.

### Brace symmetry metrics (v1 catalog)

```text
brace.balance          ∈ {ok, unclosed, extra_close}     # objective
brace.maxDepth         number                            # objective
brace.depthBudgetHit   boolean                           # objective vs policy
brace.openCloseSkew    (opens-closes) over window        # objective
brace.spanImbalance    |leftWeight-rightWeight|/max      # objective once pair table exists
brace.plateauMax       longest run at constant depth     # objective
brace.nestingEntropy   entropy of depth histogram        # objective
brace.sideMirror       optional score 0..1               # semi-verifiable (needs side labels)
```

Index enhancement: produce a **matched-pair table** during analyze (or reuse physics walk) so span metrics are O(n), not repeated regex.

## Measurement utility

A measurement is only worth surfacing if it changes a **decision**: prune, graft, rename, extract frame, refresh cast, or re-open wonder.

### Utility tests (before promoting a metric to hover/op)

1. **Actionability** — can a human act differently in ≤30s because of it?  
2. **Non-echo** — is it not already on the visible line?  
3. **Stability** — does it not flicker on every keystroke without semantic change?  
4. **Cost** — is it cheaper than the insight (cache, O(n) file, not full garden scan on cursor)?  
5. **Epistemic class** — is its subjective/objective label honest?

### Utility ranking (default promotion)

| Rank | Examples | Surface |
|------|----------|---------|
| **P0 always-on instruments** | brace balance, true Δ, projection stale, cache tier | diagnostics, mechanics, delta-first hover |
| **P1 learnable handles** | grain entropy, pairing rate, span imbalance, support | commands / explicit ops |
| **P2 garden phenology** | bed coverage, canopy depth, personality | `gardenStats`, periodic |
| **P3 noodle / wonder** | read-aloud pauses, “absent concept”, aesthetic grain | `!probe` text, never blocking CI |

Demote metrics that fail utility tests to P3 or drop.

## Noodling vs semi-verifiable probes

The garden already has a rich **probe culture** (`!probe{ ... }` in wonders, `$%[…]` measurement points, CLI `spw ls --probe`). Distinguish three probe grades so editors and tests do not lie about certainty.

### Probe grades

| Grade | Name | Verifiability | Examples | Editor treatment |
|-------|------|---------------|----------|------------------|
| **E0** | **Objective probe** | deterministic observation from a named code path and declared parse state | complete structured parse, parser-owned pair identity, file existence, signature set equality | diagnostics, CI, tests |
| **E1** | **Semi-verifiable probe** | measurable with declared method; interpretation open | nesting rhythm score, pairing rate, span imbalance, co-occur rank, analyze_ms, support count | hover/ops with **method footnote**; optional soft thresholds |
| **E2** | **Noodle / subjective probe** | human or agent judgment; no single oracle | “read aloud 30s — where pause?”, “what concept is absent?”, metabolic feel | wonder UI, command palette “run noodle”, **never** fail ship gate |

**Noodling** is deliberate: low-cost exploration that trains taste without claiming truth. It should be:

- **cheap to invoke** (one command / one code lens on wonder blocks)  
- **logged optionally** as episode notes, not as failing tests  
- **labeled** so agents do not treat E2 answers as E0 facts  

**Semi-verifiable** probes are the bridge: numbers you can recompute, stories you can still argue about (“is 0.4 span imbalance too much?”).

### Projections: subjective vs objective

| Projection class | Meaning | Example |
|------------------|---------|---------|
| **Objective projection** | deterministic map with declared input, revision, method, and verification | parser-owned source spans; a future verified formatter plan |
| **Cached projection** | objective result + **freshness** | gen file vs mold hash; tiered register cells |
| **Subjective projection** | human/agent framing layered on measures | “this bed feels mono-intent”; personality label from entropy thresholds **you chose** |
| **Semi-verifiable projection** | score + published formula | `personality = argmax(phase) if entropy < τ` with τ in profile |

Rule: **subjective projections must cite their objective substrate** or declare pure noodle. Popovers may show:

```text
personality: intent-heavy  (entropy 0.21 · threshold 0.3 · profile garden.default)
```

not:

```text
personality: intense
```

## Light testing infrastructure

Goal: verify **instruments and grades**, not boil the ocean of garden taste.

### Principles

1. **E0 in CI** — complete structured parsing, parser-owned pair identity, anti-echo invariants where decidable, request schema, and true-delta fixtures.  
2. **E1 as golden numbers** — fixed corpus snippets → expected metric ranges (not exact floats if noisy).  
3. **E2 never gates** — optional snapshot of probe *text* presence, not answers.  
4. **Same fixtures for LSP + CLI** where possible (brace stream, probe patterns).  
5. **Light** — small corpus under `packages/spw-lsp/src/__tests__/fixtures/garden/` (or `src/testing/garden/`); no full monorepo scan in unit tests.

### Layers (reuse existing runners)

| Layer | Command | Covers |
|-------|---------|--------|
| Unit | `npm run test:lsp` | balance, delta, span table, anti-echo section builder, metric formulas |
| Probe smoke | thin vitest or `spw ls --probe` on fixture files | E1 probe patterns parse + hit counts |
| Ship | `fuzz:ship` | types + full tests — **no E2** |
| Explore | manual / agent noodle session | E2; write notes to plan stream or episode |

### Suggested test modules (when implementing)

```text
[NEW] packages/spw-lsp/src/__tests__/brace-symmetry.test.ts
[NEW] packages/spw-lsp/src/__tests__/garden-metrics.test.ts
[NEW] packages/spw-lsp/src/__tests__/hover-anti-echo.test.ts
[NEW] packages/spw-lsp/src/__tests__/fixtures/garden/*.spw
[MOD] packages/spw-lsp/src/__tests__/analysis.test.ts   # retain deterministic balance checks; move profile thresholds to E1
```

### Invariant examples (E0)

- Balanced fixture → no `spw-physics` brace errors.  
- Nested fixture → `delta` at inner line equals local atoms not in parent ambient.  
- Hover builder with `echoPolicy=suppress-visible` → markdown does not contain kind label when sigil on line (fixture-driven).  
- Grade tags: metrics API returns `grade: 'objective' | 'semi' | 'subjective'` on each row.

### Soft checks (E1)

- Span imbalance on a known left-heavy fixture ≥ 0.3.  
- Pairing rate on lens+intent line = 1.0.  
- Nesting entropy differs between flat and deep fixtures.

### Explicit non-tests (E2)

- Do not assert on wonder prose quality.  
- Do not fail CI because “absent concept” probe was unanswered.

## Domain profiles: structural knowledge, longitudinal development, complex UI, applied math

Make instruments **domain-shaped** without forking the language. Each profile is a **probe library + saved lens + dimension pack + handle curriculum** over the same neutral contract.

These profiles are optional projections. They cannot rename core fields, redefine evidence, or acquire effects merely by changing vocabulary.

### Shared abstraction (all domains)

| Spw primitive | Knowledge role |
|---------------|----------------|
| Operator / brace sequence | **combinator** (generator of structure) |
| Annotation braid / signature | **local signature** (addressable structural trait) |
| Frame path + nested body | **site** (revision-addressed region) |
| Lens query (+ optional payload) | **selection** or **edit preview** |
| Pulse (scoped beats) | **probe protocol** / experiment loop |
| Projection mold→cast | **materialized projection** |
| ONF / normalize | **canonical form** for equality & rewrite |
| Topographic summary | **corpus measurements** |
| E0/E1/E2 grades | **epistemic class** |
| S0/S1/S2/S3 grades | **effect and authorization class** |

**Structural knowledge profile** = addressable structures + exact-first ranked selections + graded measures + optional previewed edits.  
**Longitudinal development profile** = revisions + append-only observations + explicit choices + materialized projections + versioned local dialects.

### Mode A — Combinatoric knowledgebase

**Goal:** query *shapes*, not only strings; compare forms; publish reusable recipes.

| Need | Instrument |
|------|------------|
| Enumerate by operator/brace lattice | `spw ls --seq/--braces/--model lattice` + lensPreview |
| Stable identity under rewrite | ONF / Spw.m hash; surface hash for episodes |
| Pairwise / n-wise co-structure | frame-scoped co-occur + signature support (not file-wide only) |
| Recipe library | named lenses under `.spw/lenses/` + operator-lattice query-recipes |
| Incremental bulk assays | pulse on **category** or **lens** scope; batchSize ticks |
| Equality without text identity | normalize then compare signatures |

**Hover utility in CKB mode:** rarity of this **combinator signature** in the corpus; top structurally similar regions; not ambient dump.

**Curriculum handles:** lens-preview → support-read → grain-read → extend-read (where the lattice is sparse).

Footholds: `spw-operator-lattice` skill, seed `SpwPattern`, `curiosity-brace.spw`, symmetry applications registry.

### Mode B — Longitudinal craft

**Goal:** develop a local universe through observable episodes, explicit choices, and reversible pattern changes rather than only appending files.

| Development concern | Spw practice |
|---------------------|--------------|
| Addressable material | named frame, signature, source span, or seed |
| Variant | competing braids or forms under one declared consideration |
| Region | root or subroot such as process, applications, or patterns |
| Materialization | projection, UI, runtime cast, or emitted artifact |
| Evidence | E0 observations + E1 metrics + task outcomes + explicit E2 reports |
| Pattern change | differential preview, one bounded tick, episode observation |
| Choice | exact-first selection plus declared human or repository authority |
| Local idiom | versioned profile or dialect with examples and counterexamples |
| Transfer | path reference, mount, recipe, or profile exchange |
| Development history | append-only observations across revisions and episodes |

**Development pulses (examples):**

- `craft.assay.health` — E0 complete parse + well-nested pair checks on a category  
- `craft.projection.check` — stale materialization observations on frames with declared targets  
- `craft.find.sparse` — E1 exact-first support scan with counterexamples  
- `craft.pattern.preview` — differential plan with dry run and source-map evidence  

**Hover in longitudinal mode:** revision delta + materialization status + exact and near support, each with evidence grade and source span. A biological vocabulary may translate this profile locally, but it is not the shared model.

### Mode C — Complex UI

**Goal:** UI as **projection of structure**, not a second ontology (literate-ui already maps spirit sequence → gestures).

| UI problem | Spw/garden move |
|------------|-----------------|
| Too many panels | anti-echo + visibility budget; one surface per fact class |
| State explosion | registers as fiber; phase as mode; materialization breadcrumb |
| Cross-cutting concerns | categorical pulses on `patterns/literate-ui` + component beds |
| Design system combinatorics | operator/container lattice of components; optional symmetry views for layout pairs |
| Incremental redesign | lens = “frames with `#:ui` missing pair”; tick = suggest not force |
| Learnability | handles as studio tools (Δ-read on layout frames, pair-read on lens/intent) |

Treat **component trees** as versioned projection systems: region = design domain; signature = interaction motif; cast = rendered/build artifact; stale cast = design drift.

Footholds: `.spw/patterns/literate-ui.spw`, `symmetry-ui-design.spw`, vscode quality bar (useful affordance, quiet feedback).

### Mode D — Applied mathematics

**Goal:** bind math objects to **addressable Spw structure** and **graded measures**, using radar fields already in the repo.

| Math object | Spw encoding sketch | Measure / op |
|-------------|---------------------|--------------|
| Generators / relations | operators + brace laws | brace-read, ONF rewrite |
| Lattice meet/join | facet / confluence (`&`) | support-read, co-structure |
| Fiber bundle | sigil base × register fiber | cache-read, phase |
| Rewrite system | AST/ONF transforms | lens payload reindex/normalize |
| Group actions (e.g. D4) | symmetry apps + brace sides | pair-read, span symmetry |
| Entropy / information | signature histograms | grain-read, garden species mix |
| Homotopy / noncommute | `!(~x)` vs `~(!x)` paths | probe sequences, lattice model |
| Optimization / search | probe loops + ranking | pulse + declared objective and constraints |

**Math pulses:** assay normalize cost; compare SeNF termination risk (E1/E2 honesty); population entropy of operator mixes in a theory bed.

**Never** claim a theorem in hover; E0 = checkable equalities/parse; E1 = scores; E2 = wonder about interpretation.

Footholds: `spw-math-algorithm-radar`, `docs/theory/spw/onf.spw`, register-geometry, symmetry applications.

### Cross-domain playbook (how to make it *more useful*)

1. **Publish combinators as lenses** — every important motif becomes a named query (with/without payload).  
2. **Run development pulses deliberately** — category health, sparse patterns, stale projections.  
3. **Keep UI and math in beds** — separate profiles (hover/pulse/lens libraries) so noise budgets differ.  
4. **Prefer population metrics over single-file essays** — rarity, support, entropy, span.  
5. **Incremental only** — complex UI/math repos are large; batchSize + dryRun + grade caps.  
6. **Curriculum of handles** — same 8–12 ops across VS Code/Neovim; domain packs add recipes, not new chrome.  
7. **Light tests** — E0 equality/brace/delta; E1 metric ranges on motif fixtures; E2 never gates.  
8. **Link skills** — operator-lattice for query recipes; math radar for technique choice; garden geometry for editor instruments.

### Example: one motif, four modes

Motif: `#:layer #!intent` braid inside `^["…"]{…}`.

| Mode | Lens / pulse | Useful output |
|------|--------------|---------------|
| CKB | match pairing completeness | regions with incomplete variants |
| Longitudinal | frequency and history of complete pairs | evidence for a possible idiom upgrade |
| UI | frames tagged ui missing pair | incremental design system fix list |
| Math | treat as typed edge layer→intent | lattice edge census |

## Lyrical · compositional · semantic development (LSP)

Three **development axes** for what the LSP should teach—orthogonal to domain packs, stacked with pulse/lens/grade doctrine.

| Axis | Question | LSP should surface | Anti-echo (do not restate) |
|------|----------|--------------------|---------------------------|
| **Lyrical** | How does this *read* as a path? | Motif rhythm, operator melody, wonder pauses, spirit-sequence “sentences” | Kind labels already on the line |
| **Compositional** | How is this *assembled*? | Brace lattice, frame nesting, query composition, ONF skeleton, part–whole walks | Flat file lists without structure |
| **Semantic** | What does this *mean / bind*? | Annotation identity, mold→cast projection, register/phase, layer (grammar\|semantics\|pragmatics) | Ambient braid dump already in strip |

**Principle:** every major navigation affordance answers **≥1 axis** and emits a **trace** (not only a jump).

### Footholds vs gaps

| Substrate | Today | Gap for L/C/S |
|-----------|-------|----------------|
| Path refs / `@root` | definition, links, selectorHits | multi-hop **walk** + trace artifact |
| References / rename | name-based | shape-level composition; path quality (lyric) |
| Projections | gen/index, stale checks | derivative chain walk in editor |
| Pipeline **Precipitate** | runtime stage deltas | not scheduled as LSP walk byproduct |
| Probes / `!probe` / `$%[]` | culture + CLI | pulse beats with grades |
| `SpwPattern` / expressions | seed query | expression → walk plan |
| Spirit sequence | literate-ui / completion plans | first-class **walk policy** |

### Reference trees as walk substrate

```text
EdgeKind
  path_ref | annotation_ref | projection | import_graft
  braid_pair | query_hit | onf_derive | stage_derive
```

**Walk policies:** `melody` (lyrical), `assembly` (compositional), `meaning` (semantic), `novelty` (rare variants / new edge combinations), `byproduct` (follow precipitates of prior beats).

LSP (earned): `spw/refTree`, `spw/walkPreview`, `spw/walkTick` (pulse-compatible).

### Probes & expressions as pulse/loop fuel

| Input | Compiles to | Beat effect |
|-------|-------------|-------------|
| `!probe{…}` (subjective) | noodle beat | card/log; never mutate |
| `$%[a,b]` | measure beat | sample metrics → trace row |
| op/brace probe expr | sequence hit | frontier = matching stream |
| `SpwPattern` / nested lens | query plan | hit set = walk frontier |
| Spirit path `?~@&*^` | policy `melody` | constrain edge order |
| ONF / stage name | policy `meaning` + stage_derive | precipitate chain |

**Loop** = pulse until stop: expand frontier → measure → **precipitate** trace step → optional dryRun effect.

### Patterned traces, novel walks, derivatives, byproducts

```text
TraceRecord
  seed, policy, grade, steps[]
  patternSignature   // edge-kind + op melody hash
  noveltyScore       // unseen in garden population
  byproducts[]       // derivative | side_channel | stale_cast | wonder
```

| Product | Meaning |
|---------|---------|
| **Patterned trace** | repeated signature → reusable walk recipe |
| **Novel walk** | high novelty path (new combination / rare variant) |
| **Derivative** | ONF child, gen cast, stage precipitate |
| **Byproduct** | diagnostic, impact hint, co-hit, stale neighbor from a beat |

Align with runtime `Precipitate { input, output, delta }`: each beat drops a precipitate into the trace. Store lightly under harness runs / mem dump; hover: resume walk / compare traces.

### Axis priorities

- **Lyrical:** spirit-path score; melody fragment on hover; reuse semantic-token alphabet  
- **Compositional:** brace/frame as walk backbone; query-composition lens library; assembly outline  
- **Semantic:** projection lineage default; layer census along path; surface vs ONF compare  

Walks never rewrite by default; pattern changes require a graded differential payload and preview.

## Naming and compositional comparison

PhD work lives or dies on **names that travel** and **structures you can compare**. The LSP should make both first-class, not afterthoughts of hover text.

### Naming layers (stable coordinates)

| Layer | What is named | Comparison key | LSP affordance |
|-------|---------------|----------------|----------------|
| **Surface name** | identifier / `#topic` as typed | string equality | rename, refs (today) |
| **Qualified name** | `framePath › atom` | path + atom | hover title, support-read |
| **Signature** | braid multiset + kind mix | order-insensitive fingerprint | rarity, population stats |
| **Shape name** | ONF / brace–op skeleton | structural hash after normalize | compositional equality |
| **Role name** | `#:lens` / layer / dialect role | role taxonomy | semantic walks |
| **Episode name** | commit/episode identity | git + surface hash | phenology, craft history |
| **Prime name** | modeling register (below) | prime id + local gloss | translation without fork |

**Doctrine:** renaming is not only string replace—it is **coordinate change**. Wonder probes already ask “rename X and count breakage”; productize as `name-impact` handle: E0 refcount + E1 role drift.

**Anti-echo for names:** do not hover “this is called layer” when `#:layer` is visible; show **qualified address**, **signature frequency**, **shape twins**, **profile gloss**.

### Compositional comparison (shapes, not only strings)

Compare two regions A and B along independent axes:

| Axis | E0 / hard | E1 / soft | E2 / interpretive |
|------|-----------|-----------|-------------------|
| **Text** | exact / edit distance | — | “same voice?” |
| **Name** | same qualified name | synonym via role map | — |
| **Signature** | equal atom multiset | Jaccard / rarity delta | — |
| **Shape** | ONF/skeleton hash equal | tree-edit / span profile | “same argument form?” |
| **Assembly** | same frame nesting depth band | brace rhythm distance | — |
| **Lineage** | same projection mold | shared walk prefix | “same tradition?” |
| **Prime gloss** | same prime register tag | — | cross-field metaphor fit |

**Handles:**

- `compare-read` — side-by-side packet: name / signature / shape / assembly deltas  
- `twin-search` — population query for shape or signature twins (CKB core)  
- `name-impact` — rename simulation (breakage count, beds affected)  
- `diff-walk` — two seeds, walk until paths diverge; precipitate **comparison trace**

**LSP sketches:** `spw/compareRegions`, `spw/findTwins`, `spw/nameImpact` (read-only first and only after protocol registration).

UI: never dump two full files; show **diff of coordinates** (what layer of naming/composition changed).

### Why this helps every discipline

Naming is the shared problem of theory-building; compositional comparison is how you spot **isomorphism, analogy, and false friends** across chapters, specimens, proofs, and fieldnotes—without claiming the domains are the same substance.

## Prime modeling registers (physical → alchemical → …)

Spw already primes several “physics of meaning” languages (pipeline as wash/crystallize/refine/react; materials ontology; valence; garden as bed). **Primes** are **optional translation registers**: same structural coordinates, different gloss packs—so a Chemistry PhD and an English PhD can share a garden without collapsing into one metaphor.

### Prime registry (extensible)

| Prime | Modeling stance | Spw bindings (examples) | Good for |
|-------|-----------------|-------------------------|----------|
| **physical** | force, field, scale, conservation | depth budget, span, timing, cache cost | Physics, nanofab, manufacturing |
| **chemical** | reaction, catalyst, precipitate, purity | pipeline stages, valence, normalize as refine | Chemistry, materials process |
| **metaphysical** | category, essence, relation, modality | ONF roles, layer grammar/semantics/pragmatics | Philosophy-adjacent theory, English theory |
| **alchemical** | transform under intention, stages of work | spirit sequence, materialization cycle, episode | Craft method, reflective practice, SW process |
| **biological** | organism, trait, selection, development | beds, variants, expression (cast), phenology | Biology, botany, ecology, SW ecosystems |
| **geological** | stratum, deposit, erosion, time | layers, archive cold tier, episode strata | Anthropology (deep time), materials history |
| **linguistic** | utterance, register, genre, discourse | dialect Spw.b/l/m/x, lyrical melody walks | English, anthropology (discourse) |
| **mathematical** | object, morphism, invariant, proof | shape hash, ONF, lattice queries | Math, computation theory |
| **social** | actor, practice, institution, care | ownership, craft episodes, impact walks | Social work, anthropology |
| **computational** | state, algorithm, complexity, rewrite | pulses, budgets, analyze_ms, parse recovery | Computation, digital fab |
| **material** | grain, defect, phase, microstructure | materials-ontology motifs, brace defects | MSE, manufacturing, nanofab |
| **botanical** | growth, graft, canopy, season | garden beds, graft path-refs, phenology | Botany, ecology, design systems |

**Rules for primes:**

1. **Prime is a gloss, not a second AST.** Structure stays Spw; words swap by profile.  
2. **Every profile assertion needs a coordinate** (signature, shape, measure)—or it is E2 noodle.  
3. **False friends table** per profile pair (e.g. biological “selection” ≠ social “selection” without a shared evaluation function).  
4. **PhD may bind a bed to a prime pack** (`#:prime #!chemical` on a theory bed) without forcing the whole monorepo.  
5. **Alchemical / metaphysical primes are first-class for craft**, never for E0 CI gates.

### Enhancements that make primes *work* in the LSP

| Enhancement | Behavior |
|-------------|----------|
| **Prime-aware hover** | Same anti-echo facts; gloss strings from active prime |
| **Prime compare** | `compare-read` shows structural equality + optional dual gloss |
| **Prime lens packs** | Shared motifs with field-specific wonder probes |
| **Prime walk policy aliases** | `melody`↔“prosody” (linguistic), `assembly`↔“synthesis” (chemical), `meaning`↔“homology” (bio, careful) |
| **Translation probe** | Existing wonder pattern: rewrite frame in target vocabulary; breaks reveal untranslatable structure—schedule as E2 pulse |
| **Materials/MSE pack** | Load `materials-ontology.spw` motifs as lenses (lattice, defect, phase) |
| **False-friend warnings** | E1 when same surface name used under two primes with conflicting gloss |

## PhD concerns by discipline (instrument map)

Design for **dissertation-shaped work**: long horizon, citation density, method honesty, fieldwork/lab/text, committee intelligibility.

| Discipline | Primary anxieties | Spw / LSP instruments that help |
|------------|-------------------|--------------------------------|
| **Biology** | homology vs analogy; reproducibility; developmental time | biological prime; expression/cast; phenology; twin-search on traits; E0/E1 grades on assays |
| **Botany** | growth form; seasonal sampling; graft/chimaera | garden beds; graft edges; canopy depth; phenology pulses |
| **Chemistry** | mechanism steps; purity; reaction conditions | chemical prime; precipitate traces; stage pipeline; valence; lab-notebook episodes |
| **Materials / MSE** | microstructure ↔ property; defects; processing path | material prime; materials-ontology lenses; brace “defects”; manufacturing pulses |
| **Nanofabrication** | process windows; scale; contamination | physical+material primes; budgeted pulses; analyze cost; stale process casts |
| **Manufacturing** | process capability; BOM/lineage; rework | projection mold→cast; name-impact; differential ticks; episode QA |
| **Physics** | units/scale; invariance; model limits | physical prime; shape invariants (ONF); measure grades; no false precision in hover |
| **Math** | definition hygiene; proof structure; isomorphism | shape twins; compositional compare; lattice queries; E0 equality vs E2 interpretation |
| **Computation** | complexity; correctness; rewrite safety | budgets; parse recovery; verified differentials; pulse isolation |
| **English** | close reading; genre; argument structure | linguistic+lyrical axes; melody walks; discourse beds; naming layers |
| **Anthropology** | emic/etic; fieldnotes; multi-scalar time | social+geological primes; translation probes; walk traces as field paths |
| **Social Work** | ethics; case vs system; care practices | social prime; ownership; impact/byproduct walks; E2 care notes never auto-mutate records |
| **All PhDs** | naming drift; “what changed since last chapter?”; committee clarity | name-impact; compare regions; episode history; profile gloss for outsiders |

### Cross-cutting PhD needs → product features

1. **Glossary that is structural** — names + signatures + primes, not a wiki page alone.  
2. **Method section as pulse profile** — reproducible assay list (what you measured, grade, budget).  
3. **Related work as twin-search** — shape/signature neighbors in the garden or mounted corpora.  
4. **Revision archaeology** — episode/phenology, not only git blame.  
5. **Ethical / epistemic labels** — E0/E1/E2 (or project evidence grades) on every observation, assertion, or interpretation in hover/trace.  
6. **Portable committee packet** — export compare + trace + prime gloss without editor lock-in (LSP JSON).  

### What not to do for academic users

- Force one master metaphor (everything is “DNA” or everything is “reaction”).  
- Gate degrees of interpretation as CI failures.  
- Hide uncertainty—PhDs need **honest grades**.  
- Replace domain software (ImageJ, R, lab ELN); Spw **coordinates and compares** theory/structure/process notes.  
- Overclaim isomorphism between fields without shared coordinates.

### Expanded domain topography (`.spw`)

Full discipline catalog with **per-stratum reference depth** (source · structure · relation · time · layout · operation), primes, instruments, and false friends:

**`.agents/plans/spw-garden-geometry/phd-domain-topography.spw`**

Includes Biology, Botany, Chemistry, Materials, Nanofabrication, Manufacturing, Physics, Astronomy, Math, Statistics, Computation, English, Linguistics, Philosophy, Anthropology, Archaeology, History, Social Work, Public Health, Psychology, Neuroscience, Education, Law, Economics, Political Science, Architecture, Design, Musicology, Art History, Theology/Religious Studies, Library & Information Science—plus shared instruments and forbidden collapses. Aligns reference depth with `docs/theory/spw/operational-topography.spw` strata.

### Editor surface physics (`.spw`)

**`.agents/plans/spw-garden-geometry/editor-surface-physics.spw`**

Contracts for:

- **prose kinds** — AST / editorial / structural / domain / measurement (format + select + cache rules each)
- **brace format physics** — why string-safe indent exists; LSP vs seed defaults; profiles; coupling to diagnostics
- **selectability** — exact units (span, token, path_ref, annotation, frame, brace pair, …) and edit gates
- **caches** — hot/warm/cold document tiers, path heuristics, editing categories, trial/sidecar rules
- **plugin behavior** — thin client, activation, protocol honesty, formatOnSave, strip/selection interaction

SEORM note: braces/format/select/cache are material handling of source-as-matter; prose kinds are material phases (fluid narrative vs crystalline lattice).

### Substrate · organelle · beat · block (`.spw`)

**`.agents/plans/spw-garden-geometry/substrate-organelle-physics.spw`**

- **Theoretical substrates** — instantiate pipeline, event log, index memory, trial, prime, walk-trace, external SOR  
- **Precipitation tuning** — knobs (stage/hash/grade/budget/liminality/immutable/phase/format/prime/walk) × when matrix  
- **Liminal projection** — local|liminal|visible|global as memory surfaces for beat lifecycle + S0–S3 mutability  
- **Transform handles** — readability vs combination, graded  
- **Optional ecological block profile** — membrane/lumen/organelles/ports/substrate/metadata labels; in-place config, workspace pulses, audits  
- **Operators as portals or suborganelles** — navigation openers vs localized reactors  

### Org · static analysis · LLM · harness (`.spw`)

**`.agents/plans/spw-garden-geometry/org-static-llm-value.spw`**

Value model for enhancing tooling so:

- **static analysis** and **LLMs** share graded geometry packets (transect, compare, twins, walk, audit, S2 edit plans)
- **Spw builds organizations** (beds, SOP pulses, episodes, audits, mount boundaries)
- **workbench is the reference harness** (kernel + LSP + garden + agent OS + consumer mount), not the only monorepo

Roadmap P0–P3 and metrics of value (static / llm / org / harness) included.

### Register · tokens · config (`.spw`)

**`.agents/plans/spw-garden-geometry/register-token-config.spw`**

- **Registers** — snapshot protocol, explorer/hover, phase/liminality knobs, kill phantom `spw/registerSnapshot` gap  
- **Tokenization** — TextMate vs semantic vs theme colors; AST-backed tokens; portal/organelle/prose kinds  
- **Configuration** — resolution order (.spw law vs VS Code comfort); `contributes.configuration` menus; config files layout  

### Formula · variant · geometry utility (`.spw`)

**`.agents/plans/spw-garden-geometry/formula-variant-geometry-utility.spw`**

Closed utility loop for:

- **Formula production** — structural/query/measure/pulse/claim/geometry kinds; identity hashes; publish pipeline  
- **Variant testing** — mutation axes × assay matrix; promote/discard with grades  
- **Workflow development** — pulses as runnable SOPs  
- **Geometry development** — grow strata/edges before chrome; fixture-first  

Actors: human · static CI · LLM. Workbench as harness example + template (formula + 2 variants + pulse + eval).

## Scope

- **In scope (this plan)**: doctrine, geometric constraints, profile schema, feature catalog, handle vocabulary, LSP request sketches, VS Code/Neovim binding map, anti-echo rules, pulse/lens incremental apply, probe grades, light tests, domain profiles (structural knowledge/longitudinal craft/UI/math), lyrical/compositional/semantic axes, ref-tree walks, trace precipitation, naming layers, compositional comparison, prime modeling registers, interdisciplinary PhD instrument map, links to index/braid work, distilled artifact.
- **Out of scope**: implementing full garden CLI in the first slice; webview “culture dashboard”; changing language semantics; forcing UI parity of chrome between editors (parity of *handles* only); claiming automatic theorem proving or automatic pattern evolution in-editor.

## Implementation slices (when coding starts)

1. **Protocol truth** — one registry for handler, advertisement, types, client invocation, observation, and tests.  
2. **Seed-owned topography** — complete/recovered/invalid parse state, pair identity, structure fingerprint, and exact selection.  
3. **Read-only LSP transect** — revision-addressed evidence packet shared by both editors.  
4. **True delta in index** — `deltaEnter` / compat aliases; tests extend `server-index.test.ts`.  
5. **Anti-echo hover builder** — pipeline + `whenLocalBlock` / `whenInlays` / `deltaMode`.  
6. **Profile resolution** — file/region/workspace presentation only.  
7. **Pair and span observations** — E0 facts separated from E1 symmetry or rhythm profiles.  
8. **Mechanics strip + grade tags** — cache tier and measured, method-cited cost.  
9. **Read-only pulse/lens previews** — exact selection, budgets, no editor-owned semantics.  
10. **Verified differential consumption** — any S2 lens tick delegates to the shared parser-checked edit plan.  
11. **Light garden test pack** — delta, anti-echo, scope isolation, exact-target, and preview fixtures.  
12. **Named handles and cognitive copy** — thin VS Code and Neovim projections after payloads are earned.

## Files (when executed)

```text
[NEW] .agents/plans/spw-garden-geometry/PLAN.md
[NEW] .agents/plans/spw-garden-geometry/wip.spw
[NEW] .agents/plans/spw-garden-geometry/spw-garden-geometry.spw
[MOD] packages/spw-lsp/src/handlers/display.ts
[MOD] packages/spw-lsp/src/server-index.ts
[MOD] packages/spw-lsp/src/types.ts
[MOD] packages/spw-lsp/src/stdio-server.ts
[MOD] packages/spw-lsp/src/helpers.ts          # config merge for hover profiles
[NEW] packages/spw-lsp/src/garden/features.ts  # tree/file feature extractors
[MOD] extensions/vscode-spw/package.json       # settings + commands
[MOD] extensions/vscode-spw/src/extension.ts
[MOD?] extensions/neovim-spw/lua/spw-lsp.lua
[MOD?] extensions/neovim-spw/lua/spw/garden.lua
[MOD] .agents/plans/vscode-cognitive-surface/PLAN.md  # cross-link
[MOD] .agents/plans/vscode-lsp-roadmap/PLAN.md
```

### Craft guard

- No second semantics engine in the client.  
- Profiles are data; builders stay pure functions of (context, profile, visibility).  
- `display.ts` is already ~1410 lines — extract hover/garden builders before growing.  
- Every new `spw/*` method needs tests + matrix update (capability honesty).  
- Neovim: prefer `:commands` and floating preview reuse of markdown from LSP; no mandatory plugin UI framework.

## Commits (planning → later implementation)

1. `.[plans] — stage spw-garden-geometry doctrine and artifact`  
2. `#[spw-lsp] — true deltaEnter in DocumentLineContext + tests`  
3. `&[spw-lsp] — anti-echo hover builder (delta-first, whenInlays)`  
4. `#[spw-lsp] — brace pair table + symmetry metrics (E0/E1)`  
5. `#[spw-lsp] — pulse profiles + spw/pulseRun (scoped beats)`  
6. `^seed[spw-lsp] =request[lens] — lensPreview then lensApplyTick`  
7. `^seed[spw-lsp] =request[garden] — gardenStats/fileFeatures + grades`  
8. `![garden] — light fixtures: delta, anti-echo, pulse isolation, lens preview`  
9. `&[vscode] — hover/pulse/lens commands and settings`  
10. `&[neovim] — portable wrappers for same requests`  
11. `![garden] — mounted-consumer + E2 noodle session notes`

## Agentic Hygiene

- Rebase target: `main@b4832193891b2b89b7e1e20dc0e462e2e4c9236e`  
- Rebase cadence: before implementation slices  
- Hygiene split: plan-only first; code slices separate from TS upgrade ladder  

## Dependencies

- Hard prior: operational-topography, canonical custom-protocol registry, and Seed parser/structure truth  
- Soft prior: editor-contract, capability matrix, braid/delta index correctness  
- Soft parallel: plugin-performance (whenInlays, visibility), cognitive-surface (copy)  
- Soft sibling: typescript-perf-audit (pattern only)  

## Failure Modes

- **Hard**: hover still echoes visible sigils after the anti-echo contract says it will not  
- **Soft**: garden stats become another sidebar that nobody opens  
- **Soft**: metaphors without metrics (personality as pure flavor text)  
- **Non-negotiable**: portable handles via LSP; thin client; no absolute paths in artifacts  

## Validation

- **Hypotheses**:
  - anti-echo reduces hover line count ≥40% on annotation-dense files without losing cross-file facts  
  - `deltaEnter` matches fixtures where local is subset of ambient novelty only  
  - garden stats distinguish two beds by entropy/pairing  
  - brace span metrics separate left-heavy vs balanced fixtures (E1)  
  - category pulse never touches files outside match set  
  - lens preview is dry; lens tick respects batchSize and dryRun  
  - no E2 probe can fail `fuzz:ship`  
- **Negative controls**: parse semantics unchanged; existing brace physics tests stay green; inlays still work when hover profile is minimal.  
- **Demo**: nested frame → Δ not ambient; pulse on `process/*` → beat status; lens from caret frame → N hits preview; Neovim same payload.  

## Spw Artifact

`.agents/plans/spw-garden-geometry/spw-garden-geometry.spw`
