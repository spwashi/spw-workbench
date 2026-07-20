# Plan: lsp-custom-request-completions

Audit the complete LSP capability surface before deciding which custom requests deserve implementation.

## Goal

Produce an evidence matrix for standard and custom LSP capabilities across the server and editor clients. Exercise the server from an identity-free mounted-consumer fixture, distinguish declared capabilities from observed behavior, and implement only the custom requests whose semantics and cost are justified by a concrete authoring surface.

Taste note: authority honesty, portability, and evidence before parity.

## Scope

- **In scope:** Inventory advertised capabilities, handlers, client calls, tests, mounted-consumer behavior, failure modes, and performance costs; identify duplicate client-side semantics; implement only earned custom requests.
- **Out of scope:** Assuming every declared request must exist; requiring identical editor UI; inventing consumer-specific fixtures; broad runtime or parser changes.

## Evidence contract

For each capability, record whether it is:

1. advertised by the server,
2. configured by a client,
3. invoked by a client,
4. observed to return useful behavior, and
5. covered by a repeatable test.

The audit fixture must use only relative paths and generic consumer content. Results must record both consumer and mounted-workbench revisions without embedding repository identities.

## Candidate files

```
[MOD] packages/spw-lsp/src/stdio-server.ts
[MOD] packages/spw-lsp/src/handlers/analysis.ts
[MOD] packages/spw-lsp/src/server-index.ts
[MOD] packages/spw-lsp/src/types.ts
[MOD] extensions/vscode-spw/src/lsp/custom-requests.ts
[NEW] packages/spw-lsp/src/__tests__/capability-audit.test.ts
```

The audit decides the final implementation file set. New handler modules are not assumed in advance.

## Commits

1. `![lsp] *audit[capabilities] — map advertised, invoked, observed, and tested behavior`
2. `![lsp] *audit[mounted-consumer] — exercise root discovery and failure modes`
3. `^seed[lsp] =request[earned] — implement justified semantic requests`
4. `![lsp] =evidence[snapshots] — verify server and editor capability claims`

## Agentic Hygiene

- Rebase target: `main`
- Rebase cadence: before commit 1, before implementation, before merge
- Hygiene split: keep audit evidence separate from any implementation

## Dependencies

- `.agents/plans/mounted-consumer-tooling/PLAN.md`
- `.spw/tooling/editor-surface-audit.spw`

## Spw Artifact

Create a distilled artifact only after the audit establishes stable capability and evidence categories.
