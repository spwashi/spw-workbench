# Plan: vscode-register-explorer

Add a register-first VS Code surface so runtime state is inspectable as a workspace artifact rather than only as hover text and passive code-lens summaries, with explicit support for resonance, graph-style inspection, and perspective rotation.

## Goal

The extension already computes runtime trial results and exposes fragments of register information in hover and code-lens output, but the user still has no stable place to inspect register state, provenance, phase, write history, or resonance while editing. The desired end state is a dedicated Register Explorer surface in the Spw activity bar with predictable states, explicit commands, graph-aware detail flows, and perspective rotations that make registers feel like first-class workspace objects rather than debug residue. This improves clarity and expressiveness by making register behavior legible without forcing the user to leave the editor or infer state from scattered hints.

This is a component-design rung in the current ecology. The explorer should not only expose runtime state; it should teach how an editor-side component can embody language design, graph thinking, and inspection taste. The plan becomes stronger when each UI decision can be reviewed against existing runtime/code patterns and when the surface leaves behind reusable snippets, event names, and inspection idioms rather than one-off panel behavior.

The register explorer is one of three coordinated VS Code surfaces. It contributes `SpwContext.registerSnapshot` and `SpwContext.focusedRegister`, can consume atlas context when it exists, and must still ship coherently from active-file runtime snapshots when the atlas or authoring loop have not landed. See `vscode-interaction-contract.spw` in the workspace-atlas plan directory for the shared event vocabulary, capability model, and additive composition contract.

**Taste note**: clarity, expressiveness, containment.

## Scope

- **In scope**: define a register explorer view, register tree hierarchy, detail interactions, refresh/reveal commands, runtime-trial-backed data flow, resonance presentation across files or register groups, graph-query entry points for selected registers, rotation rules between phase/provenance/resonance views, materialization-stage-aware inspection affordances (priming registers show charging operators; body-stage registers show materialized values and projection lineage), spirit-sequence phase trajectory in detail views, optional cross-surface filtering when atlas emits `atlas.rootSelected`, shared `SpwContext` fields (`registerSnapshot`, `focusedRegister`), cross-plan event emission (`register.focused`, `register.phaseChanged`), the minimum LSP transport needed to expose register snapshots to the VS Code extension without making atlas state mandatory, and explicit review of existing runtime/query/editor patterns so the explorer grows from organic repo idioms rather than generic tree-view defaults.
- **Out of scope**: redesigning runtime register semantics, adding persistent register history storage, changing `RegisterBank` contracts, building a custom webview inspector, or implementing manifest parsing (workspace-atlas scope).

## Files

```text
[NEW] .agents/plans/vscode-register-explorer/PLAN.md
[NEW] .agents/plans/vscode-register-explorer/wip.spw
[NEW] .agents/plans/vscode-register-explorer/vscode-register-explorer.spw
[MOD] extensions/vscode-spw/package.json
[MOD] extensions/vscode-spw/src/extension.ts
[MOD] extensions/vscode-spw/src/context.ts
[NEW] extensions/vscode-spw/src/views/registers-tree.ts
[MOD] packages/spw-lsp/src/context.ts
[MOD] packages/spw-lsp/src/types.ts
[MOD] packages/spw-lsp/src/stdio-server.ts
[NEW] packages/spw-lsp/src/handlers/runtime.ts
[MOD?] packages/spw-lsp/src/server-index.ts
[DEL] (none)
```

### Craft guard

- Keep register fetching behind one typed LSP request boundary; do not duplicate runtime trial logic in the extension.
- Keep the tree model and command wiring separate so `registers-tree.ts` does not become another monolithic extension surface.
- Avoid introducing a second register vocabulary alongside runtime types; labels in the UI should map directly to runtime fields such as phase, writes, provenance, and resonances.
- Keep graph-query and rotation interactions additive; the first slice should deepen inspection rather than turn the explorer into a general graph UI.
- Watch file size in `packages/spw-lsp/src/stdio-server.ts` and `extensions/vscode-spw/src/extension.ts`; both are already shared hot spots.
- SpwContext fields added by this plan (`registerSnapshot`, `focusedRegister`) must be additive; do not remove or rename fields that the atlas plan introduced.
- If atlas context is present, consume `atlas.rootSelected` to filter registers by root scope. If atlas context is absent, fall back to active-file or workspace snapshot scope rather than blocking the explorer.
- Materialization stage determines inspection affordances: priming registers show charging operators, concept registers show named potential and references, frame registers show container structure, body registers show materialized values and projection lineage.

## Spirit-Sequence Phase Trajectory

Registers carry phase state from the spirit sequence (`?~@&*^`). The explorer should make this visible:

- **Phase grouping**: the primary tree grouping is by current phase. Each phase group uses the sigil's role name from `SIGIL_SEMANTICS` (e.g., "? wonder/probe", "~ potential/name").
- **Phase trajectory**: the detail view shows the register's phase history — what operators charged it, what collapsed it, and whether it has traversed the full spirit sequence or stalled.
- **Cross-surface sync**: when atlas emits `atlas.perspectiveRotated({ perspective: 'phase' })`, the explorer can match phase grouping without losing the current selection. When a register's phase changes between snapshots, emit `register.phaseChanged` so atlas and authoring surfaces can respond. When a register is focused, emit `register.focused` so the atlas highlights resonance neighbors and the authoring loop can show the register in code lenses.

## Materialization-Aware Inspection

Each register sits at a stage in the `priming → concept → frame → body` cycle. The detail view adapts its affordances based on stage:

| Stage | Detail affordances |
|---|---|
| Priming | Show charging operators, disposition, pending bindings |
| Concept | Show named potential, `~` bindings, unbound references |
| Frame | Show `^` container structure, relations, probe attachment points |
| Body | Show materialized value, projection lineage, stale/fresh status |

The heuristic for determining a register's materialization stage mirrors the atlas logic: presence/absence of `~` bindings, `^` frames, and `ProjectionEntry` links in the server index.

## Cross-Surface Interaction

The register explorer participates in the cross-plan event bus defined in `vscode-interaction-contract.spw`:

- **Consumes** `atlas.rootSelected`: filter the register tree to registers touched by files under the selected root. This avoids showing a global dump when the user has narrowed their atlas context.
- **Consumes** `probe.completed`: refresh the register snapshot when a probe finishes, since probes may alter register state.
- **Emits** `register.focused`: when the user selects a register, notify the atlas (highlight resonance) and authoring loop (show in code lens).
- **Emits** `register.phaseChanged`: when a register's phase changes between snapshots, notify the atlas for phase-view updates.

## SpwContext Evolution

This plan adds two fields to `SpwContext`:

- `registerSnapshot: RegisterSnapshot | null` — latest runtime trial register state, typed as `{ registers: RegisterEntry[], timestamp: number, fileUri: string }`.
- `focusedRegister: { name: string, phase: number, fileUri: string } | null` — currently inspected register, emitted via `register.focused`.

These fields are additive on top of the atlas plan's contributions.

## Provides

- `SpwContext.registerSnapshot`
- `SpwContext.focusedRegister`
- `register.focused`
- `register.phaseChanged`

## Consumes

- none for solo ship
- optional `manifestState` and `activeRoot` from atlas for root-scoped filtering
- optional `probe.completed` from authoring for snapshot refresh

## Solo Ship

- The explorer must show useful register state for the active file even when atlas context is absent and no cross-surface events are available.
- Root filtering, register-coupling resonance, and phase synchronization are additive enrichments rather than prerequisites for rendering the tree.

## Synergy Paths

- `register-explorer x atlas`: selected roots narrow register scope and focused registers highlight atlas resonance neighbors.
- `register-explorer x authoring-probe-loop`: focused registers become code-lens/status pivots and completed probes refresh snapshots.
- `atlas x register-explorer x authoring-probe-loop`: one semantic target can rotate between root context, register state, and editor action while preserving selection identity.

## Performance Considerations

### Register snapshot transport
The `spw/registerSnapshot` custom request crosses the stdio process boundary. Register snapshots for a single file include 12 operator registers × (value + phase + writes + provenance). Typical payload: ~2KB JSON.
- Fetch **on file open/save and on explicit refresh**, not on every keystroke
- Cache in `SpwContext.registerSnapshot` with a `fileUri + contentHash` key
- The LSP runs `trialRunSpw()` to produce snapshots — this is synchronous and typically <50ms for a single file, but can spike for files with deep runtime evaluation. Add a **200ms timeout** and return stale cache on timeout.

### Tree view refresh
Same principle as atlas: fire `onDidChangeTreeData` only when the snapshot actually changes (compare content hash). Group all register entries by phase — 7 phase groups × N registers per phase. Keep the tree flat (2 levels: phase group → register) to avoid deep nesting re-renders.

### Phase trajectory computation
Phase trajectory (write history) requires walking the register's provenance chain. This data comes from `runtime-telemetry-canon` when available. Without it, the detail view shows only the current phase (cheap — already in the snapshot). Do NOT compute trajectory eagerly for all registers in the tree; compute **on detail expand** only.

### Acoustic properties
Liminality, frequency, and coupling are computed from register write patterns. These are derived values, not stored — compute them from the snapshot's write count, beat age, and cross-register reference patterns. Cost: O(registers²) for coupling, but with only 12 registers this is <1ms.

### Resonance from substrate events
Substrate events (if `runtime-telemetry-canon` is available) provide resonance edges. These are already computed during `runSpw()` and included in the telemetry payload. The register explorer just reads them from the snapshot — no additional computation needed. Without telemetry, resonance section shows "unavailable" (not empty, not error).

### Memory: snapshot lifecycle
Register snapshots become stale immediately after any edit. Strategy:
- Show the snapshot with a "stale" badge after edits (do NOT discard it)
- Auto-refresh on save (same as diagnostics)
- Manual refresh via "Re-ground Registers" command
- Never hold more than 1 snapshot per file in memory

## Design Considerations

### Cognitive
- **Registers as workspace objects, not debug dumps**: the explorer presents 12 operator registers as named, phase-grouped entities — not a raw variable watch list. Each register has a role (`? wonder/probe`, `~ potential/name`), a phase position in the spirit sequence, and observable state. The user encounters registers as first-class language concepts.
- **Phase grouping as primary axis**: the tree's top-level grouping by spirit-sequence phase teaches the operator progression. A user scanning the tree reads: wonder → potential → perspective → confluence → value → integration. The register explorer *is* a spirit-sequence teaching tool.
- **Materialization-aware detail**: different lifecycle stages surface different information. A priming register shows "charging operators" — what's flowing in. A body-stage register shows "materialized value" and "projection lineage" — what came out and where it went. This teaches that registers evolve, not just store.
- **Two phase axes, clearly labeled**: spirit-sequence phase (`?~@&*^`) answers "what operator charged this register?" Pipeline phase (`lex→parse→semantic`) answers "when did the runtime see it?" When both are available, the detail view shows both with clear headings. When only spirit-sequence is available (solo ship), it's the only axis — no empty "pipeline phase: unavailable" noise.
- **Resonance as entanglement**: when register coupling data is available, the resonance section shows which other registers share state or provenance. This makes the `&` operator's entanglement physics tangible — the user can see how `& confluence/merge` creates observable coupling between registers.

### Ergonomic
- **Activity bar placement**: the register explorer lives in the same "Spw" activity bar as the atlas, as a separate view. This gives both views dedicated real estate while keeping them visually grouped.
- **Focus-to-inspect**: clicking a register emits `register.focused` and opens a detail section (child nodes expand) showing value, phase, writes, and available metadata. No modal panels, no separate detail views, no context switches.
- **Stale-but-visible snapshots**: after an edit, the snapshot shows a "(stale)" suffix on the tree view title. The stale data is still visible and useful — the user can compare stale state with their edit to understand what changed. Auto-refresh on save restores freshness.
- **Reveal from editor**: "Spw: Reveal Register at Cursor" command focuses the register that the cursor's current operator maps to. This bridges the editor and the explorer without requiring the user to manually find registers in the tree.
- **Refresh on demand**: the tree does NOT auto-refresh on every keystroke. Manual refresh ("Re-ground Registers" command), auto-refresh on save, and auto-refresh on `probe.completed` events. The user controls the snapshot rhythm.

### Aesthetic
- **Spw vocabulary**: phase groups use `SIGIL_SEMANTICS` role names: "? wonder/probe", "~ potential/name", "^ integration/framing". Register detail labels use runtime field names: "writes", "phase", "provenance". The explorer speaks the same language as the runtime.
- **Phase sigil as icon**: each phase group node uses the sigil character itself as a label prefix: `? wonder/probe (2)` where `(2)` is the register count in that phase. The sigil IS the icon — no need for custom images.
- **Value display**: register values are displayed as compact one-line summaries, not pretty-printed JSON. For strings: quoted. For objects: `{...}` with key count. For arrays: `[...]` with length. Detail expansion shows full value if needed.
- **Consistent with atlas rhythm**: tree item shape mirrors the atlas: `[sigil] label — detail`. Phase groups: `? wonder/probe — 2 registers`. Individual registers: `~ potential — "my_value" (3 writes)`. Uniform scanning rhythm across both tree views.

## Implementation Notes

### What already exists
- `SpwContext` fields: `registerSnapshot` and `focusedRegister` — already typed and initialized in `context.ts:147-148`
- `SpwEventBus`: `register.focused` and `register.phaseChanged` already wired in `context.ts:50-60`
- `SIGIL_SEMANTICS` in `server-index.ts:105-119` — phase names and role descriptions for tree labels
- `trialRunSpw()` in `HandlerDeps` — already available for snapshot generation
- `RegisterBank` in `packages/spw-runtime/src/state/register-bank.ts` — the runtime source of register state
- `type-affinities.ts` in `packages/spw-runtime/src/state/` — register access mode types
- Custom request infrastructure in `lsp/custom-requests.ts` — already handles `spw/annotations` and `spw/select`

### Data availability assessment
**Without runtime-telemetry-canon** (solo ship):
- Register names, current phase, current value: available from `trialRunSpw()` return value
- Write count: available if RegisterBank exposes it (check `register-bank.ts`)
- Provenance chain: NOT available — show "provenance requires runtime telemetry"
- Substrate events: NOT available — hide resonance section
- Acoustic properties: can compute liminality and frequency from write count; coupling requires cross-register data

**With runtime-telemetry-canon** (enriched):
- Full provenance chains, substrate events, detected resonances, register metadata all available
- Phase trajectory becomes meaningful (shows operator sequence that charged the register)

### New files needed
1. **`extensions/vscode-spw/src/views/registers-tree.ts`** — `TreeDataProvider<RegisterNode>` with phase-grouped tree. Receives `SpwContext`, emits `register.focused` on selection. ~200 lines estimated.
2. **`packages/spw-lsp/src/handlers/runtime.ts`** — handles `spw/registerSnapshot` and optionally `spw/registerDetail` custom requests. Runs `trialRunSpw()`, extracts register state, returns typed snapshot. ~100 lines estimated.

### Files to modify
- **`extension.ts`**: register the tree view and refresh command. ~8 lines.
- **`package.json`**: add `views` contribution for "Spw Registers" in activity bar, 3 commands (refresh, reveal, focus). ~25 lines of JSON.
- **`stdio-server.ts`**: add case blocks for `spw/registerSnapshot` and `spw/registerDetail`. ~10 lines.
- **`types.ts`**: add `RegisterSnapshotResult` and `RegisterDetailResult` response types. ~15 lines.

### Hot file coordination
Same as atlas — the tree view is a self-contained module, `extension.ts` gets a registration call, `stdio-server.ts` gets dispatch cases. The register handler (`runtime.ts`) is a new file with no overlap. Merge risk is low.

### Solo-ship truth
The explorer MUST render useful state from `trialRunSpw()` alone. The solo-ship tree shows:
- 7 phase groups (from `SIGIL_SEMANTICS`)
- Current register values and write counts
- "Provenance: requires runtime telemetry" placeholder
- "Resonance: unavailable" placeholder

This is still valuable — it makes the 12 operator registers visible as workspace objects. The enriched version adds depth, not the initial shape.

### Rebase target update
Current target (`main@3b1747c4`) is stale. Rebase to current main before implementation.

## Commits

1. `.[plans] — stage vscode-register-explorer planning artifacts`
2. `&[vscode-registers] — add typed register snapshot transport to the LSP shell`
3. `&[vscode-registers] — add register explorer tree and reveal/refresh commands`
4. `&[vscode-registers] — add materialization-aware detail view and cross-surface event wiring`
5. `![vscode-registers] — verify extension compile and register snapshot flows`

## Agentic Hygiene

- Rebase target: `main@3b1747c4` (updated 2026-03-27)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none currently. The March 26, 2026 drift note is stale in the current clean worktree, but `extensions/vscode-spw/src/extension.ts`, `extensions/vscode-spw/src/context.ts`, `extensions/vscode-spw/package.json`, and `packages/spw-lsp/src/stdio-server.ts` remain shared hot files and should be checked again before implementation starts.

## Cognitive Surface Stack

The register explorer operates at the **substrate layer** — it exposes runtime register state, provenance, acoustic properties, and resonance as inspectable workspace objects. This is where the `register-bank.spw` specification becomes a lived experience.

| Explorer View | Spw Layer | Reads From |
|---|---|---|
| Register tree | register | primary grouping by spirit-sequence phase using `register-bank.spw` SIGIL_SEMANTICS role names; each node is an operator register per `literate-ui.spw` component mapping |
| Phase trajectory | register | write history from spw-runtime RegisterBank provenance chains; pipeline phase from register-phase-evolution when available, spirit-sequence phase always |
| Materialization detail | cognitive | `literate-architecture.spw` priming/concept/frame/body stages determine different inspection affordances per stage |
| Acoustic properties | substrate | liminality (mutation openness 0–3), frequency (writes/sec), coupling (entanglement 0–1) — all from `register-bank.spw` acoustic model, computed by spw-runtime RegisterBank |
| Resonance | substrate | four channels from Substrate event stream; `register-bank.spw` defines bidirectional coupling invariant for & edges |
| Graph query | register+substrate | SPWQ selector traversal over selected register; results show co-occurring registers and resonance neighbors |
| Perspective rotation | register | phase/provenance/resonance views as rotation lenses per `literate-ui.spw` @-operator gesture |

**Spw internals used**: spw-seed (types, query), spw-runtime (RegisterBank, Substrate, resonance detection, type-affinities, interpretSeed), spw-lsp (runtime handler, ServerIndex).

**Canon surfaces**: `.spw/registries/register-bank.spw` (THE canonical source — operator→register→phase→acoustic semantics, storage model, invariants), `.spw/patterns/literate-ui.spw` (register→component mapping, operator gesture categories), `.spw/tooling/vscode-spw.spw` (capability registry).

## Dependencies

- `plan-ecology-clustering` — this plan currently occupies a `component` rung and should turn runtime/query study into a discussable editor component rather than a disconnected panel.
- Thin-client baseline (March 26, 2026): VS Code phases 1-3 and the metadata pass already moved standard editor features into the LSP and narrowed the extension to a small client shell. This plan should spend budget on register-specific transport, tree composition, and inspection idioms, not on reintroducing client-side providers.
- Shared interaction substrate: `.agents/plans/vscode-workspace-atlas/vscode-interaction-contract.spw` defines additive event vocabulary, capability names, context growth rules, transport tiers, and cross-theme enrichment paths.
- Client-composition substrate: whichever VS Code surface lands first should extract additive `SpwContext` growth, typed client events, and typed `spw/*` request helpers from `extensions/vscode-spw/src/extension.ts` and `extensions/vscode-spw/src/context.ts` before multiple surfaces widen the same shell in parallel.
- Multi-agent coordination risk: `extensions/vscode-spw/src/extension.ts`, `extensions/vscode-spw/src/context.ts`, `extensions/vscode-spw/package.json`, and `packages/spw-lsp/src/stdio-server.ts` are shared hot files with the atlas and authoring plans; integration commits should be split from the register explorer's solo-ship path when work proceeds in parallel.
- `manifestState`, `activeRoot`, and `probe.completed` are optional enrichments, not blockers. This plan should be reviewable and shippable before the atlas or authoring surfaces land, provided fallback scope behavior is in place.
- Handler-registration substrate: `stdio-server.ts` should gain an extracted handler registration pattern before this plan adds `handlers/runtime.ts`. See `vscode-interaction-contract.spw ^["handler_registration"]`.

### Cross-theme enrichments (not blockers)

- **runtime-telemetry-canon** (landed): provides immutable substrate events, detected resonances, and register metadata from `runSpw()`. This is the primary data source for register snapshots — without it, snapshots contain values and basic phase but lack provenance, substrate events, and resonance edges. With it, the explorer can show full phase trajectory, register coupling, and provenance chains.
- **register-phase-evolution** (planning): provides canonical pipeline-phase vocabulary (`lex`, `parse`, `semantic`, `optimize`, `pragmatic`) aligned across runtime, query, and docs. Without it, the explorer uses spirit-sequence phase from `SIGIL_SEMANTICS` for grouping. With it, the explorer can show pipeline phase alongside spirit-sequence phase in the detail view.
- **monorepo-workspace-foundation** (ready_to_commit): restructures `packages/spw-lsp/` paths. Same coordination note as the atlas plan.

### Phase vocabulary note

This plan uses two "phase" axes (see `vscode-interaction-contract.spw ^["phase_vocabularies"]`): **spirit-sequence phase** (what operator semantics the register was charged by — `?~@&*^`) and **pipeline phase** (when the runtime enriched the register — `lex`, `parse`, `semantic`, etc.). In the explorer tree, unqualified "phase" means pipeline phase. The detail view shows both when both are available.

## Principal Engineering Orientation

- Ladder position: `component`
- Judgment target: use one editor component to sharpen inspection taste, state naming, and the relationship between runtime truth and editor affordance
- Commit bar: every slice should leave behind one reusable context/event idiom, one reviewable detail-view concept, and one clearer way to discuss register behavior across plans

## Review Surfaces

- Extension surfaces: `extensions/vscode-spw/src/extension.ts`, `extensions/vscode-spw/src/context.ts`, `extensions/vscode-spw/package.json`
- Transport/runtime surfaces: `packages/spw-lsp/src/stdio-server.ts`, `packages/spw-lsp/src/context.ts`, `packages/spw-lsp/src/types.ts`, `packages/spw-lsp/src/handlers/runtime.ts`
- Semantic precedents: `extensions/vscode-spw/src/semantics.ts`, `packages/spw-runtime/src/state/register-bank.ts`, `packages/spw-runtime/src/state/type-affinities.ts`, `packages/spw-runtime/src/pipeline/substrate.ts`
- Canon surfaces: `.spw/registries/register-bank.spw`, `.spw/patterns/literate-ui.spw`, `.agents/plans/vscode-workspace-atlas/vscode-interaction-contract.spw`

## Capability Transfer

- Interaction capability: tree navigation, detail panes, event emission, and perspective rotation
- Runtime capability: register snapshot truth, phase history, provenance, and resonance need to stay close to runtime terminology
- Discussion capability: the explorer should create better conversations about what a register is, how it changes, and which phase axis the user is actually looking at

## Syntax and Snippet Discipline

- Stable inspection syntax: labels, commands, and detail headings should reuse canonical register/phase terms from runtime and query plans
- Event snippets: preserve a small corpus of event payload examples (`register.focused`, `register.phaseChanged`, `atlas.rootSelected`) so cross-surface wiring stays inspectable
- Solo-ship snippets: the first useful active-file snapshot and reveal/refresh commands should be demonstrable without the atlas plan present

## Fuzz Strategy

- Explore: `npm --prefix extensions/vscode-spw run compile`
- Stabilize: `npm --prefix extensions/vscode-spw run compile && node --import tsx packages/spw-lsp/src/stdio-server.ts`
- Ship gate: `npm --prefix extensions/vscode-spw run compile && npm run lsp:smoke && git diff --check`

## Spw Artifacts

Interaction spec:

```text
.agents/plans/vscode-register-explorer/vscode-register-explorer.spw
```

Cross-plan interaction contract (owned by workspace-atlas, referenced here):

```text
.agents/plans/vscode-workspace-atlas/vscode-interaction-contract.spw
```
