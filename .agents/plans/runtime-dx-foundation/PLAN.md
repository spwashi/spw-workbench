# Plan: runtime-dx-foundation

Establish a senior-grade DX foundation for the runtime and editor integrations.

## Goal

Create a coherent DX layer that spans runtime diagnostics, instrumentation, and editor/LSP UX.
The outcome should make failures actionable, performance visible, and onboarding friction lower for new contributors.
Taste note: improve clarity and correctness with explicit contracts, structured logging, and predictable configuration.

## Scope

- **In scope**: runtime diagnostics contracts, structured error identifiers, instrumentation hooks, LSP/worker diagnostic flow, editor plugin troubleshooting UX, and DX documentation/playbooks.
- **Out of scope**: new language features, parser/AST behavior changes, UI feature redesigns, or large refactors not directly tied to DX.

## Files

[NEW] docs/runtime/md/dx-foundation.md  
[NEW] docs/runtime/spw/dx-instrumentation.spw  
[MOD?] src/runtime/** (diagnostics + instrumentation surfaces)  
[MOD?] src/infra/** (logging/instrumentation scaffolding)  
[MOD?] src/platform/workers/** (LSP/DAP worker diagnostic propagation)  
[MOD?] scripts/lsp/** (server logging + diagnostics payloads)  
[MOD?] extensions/intellij-spw/** (DX settings + troubleshooting UX)  
[MOD?] extensions/vscode-spw/** (DX parity + guidance)  
[NEW] .agents/plans/runtime-dx-foundation/runtime-dx-foundation.spw

### Craft guard

Keep new runtime/infra modules under 400 lines and avoid >12 imports per file. If a file crosses 600 lines, split by responsibility (diagnostics vs transport vs logging).

## Commits

1. #[dx-runtime] — define DX instrumentation contract + diagnostic identifiers
2. &[runtime] — wire structured diagnostics + logging hooks through runtime/infra
3. &[lsp] — propagate diagnostics + performance telemetry via workers/LSP server
4. &[editors] — refine plugin settings UX + add troubleshooting affordances
5. .[docs] — add DX playbook, onboarding checkpoints, and instrumentation guide

## Agentic Hygiene

- Rebase target: historical baseline `591a86c631671ddced9716eb8f32380af0db8a0b` (lore-era; not on rewritten main)
- Rebase cadence: before commit 1, before merge
- Hygiene split: local changes in `package.json` and `.agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh` are unrelated; keep out of DX commits

## Dependencies

none

## Spw Artifact

.agents/plans/runtime-dx-foundation/runtime-dx-foundation.spw
