# Plan: vscode-workspace-atlas

Add a workspace atlas view that turns `.spw/workspace.spw` and the LSP index into a navigable model of roots, planes, generated surfaces, memory locations, and cross-tree resonance paths.

## Goal

The workspace already declares its own discovery and navigation contract in `.spw/workspace.spw`, but the VS Code extension still relies on one hardcoded root map and a single Concepts tree. The desired end state is a Workspace Atlas surface that makes roots, memory tiers, generated projections, harness locations, workspace contracts, and cross-tree resonances directly explorable from the activity bar with perspective rotations between topology, contract, resonance, phase, and query views. This improves clarity and layering by letting the extension speak the workspace's own manifest vocabulary instead of maintaining a second flatter model in code.

The atlas is one of three coordinated VS Code surfaces. It contributes manifest state, workspace temperature, and active root selection to the shared `SpwContext`, but it must still ship coherently when the register explorer and authoring loop are absent. See `vscode-interaction-contract.spw` for the shared event vocabulary, capability model, and additive composition contract.

**Taste note**: clarity, layering, naming.

## Scope

- **In scope**: define the atlas view hierarchy, manifest-derived root loading, fallback behavior when the manifest is absent or incomplete, root and plane interactions, graph-query entry points, cross-tree resonance presentation, rotation between topology/contract/resonance/phase/query perspectives, spirit-sequence phase axis for workspace nodes, materialization state badges, live memory temperature alongside declared memory placement, manifest authority rules, shared `SpwContext` fields (`manifestState`, `workspaceTemperature`, `activeRoot`), cross-plan event emission (`atlas.rootSelected`, `atlas.perspectiveRotated`), resonance computation via a typed `spw/resonance` LSP endpoint, the shared interaction contract artifact, and the minimum LSP or index additions needed to expose workspace metadata cleanly without requiring the other two surfaces to land first.
- **Out of scope**: changing the workspace manifest semantics, redesigning root syntax, building projection generation tooling inside the extension, or implementing register snapshot transport (register-explorer scope).

## Files

```text
[NEW] .agents/plans/vscode-workspace-atlas/PLAN.md
[NEW] .agents/plans/vscode-workspace-atlas/wip.spw
[NEW] .agents/plans/vscode-workspace-atlas/vscode-workspace-atlas.spw
[NEW] .agents/plans/vscode-workspace-atlas/vscode-interaction-contract.spw
[MOD] extensions/vscode-spw/package.json
[MOD] extensions/vscode-spw/src/extension.ts
[MOD] extensions/vscode-spw/src/context.ts
[MOD] extensions/vscode-spw/src/roots.ts
[NEW] extensions/vscode-spw/src/views/workspace-tree.ts
[MOD] packages/spw-lsp/src/helpers.ts
[MOD] packages/spw-lsp/src/server-index.ts
[MOD] packages/spw-lsp/src/types.ts
[MOD] packages/spw-lsp/src/stdio-server.ts
[NEW] packages/spw-lsp/src/handlers/workspace.ts
[DEL] (none)
```

### Craft guard

- Prefer deriving atlas data from one manifest-reading path rather than scattering workspace parsing across the extension and LSP.
- Preserve a truthful fallback when `.spw/workspace.spw` is missing; the atlas should degrade, not disappear.
- Keep root labels aligned with manifest terminology such as roots, memory locations, generated surfaces, and harness contracts.
- The atlas should not become a generic graph canvas in this slice; graph queries should open focused result sets around the selected node or subtree.
- Watch hot files `extensions/vscode-spw/src/extension.ts`, `extensions/vscode-spw/src/roots.ts`, and `packages/spw-lsp/src/server-index.ts` for concept creep.
- Structural claims come from the manifest; behavioral observations come from the index. Inferred data must never silently override manifest truth (see `vscode-interaction-contract.spw ^["manifest_authority"]` for the full authority table).
- SpwContext fields added by this plan (`manifestState`, `workspaceTemperature`, `activeRoot`) must be additive; do not remove or rename fields that `context.ts` already exposes.
- Command names should use Spw vocabulary: "Re-ground" over "Refresh", "Rotate lens" over "Switch view", "Unprimed" over "Not initialized".

## Spirit-Sequence Axis

The spirit sequence (`?~@&*^`) is the heart of Spw dynamics. The atlas should make it navigable, not just decorative. The **literate-ui pattern** (`.spw/patterns/literate-ui.spw`) defines how each operator maps to a navigation gesture and how the spirit sequence forms a navigation spine — the atlas's phase perspective is a direct application of this pattern.

- **Phase as a rotation lens**: alongside topology, contract, resonance, and query perspectives, the atlas offers a **phase** perspective that groups workspace nodes by the dominant spirit-sequence operator in their content.
- **Computation**: operator frequency analysis per file or root. The dominant phase is the highest-frequency spirit operator. This reuses the operator-distribution probe already described in the workspace manifest (`$%[op.distribution]@here`).
- **Presentation**: each root or surface node shows a phase badge (e.g., `~ potential`) in phase perspective. The badge uses the sigil's own role name from `SIGIL_SEMANTICS`.
- **Cross-plan emission**: when the user rotates to phase perspective, emit `atlas.perspectiveRotated({ perspective: 'phase' })` so the register explorer can match the grouping.

## Materialization State

Each atlas node can carry a materialization badge reflecting the `priming → concept → frame → body` cycle declared in the workspace manifest:

- **Priming** (charging): operator sequences without named bindings — register disposition being set.
- **Concept** (potential): named `~` bindings without containing `^` frames — unbound references.
- **Frame** (structured): `^`-declared containers with internal structure but no generated projection.
- **Body** (materialized): artifacts in `gen/*` or resolved outputs generated from a frame.

Heuristics for detection: scan the document's AST for the presence/absence of `~` bindings, `^` frames, and projection lineage entries. A file with only operator sequences and no bindings is priming. A file with `~` names but no `^` containers is concept-stage. A file that owns a `^` frame without a corresponding `ProjectionEntry` is frame-stage. A file tracked in `projections` with a valid generated target is body-stage.

Stale detection: a body whose spec-owner frame has a newer content hash than the last generation timestamp is "ungrounded."

## Live Memory Temperature

The Memory section shows two layers:

1. **Declared placement** (manifest-derived): the fixed paths from `^"memory_locations"` — hot, warm, cold, generated with their ownership descriptions.
2. **Observed temperature** (index-derived): which documents are currently in each LSP cache tier, with beat age since last access and mutation frequency.

When the manifest is present, both layers are visible — declared placement as the section label, observed temperature as per-file detail. When the manifest is absent, only observed temperature appears, clearly labeled as "inferred."

The LSP workspace handler exposes a `spw/workspaceTemperature` request that returns `{ uri: string, tier: string, beatAge: number, writeCount: number }[]` from `ServerIndex` document state.

## Resonance Computation

Resonance is observable coupling between workspace nodes across tree boundaries. The atlas computes resonance through four channels:

1. **Annotation co-occurrence**: `ConceptCluster.coOccurs` in `server-index.ts` — concepts that appear in the same files or frames. Strength: shared annotation count normalized by total annotations.
2. **Root cross-reference**: `SpwSelectorHit` paths that resolve across root boundaries. Strength: count of cross-root references.
3. **Projection lineage**: `ProjectionEntry` source → target links. Strength: binary (linked or not), plus stale/fresh status.
4. **Register coupling**: registers that share bindings or provenance across files (available when register-explorer data is present). Strength: count of shared provenance entries.

The LSP exposes a `spw/resonance` request that returns typed resonance edges for a given node URI. The atlas's "Show Resonance Neighbors" command queries all four channels and presents the strongest channel first, with weaker channels expandable on demand.

## Manifest Authority

Structural claims come from the manifest; behavioral observations come from the index.

| Section | Authority | Fallback when manifest absent |
|---|---|---|
| Roots | Manifest-strict | ROOT_MAP hardcoded roots, labeled "inferred" |
| Memory | Manifest for placement, index for temperature | Show only index-derived temperature |
| Generated | Manifest for spec owners, index for stale detection | Hide section entirely |
| Harness | Manifest-strict | Hide section |
| Contracts | Manifest-strict | Hide section |
| Queries | Index-derived, manifest-scoped | Available but scoped to discovered files |

## SpwContext Evolution

This plan adds three fields to `SpwContext`:

- `manifestState: ManifestState | null` — parsed `workspace.spw` with root entries, memory locations, layer declarations, and contract references.
- `workspaceTemperature: Map<string, TierSnapshot>` — live cache tier snapshots from the LSP index, refreshed on `spw/workspaceTemperature` responses.
- `activeRoot: { sigil: string, resolvedPath: string } | null` — currently selected root in the atlas, emitted via `atlas.rootSelected` for cross-surface filtering.

These fields are additive. The register-explorer and authoring-probe-loop plans will contribute their own fields to `SpwContext` in subsequent commit arcs.

## Provides

- `SpwContext.manifestState`
- `SpwContext.workspaceTemperature`
- `SpwContext.activeRoot`
- `atlas.rootSelected`
- `atlas.perspectiveRotated`
- `spw/resonance`
- `spw/workspaceTemperature`

## Consumes

- none for solo ship
- optional `registerSnapshot` data when the register explorer has already added register-coupling resonance

## Solo Ship

- The atlas must render roots, memory, generated surfaces, contracts, and query pivots from manifest + index data even when register or authoring surfaces are absent.
- Register-coupling resonance is additive; when register data is unavailable the atlas still renders the other three resonance channels and labels register coupling as unavailable rather than degraded.

## Synergy Paths

- `atlas x register-explorer`: selected roots narrow register scope, and register-coupling resonance augments atlas neighbors.
- `atlas x authoring-probe-loop`: selected roots scope completion/query surfaces, and authoring status can mirror atlas perspective rotation.
- `atlas x register-explorer x authoring-probe-loop`: one semantic target can rotate between workspace node, register state, and authoring action without losing identity.

## Commits

1. `.[plans] — stage vscode-workspace-atlas planning artifacts`
2. `&[vscode-workspace] — derive atlas metadata from workspace manifest and index helpers`
3. `&[vscode-workspace] — add workspace atlas tree and root/memory navigation commands`
4. `&[vscode-workspace] — add phase perspective, materialization badges, and resonance endpoint`
5. `![vscode-workspace] — verify extension compile and manifest fallback behavior`

## Agentic Hygiene

- Rebase target: `main@f42a80fa8eefb813992e21f7461c96926f033416`
- Rebase cadence: before commit 1, before merge
- Hygiene split: current local drift exists in `extensions/vscode-spw/src/annotation-index.ts`, `extensions/vscode-spw/src/extension.ts`, and `packages/spw-lsp/src/stdio-server.ts`; implementation work should isolate or reconcile that drift before feature commits begin.

## Dependencies

- Shared interaction substrate: `vscode-interaction-contract.spw` defines the additive event vocabulary, capability model, context growth rules, transport tiers, and cross-theme enrichment paths. It can land before or with any one of the three VS Code surface slices.
- Multi-agent coordination risk: `extensions/vscode-spw/src/extension.ts`, `extensions/vscode-spw/package.json`, `extensions/vscode-spw/src/context.ts`, and `packages/spw-lsp/src/stdio-server.ts` are shared hot files with `vscode-register-explorer` and `vscode-authoring-probe-loop`; pairwise integration commits should be split from the atlas's solo-ship path when work proceeds in parallel.
- `vscode-register-explorer` and `vscode-authoring-probe-loop` may consume `manifestState`, `workspaceTemperature`, and `activeRoot` opportunistically, but the atlas itself must not depend on either plan for a coherent first ship.
- Handler-registration substrate: `stdio-server.ts` should gain an extracted handler registration pattern before this plan adds `handlers/workspace.ts`. See `vscode-interaction-contract.spw ^["handler_registration"]`.

### Cross-theme enrichments (not blockers)

- **runtime-telemetry-canon** (ready-for-commit): provides immutable `resonances` from pipeline results, which unlocks resonance channel 4 (register coupling). Without it, the atlas renders three resonance channels and labels register coupling as unavailable.
- **absorb-spwq-cli** (verifying): provides repaired selector traversal, which makes graph queries (cross-root, subtree-focus) more reliable. Without it, queries use the current selector implementation with possible gaps on complex selectors.
- **monorepo-workspace-foundation** (ready_to_commit): restructures `packages/spw-lsp/` paths. If it lands first, `resolveServerPath()` and handler imports need updating. If it lands after, compatibility wrappers in `src/` handle the transition.

## Fuzz Strategy

- Explore: `npm --prefix extensions/vscode-spw run compile`
- Stabilize: `npm --prefix extensions/vscode-spw run compile && npm run lsp:smoke`
- Ship gate: `npm --prefix extensions/vscode-spw run compile && npm run lsp:smoke && git diff --check`

## Spw Artifacts

Interaction spec:

```text
.agents/plans/vscode-workspace-atlas/vscode-workspace-atlas.spw
```

Cross-plan interaction contract (shared with register-explorer and authoring-probe-loop):

```text
.agents/plans/vscode-workspace-atlas/vscode-interaction-contract.spw
```
