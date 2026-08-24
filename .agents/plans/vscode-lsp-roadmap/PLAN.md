# Plan: vscode-lsp-roadmap

Coordinate **editor clients** (VS Code primary reference, Neovim native peer, IntelliJ follow-on) and `spw-lsp` as one ecology: ordered rungs, thin-client doctrine, capability honesty, shared diagnostics/probes, and links to TypeScript upgrade/perf plans.

## Goal

The repo already has rich VS Code/LSP *plans* and working preview clients (VS Code + Neovim), but the plan graph is hard to execute: some surfaces are partially landed, client custom-request types advertise methods the server never handles, and **editor-specific chrome** risks forking semantics that belong in the LSP. This roadmap is the **execution truth** layer — not a feature dump and not a VS-Code-only wishlist.

End state: agents and humans can answer (1) what ships first, (2) what is already true in tree, (3) what must stay in LSP vs client, (4) how both VS Code and Neovim project the same server truth through native affordances, (5) how performance and type-safety support editor quality.

**Taste note**: clarity, layering, evidence discipline, performance, **cross-client honesty**.

### Multi-client doctrine (2026-07-27)

| Layer | Owner | VS Code | Neovim |
|-------|--------|---------|--------|
| Parse / measure / mobility / mass | Seed | consume via LSP | consume via LSP |
| Diagnostics, hover, code actions, rename, format | `spw-lsp` | LanguageClient | `vim.lsp` |
| Custom `spw/*` (earned only) | `spw-lsp` | `custom-requests.ts` | `lsp.request_custom` |
| Trees / status bar / webviews | VS Code client | Concepts, Atlas, strip | **do not port** — use quickfix, notify, splits, lualine |
| Syntax fallback | client | TextMate | `syntax/spw.vim` + treesitter queries |
| Commands | client map | Command palette | `:Spw*` + keymaps |

**Rule:** new author value lands as **LSP diagnostics / code actions / earned methods** first. Client chrome is a *projection*, not a second semantic engine. Neovim does not need VS Code panels; it needs **peer depth**. Parity is truth density and named receipts, not chrome.

**Feedback law (2026-08-24):** host designs are not assumed sound or complete, and they are not sketches of one another. Keep them because they disclose cache layer, profile stack, and runtime cost. Missing depth or uneven parity is the next kernel, profile, or runtime question — not permission to finish one IDE or to starve a peer.

## Current reality (2026-07-21)

### Landed (do not re-plan as greenfield)

| Surface | Evidence |
|---------|----------|
| Thin client + LanguageClient | `extensions/vscode-spw/src/extension.ts` |
| Neovim native LSP client | `extensions/neovim-spw/lua/spw/lsp.lua`, `:Spw*` commands, `gf`/`gF` navigation |
| Compiled LSP preferred; tsx fallback | VS Code `createServerOptions` prefers `*.js`; Neovim resolves workbench / mount |
| Concepts + Workspace Atlas trees | VS Code only: `views/concepts-tree.ts`, `views/workspace-tree.ts` |
| Context strip + navigation | VS Code `context-strip.ts`; Neovim statusline via standard diagnostics |
| Annotation index | VS Code `annotation-index.ts` |
| Custom request client types | VS Code `lsp/custom-requests.ts`; Neovim wrappers for operatorFreq / phase / form / temperature |
| Standard LSP methods | definition, hover, symbols, completion, codeLens, format, rename, semantic tokens, … |
| Server custom methods | `spw/select`, `spw/annotations`, `spw/contextAtPosition`, `spw/workspaceManifest`, `spw/workspaceTemperature` |
| LSP package build | `packages/spw-lsp` → `build:server` → `dist/stdio-server.js` |
| Lore upstream bridge plan | **done** (historical; do not reopen) |
| Seed self-mass + CLI mass | `self-mass.ts`, `spw mass` — **not yet** projected as editor diagnostics |

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
| **Measure not in editor** | `%mass` / authority live in seed+CLI; wonder `$%[file.*]` metrics and plan surfaces have no diagnostic loop in VS Code or Neovim |
| **Neovim phantom parity risk** | `:SpwOperatorFreq` / `:SpwPhase` call methods that may still be client-ahead of server (same capability honesty problem as VS Code) |
| **Panel-first bias** | Plans historically specify VS Code trees; Neovim authors (and mounted consumers) need quickfix/statusline projections of the same packets |

## Execution ladder (ordered)

| Rung | Plan | Outcome |
|------|------|---------|
| **0a** | `operational-topography` | Seed-owned parse/structure coordinates, evidence/effect grades, exact selection, differential envelopes — **kernel largely landed; remaining: pair AST labels, editor projection** |
| **0b** | This roadmap + editor-contract | Observation ownership, presentation authority, invalidation rules; **client-agnostic** |
| **0c** | `form-geometry-editor` | Project form geometry + pulse into LSP: hover packet, mobility code actions, `spw/formContext`, pulse check — **both clients** |
| **1** | `lsp-custom-request-completions` | Canonical protocol registry + matrix; kill or implement phantoms; **earn `spw/formContext` before new garden methods**; demote Neovim wrappers that call dead methods |
| **1b** | `measure-invariant-generalization` → LSP | Project `%mass`/scheme/authority reconcile as **diagnostics + exact-only code actions** (no client re-measure) |
| **2** | `vscode-plugin-performance` | Compiled launch default, lean activation, incremental annotations, shared cursor context; server-side cost bounds help Neovim equally |
| **2n** | `neovim-spw-surfaces` | Mounted-consumer audit; keymap/quickfix quality; earned command wrappers only; **no panel-parity program** |
| **3a** | Atlas **follow-up** | Extract tree complexity; resonance only via earned method (**VS Code**) |
| **3b** | `vscode-register-explorer` | Register tree + server `spw/registerSnapshot` (**VS Code chrome**; Neovim gets optional float later) |
| **4** | `vscode-authoring-probe-loop` | Mobility/HOF actions, pulse, wonder-block probes, plan-context — **LSP-first; Neovim `:Spw*` projections** |
| **4c** | `curiosity-mutation-ergonomics` | Combinator walk invitations, explore/stabilize mutation families — **seed/CLI first**; LSP invitation packets after |
| **4d** | `syntax-profile-stack` + `shape-syntax-ecology` | Dialect/stack on hover; experimental syntax catalog refs; screenshot dual-read policy; cache keys dialect×preprocess |
| **4e** | `refactor-experiment-lifecycle` | Multi-file plan apply from editor only via earned WorkspaceEdit from plan |
| **5** | `vscode-cognitive-surface` | Reading profiles (author / prompt / research / creative), orientation copy — shared vocabulary; client chrome differs |
| **after 1** | `spw-garden-geometry` | Anti-echo + measurement profiles over shared evidence (uses formContext, not a second model) |
| **∥** | `typescript-perf-audit-infra` + `typescript-upgrade-ladder` | Faster typecheck; not a substitute for editor perf |

Parallel safe after rung 2: IntelliJ/LSP4IJ, mounted-consumer evidence, and Neovim surface hardening, as long as they do not fork semantics.

### Highest-leverage product slices (both editors)

Priority order for “plugin feels like a workbench”:

1. **Mass / path / open-question diagnostics** — declare→observe→reconcile in the problem list; exact-only fix (`workspace/applyEdit`).
2. **Cursor-local probe actions** — code action / `:SpwCodeAction` on `%mass`, `!probe`, `?["…"]` wonder blocks, `$%[file.*]` metric lines (screenshot-native).
3. **Status-disciplined hover** — runtime/token facts first; interpretive metaphors only with `#implemented` / `#proposed` / `#interpretive` badges.
4. **Plan context** — when URI is under `.agents/plans/<slug>/`, expose next commit / open count (VS Code status strip; Neovim statusline or `:SpwPlan`).
5. **Dialect / profile stack on hover** — `resolveSurfaceProfile`; machine_lint; experimental catalog ids when present.
6. **Brace material packet** — coupling occupancy/payload (formContext); dual liminality never collapsed.
7. **Screenshot/LLM play policy** — stable semantic tokens; vision proposes, AST/plan disposes.

## Imagination / play (roadmap-level)

Plans in this ecology are for **humans who deepen expertise**—optionally folding an LLM via IDE or screenshot. They are not execution authority. Play: open three plans (syntax-profile-stack, form-geometry-editor, shape-syntax-ecology) and reconstruct the lattice without chat history.
5. **Reading profiles** — noise budget: author vs prompt-fold vs research vs creative (config / `vim.g.spw_reading_profile`).

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
11. **Measure is Seed-owned; write is exact+drift only.** Clients never invent tolerances; schemes come from the surface or a named profile.
12. **Neovim is a peer client, not a port.** Native quickfix, floats, and keymaps project the same packets; do not require VS Code tree views for Neovim completeness.
13. **Wonder and `$%` metrics are first-class probe sites.** Surfaces like `.spw/index.spw` already author `!probe` and `$%[file.frame_count, …]`; the editor must close that loop.

## Scope

- **In scope**: plan ecology hygiene, Seed/LSP ownership, protocol-registry honesty, performance rung, ordered surface delivery for **VS Code + Neovim**, shared differential and measure projections, cross-links to TS plans and `measure-invariant-generalization`, fill missing PLAN.md files, refresh stale file lists and base refs.
- **Out of scope**: implementing all surfaces in one branch; changing Spw language semantics; VS Code webview consoles; Neovim external UI plugins as dependencies; adopting TS 7 inside one extension alone without monorepo dual-install policy.

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
[NEW] .agents/plans/neovim-spw-surfaces/PLAN.md
[MOD] .agents/plans/measure-invariant-generalization/PLAN.md
[MOD] .spw/tooling/vscode-spw.spw
[MOD] .spw/tooling/neovim-spw.spw
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
- Hard input for measure diagnostics: `measure-invariant-generalization` seed schemes (rung 1b may land exact-mass diagnostics before full EvalScheme)
- Peer client: `neovim-spw-surfaces` (rung 2n)
- Soft: `spw-garden-geometry` (anti-echo profiles after formContext)
- Soft: `typescript-perf-audit-infra`, `typescript-upgrade-ladder`, `mounted-consumer-tooling`, `audit-fuzz-truthfulness`

## Failure Modes

- **Hard**: implementing register/authoring features on phantom client methods → runtime failures
- **Soft**: atlas “greenfield” PRs that rewrite landed trees instead of extracting
- **Soft**: performance work that only lengthens debounce
- **Non-negotiable**: thin-client boundary; no absolute paths in commits

## Validation

- **Hypotheses**: capability matrix matches stdio-server + custom-requests; ladder order reduces thrash on `extension.ts` / `stdio-server.ts`
- **Negative controls**: the landed standalone LSP entrypoint remains stable; language semantics remain unchanged
- **Demo**: open PLAN table → point at files in tree → show one phantom method pair

## Spw Artifact

`.agents/plans/vscode-lsp-roadmap/vscode-lsp-roadmap.spw`
