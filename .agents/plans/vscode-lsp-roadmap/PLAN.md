# Plan: vscode-lsp-roadmap

Coordinate VS Code extension and `spw-lsp` work as one ecology: ordered rungs, thin-client doctrine, capability honesty, and links to TypeScript upgrade/perf plans.

## Goal

The repo already has rich VS Code/LSP *plans* and a working preview extension, but the plan graph is hard to execute: some surfaces are partially landed, some PLAN.md files were missing, base SHAs drifted, file predictions still say `[NEW]` for code that exists, and client custom-request types advertise methods the server never handles. This roadmap is the **execution truth** layer — not a feature dump.

End state: agents and humans can answer (1) what ships first, (2) what is already true in tree, (3) what must stay in LSP vs client, (4) how performance and type-safety work support editor quality.

**Taste note**: clarity, layering, evidence discipline, performance.

## Current reality (2026-07-21)

### Landed (do not re-plan as greenfield)

| Surface | Evidence |
|---------|----------|
| Thin client + LanguageClient | `extensions/vscode-spw/src/extension.ts` |
| Compiled LSP preferred; tsx fallback | `createServerOptions` prefers `*.js` |
| Concepts + Workspace Atlas trees | `views/concepts-tree.ts`, `views/workspace-tree.ts` |
| Context strip + navigation | `context-strip.ts`, `navigation.ts` |
| Annotation index | `annotation-index.ts` |
| Custom request client types | `lsp/custom-requests.ts` |
| Standard LSP methods | definition, hover, symbols, completion, codeLens, format, rename, semantic tokens, … |
| Server custom methods | `spw/select`, `spw/annotations`, `spw/contextAtPosition`, `spw/workspaceManifest`, `spw/workspaceTemperature` |
| LSP package build | `packages/spw-lsp` → `build:server` → `dist/stdio-server.js` |
| Lore upstream bridge plan | **done** (historical; do not reopen) |

### Seed kernel landed (editor must project, not re-invent)

| Surface | Evidence | Editor implication |
|---------|----------|-------------------|
| Coupling ONF frames | `packages/spw-seed/src/types/coupling.ts`, normalize | Hover packet: kind/form/occupancy/payload |
| Form / boundary ladders | `canonical/form-ladders.ts`, `docs/theory/spw/form-ladders.spw` | Ladder notation + axes at caret |
| Form contours | `canonical/form-contours.ts`, `docs/theory/spw/form-contours.spw` | Density-budgeted hover/outline/agent views with loss receipts |
| Form geometry (label mobility) | `canonical/form-geometry.ts`, mobility rules + HOF | Code actions / preview rewrites |
| Mutation automata + pulse CLI | `canonical/mutation-automata.ts`, `spw-cli` pulse | Format/pulse check share one edit kernel |
| Differentials | `canonical/differential.ts` | `SourceEdit` → LSP `TextEdit` map |
| Topography probes | `canonical/topography-probe.ts`, topography scan | Diagnostics prose-fallback / structureMoved |
| Register liminality bridge (explicit S1 profile) | `spw-runtime` liminality-bridge | Optional command after honest snapshot; syntax has no effect |
| Theory | `form-geometry.spw`, `mutation-automata.spw`, `operational-transform.spw` | Teaching copy must cite E/S grades |

### Gaps / drift

| Issue | Detail |
|-------|--------|
| **Capability split-brain** | Client types `spw/resonance`, `spw/registerSnapshot`, `spw/operatorFrequency`, `spw/phaseContext` — **not handled** in `stdio-server.ts` |
| **No `spw/formContext`** | Seed geometry is CLI-probed; LSP/plugin do not yet surface coupling + applicable rules |
| **Code actions thin** | Only trait ⇄ facet toggle; mobility rules unused in editor |
| **Format kernel fork** | LSP format ≠ pulse/mutation automata profiles |
| **Eager activation** | `activationEvents: []` + activate starts LSP, annotation index, strip, both trees immediately |
| **Hot-file bloat** | `display.ts`, `server-index.ts`, atlas/concepts trees remain large |
| **Type debt** | LSP context/types still heavy `any` (JSON-RPC boundary) |
| **Empty `providers/`** | reserved directory, unused |
| **No editor perf identity** | No structured startup/save/cursor measurements |

## Execution ladder (ordered)

| Rung | Plan | Outcome |
|------|------|---------|
| **0a** | `operational-topography` | Seed-owned parse/structure coordinates, evidence/effect grades, exact selection, differential envelopes — **kernel largely landed; remaining: pair AST labels, editor projection** |
| **0b** | This roadmap + editor-contract | Observation ownership, presentation authority, invalidation rules |
| **0c** | `form-geometry-editor` (new) | Project form geometry + pulse into LSP/plugin: hover packet, mobility code actions, `spw/formContext`, pulse check |
| **1** | `lsp-custom-request-completions` | Canonical protocol registry + matrix; kill or implement phantoms; **earn `spw/formContext` before new garden methods** |
| **2** | `vscode-plugin-performance` | Compiled launch default, lean activation, incremental annotations, shared cursor context |
| **3a** | Atlas **follow-up** | Extract tree complexity; resonance only via earned method |
| **3b** | `vscode-register-explorer` | Register tree + server `spw/registerSnapshot` + liminality column (bridge is S1 runtime) |
| **4** | `vscode-authoring-probe-loop` | Mobility/HOF actions, pulse commands, differential previews on stable transport |
| **5** | `vscode-cognitive-surface` | Orientation/teaching polish after core surfaces quiet |
| **after 1** | `spw-garden-geometry` | Anti-echo + measurement profiles over shared evidence (uses formContext, not a second model) |
| **∥** | `typescript-perf-audit-infra` + `typescript-upgrade-ladder` | Faster typecheck; not a substitute for editor perf |

Parallel safe after rung 2: IntelliJ/LSP4IJ and mounted-consumer evidence, as long as they do not fork semantics.

### Editor projection slices (from form-geometry proposal)

| Slice | Effect | Notes |
|-------|--------|-------|
| **P0** | Coupling hover + digraph/capsule honesty | S0; seed `readCouplingFrame` |
| **P0** | Code actions whose actual-source mobility receipts pass health/loss/revision gates | S1 plan → S2 apply on accept |
| **P1** | `spw/formContext` + context strip | One density-parameterized contour packet for strip/actions/teaching |
| **P1** | Pulse/mutation → LSP `TextEdit` map | One differential kernel |
| **P2** | Diagnostics prose-fallback; optional empty-bound inlays | Config-gated |
| **P2** | Semantic token modifiers occupancy / couple vs capsule | Theme-friendly, no charge law |
| **P3** | HOF walk UI + register bridge command | After honest snapshot path |

## Doctrine (non-negotiable)

1. **Seed owns parse and structural truth; LSP assembles and transports revision-addressed observations.** Clients compose and render; they do not re-parse Spw for meaning.
2. **No phantom methods.** If the client types a `spw/*` method, the server implements it *or* the type is removed/optional until earned.
3. **Visibility budget.** Hidden trees do not drive cursor/LSP traffic.
4. **Incremental over debounce.** Prefer invalidation ownership over longer timers.
5. **Additive `SpwContext`.** New fields only; no silent renames across surface plans.
6. **Hot files extract before grow.** `display.ts`, `server-index.ts`, tree views, `stdio-server` dispatcher — extract helpers, do not widen further.
7. **Measure editor paths separately from `tsc`.** TS 7 speed ≠ extension startup.
8. **One differential kernel.** CLI formatting, standard LSP edits, code actions, pulse, and label-mobility rewrites project one plan (`SourceEdit` / mobility `apply`); editor settings are inputs, not a second semantics.
9. **Geometry is Seed-owned.** Form ladders, mobility rules, and HOF programs live in `spw-seed`; LSP transports observations and previews; plugin never re-parses for meaning.
10. **Implemented rules only as executable actions.** Proposed mobility rules may appear as teaching text, never as silent auto-rewrite.

## Scope

- **In scope**: plan ecology hygiene, Seed/LSP ownership, protocol-registry honesty, performance rung, ordered surface delivery, shared differential projections, cross-links to TS plans, fill missing PLAN.md files, refresh stale file lists and base refs.
- **Out of scope**: implementing all surfaces in one branch; changing Spw language semantics; replacing IntelliJ work; adopting TS 7 inside the extension alone without monorepo dual-install policy.

## Files (roadmap artifacts only)

```text
[NEW] .agents/plans/vscode-lsp-roadmap/PLAN.md
[NEW] .agents/plans/vscode-lsp-roadmap/wip.spw
[NEW] .agents/plans/vscode-lsp-roadmap/vscode-lsp-roadmap.spw
[NEW] .agents/plans/form-geometry-editor/PLAN.md
[NEW] .agents/plans/form-geometry-editor/wip.spw
[NEW] .agents/plans/form-geometry-editor/form-geometry-editor.spw
[NEW] .agents/plans/vscode-editor-contract/PLAN.md
[NEW] .agents/plans/vscode-cognitive-surface/PLAN.md
[MOD] .agents/plans/vscode-plugin-performance/PLAN.md
[MOD] .agents/plans/vscode-plugin-performance/wip.spw
[MOD] .agents/plans/lsp-custom-request-completions/PLAN.md
[MOD] .agents/plans/lsp-custom-request-completions/wip.spw
[MOD] .agents/plans/vscode-workspace-atlas/PLAN.md
[MOD] .agents/plans/vscode-workspace-atlas/wip.spw
[MOD] .agents/plans/vscode-register-explorer/PLAN.md
[MOD] .agents/plans/vscode-authoring-probe-loop/PLAN.md
[MOD] .agents/plans/operational-topography/PLAN.md
[MOD] .agents/plans/spw-garden-geometry/PLAN.md
```

### Craft guard

- Roadmap stays short and queryable; detail remains in child plans.
- Do not duplicate full feature specs here — point to children.
- Prefer status tables over aspirational prose.

## Commits

1. `.[plans] — stage vscode-lsp-roadmap and fill missing editor plan surfaces`
2. `.[plans] — refresh performance, capability, and atlas plans against landed code`
3. `.[plans] — wire upgrade/perf TypeScript plans into editor ecology`

## Agentic Hygiene

- Rebase target: `main@b4832193891b2b89b7e1e20dc0e462e2e4c9236e`
- Rebase cadence: before any implementation branch from a child plan
- Hygiene split: plan-only commits; no product code in the roadmap branch unless tiny doc cross-links

## Dependencies

- Child plans listed in ladder (do not merge feature work *as* this plan)
- Hard input: `operational-topography` (seed kernel)
- Hard input: `form-geometry-editor` (rung 0c — projects form-geometry + pulse)
- Soft: `spw-garden-geometry` (anti-echo profiles after formContext)
- Soft: `typescript-perf-audit-infra`, `typescript-upgrade-ladder`, `mounted-consumer-tooling`, `audit-fuzz-truthfulness`

## Failure Modes

- **Hard**: implementing register/authoring features on phantom client methods → runtime failures
- **Soft**: atlas “greenfield” PRs that rewrite landed trees instead of extracting
- **Soft**: performance work that only lengthens debounce
- **Non-negotiable**: thin-client boundary; no absolute paths in commits

## Validation

- **Hypotheses**: capability matrix matches stdio-server + custom-requests; ladder order reduces thrash on `extension.ts` / `stdio-server.ts`
- **Negative controls**: lore-upstream-bridge stays done; language semantics unchanged
- **Demo**: open PLAN table → point at files in tree → show one phantom method pair

## Spw Artifact

`.agents/plans/vscode-lsp-roadmap/vscode-lsp-roadmap.spw`
