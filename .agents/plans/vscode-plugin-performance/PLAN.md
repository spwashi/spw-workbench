# Plan: vscode-plugin-performance

Improve the VS Code extension's startup, indexing, and live-update behavior without turning the client into a second semantic engine.

## Goal

The preview VS Code extension still pays too much work too early: once activated (on `onLanguage:spw` or either view, since `b7c5c7df`), it starts the LSP, annotation mirror, context strip, concepts tree, and workspace atlas together, and surfaces can request cursor context independently. The extension runs only its bundled server (`dist/stdio-server.js`; the `tsx` fallback is gone), so eager UI work is what still dominates feel. The desired end state is a faster, quieter extension that preserves thin-client posture: semantic truth in `packages/spw-lsp/`, selective activation/refresh/recompute on the client. Remaining eager work is a cache, activation-profile, and scan-bound problem. Do not treat missing trees, strips, or atlas completeness as the performance goal.

**Server-side cost bounds help Neovim equally** (same stdio server). Neovim-specific CursorHold / fold refresh costs live in `neovim-spw-surfaces`; do not “fix” them by adding VS Code-only debounce that leaves the server heavy.

**Taste note**: performance, layering, quiet feedback, multi-client fairness.

## Ladder position

Roadmap rung **2** (after editor-contract + capability honesty). See `.agents/plans/vscode-lsp-roadmap/PLAN.md`.

Does **not** replace `typescript-perf-audit-infra` (that measures `tsc`). Editor paths need separate wall-time probes: activation → LSP ready, save → sidebar, cursor → strip, initialize → scan complete.

## Scope

- **In scope**: ensure compiled server is the default resolved path in workbench + mounted consumers; activation gating (`onLanguage:spw` and/or lazy view registration); incremental annotation sync; single shared cursor-context transport; visibility-gated tree refresh; semantic tokens from parse/index not full-text regex rescans; bounded workspace scan; hot-file extraction if dispatcher/index grows; mounted-consumer measurements; **document server CPU/IO budgets** that Neovim and VS Code share when mass diagnostics and probes land.
- **Out of scope**: new editor capabilities (authoring/measure plans); Spw language changes; atlas/concepts UX redesign beyond refresh policy; full telemetry SaaS; implementing phantom `spw/*` methods (capability plan); TypeScript 7 adoption (upgrade ladder); Neovim UI porting.

## Landed vs remaining (2026-07-20)

| Item | Status |
|------|--------|
| Prefer `stdio-server.js` when present | **Landed** in `extension.ts` |
| `tsx` fallback when only `.ts` | Still present (ok for dev; must not be ship default) |
| Eager `annotationIndex.activate()` + both trees | **Still eager** |
| Shared cursor context bus | **Not landed** |
| Incremental annotation delta | **Not landed** (full rebuild risk remains) |
| Semantic tokens from ServerIndex parse | **Partial / verify** — plan still targets regex elimination |
| Explicit instrument traffic | **Landed** — Form/Stack/Cache are user-invoked; editor TTL cache now exposes its own receipt |
| File size pressure | `display.ts` ~1410, `server-index.ts` ~1160, trees ~725–750 |

**Since 2026-07-20 (checked 2026-10-27):** activation is gated on `onLanguage:spw` and the two views (`b7c5c7df`), and the `tsx` fallback is gone, so `lean_activation` became `~[lazy_views]`. `annotationIndex.activate()` and both trees still start at activation. Semantic tokens still come from the regex scanner (`roleTokens`); moving them onto the parse tokens is `editor-reading-hierarchy` `~[roles_from_lex]`; the server already holds the parse tokens, so roles drawn from them cost no second lex (that plan's measure, 2026-10-26). Sizes at `850077ab`: `display.ts` 1332, `server-index.ts` 1390, trees 708 and 753.

## Mounted-consumer asks (2026-10-12)

Routed from the roadmap table in `vscode-lsp-roadmap/PLAN.md`. This plan stays dormant; the consumer's figures are **named costs** for the retained bench sample the card asks for, not a reason to change startup yet.

- **Named costs (consumer, pin `229aedcf`).** A hover count filled 3 files at 15 s, 74 at 60 s, 120 at 150 s. The CLI's integrity pass alone took about 50 s and 490 MB; a bare query peaked near 560 MB; under swap pressure a query was killed. Cache hits were always 0.
- **Readiness.** Views that count must know whether the index is complete. Report building N of M, ready or stale over standard LSP progress, and refresh each view once on ready.
- **Fact store.** Facts per file keyed by content hash, shared by the CLI and the server, updated per changed file from the watcher. This bears on `?[annotation_transport]` (a per-file delta replaces the client rebuild).
- **Trigger budget.** Nothing runs on a timer when nothing changed; capture mode silences everything but on-save diagnostics. This extends `?[visibility_rule]`.
- **Scope.** Index what the manifest declares and honor `scan_exclusion` and `.gitignore` rather than the fixed `IGNORED_DIRS`; tag archived and scratch facts so counts can say live versus archived and never count scratch.

## Files

```text
[MOD] .agents/plans/vscode-plugin-performance/PLAN.md
[MOD] .agents/plans/vscode-plugin-performance/wip.spw
[REF] .agents/plans/vscode-plugin-performance/vscode-plugin-performance.spw
[REF] .agents/plans/vscode-lsp-roadmap/PLAN.md
[REF] .spw/tooling/editor-surface-audit.spw
[MOD] extensions/vscode-spw/package.json
[MOD] extensions/vscode-spw/src/extension.ts
[MOD] extensions/vscode-spw/src/annotation-index.ts
[MOD] extensions/vscode-spw/src/context.ts
[MOD] extensions/vscode-spw/src/context-strip.ts
[MOD] extensions/vscode-spw/src/views/workspace-tree.ts
[MOD?] extensions/vscode-spw/src/views/concepts-tree.ts
[MOD] packages/spw-lsp/package.json
[MOD] packages/spw-lsp/src/stdio-server.ts
[MOD] packages/spw-lsp/src/server-index.ts
[MOD] packages/spw-lsp/src/handlers/semantic-tokens.ts
[MOD?] packages/spw-lsp/src/handlers/workspace.ts
[MOD?] packages/spw-lsp/src/handlers/display.ts
```

### Craft guard

- Keep semantic truth in the LSP; no client-only semantics fork.
- Do not widen `stdio-server.ts` or `server-index.ts` without extraction.
- `extension.ts` stays orchestration-only; activation gating in small helpers.
- Incremental invalidation over longer debounce.
- Hidden surfaces do not drive LSP traffic.
- Measure before claiming; log probe table in wip stream.

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

## Fuzz Strategy

- Explore: `npm run build:lsp && npm run build:vscode` (or workspace equivalents)
- Stabilize: `npm run test:run` + LSP package tests under `packages/spw-lsp`
- Ship: `npm run fuzz:ship`
- Manual probes (record in stream): activation→ready, save→sidebar, cursor RPS, semantic-token latency, scan complete

## Agentic Hygiene

- Rebase target: `main@b4832193891b2b89b7e1e20dc0e462e2e4c9236e`
- Rebase cadence: before stage_planning_artifacts, before merge
- Hygiene split: none; coordinate with capability plan if touching custom-request types

## Dependencies

- Soft prior: `vscode-editor-contract`, `lsp-custom-request-completions` (avoid optimizing phantom calls)
- Soft parallel: `typescript-perf-audit-infra` (toolchain only)
- `mounted-consumer-tooling` — identity-free fixtures
- Sibling risk: atlas/register/authoring share `extension.ts`, `context.ts`, `stdio-server.ts`

## Spw Artifact

`.agents/plans/vscode-plugin-performance/vscode-plugin-performance.spw`
