# Plan: vscode-editor-contract

Define the boundary between **Seed-owned parse/structural truth**, **LSP observation assembly**, and **client surface composition**: what the editor may ask, which payloads are authoritative vs measured vs interpretive, and how invalidation/refresh should work.

## Goal

Without a contract, atlas, registers, authoring, and performance work invent parallel nouns and refresh policies. The desired end state is a short, durable contract that every VS Code plan cites: observation catalog, authority model, transport vocabulary, and invalidation matrix. This improves clarity and layering so new surfaces compose instead of fork.

**Taste note**: clarity, layering, naming, evidence discipline.

## Scope

- **In scope**:
  - Observation catalog (what can be known: document parse, annotations, manifest, temperature, cursor context, registers, phase, …)
  - Selection-transect, evidence-packet, effect-grade, and differential envelopes from `operational-topography`
  - Authority rules (manifest > index > client inference; never silent override)
  - Transport map: standard LSP methods vs `spw/*` custom requests
  - Invalidation matrix: didOpen/Change/Save/Close, watched files, visibility, cursor move
  - `SpwContext` field ownership table (which plan adds which field; additive only)
  - Failure/degrade rules when LSP unavailable or method missing
  - Distilled artifact `vscode-editor-contract.spw`

- **Out of scope**: implementing new views; changing language semantics; full capability implementation (owned by `lsp-custom-request-completions`); performance micro-optimizations (owned by `vscode-plugin-performance` once contract is stable)

## Relationship to ladder

Roadmap rung **0**. Blocks honest performance and surface work when payload ownership is unclear.

See `.agents/plans/vscode-lsp-roadmap/PLAN.md`.

## Files

```text
[NEW] .agents/plans/vscode-editor-contract/PLAN.md
[MOD] .agents/plans/vscode-editor-contract/wip.spw
[NEW] .agents/plans/vscode-editor-contract/vscode-editor-contract.spw
[MOD?] .agents/plans/vscode-workspace-atlas/vscode-interaction-contract.spw
[REF] extensions/vscode-spw/src/context.ts
[REF] extensions/vscode-spw/src/lsp/custom-requests.ts
[REF] packages/spw-lsp/src/stdio-server.ts
[REF] packages/spw-lsp/src/types.ts
```

### Craft guard

- Prefer tables over long prose.
- Align with existing `vscode-interaction-contract.spw` (atlas plan); do not fork a second event bus vocabulary.
- Contract changes that rename events require cross-plan stream notes.

## Commits

1. `.[plans] — formalize vscode-editor-contract PLAN and artifact skeleton`
2. `.[plans] — publish observation, authority, and invalidation tables`
3. `.[docs]? — link contract from extension README if stable`

## Agentic Hygiene

- Rebase target: `main@b4832193891b2b89b7e1e20dc0e462e2e4c9236e`
- Rebase cadence: before commit 1, before merge
- Hygiene split: required before implementation

## Dependencies

- Hard input: `operational-topography` and the canonical custom-protocol registry
- Soft input: `vscode-workspace-atlas` interaction contract (already drafted)
- Downstream consumers: performance, capability audit, register explorer, authoring

## Failure Modes

- **Hard**: two names for the same observation (client vs server)
- **Soft**: contract over-specifies UX chrome
- **Non-negotiable**: Seed owns parse/structure; LSP assembles revision-addressed observations; clients project the shared payload without inventing semantics

## Spw Artifact

`.agents/plans/vscode-editor-contract/vscode-editor-contract.spw`
