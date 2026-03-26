# Plan: vscode-register-explorer

Add a register-first VS Code surface so runtime state is inspectable as a workspace artifact rather than only as hover text and passive code-lens summaries, with explicit support for resonance, graph-style inspection, and perspective rotation.

## Goal

The extension already computes runtime trial results and exposes fragments of register information in hover and code-lens output, but the user still has no stable place to inspect register state, provenance, phase, write history, or resonance while editing. The desired end state is a dedicated Register Explorer surface in the Spw activity bar with predictable states, explicit commands, graph-aware detail flows, and perspective rotations that make registers feel like first-class workspace objects rather than debug residue. This improves clarity and expressiveness by making register behavior legible without forcing the user to leave the editor or infer state from scattered hints.

The register explorer is one of three coordinated VS Code surfaces. It contributes `SpwContext.registerSnapshot` and `SpwContext.focusedRegister`, can consume atlas context when it exists, and must still ship coherently from active-file runtime snapshots when the atlas or authoring loop have not landed. See `vscode-interaction-contract.spw` in the workspace-atlas plan directory for the shared event vocabulary, capability model, and additive composition contract.

**Taste note**: clarity, expressiveness, containment.

## Scope

- **In scope**: define a register explorer view, register tree hierarchy, detail interactions, refresh/reveal commands, runtime-trial-backed data flow, resonance presentation across files or register groups, graph-query entry points for selected registers, rotation rules between phase/provenance/resonance views, materialization-stage-aware inspection affordances (priming registers show charging operators; body-stage registers show materialized values and projection lineage), spirit-sequence phase trajectory in detail views, optional cross-surface filtering when atlas emits `atlas.rootSelected`, shared `SpwContext` fields (`registerSnapshot`, `focusedRegister`), cross-plan event emission (`register.focused`, `register.phaseChanged`), and the minimum LSP transport needed to expose register snapshots to the VS Code extension without making atlas state mandatory.
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

## Commits

1. `.[plans] — stage vscode-register-explorer planning artifacts`
2. `&[vscode-registers] — add typed register snapshot transport to the LSP shell`
3. `&[vscode-registers] — add register explorer tree and reveal/refresh commands`
4. `&[vscode-registers] — add materialization-aware detail view and cross-surface event wiring`
5. `![vscode-registers] — verify extension compile and register snapshot flows`

## Agentic Hygiene

- Rebase target: `main@f42a80fa8eefb813992e21f7461c96926f033416`
- Rebase cadence: before commit 1, before merge
- Hygiene split: current local drift exists in `extensions/vscode-spw/src/annotation-index.ts`, `extensions/vscode-spw/src/extension.ts`, and `packages/spw-lsp/src/stdio-server.ts`; implementation work should isolate or reconcile that drift before feature commits begin.

## Dependencies

- Shared interaction substrate: `.agents/plans/vscode-workspace-atlas/vscode-interaction-contract.spw` defines additive event vocabulary, capability names, and context growth rules.
- Multi-agent coordination risk: `extensions/vscode-spw/src/extension.ts`, `extensions/vscode-spw/src/context.ts`, `extensions/vscode-spw/package.json`, and `packages/spw-lsp/src/stdio-server.ts` are shared hot files with the atlas and authoring plans; integration commits should be split from the register explorer's solo-ship path when work proceeds in parallel.
- `manifestState`, `activeRoot`, and `probe.completed` are optional enrichments, not blockers. This plan should be reviewable and shippable before the atlas or authoring surfaces land, provided fallback scope behavior is in place.

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
