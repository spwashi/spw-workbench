# Plan: shape-syntax-ecology

Coordinate today’s design thread into one **ecology** of plans: dialects and syntax profiles as product surfaces; experimental syntax that is **runtime- and tool-referenceable**; intermediate forms, memory, refactor, selectors, expand/reduce; and plan artifacts that **spark human expertise and imagination** (IDE + screenshot/LLM play).

## Goal

A reviewing human (and any LLM they fold in via IDE or screenshot) should be able to:

1. **See** Spw as a shape language (braces as material, operators as gestalt, liminality as dual axes).
2. **Reference** experimental syntax from runtime/tools without promoting metaphor to seed law.
3. **Play** safely: plan-first mutation, hash-gated multi-file refactor, dialect-honest parse/cache.
4. **Learn** along dialect curricula (b → p → q/l → m → f → x → t).
5. **Connect** measure, curiosity, form geometry, editors, and precipitation under one status discipline.

**Taste:** syntactic presence, practical use, imagination under evidence grades, multi-client honesty.

### Audience of the plan ecology

| Reader | Value of these plans |
|--------|----------------------|
| Human reviewer | Deepen expertise; choose what to implement next; aesthetic + formal judgment |
| Human + LLM (IDE) | Hover stack, dialect, probes, σ-chain as shared vocabulary |
| Human + LLM (screenshot) | Gestalt of code region; dual-read only with AST ground truth |
| Implementer agent | Ordered rungs, file lists, falsifiers, negative controls |

## Ecology map (plans + theory)

| Node | Role in ecology |
|------|-----------------|
| **syntax-profile-stack** | Dialect detect, stack resolve, metasyntax, lint runway (**seed landed partial**) |
| **shape-syntax-ecology** (this) | Coordination, runtime reference hooks, imagination contract |
| **spw-syntax-warning-cleanup** | Executable corpus census: parser-owned forms, notation exhibits, and unresolved syntax opportunities |
| **mutation-flow-automata** (theory) | Glyph σ/φ/CA; intermediate states |
| **curiosity-mutation-ergonomics** | Combinator cells, explore/stabilize profiles, sustained curiosity |
| **refactor-experiment-lifecycle** | select→plan→intermediate→worktree→episode |
| **measure-invariant-generalization** | sample under scheme; mass→general measure |
| **form-geometry-editor** | Brace material inspect; mobility; liminality bridge honesty |
| **vscode-lsp-roadmap** + **neovim-spw-surfaces** | Syntactic presence in editors; screenshot-friendly probes |
| **vscode-authoring-probe-loop** | Cursor sites, wonder, plan context |
| **vscode-cognitive-surface** | Reading profiles; gestalt disclosure |
| **spw-beat-diff-precipitation** | Beat cache, precipitation defaults (runtime memory) |

## Runtime enhancements: experimental syntax that can be *referenced*

Problem: experimental syntax (flow CA, dialect stack, σ-chain, group `=G`) lives in theory/plans but **cannot be cited** by runtime, LSP, or tests as a stable handle.

### Proposed reference surface (portable)

```
packages/spw-seed/src/experimental/
  syntax-catalog.ts     // ids + status + dialect + docs path
  syntax-catalog.test.ts
```

Each entry:

```ts
{
  id: 'flow.sigma_chain' | 'dialect.Spw.f' | 'brace.inspect_ports' | …
  status: 'proposed' | 'partial' | 'implemented'
  dialect?: DialectId
  docs: 'docs/theory/spw/…'
  runtimeHook?: 'none' | 'parse_meta' | 'lint' | 'lower' | 'interpret'
  reference: string  // greppable token for tests: e.g. "spw.exp.flow.sigma_chain"
}
```

### Runtime / seed hooks (practical)

| Hook | Purpose | Status |
|------|---------|--------|
| `parse()` `dialect` + preprocess | Dialect product surfaces | **landed** |
| `parse().experimentalRefs` | `=exp[ id: … ]` citations | **landed** |
| `SYNTAX_CATALOG` + scan | Greppable ids + hover markdown | **landed** |
| LSP hover dialect/exp/seed stack | Plan-syntax presence | **landed** |
| Semantic tokens + TM dialect-exp | Gestalt coloring | **landed** |
| `resolveSurfaceProfile` | Stack for format/CLI | partial (API) |
| CLI `spw profile` / `spw exp` | Human/LLM browse | **landed** |
| LSP `spw/surfaceProfile` · `phraseScan` · `channelPolicy` | Stack/phrases/channel probes | **landed** |
| LSP unknown `=exp` diagnostics | Catalog literacy | **landed** (info) |
| Runtime `prepareSource` + `HotRuntimeSession` | Dialect prepare + hot re-eval cache | **landed** |
| φ lower / worktree | execute experimental | proposed |

### Fixity · brace phrases · optimizable grammar

Theory: `docs/theory/spw/fixity-brace-phrases.spw` (+ `brace-charge-crawl.spw`).

| Idea | Use |
|------|-----|
| **Fixity** | Act placement: prefix (primary), postfix (L→R dual), membrane, proposed infix |
| **Brace phrase** | Named Act×Bound silhouette (`![]`, `*{…}`, `data~`, …) — unit of emergence |
| **Emergent grammar** | phrase seen → cataloged → rewrite law → dialect project → channel graduate |
| **Optimize** | only under schema×fixity×measure×rewrite×`phraseOptKey` cache |
| **Runtime** | `session/phrases.ts` scan + opt key; channels/crawl/charge for field motion |
| **Biome** | ocean `experiments/syntax.spw` phrase nursery; Spw.o regional only |

### Reference ↔ dereference (shape address)

Theory: `docs/theory/spw/reference-deref-geometry.spw` (proposed).

| Principle | Claim |
|-----------|--------|
| Dual ladder | **Ref** points (outward mark); **deref** follows (inward resolve)—same form rungs, opposite direction |
| Recognizability | Glyph silhouettes encode role (`~"…"`, `@`, `$`, `/`, `*`) faster than English keywords |
| Prefer composition | `*@id`, `$~"path"`, `@(a/b)` over new alphabet letters |
| Dialect fit | **q** natural for follow; **l** dense path packs; **x** hot collapse; **b** teach dual-read; **p** roots without hot `*` |
| Dimension | d0 name → d1 path → d2 graph → d3 stack×time×attention → dn field product—**axes multiply**, glyphs do not |
| Channel | Stability channel gates which dimensional axes may be *followed* vs only *pointed* |

Aligns with `REFERENCE_PROGRESSIONS`, form ladders (`empty → … → path/ref → fold`), GraphIR/IdentityIR spine, and consumer mount-aware resolve.

### Liminality / brace material (runtime honesty)

- Do **not** merge surface liminal shapes with register liminality.
- Reference bridge profile id `Spw.Runtime.RegisterLiminalityBridge` from form-geometry-editor + cognitive docs.
- Payload inspect: coupling occupancy/payload on hover (formContext) is the **practical** “brace as material.”

## Syntactic presence (practical use)

| Surface | Presence upgrade |
|---------|------------------|
| Parse | dialect + preprocess flag + machine_lint warnings (**landed**) |
| Review | plan/flow/query profiles + privacy patterns (**landed partial**) |
| Format | default from stack (remaining) |
| LSP | hover: stack + exp refs + gestalt token roles |
| Neovim | `:SpwProfile`, dialect in statusline |
| Screenshot path | stable semantic colors; dual-read policy in cognitive-surface |
| Selectors | Spw.q as address product; semantic-edit rules as data |
| Expand | derived `.expanded.spw` skip-index; t dialect |
| Reduce/abstract | ONF/shape fingerprint (geometry plan); m dialect |
| Memory | p stream + beat cache + experiment gen/ (precipitation defaults) |
| Refactor | plan spine + intermediate σ + worktree l1 |

### Operational expression, notation exhibit, and prose

The 2026-08-24 warning census adds a three-way status boundary to this ecology:

1. An **operational expression** is parser-owned and may proceed toward normalization or runtime interpretation.
2. A **notation exhibit** preserves a proposed or comparative spelling for inspection, teaching, or design; it carries no effect authority.
3. **Prose** explains a construct and may use `key: |` when indentation-bounded multiline disclosure is useful.

Current strings, phrases, lists, and block scalars can host notation exhibits, but they do not preserve a typed token product. A follow-on catalog/design slice should consider an exhibit node or product with source span, token sequence, declared dialect, implementation status, and explicit `runtimeHook: none`. This extends the existing experimental catalog discipline without treating every example as executable grammar.

The census also records three adjacent candidates that remain proposed: typed relations for recurring `>`, `=>`, and `==`; signed numeric literals; and a migration among legacy `[...]`, explicit `#[...]`, and choice-like `a | b | c`. Their frequency is evidence for experiments, not promotion.

## Imagination contract (plans as sparks)

Every related plan should include a short **`## Imagination / play`** block:

- One **IDE play** (what to open, what to hover, what to mutate plan-only)
- One **screenshot play** (what gestalt to show an image model; require AST check)
- One **learning move** (which dialect curriculum step)
- One **falsify** if play is mistaken for shipped law

## Scope (this plan’s own work)

### In scope

- Ecology PLAN + rich wip + distilled `.spw`
- Cross-updates to related PLAN.md / wip streams
- Spec for `experimental/syntax-catalog` (implement in follow-on commits)
- Runtime note: parse/profile already referenceable; catalog is next
- Imagination blocks on child plans

### Out of scope (here)

- Full φ→MutationRule lower
- Full refactor worktree CLI
- Vision model pipeline implementation
- Merging liminality axes

## Files

```
[NEW] .agents/plans/shape-syntax-ecology/PLAN.md
[NEW] .agents/plans/shape-syntax-ecology/wip.spw
[NEW] .agents/plans/shape-syntax-ecology/shape-syntax-ecology.spw
[MOD] .agents/plans/syntax-profile-stack/PLAN.md
[MOD] .agents/plans/syntax-profile-stack/wip.spw
[MOD] .agents/plans/curiosity-mutation-ergonomics/PLAN.md
[MOD] .agents/plans/curiosity-mutation-ergonomics/wip.spw
[MOD] .agents/plans/refactor-experiment-lifecycle/PLAN.md
[MOD] .agents/plans/refactor-experiment-lifecycle/wip.spw
[MOD] .agents/plans/measure-invariant-generalization/PLAN.md
[MOD] .agents/plans/measure-invariant-generalization/wip.spw
[MOD] .agents/plans/vscode-lsp-roadmap/PLAN.md
[MOD] .agents/plans/vscode-lsp-roadmap/wip.spw
[MOD] .agents/plans/neovim-spw-surfaces/PLAN.md
[MOD] .agents/plans/neovim-spw-surfaces/wip.spw
[MOD] .agents/plans/form-geometry-editor/PLAN.md
[MOD] .agents/plans/form-geometry-editor/wip.spw
[MOD] .agents/plans/vscode-authoring-probe-loop/PLAN.md
[MOD] .agents/plans/vscode-authoring-probe-loop/wip.spw
[MOD] .agents/plans/vscode-cognitive-surface/PLAN.md
[MOD] .agents/plans/vscode-cognitive-surface/wip.spw
[MOD] .agents/plans/spw-syntax-warning-cleanup/PLAN.md
[MOD] docs/runtime/md/spacing-and-progressive-inspection.md
[MOD?] docs/theory/spw/syntax-profile-stack.spw
[MOD?] docs/theory/spw/mutation-flow-automata.spw
[NEW?] packages/spw-seed/src/experimental/syntax-catalog.ts  // follow-on implement
```

## Commits

1. `.[plans] — stage shape-syntax-ecology + cross-link related plans`
2. `vocab[seed] — experimental syntax-catalog reference ids` (follow-on)
3. `![seed] — catalog tests + parse optional exp refs` (follow-on)
4. `#[lsp] — hover stack + exp refs` (follow-on, after capability honesty)
5. `.[plans,docs] — distinguish operational syntax, notation exhibits, and prose`

## Agentic Hygiene

- Rebase target: `main@f01a1d4ce5f654cd874b5ccfcdf1a6692a5ab3f3`
- Plan-only updates first; catalog code in separate commits
- Hygiene: no accidental `*.d.ts`

## Dependencies

- Hard soft: syntax-profile-stack (landed dialect module)
- Evidence: spw-syntax-warning-cleanup (warning-free corpus census and parser repairs)
- Soft: all ecology children listed above
- Theory: mutation-flow-automata, syntax-profile-stack, form-geometry, valence, liminality-bridge

## Failure Modes

- **Hard:** experimental catalog implies runtime execution of proposed φ
- **Hard:** screenshot/LLM path without AST dual-read presented as truth
- **Soft:** plan sprawl without ecology map
- **Non-negotiable:** status discipline; seed portability; effect grades

## Validation

- Ecology map lists every related plan with one-line role
- Each child plan has Imagination/play + stream note dated
- Human can open three plans and reconstruct today’s lattice without chat history
- Reader documentation states which warning-census findings are implemented conventions and which remain proposed syntax

## Spw Artifact

`.agents/plans/shape-syntax-ecology/shape-syntax-ecology.spw`
