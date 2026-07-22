# Plan: lsp-custom-request-completions

Audit the complete LSP capability surface and **close the phantom custom-request gap** before new editor surfaces depend on methods that do not exist.

## Goal

Produce an evidence matrix for standard and custom LSP capabilities across server and clients. Distinguish advertised, configured, invoked, observed, and tested behavior. Implement only custom requests earned by a concrete authoring or explorer surface — or **remove/optionalize** client types that currently lie.

**Taste note**: authority honesty, portability, evidence discipline.

## Ladder position

Roadmap rung **1**. See `.agents/plans/vscode-lsp-roadmap/PLAN.md`.

## Capability snapshot (2026-07-20)

### Standard methods (server `initialize` capabilities)

Advertised and routed in `stdio-server.ts`: definition/declaration, references, rename(+prepare), documentLink, hover, documentSymbol, workspaceSymbol, codeAction, completion, codeLens, formatting/rangeFormatting, documentHighlight, inlayHint, foldingRange, semanticTokens/full, textDocumentSync.

### Custom methods

| Method | Server handler | Client type | Client invoke helper | Notes |
|--------|----------------|-------------|----------------------|-------|
| `spw/select` | yes | no typed map entry | — | Server-only / CLI-adjacent |
| `spw/annotations` | yes | yes | yes | Core for concepts/index |
| `spw/contextAtPosition` | yes | yes | yes | Strip + atlas cursor |
| `spw/workspaceManifest` | yes | yes | yes | Atlas roots |
| `spw/workspaceTemperature` | yes | yes | yes | Memory tier UI |
| `spw/resonance` | **no** | yes | — | **Phantom** — atlas plan wants it |
| `spw/registerSnapshot` | **no** | yes | — | **Phantom** — register explorer |
| `spw/operatorFrequency` | **no** | yes | — | **Phantom** — authoring heat |
| `spw/phaseContext` | **no** | yes | — | **Phantom** — authoring status |
| `spw/formContext` | **no** | **no** | — | **Proposed (earn)** — form-geometry-editor P1; Seed coupling + ladders + applicable mobility rules |

Policy for this plan: either implement with tests + mounted-consumer evidence, or demote client types so call sites cannot pretend success.

Server routing is not capability advertisement. The current tree has no single custom-protocol registry from which handlers, initialization metadata, TypeScript request maps, client helpers, and audit rows are derived. Establish that registry before adding `spw/topography`, differential preview, garden, pulse, or hydration methods.

### Proposed next earned method (2026-07-21)

**`spw/formContext`** — revision-addressed S0 packet at position:

- `coupling` (kind/form/occupancy/payload when present)
- boundary/operator contour with requested density, catalog/evidence/view signatures, dimensions, and omitted point ids
- `labelSites` sketches near caret
- `applicableRules[]` with status plus actual-source S1 preview receipt (hashes, health delta, inverse status, loss posture); `implemented` alone is not eligibility
- compact topography (parseHealth, paired depth)

**Do not** type `spw/formContext` in the client until a server handler + test land. Prefer implementing this before re-opening phantom `resonance` / `operatorFrequency` unless a surface hard-requires them.

## Scope

- **In scope**: canonical protocol registry; evidence matrix; fix phantom types; implement only earned methods (prefer `phaseContext` / `registerSnapshot` / `operatorFrequency` / `resonance` only when a landed surface needs them *now*); tests under `packages/spw-lsp/src/__tests__`; optional capability-audit test; document matrix in plan/artifact.
- **Out of scope**: assuming every typed request must exist; identical multi-editor UI; consumer-specific fixtures with absolute paths; broad parser changes; full register explorer UI (only transport if earned).

## Files

```text
[MOD] .agents/plans/lsp-custom-request-completions/PLAN.md
[MOD] .agents/plans/lsp-custom-request-completions/wip.spw
[NEW] packages/spw-lsp/src/protocol.ts
[MOD] packages/spw-lsp/src/stdio-server.ts
[MOD] packages/spw-lsp/src/types.ts
[MOD] packages/spw-lsp/src/handlers/analysis.ts
[MOD?] packages/spw-lsp/src/handlers/workspace.ts
[MOD?] packages/spw-lsp/src/handlers/display.ts
[MOD] packages/spw-lsp/src/server-index.ts
[MOD] extensions/vscode-spw/src/lsp/custom-requests.ts
[NEW] packages/spw-lsp/src/__tests__/capability-audit.test.ts
[REF] .spw/tooling/editor-surface-audit.spw
```

### Craft guard

- Extract from `stdio-server` / `display` rather than growing switchboards.
- Prefer one typed request boundary; no client-side reimplementation of register/runtime trials.
- Every new method needs distinct evidence for: registry entry, handler, advertisement/discovery, type, client invocation, observed response/failure, test, and matrix row.
- `spw/topography` and edit-preview methods transport Seed-owned coordinates and differential plans; the LSP does not invent a second structural model.

## Commits

1. `vocab[lsp] =register[protocol] — one source for custom method identity and discovery`
2. `![lsp] *audit[capabilities] — matrix handled/advertised/configured/invoked/observed/tested`
3. `vocab[lsp] — demote or implement phantom spw/* client types`
4. `^seed[lsp] =request[earned] — implement only justified semantic requests`
5. `![lsp] =evidence[snapshots] — server + mounted-consumer evidence`

## Agentic Hygiene

- Rebase target: `main@a333db8d33606c362439487f41371ad4091506b6`
- Rebase cadence: before commit 1, before implementation, before merge
- Hygiene split: keep pure audit commit separate from implementation
- Cross-link: `.agents/plans/form-geometry-editor/PLAN.md` (earns formContext)

## Dependencies

- Hard: `operational-topography` ownership and evidence/effect envelope
- Soft: `vscode-editor-contract`, `vscode-lsp-roadmap`
- `mounted-consumer-tooling`
- Downstream: performance (avoid optimizing dead calls), register explorer, authoring

## Spw Artifact

Create/update distilled capability matrix after audit stabilizes categories.

Optional: `.agents/plans/lsp-custom-request-completions/lsp-capability-matrix.spw`
