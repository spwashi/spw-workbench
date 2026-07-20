# Plan: runtime-dx-foundation

Establish a senior-grade DX foundation for the runtime and editor integrations, with a primary focus on making `.spw` installable and debuggable in independent consumer repositories.

## Goal

Create a coherent DX layer that spans runtime diagnostics, instrumentation, and editor/LSP UX.

Three concrete outcomes:

1. **Failures are traceable**: a parse error, runtime fault, or LSP timeout reads as a station in the spiritual testing path (literature → seed → runtime → query → telemetry → publish) rather than an opaque red light.
2. **Installation is debuggable**: when an external codebase runs `spw init` or starts the LSP, diagnostic output confirms what worked, what didn't, and what to try next.
3. **Performance is visible**: LSP response times, parse durations, and selector traversal counts surface in both editor status bars and CLI output.

This is the service-design rung in the current ecology. The plan should teach the team how installability, diagnostics, and instrumentation become part of the product's language rather than hidden implementation residue. The strongest commits here will leave behind greppable codes, stable health-check snippets, and troubleshooting loops that another developer can actually follow.

Taste note: improve **clarity** and **correctness** with explicit contracts, structured logging, and predictable configuration. DX localizes a failure to a station, not a stack trace.

## Scope

- **In scope**:
  - Diagnostic ID registry (structured error codes with station attribution)
  - Runtime instrumentation hooks (parse timing, substrate events, resonance cycles)
  - LSP diagnostic propagation (server → editor with structured payloads)
  - CLI diagnostic mode (`spw --diagnostics` for installation troubleshooting)
  - Editor plugin troubleshooting UX (status bar, output channel, settings validation)
  - DX playbook for external developers installing .spw in their projects
  - Path-oriented troubleshooting: concept → parser → runtime → LSP → editor → publish
  - Review of station language against governance, hot-reload, and install surfaces so install, runtime, editor, and release literature share one troubleshooting vocabulary

- **Out of scope**: new language features, parser/AST behavior changes, UI feature redesigns, large refactors not directly tied to DX.

## Files

```text
[NEW] packages/spw-runtime/src/diagnostics/index.ts
[NEW] packages/spw-runtime/src/diagnostics/codes.ts
[NEW] packages/spw-runtime/src/diagnostics/station.ts
[MOD] packages/spw-runtime/src/pipeline.ts
[MOD] packages/spw-runtime/src/substrate.ts
[MOD] packages/spw-seed/src/parser.ts
[MOD] packages/spw-lsp/src/handlers/analysis.ts
[MOD] packages/spw-lsp/src/handlers/display.ts
[MOD] packages/spw-lsp/src/context.ts
[MOD] packages/spw-cli/src/main.ts
[MOD] extensions/vscode-spw/src/extension.ts
[MOD?] extensions/intellij-spw/src/main/kotlin/
[NEW] docs/runtime/md/dx-foundation.md
[NEW] docs/runtime/md/dx-installation-guide.md
[NEW] docs/runtime/spw/dx-instrumentation.spw
[NEW] .agents/plans/runtime-dx-foundation/runtime-dx-foundation.spw
```

### Craft guard

- Keep diagnostics modules under 400 lines; split by station (seed, runtime, lsp, cli) if needed.
- Diagnostic codes must be greppable across the entire stack: `SPW-SEED-001`, `SPW-RT-001`, `SPW-LSP-001`.
- DX should not add weight to the hot path — instrumentation hooks are opt-in via environment or config flags.
- Editor status integration should be thin — delegate intelligence to LSP.

## Commits

Each commit produces an externally-visible artifact (error code, CLI flag, status indicator, documentation section). More granular commits create more contact surfaces for external developers.
Commit 1 is the serialization point for naming and station contracts. After that lands, seed, LSP, CLI, and editor slices can advance in parallel while runtime instrumentation trails as the deeper debugging lane.

### Station: Diagnostic Registry
1. `#[dx-diagnostics] — define diagnostic ID registry and station attribution contract (SPW-SEED-*, SPW-RT-*, SPW-LSP-*, SPW-CLI-*)`

### Station: Seed (parser/lexer)
2. `&[seed] — add parse timing hooks to spw-seed parser entry points`
3. `&[seed] — add structured error codes to lexer and grammar failures`
4. `![seed] — verify diagnostic codes appear in parse error output for malformed .spw files`

### Station: Runtime (pipeline/substrate/resonance)
5. `&[runtime] — wire diagnostic station hooks through pipeline and substrate`
6. `&[runtime] — add resonance cycle instrumentation with opt-in timing`
7. `![runtime] — verify diagnostic propagation through substrate event chain`

### Station: LSP (server diagnostics + telemetry)
8. `&[lsp] — propagate structured diagnostics from seed/runtime to LSP responses`
9. `&[lsp] — add performance telemetry to LSP context (parse duration, response latency)`
10. `![lsp] — smoke test: LSP diagnostic payloads carry station codes and timing`

### Station: CLI (installation troubleshooting)
11. `&[cli] — add spw doctor subcommand for installation health check`
12. `&[cli] — add --diagnostics flag to existing commands for verbose station output`
13. `![cli] — verify spw doctor reports: parser loaded, LSP reachable, extension connectable`

### Station: Editor (VS Code integration)
14. `&[vscode] — add Spw output channel with structured diagnostic log`
15. `&[vscode] — add status bar indicator for LSP connection health and parse performance`
16. `&[vscode] — add settings validation with actionable error messages`
17. `![vscode] — verify output channel shows station-attributed diagnostics during editing`

### Station: Documentation
18. `.[docs] — write DX playbook: installation, health check, troubleshooting flowchart`
19. `.[docs] — write instrumentation guide: how to read diagnostic codes, where each station lives`
20. `.[plans] — write runtime-dx-foundation.spw artifact formalizing the station model`

Fuzz strategy:
- Explore: `npm run fuzz:runtime` (catch diagnostic hook regressions)
- Stabilize: `npm run fuzz:types && npm run test:runtime && npm run lsp:smoke`
- Ship: `npm run fuzz:ship`

## Agentic Hygiene

- Rebase target: `main@3b1747c4` (updated 2026-03-27; lore-era 591a86c6 no longer reachable)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none; prior local drift in package.json has landed on main

## Dependencies

- `spw-site-install` — installation flow defines the failure modes that `spw doctor` and station diagnostics must explain.
- `ecosystem-surface-governance` — provides the spiritual testing path (station vocabulary) that diagnostic IDs should mirror.
- `lsp-lore-upstream-bridge` — LSP entry point must be stable before diagnostic propagation is wired.
- `absorb-spwq-cli` — CLI command taxonomy must be settled before `--diagnostics` flag placement.
- `plan-ecology-clustering` — this plan occupies the `service` rung and should turn runtime truth into reusable install, support, and release knowledge.

## Principal Engineering Orientation

- Ladder position: `service`
- Judgment target: make operational understanding part of the design surface so install, failure, and recovery are discussable with the same precision as syntax or runtime semantics
- Commit bar: each slice should yield one concrete user-facing artifact, one searchable phrase or code, and one clearer next action for whoever encounters the failure

## Review Surfaces

- Runtime/service code: `packages/spw-runtime/src/pipeline.ts`, `packages/spw-runtime/src/substrate.ts`, `packages/spw-runtime/src/diagnostics/`
- Tooling code: `packages/spw-seed/src/parser.ts`, `packages/spw-lsp/src/context.ts`, `packages/spw-cli/src/main.ts`, `extensions/vscode-spw/src/extension.ts`
- Process/literature: `.spw/process/hot-reload-loop.spw`, `.agents/plans/ecosystem-surface-governance/ecosystem-surface-governance.spw`, release/install docs and plans that will quote the station model

## Capability Transfer

- Runtime capability: parse timing, substrate events, resonance cycles, and station attribution
- Interaction capability: output channels, status bars, CLI doctor flows, and installation guidance
- Service capability: reproducible health checks, searchable failure codes, and truthful public support language

## Syntax and Snippet Discipline

- Stable snippets: preserve minimal examples of diagnostic output, `spw doctor` health reports, and installation troubleshooting steps so docs and tests talk about the same thing
- Experimental diagnostics: new telemetry or verbose output should stay opt-in until its signal quality is proven
- Review loop: every new station code or diagnostic route should be easy to trace from docs to CLI/editor output and back into the implementation

## Recursive Improvement

- Re-read install, runtime, editor, and governance surfaces before naming a new station or code.
- Land one user-visible diagnostic artifact at a time and verify that it suggests a real next action.
- Promote only the wording that survives code, CLI, editor UI, docs, and support conversation without drift.
- Treat support compression as a success metric: fewer words needed to explain what failed and what to try next.

## Spw Artifact

`.agents/plans/runtime-dx-foundation/runtime-dx-foundation.spw`

The artifact should formalize the diagnostic station model: which stations exist, what each station's contract is, and how a diagnostic ID traces through the spiritual testing path.
