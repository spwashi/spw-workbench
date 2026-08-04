# Plan: measure-invariant-generalization

Generalize `%mass` from exact file-size reconciliation into a portable **measure + evaluation scheme** lattice so surfaces can declare approximate/fuzzy invariants, authority can stay contract-agnostic, and clone-time `.spw` experiences stay sharp across audiences.

## Goal

`%mass{ lines, bytes }` is already a clean product: portable declaration, subject resolution at the edge, exact reconcile, span-local `--write`. It is compelling because it treats a surface as a **claim about the world**, not as free prose. It is not yet general enough: only two keys, only exact equality, no evaluation scheme, and the same pattern is reimplemented ad hoc for authority (`!writes` / `&joins` / `!reads`) and for claim-protocol falsify thresholds.

The desired end state is a **measure protocol** where:

1. Surfaces declare measurements with named keys and optional **evaluation schemes** (exact, band, relative, profile-quantile, corpus-prior).
2. Tests and probes consume **invariant templates** — approximate/fuzzy assertions whose precision is set by the scheme, not hard-coded in each test.
3. Authority generalizes from “JS subject may write X” to **contract-agnostic claims**: any host subject (text, convention, corpus, module) can be observed under a disclosed extractor + scheme.
4. Operator metaphors stay **status-disciplined**: interpretive physics (`?` vacuum, `!` catalyst, `*` crystal, `~` field, `&` material, `^` posture) may inspire authoring and prompts, but must not be advertised as runtime law without method + corpus.

**Taste note:** correctness (status discipline: implemented vs interpretive vs measured), expressiveness (one grammar for exact mass and fuzzy invariants), layering (portable seed protocol; host extractors at the edge), naming (measure/scheme/invariant, not another overloaded “hash”).

### Kernel pivot (mass de-centered)

`%mass` remains a **thrift specialization**, not the kernel. Portable types and Spw registry now exist:

| Piece | Path |
|-------|------|
| Protocol | `packages/spw-seed/src/canonical/measure-protocol.ts` |
| Registry | `.spw/registries/measure-context.spw` |
| Theory | `docs/theory/spw/measure-context-kernel.spw` |
| IR slice | `MeasureIR` in `packages/spw-seed/src/ir/slices.ts` |

**File-level syntactic context** for `%`+`mass` is assumed from the Spw family definition (operator, identifier, subject bind `self`, plane thrift, algorithm `thrift.file_physics`) — not from CLI folklore alone. Scalable growth: new **perceptive plane** + **algorithm** + host adapter, not a new one-off verb. Algorithm `attention.scope_walk` names multi-uri walks over attentional scopes.

## Ecology

Parent: `.agents/plans/shape-syntax-ecology/PLAN.md`.  
Evaluation stage of σ-chain (`%`); schemes attach to stabilize curiosity and thrift claims.  
Dialect: samples are dialect-agnostic pure numbers; **declaring surfaces** often Spw.b; machine budgets Spw.m.  
Editor presence: LSP diagnostics Phase E; screenshot of `%mass{…}` is a good dual-read drill (digits + verdict).

## Imagination / play

| Mode | Play |
|------|------|
| **IDE** | `spw mass` dry on a surface with `@self`; introduce intentional drift; refuse `--write` under tol scheme when schemes land |
| **Screenshot** | `%mass` + `@self` pair; ask model what is claim vs subject; verify paths |
| **Learning** | Exact vs band/tol as precision mood of evaluation, not global fuzzy culture |
| **Falsify** | Runtime register-`%` conflated with surface mass; silent pass on unmeasurable keys |

## Practical use

| Concern | Hook |
|---------|------|
| Refactor verify | post-apply mass/authority |
| Intermediate | declared vs measured in plan receipt |
| Memory | thrift claims on modules; not beat cache |
| Selectors | density metrics as host measures |
| Tests | scheme edge cases; default exact compat |
| Abstract | metric catalog ids as shared vocabulary |

## Scope

### In scope

- **Review & design map** of current measure / authority / operator implementations and implications (this plan’s primary artifact set).
- **Measure protocol sketch** (types + surface grammar) generalizing `self-mass`:
  - declared measure keys beyond `lines` / `bytes` (operator density, path-ref count, frame count, claim counts, custom host keys).
  - evaluation schemes: `exact | band{lo,hi} | tol{abs,rel} | profile{name} | prior{corpus}`.
  - verdicts extended: `match | drift | band_ok | soft_miss | undeclared | unmeasurable | scheme_mismatch`.
- **Invariant templates for tests**: fuzzy assertion helpers that read scheme precision from the declaration (or from a named eval profile), so Vitest/CLI probes share one language with `.spw` surfaces.
- **Authority generalization path**: keep JS extractors, but separate **claim grammar** (sigil+label + stream of names/patterns) from **host contract** (JS DOM, TS import graph, Spw convention, plain-text regex).
- **Operator metaphor ledger**: map original intents, current interpretive names, runtime behaviors, and proposed physics metaphors — with status tags only.
- **Audience & clone experience**: how a bundled `.spw` directory + VS Code / IntelliJ / Neovim plugins serve humans-as-authors, prompt-folders, research probes, and creatives — without requiring a single “correct” contract.
- **Composable value / generalizability criteria**: what stays portable in seed vs what must stay host-edge.
- **Editor projection contract (design + Phase E hooks)**: how seed reconcile becomes **shared LSP diagnostics/code actions** for VS Code and Neovim (no client re-measure).

### Out of scope

- Rewriting the interpreter’s `%` register-measure semantics (already implemented; protocol may *reference* it later).
- Implementing full corpus priors / z-score baselines (owned by `geometric-analysis-tooling` for geometry; this plan only defines how measure schemes *consume* priors once they exist).
- Changing lexer OperatorKind set or adding `_` as a first-class operator.
- Replacing claim-protocol, authority facets, or `%mass` surfaces overnight — migration is additive.
- VS Code tree views / Neovim panel UIs (chrome belongs to client plans; this plan owns measure truth + LSP diagnostic shape).

## Review: implementations and implications

### What exists today (evidence)

| Layer | Artifact | Behavior |
|---|---|---|
| Seed | `packages/spw-seed/src/canonical/self-mass.ts` | Parse `@self` + `%mass`; measure `lines`/`bytes`; exact reconcile; span rewrite |
| Seed | `packages/spw-seed/src/canonical/authority.ts` | Parse `!writes` / `&joins` / `!reads` streams; verdicts vs observed host facts |
| CLI | `packages/spw-cli/src/mass.ts` | effect.l0.measure; `--write` l2; `--missing` |
| CLI | `packages/spw-cli/src/authority.ts` + `authority-extract.ts` | JS/TS subject extract only |
| Runtime | `interpreter` `%` | Measure named/focused register (scalar scale) — different product than `%mass` |
| Theory | `docs/theory/spw/operators.spw` | `%` = measure; status-disciplined runtime table |
| Theory | `docs/theory/spw/operator-atlas.spw` | `%` reduces → scalar, note measure ∈ [0,1] (atlas reading ≠ mass integers) |
| Ladders | `form-ladders.ts` op `%` | seed → select → label `%[metric]` (conceptual) |
| Harness | `.spw/harness/claim-protocol.spw` | claim + measure + falsification threshold (prose, not machine scheme) |
| Spec bridge | `lib/spw-v0.3.0/architecture/theory-bridge.spw` | measured = method + corpus + result; accessor polarity interpretive |

### Why `%mass` is compelling

- **Span-local truth**: rewrites only digits; formatting profiles survive.
- **Portable core**: seed never touches the filesystem; CLI resolves `@self`.
- **Honest verdicts**: `unmeasurable` for unknown keys instead of silent pass.
- **Multi-subject grouping**: same nearest-preceding-`@self` rule as authority — one composition pattern.

### Why it is not yet general enough

1. **Exact-only** — scientific and convention tests need bands and tolerances.
2. **Two keys** — file physics is one domain; topography, authority density, and prompt folds need others.
3. **No scheme object** — precision lives in the probe author’s head, not the surface.
4. **Name collision risk** — runtime `%` (register scalar) vs surface `%mass` (declared metric facet) share a sigil with different products; status discipline must stay explicit.
5. **Authority is host-coupled** — extract is JS-shaped; text analysis / convention management need the same claim grammar with different extractors.

### Operator ledger (intent → reality → metaphor)

Status tags: **token** (lexed) · **runtime** · **interpretive** · **proposed** · **measured**.

| Sigil | Original / user intent | Current interpretive | Runtime (today) | Metaphor (proposed, interpretive only) |
|---|---|---|---|---|
| `?` | evaluation | wonder / probe | truthy branch / second-arg | vacuum — open site for observation |
| `!` | performance | action / commit | pass-through first arg | catalyst — forces a transition |
| `@` | bind scope | perspective | observe via named observer | standpoint — who measures |
| `#` | extrinsic associate | resonance / set | resonate register | extrinsic tag / category |
| `.` | ground / overload access | ground / properties | path access on base | intrinsic reduction / ground |
| `_` | intrinsic associate | ONF hole / hole site | not an OperatorKind | intrinsic hole (do not promote to op without dialect) |
| `&` | subject placeholder (`&_a`) | confluence / subject | merge confluence | material — the stuff transformed |
| `^` | — | integration / ascension | wrap integrated | posture — stance of a frame |
| `~` | — | potential / defer | deferred wrapper | field — uncollapsed possibility |
| `*` | — | value / collapse | write collapsed | crystallization — precipitate |
| `%` | measure | measure / sample | register measure | sample of a field under scheme |
| `$` | — | substrate | materialize metadata | substrate / meta of measure |
| `=` | — | configuration | register write | bind claim into place |
| alnum | formulas vs entropy | formula catalog / math scan (partial) | — | named recipes against noise |

**Implication:** overloaded operator access from names (`spwashi.%`) is a **dialect / perspective product**, not current parser law. Document as proposed; implement only behind a named profile.

**Implication:** `&_label` as subject placeholder is already *culturally* near confluence + label; formalizing placeholder holes should prefer existing `_` ONF hole semantics over inventing a second hole alphabet.

## Design: measure + evaluation scheme

### Surface grammar (additive)

```
^["module"]{
  @self: ~"../src/foo.ts"
  %mass{
    lines: 240
    bytes: 8120
    scheme: exact
  }
  %measure{
    op_density: 0.18
    path_refs: 12
    scheme: tol{ abs: 0.02, rel: 0.1 }
  }
  %invariant{
    claim: "path_refs <= 20"
    scheme: band{ lo: 0, hi: 20 }
  }
}
```

Design rules:

- Keep `%mass` as the **file-physics specialization** (lines/bytes + exact default) so existing surfaces remain valid.
- Introduce general `%measure` / `%invariant` only if a single `%` facet body cannot carry both without ambiguity; prefer **one Operation form** with labeled keys over three competing facets if parse cost is equal.
- `scheme` is either a keyword (`exact`) or a small facet (`tol{…}`). Unknown schemes → `scheme_mismatch`, never silent exact.
- Non-numeric / non-scheme keys remain `unmeasurable` carriers (preserve today’s honesty).

### Evaluation scheme object (seed-portable)

```
type EvalScheme =
  | { kind: 'exact' }
  | { kind: 'band'; lo: number; hi: number }
  | { kind: 'tol'; abs?: number; rel?: number }
  | { kind: 'profile'; name: string }   // precision table by name
  | { kind: 'prior'; corpus: string; z?: number }  // consumes geometry/corpus baselines when present
```

Reconcile is pure: `(declared, measured, scheme) → verdict`. Hosts supply `measured`.

### Invariant templates for tests

Template shape (shared by Vitest helpers and CLI probes):

```
%approx[name]{
  expect: <measured>
  against: <declared>
  scheme: <EvalScheme | profile-ref>
}
```

- **Hard tests** use `exact` (mass drift is a hard fail).
- **Research probes** use `tol` / `band` / `prior` so exploratory corpora do not thrash CI.
- **Precision is not a magic number in the test file** when the surface already declared a scheme — the test *loads* the scheme.

### Authority: contract-agnostic path

Split into three layers:

1. **Claim grammar** (seed) — already mostly portable: sigil+label facet + stream of raw claim tokens.
2. **Observation interface** (seed types) — `ObservedAuthority { kind, name, sites }` stays; add optional `measure?: number` for quantitative claims.
3. **Extractors** (CLI / host plugins) — JS extract remains; add **text/convention extractors** that emit the same observation shape (e.g. “surface must mention `~#taste`”, “convention file must declare `#:status`”).

Do **not** encode host contracts into OperatorKind. Authority remains a **facet convention** over existing operators (`!` action for side-effect claims, `&` join for couplings, `%` for measured constraints).

Contract-agnostic power = **same declare → observe → reconcile loop** for:

- JS module authority
- Spw convention compliance
- Prompt-fold structural budgets (depth, operator density)
- Creative surface thrift (file-physics modes from `.spw/conventions/file-physics.spw`)

## Composable value

| Audience | Composable value of generalized measure |
|---|---|
| Humans writing Spw to stay sharp | Exact mass + authority leaks keep skill honest; schemes prevent over-fitting to vanity metrics |
| Prompt authors with intricate folds | Declare structural budgets (`%measure`) so LLM-facing surfaces stay legible and testable |
| Research teams | Fuzzy invariants + priors turn `.spw` into reproducible probes (claim-protocol becomes machine-checkable) |
| Creatives | File-physics thrift + soft schemes; inspiration without CI cruelty |
| Clone + plugin experience | Bundled `.spw` is the **experience root**: mass/authority/measure diagnostics in VS Code / IntelliJ / Neovim make the repo speak when opened |

**Plugin angle:** LSP/CLI already have geometry and authority paths; measure schemes should surface as diagnostics (`drift`, `soft_miss`) and code actions (`apply exact correction` only for `exact` schemes — never auto-write band centers).

## Forward-thinking / generalizability criteria

A design change is **in** if it:

1. Keeps seed portable (no fs, no JS AST, no editor APIs).
2. Preserves status discipline (theory-bridge: interpretive ≠ measured ≠ runtime).
3. Extends verdict honesty (`unmeasurable` / `scheme_mismatch`).
4. Composes with `@self` multi-subject grouping.
5. Lets new hosts add extractors without new OperatorKinds.
6. Does not force one metaphor physics on all domains.

A design change is **out** if it:

- Bakes vacuum/catalyst metaphors into lexer or default runtime.
- Collapses register-`%` and surface-`%mass` into one semantics without a named dialect.
- Makes all tests exact or all tests fuzzy (precision is a **scheme**, not a global mood).

## Files

```
[NEW] .agents/plans/measure-invariant-generalization/PLAN.md
[NEW] .agents/plans/measure-invariant-generalization/wip.spw
[NEW] .agents/plans/measure-invariant-generalization/measure-invariant-generalization.spw

# Phase A — design + types only (no surface migration)
[NEW] packages/spw-seed/src/canonical/eval-scheme.ts          parse + apply EvalScheme; pure reconcile
[NEW] packages/spw-seed/src/canonical/eval-scheme.test.ts
[MOD] packages/spw-seed/src/canonical/self-mass.ts            optional scheme key; non-exact verdicts
[MOD] packages/spw-seed/src/canonical/self-mass.test.ts
[MOD] packages/spw-seed/src/canonical/index.ts
[MOD] packages/spw-seed/src/index.ts

# Phase B — invariant templates + CLI
[NEW] packages/spw-seed/src/canonical/invariant-template.ts   load declared invariants; template match
[NEW] packages/spw-seed/src/canonical/invariant-template.test.ts
[MOD] packages/spw-cli/src/mass.ts                            report scheme verdicts; refuse --write for non-exact
[NEW] packages/spw-cli/src/measure.ts                         [MOD?] or extend mass — generalized measure command
[MOD] packages/spw-cli/src/commands.ts

# Phase C — authority agnosticism
[MOD] packages/spw-seed/src/canonical/authority.ts            optional quantitative claims; extractor-agnostic docs
[NEW] packages/spw-cli/src/authority-extract-text.ts          convention / text observations
[MOD] packages/spw-cli/src/authority.ts                       --extractor=js|text|auto

# Phase D — theory + clone experience surfaces
[MOD] docs/theory/spw/operators.spw                           measure scheme status row; metaphor appendix as interpretive
[NEW] docs/theory/spw/measure-schemes.spw                     scheme catalog + falsify rules
[MOD] .spw/harness/claim-protocol.spw                         machine scheme field on claim_template
[MOD?] .spw/conventions/file-physics.spw                      hook thrift modes to measure keys
[MOD] .spw/tooling/vscode-spw.spw                             diagnostic + code-action hooks
[MOD] .spw/tooling/neovim-spw.spw                             same diagnostic codes; :Spw* projections
[MOD?] .spw/tooling/intellij-plugin.spw

# Phase E — LSP projection (roadmap rung 1b; both editors)
[NEW] packages/spw-lsp/src/handlers/measure-diagnostics.ts    publishDiagnostics from seed reconcile
[MOD] packages/spw-lsp/src/handlers/editing.ts                exact+drift only workspace edits
[MOD] packages/spw-lsp/src/stdio-server.ts
[REF] .agents/plans/vscode-lsp-roadmap/PLAN.md
[REF] .agents/plans/vscode-authoring-probe-loop/PLAN.md
[REF] .agents/plans/neovim-spw-surfaces/PLAN.md
```

### Craft guard

- `self-mass.ts` (~264 lines): scheme support must stay small or split read vs reconcile vs apply.
- Do not grow `form-ladders.ts` / `form-geometry.ts` (already over 600).
- New modules target &lt;300 lines, &lt;12 imports.
- One reason to change per file: schemes ≠ extractors ≠ CLI I/O.

### Axis attribution

- **resolution** — scheme precision, report verbosity.
- **stability** — exact mass as hard invariant; fuzzy bands for exploratory surfaces.
- **noise** — corpus priors / z thresholds (consume from geometry plan when present).
- **disclosure** — status tags on metaphors; plugins show scheme name in diagnostics.

## Commits

1. `.[measure] — plan measure-invariant-generalization artifacts`
2. `vocab[seed] — EvalScheme types and pure reconcile helpers`
3. `![seed] — scheme-aware self-mass verdicts and tests`
4. `vocab[seed] — invariant template loader for approx assertions`
5. `&[cli] — mass reports schemes; refuse unsafe --write`
6. `#[cli] — contract-agnostic authority extract plug points`
7. `.[theory] — measure schemes + operator metaphor ledger (status-tagged)`
8. `.[spw] — claim-protocol and tooling hooks for clone experience`
9. `#[lsp] — mass/authority diagnostics + exact-only code actions` (Phase E; unblocks VS Code + Neovim)

## Editor projection contract

| Diagnostic code (proposed) | Severity | Fix |
|----------------------------|----------|-----|
| `spw.mass.drift` | warning/error (profile) | exact scheme only → rewrite digits |
| `spw.mass.undeclared` | hint/info | optional insert key |
| `spw.mass.scheme_mismatch` | warning | none auto |
| `spw.authority.leak` | warning | none auto |
| `spw.ref.unresolved` | already-ish | create target action |

Clients (VS Code Problems, Neovim `[d`) must not invent new codes. Reading profiles may filter severity, not invent truth.

## Fuzz strategy

- Explore: unit tests on scheme edges (tol at boundary, empty scheme, unknown key).
- Stabilize: `npm run test:seed` + CLI mass dry-run on `prompts` / `.spw`.
- Ship: `npm run fuzz:stabilize` scoped to seed+cli; no interpreter churn expected.

## Agentic Hygiene

- Rebase target: `origin/main@0c7cdfb7178079bf27a9a062ba1b310d07296f41` (HEAD at plan start; branch is `main` ahead of upstream — plan artifacts only until feature branch cut)
- Rebase cadence: before commit 1 on feature branch, before merge
- Hygiene split: working tree has many untracked `*.d.ts` under packages — **do not** include in this branch; leave untracked or a separate hygiene cleanup

## Dependencies

- **Sibling / consumer:** `geometric-analysis-tooling` — supplies corpus priors / z-scores that `prior{…}` schemes will consume; do not reimplement baselines here.
- **Editor consumers:** `vscode-lsp-roadmap` rung **1b**, `vscode-authoring-probe-loop`, `neovim-spw-surfaces` — project Phase E diagnostics only after seed reconcile is stable.
- **Related:** `operational-topography`, `spw-garden-geometry` (shape measurement culture); `mounted-consumer-tooling` (clone/mount experience).
- **none blocking** for Phase A–B (schemes work without corpus priors). Phase E needs A–B minimum for exact mass.

## Failure Modes

- **Hard:** `--write` applied under a non-exact scheme rewrites to a false “truth” (mitigate: write only for `exact` + `drift`).
- **Hard:** scheme parser accepts prose that never reconciles (mitigate: unknown scheme → `scheme_mismatch`, tests for each kind).
- **Soft:** atlas “measure ∈ [0,1]” conflicts with integer mass (mitigate: document two products of `%` — register scalar vs declared metrics).
- **Soft:** metaphor physics over-advertised in plugin hovers (mitigate: status badges; default hover = runtime/token facts).
- **Non-negotiable:** no silent pass on unmeasurable keys; no absolute user paths in commits; seed stays portable.

## Validation

### Hypotheses

1. Adding `scheme` to existing `%mass` bodies does not break exact reconcile for undeclared scheme (default `exact`).
2. Fuzzy templates reduce false CI failures on living corpora without hiding real mass drift.
3. Text/convention extractors can share authority reconcile without changing claim grammar.
4. Status-tagged metaphor ledger improves prompt-author clarity without changing parser tests.

### Negative controls

- Runtime `%` register measure behavior unchanged.
- Existing `%mass` surfaces without `scheme` keep match/drift semantics.
- Authority JS extract results unchanged when `--extractor=js`.

### Demo sequence

1. Declare `%mass{ lines: N, scheme: exact }` — `spw mass` match/drift as today.
2. Declare measure with `tol{ abs: 5 }` — soft_miss vs match on near values; `--write` refused.
3. Invariant template test loads scheme from surface and asserts approx.
4. Convention surface with text extractor reports leak/stale under same CLI shape.
5. Open repo in editor with `.spw` present — mass/authority diagnostics visible (design hook; implement later).

## Spw Artifact

```
.agents/plans/measure-invariant-generalization/measure-invariant-generalization.spw
```

Distilled protocol: measure products, scheme kinds, audience folds, operator ledger status, and clone-experience contract.
