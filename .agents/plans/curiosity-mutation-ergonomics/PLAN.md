# Plan: curiosity-mutation-ergonomics

Improve **file and mutation ergonomics** so Spw combinatorics (sigil × container × profile × scheme) become abstract machinery for **sustained curiosity** — novel relationships and dimensions that a human could not hold open alone — while keeping exploration interesting, reversible, and status-disciplined.

## Goal

The workbench already has pieces of a curiosity engine scattered across products:

| Piece | Status | Gap |
|-------|--------|-----|
| Container + operator ladders | implemented (seed) | rarely driven as *playable* steps in the editor |
| Mutation automata + pulse/mutate/beat | implemented (seed + CLI) | profiles are layout-heavy; few **exploratory** profiles |
| Form geometry / mobility / HOF | implemented (seed) | editor projection is form-geometry-editor’s job (still thin) |
| Wonder blocks + `$%[metrics]` | authored widely | not devices; metrics often unresolved |
| Measure / scheme lattice | planned (`measure-invariant-generalization`) | not yet mutation/profile vocabulary |
| Atlas / geometry / analyze | partial | clusters exist; **guided combinatorial walks** do not |
| Practice circuit (wonder→…→metareference) | interpretive design | not operationalized as file/mutation UX |

**Desired end state:** an author (or agent) can open a `.spw` surface and:

1. **See** relational and dimensional structure at high level (clusters, species, form shape) and low level (glyph site, occupancy, single mobility step).
2. **Play** named **mutation profiles** that are not only layout hygiene but **curiosity machinery** — e.g. unfold a ladder step, rotate a wonder species, dual a container, propose a reverse-edge question — always plan-first (`effect.l0.measure`) with preview receipts.
3. **Stabilize** novel relationships that survive: saved as claims, measures, plan stream entries, or settled answers — without freezing wonder into decoration.
4. **Sustain** multi-hop curiosity that exceeds working memory: the system remembers open wonders, underused species, metric drift, and next combinatorial moves.

**Taste note:** expressiveness, reversibility, fun-under-discipline, stability of novel structure, layering (seed machinery → CLI → LSP → VS Code/Neovim projections). Affect axis: delight is subordinate to evidence and effect grades.

## Ecology

Parent coordination: `.agents/plans/shape-syntax-ecology/PLAN.md`.  
Dialect home: **Spw.f** (flow glyphs) + explore/stabilize families; profiles resolve via `syntax-profile-stack`.  
σ-chain intermediate forms: `docs/theory/spw/mutation-flow-automata.spw` (`<< ~ ; ? ; % ; ! ; * ; ^ >>`).  
Experimental syntax must be **catalog-referenceable** before runtime lower (no silent execute).

## Imagination / play

| Mode | Play |
|------|------|
| **IDE** | `spw explore` (when shipped) or pulse `--profile measure_only` on a wonder-heavy file; list underused species mentally against atlas |
| **Screenshot** | Capture a `?["…"]{ !probe … $%[…] }` block; ask model which dual-track halves are machine vs human; check `$%` keys against measure catalog |
| **Learning** | After Spw.b literacy, author one φ-shaped explore plan in Spw.f without applying `*` |
| **Falsify** | Auto-writing explore profiles to disk; equating combinator “fun” with unmeasured drag |

## Practical use

| Concern | Hook |
|---------|------|
| Selectors / density | combinator cells + geometry/analyze measures |
| Intermediate | explore = l0 σ without durable `*` |
| Memory | visit set (memory/gen/harness — open); p stream for decisions |
| Refactor | stabilize → claim/mass via measure + refactor plans |
| Tests | invitation AST-filter; layout_canonical negative control |
| Expand/reduce | not primary; shape fingerprint is peer geometry plan |

### Deformation axes

| Axis | How this plan touches it |
|------|---------------------------|
| **resolution** | high-level atlas walk vs glyph-site mobility |
| **disclosure** | reading profiles; plan-only vs apply |
| **stability** | stabilize relationships via claims/schemes without killing open wonder |
| **noise** | anti-echo for wonder species; cluster before confluence |
| **timing** | beat-driven exploration ticks vs explicit pulse |
| **affect** | “interesting and fun” as measured invitations, not carnival UI |

## Scope

### In scope

**A. Combinatoric vocabulary (seed-portable)**

- Formalize a **combinator space** authors can address without inventing new OperatorKinds:
  - **Sigil site** × **container kind** × **occupancy/payload** × **label presence** (from form-ladders / coupling)
  - **Wonder species** × **lens** × **metric set** × **probe track** (human | machine | hybrid)
  - **Mutation profile family**: `hygiene` | `explore` | `stabilize` | `measure` (extend beyond layout-only ids)
- **Dimensional handles** (descriptive, method-required before “measured”):
  - form depth / brace projection
  - reference hop distance
  - operator voice (distribution)
  - thrift (mass/lines)
  - liminality / open-question density
  - cluster membership (shape fingerprint / hub / species)

**B. Mutation profiles as abstract machinery**

Named profiles that produce **previewable differentials**, not only format:

| Profile family | Intent | Ceiling default | Examples of rules (proposed) |
|----------------|--------|-----------------|------------------------------|
| `hygiene` | layout/canon (existing) | l0 plan / l1–l2 apply | `layout_canonical`, `layout_full` |
| `explore` | open structure, surface underused combinators | **l0 only** until accepted | ladder-step suggest, species-rotate wonder stub, dual boundary propose |
| `stabilize` | lock a novel relation into claim/measure/stream | l0 plan → gated l2 | insert `%mass`/`%expect`, claim template, settle wonder → stream |
| `measure` | sample without rewrite | l0 | resolve `$%`, mass reconcile, op.distribution |

Rules for explore/stabilize are **opt-in customRules / new profile ids** in mutation-automata or a thin companion module — **do not grow** `form-geometry.ts` / `pulse.ts` past craft guards; extract helpers.

**C. File ergonomics (high + low level)**

| Level | Interaction | Product |
|-------|-------------|---------|
| **High** | “walk this root by underused species” | CLI `spw explore` or `spw pulse --profile explore_*` + atlas hooks |
| **High** | “what relationships am I not holding?” | open-wonder index; cluster orphans; reverse-edge candidates |
| **Mid** | frame-local ladder step | pulse plan: empty → inhabit → label |
| **Low** | caret mobility (label site, digraph vs capsule) | form-geometry-editor P0–P1 |
| **Low** | single metric resolve under cursor | `$%` hover / `:SpwProbe` |
| **Stabilize** | promote preview → durable surface edit | mutate/pulse write with receipt |

**D. Sustained curiosity loop (cognition externalized)**

```
wonder (open)
  → substrate (where)
  → potentiation (hold alternatives / soft schemes)
  → clustering (kind among peers)
  → confluence (join evidence)
  → performance (run probe / apply plan)
  → evaluation (scheme + sample)
  → metareference (claim / stream / mass on surface)
  → re-open or settle
```

Implement as **indexed state + invitations**, not a forced wizard:

- Open wonder registry (per file / workspace): species, age, last sample
- Underused combinator report (sigil×container sparse cells)
- Next-move cards (max N) with effect grade and reversibility
- Beat optional: tick invitations without tree writes

**E. Cross-client projection**

- LSP diagnostics/code actions for explore plans (preview) and stabilize claims
- VS Code: lenses + strip “next combinator”
- Neovim: `:SpwExplore`, quickfix of invitations, no panel parity

### Out of scope

- New OperatorKinds or lexer changes for the circuit terms
- Auto-apply exploratory rewrites (always plan-first; explore defaults l0)
- Baking vacuum/catalyst metaphors as runtime law
- Growing `form-geometry.ts` (1209) or `pulse.ts` (1831) in place — extract only
- Full geometric shape fingerprint implementation (sibling `geometric-analysis-tooling`; consume when ready)
- Webview “game UI” or dependency-heavy Neovim UIs
- Replacing claim-protocol or measure plans — **compose** with them

## Design: combinator machinery

### Combinator cell

A cell is a sparse coordinate in form space:

```
cell = {
  sigil?: OperatorKind | '_'
  boundary?: PairedBoundaryKind | 'operator'
  occupancy?: 'empty' | 'inhabited' | …
  label?: boolean
  wonderSpecies?: id
  metricKeys?: string[]
}
```

**Sustained curiosity** = the system tracks which cells the author has **visited**, **stabilized**, or **never touched** in a scope, and invites underrepresented cells that are **valid** for the local AST (not random noise).

### Mutation profile contract

Every exploratory profile must declare:

```
profile: {
  id, family: hygiene|explore|stabilize|measure
  effectCeilingDefault
  reversibility: 'layout_only' | 'preview_receipt' | 'semantic_risk'
  invitations: max count / selection policy
  falsify: when this profile must refuse
}
```

Explore profiles **never** silently rewrite disks. Stabilize profiles require preview receipts + health (same gates as form-geometry-editor).

### High vs low description

| Mode | Description language | Example |
|------|----------------------|---------|
| **Expressive (high)** | frames, species, dimensions, “voice of file” | `^["walk"]{ species: blind_spot; dimension: reference }` |
| **Granular (low)** | ONF site, span, rule id, SourceEdit[] | mobility `label_in` at offset N |

Both must lower to the **same differential kernel** (`SourceEdit` / pulse plan). High-level is sugar + selection policy; low-level is the receipt.

### Reality spaces (simple ↔ complex)

| Reality space | Simple concept | Complex concept | Machinery |
|---------------|----------------|-----------------|-----------|
| **File physics** | lines/bytes | thrift + eager flags | mass / scheme |
| **Form** | one brace pair | ladder product + HOF | form-ladders, geometry |
| **Reference** | one `~path` | hub/orphan graph | atlas, path diagnostics |
| **Wonder** | one question | species rotation + dual-track probe | wonder device (ops devices) |
| **Claim** | one expect | multi-observer authority | measure + authority |
| **Plan memory** | one stream line | multi-slug open set | plan context |

## Files

```text
[NEW] .agents/plans/curiosity-mutation-ergonomics/PLAN.md
[NEW] .agents/plans/curiosity-mutation-ergonomics/wip.spw
[NEW] .agents/plans/curiosity-mutation-ergonomics/curiosity-mutation-ergonomics.spw

# Seed — combinators + profiles (extract, do not bloat hot files)
[NEW] packages/spw-seed/src/canonical/combinator-space.ts     cell coords, visit set, sparse report
[NEW] packages/spw-seed/src/canonical/combinator-space.test.ts
[NEW] packages/spw-seed/src/canonical/curiosity-profiles.ts   explore/stabilize profile defs + pure planners
[NEW] packages/spw-seed/src/canonical/curiosity-profiles.test.ts
[MOD] packages/spw-seed/src/canonical/mutation-automata.ts    register profile ids only (thin)
[MOD] packages/spw-seed/src/canonical/index.ts
[MOD] packages/spw-seed/src/index.ts

# CLI — file ergonomics
[NEW] packages/spw-cli/src/explore.ts                         invitations, walks, json envelope
[MOD] packages/spw-cli/src/commands.ts
[MOD] packages/spw-cli/src/pulse.ts                           --profile explore_* dispatch (thin glue)
[MOD] packages/spw-cli/src/mutate.ts                          stabilize profiles gated
[MOD?] packages/spw-cli/src/atlas.ts                          underused combinator / species hooks

# LSP + clients (after seed CLI truth)
[NEW] packages/spw-lsp/src/handlers/curiosity.ts              invitations + plan previews
[MOD] packages/spw-lsp/src/stdio-server.ts
[MOD] extensions/vscode-spw/…                                 commands/lenses (thin)
[MOD] extensions/neovim-spw/lua/spw/commands.lua              :SpwExplore projections

# Theory / harness
[NEW] docs/theory/spw/curiosity-combinators.spw
[MOD] docs/theory/spw/operational-devices.spw                 wonder device link
[MOD] docs/runtime/md/pulse-mutate-beat.md                    explore/stabilize families
[MOD] .spw/harness/probes/probe-loop.spw                      species rotation note
[MOD?] .spw/tooling/vscode-spw.spw
[MOD?] .spw/tooling/neovim-spw.spw
```

### Craft guard

- Do **not** add substantial logic to `form-geometry.ts` (1209) or `pulse.ts` (1831).
- New seed modules &lt;400 lines, &lt;12 imports; split walk vs profile vs invitation if needed.
- Explore rules that need mobility must **call** form-geometry APIs, not copy them.
- One reason to change: combinator-space ≠ curiosity-profiles ≠ CLI I/O ≠ LSP projection.

## Commits

1. `.[curiosity] — plan curiosity-mutation-ergonomics artifacts`
2. `vocab[seed] — combinator-space cells and sparse visit report`
3. `^seed[curiosity] — explore/stabilize/measure profile planners (plan-only)`
4. `![seed] — combinator + profile tests on fixtures`
5. `#[cli] — spw explore invitations and walks`
6. `&[cli] — wire explore/stabilize into pulse/mutate profile surface`
7. `.[theory] — curiosity combinators + pulse-mutate-beat families`
8. `#[lsp] — curiosity invitations (earned method or diagnostics)`
9. `&[editors] — VS Code lenses + Neovim :SpwExplore projections`

## Fuzz strategy

- Explore: combinator sparse reports on `index.spw` / `.spw/patterns/*`; profile plan-only on dirty buffers
- Stabilize: `npm run test:seed` + CLI explore/pulse dry-run; no workspace writes in default CI
- Ship: `fuzz:stabilize` scoped seed+cli; editor smoke only after LSP packets stable

## Agentic Hygiene

- Rebase target: `main@0c7cdfb7178079bf27a9a062ba1b310d07296f41`
- Rebase cadence: before commit 1 on feature branch, before merge
- Hygiene split: exclude unrelated plan churn and any `*.d.ts` noise; do not mix with measure Phase A implementation unless sequenced intentionally

## Dependencies

| Plan | Relation |
|------|----------|
| `form-geometry-editor` | **Hard soft** — low-level mobility actions; curiosity explores *when* to invite them |
| `measure-invariant-generalization` | stabilize profiles insert/reconcile samples under scheme |
| `geometric-analysis-tooling` | shape fingerprints / priors for clustering dimension |
| `vscode-lsp-roadmap` / `neovim-spw-surfaces` | client projections; multi-client doctrine |
| `vscode-authoring-probe-loop` | cursor sites for wonder/probe; consume invitations |
| `operational-topography` | differentials, effect grades, evidence (already kernel) |
| `spw-beat-diff-precipitation` | optional beat tick for invitations; do not block |

**none blocking** for seed combinator-space + plan-only explore profiles.

## Failure Modes

- **Hard:** explore profile writes disk without accept → refuse; default ceiling l0
- **Hard:** random combinator suggestions invalid for local AST → invitations must be AST-filtered
- **Soft:** wonder species spam → anti-echo + max invitations
- **Soft:** “fun” becomes noise → reading profile `creative` softens severity; `author` keeps thrift
- **Soft:** duplicate geometry/measure engines → import seed; no client re-parse
- **Non-negotiable:** effect grades; preview receipts for semantic edits; seed portability; no absolute paths in commits

## Validation

### Hypotheses

1. Authors revisit more underused wonder species when invitations show sparse combinator cells.
2. Plan-only explore profiles increase “interesting” edits without raising refuse_health rate.
3. High-level walk language and low-level SourceEdit receipts stay aligned (same plan id).
4. Stabilizing a relationship (claim/mass/stream) reduces re-asking the same wonder without deleting the vacuum permanently (settle vs delete).

### Negative controls

- `layout_canonical` pulse behavior unchanged
- Runtime operator evaluation unchanged
- Neovim/VS Code still work with curiosity LSP disabled

### Demo sequence

1. `spw explore .spw --json` → list underused species + combinator holes  
2. Open `index.spw` → invitation: reverse-edge wonder on `@docs` root  
3. Pulse explore plan → preview only; health ok  
4. Accept stabilize: insert metric sample or stream note  
5. Re-run explore → that cell marked visited/stabilized  
6. Neovim `:SpwExplore` / VS Code lens shows same invitation ids  

## Spw Artifact

```
.agents/plans/curiosity-mutation-ergonomics/curiosity-mutation-ergonomics.spw
```

Distilled: combinator cell, profile families, practice circuit mapping, high/low interaction matrix, reality spaces.
