# Plan: vscode-authoring-probe-loop

Design the VS Code authoring loop around `.spw` workspace semantics by making completions, theming cues, formatting/refactor actions, code lenses, commands, and status surfaces register-aware and probe-oriented.

## Goal

The current authoring experience is still mostly static: completions are sigil snippets plus annotation names, code lenses are descriptive but inert, theming carries little state nuance, and runtime/probe state is hidden inside hover or terminal workflows. The desired end state is an authoring loop where register-aware completion, actionable code lenses, formatting/refactor actions, graph-query probes, rotation-style perspective changes, and lightweight status surfaces shorten the path from edit to inspection. This improves correctness and expressiveness by letting the editor expose the same register and workspace signals that the runtime and harness already know.

The authoring loop is one of three coordinated VS Code surfaces. It contributes `SpwContext.activePhase`, `SpwContext.materializationState`, and `SpwContext.probeHistory`, can consume atlas/register context when available, and must still ship coherently from local parse/runtime context when the other two surfaces have not landed. See `vscode-interaction-contract.spw` in the workspace-atlas plan directory for the shared event vocabulary, capability model, and additive composition contract.

The authoring loop is also where new users *learn* Spw dynamics. The completion system, code lenses, hover, and status bar together form a teaching surface for the spirit sequence and materialization cycle. The extension teaches the language by speaking it.

**Taste note**: correctness, expressiveness, performance.

## Scope

- **In scope**: register-aware completion for metrics and root/selector contexts, **phase-aware completion** (after `?` suggest `~`, after `&` suggest `*`, cursor-local phase determines suggestion ranking), clickable code-lens actions including materialization-state lenses ("Generate body" on frames without projections, "Stale projection" on ungrounded bodies), probe/run commands, **materialization breadcrumb** in status bar showing `priming|concept|frame|body` for cursor context, **spirit-sequence phase indicator** in status bar, theming nuance tied to state and confidence, formatting/refactor interactions, graph-query affordances, **operator-frequency heat** command showing the current file's operator distribution (echoing the manifest's `$%[op.distribution]` probe), interaction rules for surfacing runtime/probe state in ordinary editing flow, shared `SpwContext` fields (`activePhase`, `materializationState`, `probeHistory`), optional consumption of atlas/register context when present, and cross-plan event emission (`authoring.phaseEntered`, `materialization.advanced`, `probe.completed`).
- **Out of scope**: redesigning the formatter, replacing the terminal harness, adding a bespoke webview console, or implementing manifest parsing or register snapshot transport (atlas and register-explorer scope respectively).

## Files

```text
[NEW] .agents/plans/vscode-authoring-probe-loop/PLAN.md
[NEW] .agents/plans/vscode-authoring-probe-loop/wip.spw
[NEW] .agents/plans/vscode-authoring-probe-loop/vscode-authoring-probe-loop.spw
[MOD] extensions/vscode-spw/package.json
[MOD] extensions/vscode-spw/src/extension.ts
[MOD] extensions/vscode-spw/src/context.ts
[NEW] extensions/vscode-spw/src/status/runtime-status.ts
[NEW] extensions/vscode-spw/src/commands/probe-commands.ts
[MOD] packages/spw-lsp/src/context.ts
[MOD] packages/spw-lsp/src/types.ts
[MOD] packages/spw-lsp/src/stdio-server.ts
[MOD] packages/spw-lsp/src/handlers/editing.ts
[MOD] packages/spw-lsp/src/handlers/display.ts
[MOD] packages/spw-lsp/src/handlers/analysis.ts
[DEL] (none)
```

### Craft guard

- Keep completions data-driven; do not hardcode another parallel register vocabulary into the completion handler.
- Keep code-lens text and commands aligned so every promoted action explains exactly what it will inspect or reveal.
- Treat status surfaces as summary only; detailed register/probe inspection should stay in explorer or detail commands.
- Formatting and refactor actions should reuse the same semantic model as probes and completion so the editor does not teach contradictory transformations.
- Watch `packages/spw-lsp/src/handlers/editing.ts` and `packages/spw-lsp/src/handlers/display.ts` for density; helper extraction may be needed before behavior grows.
- Phase-aware completion must derive suggestions from `SIGIL_SEMANTICS` and the spirit sequence, not from a parallel hardcoded map. The completion handler reads the cursor's look-back context to determine the current phase.
- Materialization breadcrumb and phase indicator must be cheap to compute — no full AST reparse on every keystroke. Use the document's cached parse result from `ServerIndex.getDocument()`.
- SpwContext fields added by this plan (`activePhase`, `materializationState`, `probeHistory`) must be additive; do not remove or rename fields from the atlas or register-explorer plans.
- Status messages use Spw vocabulary: "? → 3 resonances found", "cursor phase: ~ potential", "body ungrounded — spec owner changed".
- If atlas/register context is absent, degrade to local file scope rather than hiding completions, code-lens actions, or status surfaces.

## Phase-Aware Completion

The spirit sequence defines a natural progression. The completion system should make this felt. The **literate-ui pattern** (`.spw/patterns/literate-ui.spw`) formalizes each operator as a navigation gesture and each phase as a completion context — the look-back rule and suggestion ranking below are direct applications of literate-ui's spirit navigation spine.

- **Look-back rule**: from the cursor position, scan backward for the nearest unmatched spirit operator. This determines the current phase context.
- **Phase-appropriate suggestions**: after `?` (probe), rank `~` operators and naming patterns higher. After `&` (merge), rank `*` collapse and concrete binding patterns higher. After `^` (framing), suggest closing the frame and naming the integration.
- **Spirit-sequence hint**: when the user types a spirit operator, the completion detail shows where this operator sits in the full sequence (`?~@&*^`) and what typically follows.
- **Binding-phase awareness**: `!`, `=`, `%`, `#` are binding operators outside the main spirit progression. Completions after these should suggest the appropriate binding-phase patterns (action targets, constraints, metrics, annotation names) rather than spirit-sequence continuations.

This behavior is computed in the LSP completion handler (`packages/spw-lsp/src/handlers/editing.ts`) by reading the cursor's parse context from the cached AST.

## Materialization Breadcrumb

A status bar element showing the current expression's position in the materialization cycle:

- **Display**: `priming` | `concept` | `frame` | `body` — one word, updated on cursor movement.
- **Computation**: same heuristics as the atlas materialization badges — scan the cursor's enclosing AST context for `~` bindings, `^` frames, and projection lineage.
- **Code lens integration**: frames without generated bodies show a "Generate body" lens. Bodies with stale spec owners show "Body ungrounded" warning lens.
- **Event emission**: when the cursor moves across a materialization boundary, emit `materialization.advanced` so the atlas can update badges and the register explorer can refresh.

## Operator-Frequency Heat

A command ("Spw: Show Operator Distribution") that displays the current file's operator frequency breakdown:

- **Mirrors** the manifest's own `$%[op.distribution]@here` probe.
- **Presentation**: quick pick or notification showing each spirit operator's count and percentage. Dominant phase highlighted.
- **Purpose**: makes the language's self-reflective quality visible during editing. Helps users understand a file's "voice" — whether it's probe-heavy, frame-heavy, or action-heavy.
- **Reuse**: the same operator-frequency computation powers the atlas's phase perspective grouping.

## Phase-Aware Hover

Hovering over a spirit operator should show more than the SIGIL_SEMANTICS entry:

- **Spirit-sequence position**: visual indicator of where this operator sits in `?~@&*^`.
- **What typically follows**: brief guidance on the natural next phase.
- **Register effect**: what this operator does to register state (charges, names, scopes, merges, collapses, frames).
- **Materialization context**: whether this operator is contributing to priming, conceptualization, framing, or body generation.

## Cross-Surface Interaction

The authoring loop participates in the cross-plan event bus:

- **Consumes** `atlas.rootSelected`: scope completion suggestions to the selected root's vocabulary (root-prefixed paths, annotations from files under that root).
- **Consumes** `register.focused`: show the focused register in code lenses and highlight its source location if it's in the active file.
- **Emits** `authoring.phaseEntered`: when the cursor enters a new spirit-sequence phase context, notify the register explorer (highlight phase group) and status bar.
- **Emits** `materialization.advanced`: when the cursor crosses a materialization boundary, notify the atlas (update badges) and register explorer (refresh).
- **Emits** `probe.completed`: when a trial run or probe command finishes, notify the atlas (update resonance counts) and register explorer (refresh snapshot).

## SpwContext Evolution

This plan adds three fields to `SpwContext`:

- `activePhase: { phase: number, sigil: string, cursorUri: string, line: number } | null` — spirit-sequence phase at cursor position, updated on cursor movement.
- `materializationState: 'priming' | 'concept' | 'frame' | 'body' | null` — materialization stage for cursor context, updated on cursor movement.
- `probeHistory: ProbeResult[]` — recent probe results for the active document, bounded to last 10 results.

These fields complete the `SpwContext` shape defined in `vscode-interaction-contract.spw`.

## Provides

- `SpwContext.activePhase`
- `SpwContext.materializationState`
- `SpwContext.probeHistory`
- `authoring.phaseEntered`
- `materialization.advanced`
- `probe.completed`

## Consumes

- none for solo ship
- optional `manifestState` and `activeRoot` from atlas for root-scoped completion/query narrowing
- optional `registerSnapshot` and `focusedRegister` from register explorer for richer code-lens and inspection pivots

## Solo Ship

- The authoring loop must provide useful completion, hover, code-lens, probe commands, and status surfaces from cached parse/runtime context even when atlas and register surfaces are absent.
- Root scoping, register pivots, and cross-surface status mirroring are additive integrations rather than prerequisites for editor affordances.

## Recursive Improvement

- Re-read selection, tooling, and literate-ui patterns before widening authoring affordances.
- Ship one editor affordance at a time and test whether the same wording survives completion, hover, status, and docs.
- Promote only the patterns that still teach Spw when atlas/register enrichments are absent.
- Keep authoring value cheap enough to run continuously; no feature should require an expensive reparse or a second dashboard mentality.

## Synergy Paths

- `authoring-probe-loop x atlas`: root selection scopes completion/query affordances and authoring status can mirror atlas lens rotation.
- `authoring-probe-loop x register-explorer`: focused registers and probe completions deepen code-lens, hover, and refactor previews.
- `atlas x register-explorer x authoring-probe-loop`: cursor target, register target, and atlas node can rotate as one interaction river rather than three isolated workflows.

## Commits

1. `.[plans] — stage vscode-authoring-probe-loop planning artifacts`
2. `&[vscode-authoring] — add phase-aware completion and spirit-sequence hover`
3. `&[vscode-authoring] — add actionable code-lens commands and materialization breadcrumb`
4. `&[vscode-authoring] — add probe/run commands, operator-frequency heat, and editor status surfaces`
5. `&[vscode-authoring] — wire cross-surface events and SpwContext fields`
6. `![vscode-authoring] — verify compile and authoring-loop interaction paths`

## Agentic Hygiene

- Rebase target: `main@3b1747c4` (regrounded 2026-03-27 to match the packages-era plan ecology)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none currently. The March 26, 2026 drift note is stale in the current clean worktree, but `extensions/vscode-spw/src/extension.ts`, `extensions/vscode-spw/src/context.ts`, `extensions/vscode-spw/package.json`, and `packages/spw-lsp/src/stdio-server.ts` remain shared hot files and should be checked again before implementation starts.

## Cognitive Surface Stack

The authoring loop operates at the **register layer** — it makes spirit-sequence phase, materialization state, and operator coupling visible during editing. This is where syntax-as-navigation from literate-ui becomes cursor-local editorial experience.

| Authoring Surface | Spw Layer | Reads From |
|---|---|---|
| Phase-aware completion | register | cursor-local operator determines spirit-sequence phase from `register-bank.spw`; ranking follows `literate-ui.spw` spirit navigation: after ? suggest ~, after & suggest * |
| Materialization breadcrumb | cognitive | `literate-architecture.spw` priming→concept→frame→body; heuristic from cached AST depth and ProjectionEntry presence |
| Spirit indicator | register | spirit-sequence position from `literate-ui.spw` phase affordances; clicking rotates per @-operator gesture |
| Code lens actions | semantic+register | "Generate body" reads `literate-architecture.spw` materialization cycle; "Stale projection" reads ServerIndex freshness |
| Operator heat | register | `register-bank.spw` acoustic properties (frequency, coupling) via $%[op.distribution] probe |
| Phase hover | register | spirit-sequence position + register effect from `register-bank.spw` phase_mutations; connects to `literate-ui.spw` navigation gesture |
| Probe commands | substrate | Substrate event stream; results carry resonance + register snapshots when runtime-telemetry-canon available |

**Spw internals used**: spw-seed (parser, types, query), spw-runtime (RegisterBank, interpretSeed, Substrate), spw-lsp (editing handler, display handler, analysis handler).

**Canon surfaces**: `.spw/registries/register-bank.spw` (operator→register→phase→acoustic semantics), `.spw/registries/dialect-spec.spw` (dialect markers for context), `.spw/patterns/literate-ui.spw` (spirit navigation spine, operator gesture map), `.spw/patterns/literate-architecture.spw` (materialization cycle), `.spw/conventions/selection.spw` (query axes for probe affordances).

## Dependencies

- Thin-client baseline (March 26, 2026): VS Code phases 1-3 and the metadata pass already moved standard editor features into the LSP and narrowed the extension to a small client shell. This plan should spend budget on authoring-specific semantics, cheap status surfaces, and probe flow, not on reviving client-side language providers.
- Shared interaction substrate: `.agents/plans/vscode-workspace-atlas/vscode-interaction-contract.spw` defines additive event vocabulary, capability names, context growth rules, transport tiers, and cross-theme enrichment paths.
- Client-composition substrate: whichever VS Code surface lands first should extract additive `SpwContext` growth, typed client events, and typed `spw/*` request helpers from `extensions/vscode-spw/src/extension.ts` and `extensions/vscode-spw/src/context.ts` before multiple surfaces widen the same shell in parallel.
- Multi-agent coordination risk: `extensions/vscode-spw/src/extension.ts`, `extensions/vscode-spw/src/context.ts`, `extensions/vscode-spw/package.json`, and `packages/spw-lsp/src/stdio-server.ts` are shared hot files with atlas/register work; pairwise integration commits should be split from the authoring loop's solo-ship path when work proceeds in parallel.
- `manifestState`, `activeRoot`, `registerSnapshot`, and `focusedRegister` are optional enrichments, not blockers. This plan should remain reviewable and shippable from local parse/runtime context before the atlas or register explorer land.

### Cross-theme enrichments (not blockers)

- **runtime-telemetry-canon** (landed): provides immutable substrate events and resonances from runtime pipeline, which makes `probe.completed` results richer. Without it, probe results are shallow value snapshots. With it, probes return full telemetry including resonance edges.
- **register-phase-evolution** (planning): provides canonical pipeline-phase vocabulary. Without it, phase-aware completion maps only spirit-sequence operators. With it, hover and completion can bridge between spirit-sequence operators and the register pipeline phases they correspond to.
- **absorb-spwq-cli** (verifying): provides repaired selector traversal. Without it, "Trace Selector At Cursor" and graph-query probes use the current implementation with possible gaps. With it, selector resolution is reliable across the full corpus.
- **seed phase-context extraction** (unscoped): a targeted addition to the seed parser that returns the spirit-sequence context at a given cursor offset — the nearest enclosing spirit operator, its phase index, and the materialization stage. Without it, the authoring loop's look-back rule uses regex heuristics from the raw text. With it, phase detection is AST-precise. See `vscode-interaction-contract.spw ^["cross_theme_enrichments"].seed_phase_context`.

### Phase vocabulary note

This plan uses "phase" to mean spirit-sequence phase (`?~@&*^`) in completions, hover, and status bar. When register data is available and pipeline phase differs from spirit-sequence phase, the hover and detail views show both axes. See `vscode-interaction-contract.spw ^["phase_vocabularies"]`.

## Fuzz Strategy

- Explore: `npm --prefix extensions/vscode-spw run compile`
- Stabilize: `npm --prefix extensions/vscode-spw run compile && bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed --no-state`
- Ship gate: `npm --prefix extensions/vscode-spw run compile && npm run lsp:smoke && git diff --check`

## Spw Artifacts

Interaction spec:

```text
.agents/plans/vscode-authoring-probe-loop/vscode-authoring-probe-loop.spw
```

Cross-plan interaction contract (owned by workspace-atlas, referenced here):

```text
.agents/plans/vscode-workspace-atlas/vscode-interaction-contract.spw
```
