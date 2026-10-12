# Plan: audit-ui-data-models

## Goal

Make the sigil semantics table a typed algebra: keyed by the closed `OperatorKind` union, `phase` a closed union, one owner imported by every host, and a test that proves the coverage the code comment already claims.

Two tables exist today. `packages/spw-lsp/src/server-index.ts` exports `SIGIL_SEMANTICS` with 14 keys, each with `role`, `physics`, `phase`, `phaseIndex`, and `tuning`. `extensions/vscode-spw/src/semantics.ts` exports a second `SIGIL_SEMANTICS` with 25 keys and only `role`, `physics`, `phase`. Measured 2026-10-12 with a tsx script: the 11 shared ASCII keys carry identical strings, the extension adds 14 math symbols, the LSP adds `$`, `<>`, and `_`, and the LSP table covers all 13 `OperatorKind` members. The LSP comment says "satisfies ensures full coverage", but `satisfies Record<string, SigilSemantic>` checks nothing about `OperatorKind`. A grep finds no reader of the extension copy beyond its definition, type, context field, and wiring.

The original plan (a 26-commit UI data-model curriculum over `src/core/models`) was stranded when that layout vanished; on 2026-10-12 the user chose to rescope rather than archive.

**Taste Note:** correctness and clarity. An unknown sigil or phase becomes unrepresentable, and a comment that says "validated" is backed by a check.

## Scope

- **In scope**: `packages/spw-lsp/src/server-index.ts`, `extensions/vscode-spw/src/semantics.ts` (and its `context.ts` field), `packages/spw-seed/src/types/token.ts` if `_` joins `OperatorKind`, one test in `packages/spw-lsp/src/__tests__`.
- **Out of scope**: hover wording, the UI layout from the old plan, and the `tuning` strings.

## Agentic Hygiene

- **Rebase target**: `main@551bb419` (2026-10-12)
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated drift into `feature/audit-ui-data-models-agentic-hygiene` before implementation commits

## Files

```
[NEW] packages/spw-lsp/src/__tests__/sigil-semantics.test.ts
[MOD] packages/spw-lsp/src/server-index.ts
[MOD] packages/spw-lsp/src/handlers/display.ts        (guard at the single-character lookups)
[DEL] extensions/vscode-spw/src/semantics.ts          (only if ?[ext_table_reader] finds no reader)
[MOD] extensions/vscode-spw/src/context.ts, extension.ts
```

### Craft guard

- Hover output must stay byte-identical; the existing `display.test.ts` and `editing.test.ts` stay green.
- `server-index.ts` is already large; do not grow it, extract the table if it must grow.

## Commits

1. `![lsp] — add a test that SIGIL_SEMANTICS has an entry for every OperatorKind (a Record<OperatorKind, true> fixture makes the compiler check the list)`
2. `vocab[lsp] — export a closed SigilKey union and an isSigil guard, and key SIGIL_SEMANTICS by it; correct the satisfies comment, which names a coverage check the code does not perform`
3. `vocab[lsp] — type phase as a closed union of the 7 spirit phases plus the six named non-phase strings (binding, observe, meta, access, query, identity), so an unknown phase is unrepresentable`
4. `&[vscode-spw] — delete the extension copy of SIGIL_SEMANTICS, its SigilSemantic interface, and the context field, if ?[ext_table_reader] finds no reader`

## Dependencies

- None. The former edges to `audit-data-attributes` and `audit-css-tokens` shared no files after the rescope and are removed.

## Spw Artifact

None planned. The coverage test in commit 1 is the checkable record.
