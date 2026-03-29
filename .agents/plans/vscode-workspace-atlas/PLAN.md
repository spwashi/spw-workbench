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

## Performance Considerations

### Manifest parsing
Parse `.spw/workspace.spw` **once** at activation and cache in `SpwContext.manifestState`. Re-parse only on `workspace/didChangeWatchedFiles` for that specific file. Use `ServerIndex.getDocument()` if the file is open, otherwise `fs.readFile()`. The manifest is typically <200 lines — parsing cost is negligible.

### Tree view refresh
`TreeDataProvider.onDidChangeTreeData` should fire only when data actually changes, not on every LSP response. Use a content-hash comparison on the manifest + index snapshot to skip no-op refreshes. VS Code tree views re-render the entire visible range on each event.

### Workspace temperature polling
`spw/workspaceTemperature` returns `ServerIndex` document state for all tracked files. For a workspace with 200 `.spw` files, this is ~200 entries × ~50 bytes = ~10KB. Poll on a **30-second interval** or on `textDocument/didSave`, not on every request tick. Store results in `SpwContext.workspaceTemperature` (already a `Map`).

### Operator-frequency computation for phase perspective
Computing dominant phase per file requires scanning each file for spirit operators. This is the same computation as authoring's "Show Operator Distribution" command. For the tree view:
- Compute **lazily on tree node expand**, not eagerly for all workspace files
- Cache per content hash in `ServerIndex.getDocument()` metadata
- Typical cost: ~1ms per file (regex scan of all lines)

### Resonance computation
The `spw/resonance` endpoint must query all 4 channels. Annotation co-occurrence and root cross-reference are cheap (map lookups). Projection lineage is cheap (array scan). Register coupling requires runtime data (optional). Total resonance computation should be **on-demand per node** (triggered by "Show Resonance Neighbors" command or tree expand), never on initial tree load.

### Materialization badge heuristic
Same heuristic as authoring's breadcrumb but applied per file, not per cursor. Compute during workspace scan (`ServerIndex.scanWorkspace()`) and cache on `DocumentState`. Cost is trivial — check for presence of `~`, `^`, and `ProjectionEntry` per file.

### Memory: avoid holding duplicate document text
The tree view only needs metadata (root name, tier, phase badge, materialization stage). Do NOT copy full document text into tree nodes. Reference `ServerIndex.getDocument()` by URI for any detail lookups.

## Design Considerations

### Cognitive
- **Map, not file browser**: the atlas is a workspace map organized by roots, memory tiers, and contracts — not a flat file listing. Each tree node answers "what role does this play in the workspace?" rather than "what files are here?". The user builds a mental model of workspace topology, not directory structure.
- **Manifest as authority**: when the manifest is present, it names what exists. The index observes what's active. This distinction should be visible — manifest-derived labels are definitive, index-derived badges are observational. The user learns to trust the manifest as the workspace's self-description.
- **Perspective rotation as reframing**: switching between topology/contract/resonance/phase/query views should feel like rotating a crystal — same data, different light. Each perspective answers a different question about the same workspace. The rotation gesture teaches that workspace structure has multiple legible axes.
- **Materialization badges as lifecycle**: `priming → concept → frame → body` badges show where each surface sits in its development lifecycle. The user sees the workspace as a living system with surfaces at different stages of maturity, not a static collection of finished files.
- **Resonance as coupling made visible**: "Show Resonance Neighbors" reveals structural relationships that aren't obvious from the file tree — annotation co-occurrence, cross-root references, projection lineage. This teaches graph thinking about the workspace.

### Ergonomic
- **Activity bar placement**: the atlas lives in its own activity bar container ("Spw Atlas"), not as a sub-panel of the existing Explorer. This gives it dedicated real estate and avoids competing with VS Code's native file tree.
- **Click-to-navigate**: every tree node is navigable. Clicking a root node opens the root directory. Clicking a file node opens the file. Clicking a resonance neighbor navigates to that file. No dead-end nodes.
- **Expand-to-learn**: detail data (phase badges, temperature, materialization stage) loads lazily on node expand. The collapsed tree is fast and scannable. Expanding reveals depth without slowing the initial view.
- **Perspective rotation via command**: rotation between the 5 perspectives uses a command palette entry or a toolbar button in the tree view header. The user shouldn't need to remember which perspective they're in — the tree view title shows it (e.g., "Spw Atlas — Phase").
- **Manifest-absent graceful mode**: when no `workspace.spw` exists, the atlas still renders using `ROOT_MAP` and index data. All sections labeled "inferred" rather than showing error states. The user can still navigate — they just see less authority.

### Aesthetic
- **Spw vocabulary in labels**: use "Re-ground" not "Refresh". Use "Rotate lens" not "Switch view". Tree nodes show root sigils (`@cluster`, `@artifact`) as their primary labels. Phase badges use role names (`~ potential`, `^ integration`).
- **Temperature as warmth metaphor**: hot/warm/cold tier badges use subtle color coding if the VS Code theme supports it (via `ThemeColor`), but always include text labels. The metaphor is workspace "activity temperature" — recently touched files are warm, forgotten files are cold.
- **Minimal tree icons**: use VS Code's built-in `ThemeIcon` set (`folder`, `file`, `symbol-variable`, `symbol-namespace`). Do NOT add custom icons unless they convey meaning that text labels cannot. Each icon should map to a concept from the workspace vocabulary.
- **Consistent node shape**: every tree item follows the pattern: `[icon] label — detail`. Label is the Spw name. Detail is the observational badge (phase, tier, materialization stage). This creates a scannable, uniform rhythm in the tree.

## Implementation Notes

### What already exists
- `SpwContext` fields: `manifestState`, `workspaceTemperature`, `activeRoot` — already typed and initialized to null/empty in `context.ts:144-146`
- `SpwEventBus`: `atlas.rootSelected` and `atlas.perspectiveRotated` already wired in `context.ts:42-49`
- `ROOT_MAP` in `roots.ts` — current hardcoded root definitions, fallback when manifest absent
- `ServerIndex` tracks documents with tier/beat metadata, has `scanWorkspace()`, `allAnnotations()`, annotation lookups
- `ConceptCluster.coOccurs` in `server-index.ts` — annotation co-occurrence is already computed (resonance channel 1)
- `ProjectionEntry` in `server-index.ts:50-57` — projection graph exists (resonance channel 3)
- Custom request infrastructure: `createSpwCustomRequestClient()` in `lsp/custom-requests.ts` handles typed `spw/*` requests

### New files needed
1. **`extensions/vscode-spw/src/views/workspace-tree.ts`** — `TreeDataProvider<AtlasNode>` with root/memory/generated/contracts sections. Implements 5 perspective rotations. Receives `SpwContext`, emits `atlas.rootSelected` and `atlas.perspectiveRotated` on interaction.
2. **`packages/spw-lsp/src/handlers/workspace.ts`** — handles `spw/workspaceTemperature`, `spw/resonance`, and `spw/manifestState` custom requests. Reads from `ServerIndex` and manifest parser.

### Files to modify
- **`extension.ts`**: import and register `WorkspaceAtlasTreeView`. Add to `disposables`. ~8 lines.
- **`package.json`**: add `views` contribution for "Spw Atlas" in activity bar, 5 `commands` for perspective rotation and navigation, `menus` for tree item context. ~40 lines of JSON.
- **`stdio-server.ts`**: add 3 case blocks in `handleRequest` for the new `spw/*` methods, delegating to `workspace.ts` handler. ~15 lines.
- **`server-index.ts`**: expose `getDocumentTiers()` method returning tier/beat data for all documents. ~10 lines.

### Hot file coordination
The atlas tree view is a self-contained module (`workspace-tree.ts`) receiving `SpwContext`. The only `extension.ts` change is a registration call. `stdio-server.ts` gets new dispatch cases but no handler logic inline — workspace handler is extracted. Merge risk with authoring is low if both plans keep handler logic in separate files.

### Manifest parsing approach
Parse `.spw/workspace.spw` using `@spwashi/spw-seed` parser (same parser the LSP already uses for all `.spw` files). Extract root entries, memory locations, layer declarations by walking the AST for `^["roots"]`, `^["memory_locations"]`, etc. The manifest is already a standard `.spw` file — no special parser needed.

### Fallback strategy (no manifest)
When `.spw/workspace.spw` is missing:
- Roots: use `ROOT_MAP` from `roots.ts`, label as "inferred"
- Memory: show only index-derived temperature (from `ServerIndex` tiers)
- Generated/Harness/Contracts: hide sections entirely
- Queries: available but scoped to discovered files
The tree should degrade gracefully, not error.

### Rebase target update
Current target (`main@96815893`) is stale. Rebase to current main before implementation.

## Commits

1. `.[plans] — stage vscode-workspace-atlas planning artifacts`
2. `&[vscode-workspace] — derive atlas metadata from workspace manifest and index helpers`
3. `&[vscode-workspace] — add workspace atlas tree and root/memory navigation commands`
4. `&[vscode-workspace] — add phase perspective, materialization badges, and resonance endpoint`
5. `![vscode-workspace] — verify extension compile and manifest fallback behavior`

## Agentic Hygiene

- Rebase target: `main@96815893` (updated 2026-03-27)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none currently. The March 26, 2026 drift note is stale in the current clean worktree, but `extensions/vscode-spw/src/extension.ts`, `extensions/vscode-spw/src/context.ts`, `extensions/vscode-spw/package.json`, and `packages/spw-lsp/src/stdio-server.ts` remain shared hot files and should be checked again before implementation starts.

## Cognitive Surface Stack

The workspace atlas operates at the **cognitive layer** — it reads semantic and register data to present the workspace's own self-description as a navigable model.

| Atlas View | Spw Layer | Reads From |
|---|---|---|
| Roots | cognitive | `workspace.spw` manifest, `literate-architecture.spw` module shapes — each root is a navigable entry point per literate-ui operator gesture map |
| Memory | cognitive+register | manifest placement + ServerIndex cache tiers; `register-bank.spw` acoustic properties (liminality, frequency, coupling) inform heat badges |
| Phase perspective | register | operator frequency analysis per root yields dominant spirit-sequence phase from `register-bank.spw` phase definitions; navigable axis per `literate-ui.spw` spirit navigation |
| Materialization badges | cognitive | `literate-architecture.spw` priming→concept→frame→body cycle; heuristic reads ~bindings, ^frames, ProjectionEntry from ServerIndex |
| Resonance | substrate | four channels computed from Substrate events and RegisterBank coupling — annotation co-occurrence, root cross-reference, projection lineage, register coupling |
| Perspective rotation | cognitive | topology/contract/resonance/phase/query views are rotation lenses per `literate-ui.spw` @-operator gesture (reframe/rotate) |

**Spw internals used**: spw-seed (parser, query), spw-runtime (RegisterBank, Substrate, resonance detection), spw-lsp (ServerIndex, ServerContext, workspace handler).

**Canon surfaces**: `.spw/workspace.spw` (manifest source of truth), `.spw/registries/register-bank.spw` (acoustic properties, phase definitions), `.spw/patterns/literate-ui.spw` (operator→navigation gesture map, spirit navigation spine), `.spw/patterns/literate-architecture.spw` (module shape → materialization cycle).

## Dependencies

- Thin-client baseline (March 26, 2026): VS Code phases 1-3 and the metadata pass already collapsed the plugin to a thin LSP client. Standard language features now live in `packages/spw-lsp/src/stdio-server.ts`; the client shell is mostly one Concepts tree, one annotation mirror, and declarative package contributions. The next planning risk is client-side composition pressure, not more provider migration.
- Shared interaction substrate: `vscode-interaction-contract.spw` defines the additive event vocabulary, capability model, context growth rules, transport tiers, and cross-theme enrichment paths. It can land before or with any one of the three VS Code surface slices.
- Client-composition substrate: whichever VS Code surface lands first should extract additive `SpwContext` growth, a typed event bus, and typed `spw/*` request helpers from `extensions/vscode-spw/src/extension.ts` and `extensions/vscode-spw/src/context.ts` before widening the client shell with more views or status items.
- Multi-agent coordination risk: `extensions/vscode-spw/src/extension.ts`, `extensions/vscode-spw/package.json`, `extensions/vscode-spw/src/context.ts`, and `packages/spw-lsp/src/stdio-server.ts` are shared hot files with `vscode-register-explorer` and `vscode-authoring-probe-loop`; pairwise integration commits should be split from the atlas's solo-ship path when work proceeds in parallel.
- `vscode-register-explorer` and `vscode-authoring-probe-loop` may consume `manifestState`, `workspaceTemperature`, and `activeRoot` opportunistically, but the atlas itself must not depend on either plan for a coherent first ship.
- Handler-registration substrate: `stdio-server.ts` should gain an extracted handler registration pattern before this plan adds `handlers/workspace.ts`. See `vscode-interaction-contract.spw ^["handler_registration"]`.

### Cross-theme enrichments (not blockers)

- **runtime-telemetry-canon** (landed): provides immutable `resonances` from pipeline results, which unlocks resonance channel 4 (register coupling). Without it, the atlas renders three resonance channels and labels register coupling as unavailable.
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
