# Plan: vscode-lsp-roadmap

Coordinate VS Code extension and `spw-lsp` work as one ecology: ordered rungs, thin-client doctrine, capability honesty, and links to TypeScript upgrade/perf plans.

## Goal

The repo already has rich VS Code/LSP *plans* and a working preview extension, but the plan graph is hard to execute: some surfaces are partially landed, some PLAN.md files were missing, base SHAs drifted, file predictions still say `[NEW]` for code that exists, and client custom-request types advertise methods the server never handles. This roadmap is the **execution truth** layer — not a feature dump.

End state: agents and humans can answer (1) what ships first, (2) what is already true in tree, (3) what must stay in LSP vs client, (4) how performance and type-safety work support editor quality.

**Taste note**: clarity, layering, evidence discipline, performance.

## Current reality (2026-07-20)

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

### Gaps / drift

| Issue | Detail |
|-------|--------|
| **Capability split-brain** | Client types `spw/resonance`, `spw/registerSnapshot`, `spw/operatorFrequency`, `spw/phaseContext` — **not handled** in `stdio-server.ts` |
| **Eager activation** | `activationEvents: []` + activate starts LSP, annotation index, strip, both trees immediately |
| **Hot-file bloat** | `display.ts` ~1410, `server-index.ts` ~1160, atlas/concepts trees ~725–750 lines |
| **Type debt** | LSP context/types still heavy `any` (JSON-RPC boundary) |
| **Missing PLAN.md** | `vscode-editor-contract`, `vscode-cognitive-surface` were wip-only |
| **Stale plan files** | Atlas still lists trees/handlers as `[NEW]` though present |
| **Empty `providers/`** | reserved directory, unused |
| **No editor perf identity** | No structured startup/save/cursor measurements (pair with TS perf audit for *tsc*; editor needs own probes) |

## Execution ladder (ordered)

| Rung | Plan | Outcome |
|------|------|---------|
| **0a** | `operational-topography` | Seed-owned parse/structure coordinates, evidence/effect grades, exact selection, and differential envelopes |
| **0b** | This roadmap + editor-contract | Observation ownership, presentation authority, and invalidation rules |
| **1** | `lsp-custom-request-completions` | Canonical protocol registry plus advertised / configured / invoked / observed / tested matrix; kill or implement phantom methods |
| **2** | `vscode-plugin-performance` | Compiled launch defaulted, lean activation, incremental annotations, shared cursor context, parse-backed semantic tokens |
| **3a** | Atlas **follow-up** (not greenfield) | Extract tree complexity, resonance only via earned `spw/resonance`, visibility-gated refresh |
| **3b** | `vscode-register-explorer` | Register tree + **server** `spw/registerSnapshot` (no client-only trial fork) |
| **4** | `vscode-authoring-probe-loop` | Phase-aware completion/status/lenses on top of stable transport |
| **5** | `vscode-cognitive-surface` | Orientation/teaching polish after core surfaces quiet and truthful |
| **after 1** | `spw-garden-geometry` | Optional anti-echo, measurement, and teaching profiles over the shared evidence contract |
| **∥** | `typescript-perf-audit-infra` + `typescript-upgrade-ladder` | Faster agent/typecheck loop; dual-install for eslint; not a substitute for editor perf |

Parallel safe after rung 2: IntelliJ/LSP4IJ and mounted-consumer evidence, as long as they do not fork semantics.

## Doctrine (non-negotiable)

1. **Seed owns parse and structural truth; LSP assembles and transports revision-addressed observations.** Clients compose and render; they do not re-parse Spw for meaning.
2. **No phantom methods.** If the client types a `spw/*` method, the server implements it *or* the type is removed/optional until earned.
3. **Visibility budget.** Hidden trees do not drive cursor/LSP traffic.
4. **Incremental over debounce.** Prefer invalidation ownership over longer timers.
5. **Additive `SpwContext`.** New fields only; no silent renames across surface plans.
6. **Hot files extract before grow.** `display.ts`, `server-index.ts`, tree views, `stdio-server` dispatcher — extract helpers, do not widen further.
7. **Measure editor paths separately from `tsc`.** TS 7 speed ≠ extension startup.
8. **One differential kernel.** CLI formatting, standard LSP edits, code actions, and future layout/label pulses project one parser-verified plan; editor settings are inputs, not a second formatter semantics.

## Scope

- **In scope**: plan ecology hygiene, Seed/LSP ownership, protocol-registry honesty, performance rung, ordered surface delivery, shared differential projections, cross-links to TS plans, fill missing PLAN.md files, refresh stale file lists and base refs.
- **Out of scope**: implementing all surfaces in one branch; changing Spw language semantics; replacing IntelliJ work; adopting TS 7 inside the extension alone without monorepo dual-install policy.

## Files (roadmap artifacts only)

```text
[NEW] .agents/plans/vscode-lsp-roadmap/PLAN.md
[NEW] .agents/plans/vscode-lsp-roadmap/wip.spw
[NEW] .agents/plans/vscode-lsp-roadmap/vscode-lsp-roadmap.spw
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
- Hard input: `operational-topography`
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
