# Plan: vscode-plugin-performance

Improve the VS Code extension's startup, indexing, and live-update behavior without turning the client into a second semantic engine.

## Goal

The preview extension still pays too much work too early: activation starts the LSP, annotation mirror, context strip, concepts tree, and workspace atlas immediately (`activationEvents: []`), and surfaces can request cursor context independently. Compiled LSP launch **exists** (`build:server` → `dist/stdio-server.js`; extension prefers `*.js` over `tsx`), but source-first fallback and eager UI work still dominate feel. The desired end state is a faster, quieter extension that preserves thin-client posture: semantic truth in `packages/spw-lsp/`, selective activation/refresh/recompute on the client.

**Taste note**: performance, layering, quiet feedback.

## Ladder position

Roadmap rung **2** (after editor-contract + capability honesty). See `.agents/plans/vscode-lsp-roadmap/PLAN.md`.

Does **not** replace `typescript-perf-audit-infra` (that measures `tsc`). Editor paths need separate wall-time probes: activation → LSP ready, save → sidebar, cursor → strip, initialize → scan complete.

## Scope

- **In scope**: ensure compiled server is the default resolved path in workbench + mounted consumers; activation gating (`onLanguage:spw` and/or lazy view registration); incremental annotation sync; single shared cursor-context transport; visibility-gated tree refresh; semantic tokens from parse/index not full-text regex rescans; bounded workspace scan; hot-file extraction if dispatcher/index grows; mounted-consumer measurements.
- **Out of scope**: new editor capabilities; Spw language changes; atlas/concepts UX redesign beyond refresh policy; full telemetry SaaS; implementing phantom `spw/*` methods (capability plan); TypeScript 7 adoption (upgrade ladder).

## Landed vs remaining (2026-07-20)

| Item | Status |
|------|--------|
| Prefer `stdio-server.js` when present | **Landed** in `extension.ts` |
| `tsx` fallback when only `.ts` | Still present (ok for dev; must not be ship default) |
| Eager `annotationIndex.activate()` + both trees | **Still eager** |
| Shared cursor context bus | **Not landed** |
| Incremental annotation delta | **Not landed** (full rebuild risk remains) |
| Semantic tokens from ServerIndex parse | **Partial / verify** — plan still targets regex elimination |
| File size pressure | `display.ts` ~1410, `server-index.ts` ~1160, trees ~725–750 |

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

1. `.[plans] — refresh vscode-plugin-performance against landed launch path`
2. `&[vscode-startup] — default compiled LSP path + lean activation wiring`
3. `&[vscode-index] — incremental annotation sync (no full rebuild on every save)`
4. `&[vscode-context] — shared cursor context + visibility-gated tree refresh`
5. `&[spw-lsp] — parse-backed semantic tokens + scan cost bounds`
6. `![vscode-performance] *audit[mounted-consumer] — startup, save, cursor, sidebar probes`

## Fuzz Strategy

- Explore: `npm run build:lsp && npm run build:vscode` (or workspace equivalents)
- Stabilize: `npm run test:run` + LSP package tests under `packages/spw-lsp`
- Ship: `npm run fuzz:ship`
- Manual probes (record in stream): activation→ready, save→sidebar, cursor RPS, semantic-token latency, scan complete

## Agentic Hygiene

- Rebase target: `main@b4832193891b2b89b7e1e20dc0e462e2e4c9236e`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none; coordinate with capability plan if touching custom-request types

## Dependencies

- Soft prior: `vscode-editor-contract`, `lsp-custom-request-completions` (avoid optimizing phantom calls)
- Soft parallel: `typescript-perf-audit-infra` (toolchain only)
- `mounted-consumer-tooling` — identity-free fixtures
- Sibling risk: atlas/register/authoring share `extension.ts`, `context.ts`, `stdio-server.ts`

## Spw Artifact

`.agents/plans/vscode-plugin-performance/vscode-plugin-performance.spw`
