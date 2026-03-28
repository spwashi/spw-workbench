# Plan: vscode-lsp-integration

Integrate the Spw Language Server Protocol (LSP) into the VS Code extension as a thin, dependable editor lane for site codebases adopting Spw.

## Goal

The current VS Code extension relies on declarative TextMate grammars and simple regex-based providers for navigation. This plan transitions the extension to use the native `SpwLspHandler` via `stdio`, replacing fragile regex heuristics with precise AST and semantic analysis. The immediate outcome is editor trust for external site codebases: hover, completions, rename, links, and semantic tokens should reflect the same truth the parser and runtime use.

**Taste note:** we are improving **correctness** and **expressiveness** by moving from regex approximations to a unified semantic model while keeping the extension thin enough to ride alongside the install and DX lanes.

## Scope

- **In scope**: integrating `vscode-languageclient`, replacing regex hover/outline providers with LSP responses, and finishing the remaining LSP/editor capabilities needed for site adoption: semantic token verification, rename, native document links, hover polish, and context-aware file completions.
- **Out of scope**: writing full Language Server features for external editors (e.g., Vim configuration) beyond ensuring the `stdio-server.ts` remains decoupled, and experimental syntax work that should live on a separate branch once the install ecology settles.

## Agentic Hygiene

- **Rebase target**: `main@3b1747c4` (updated 2026-03-27; lore-era f53934f no longer reachable)
- **Rebase cadence**: before next commit and before merge
- **Hygiene split**: none; monorepo restructure already landed on main

## Files

```text
[NEW] .agents/plans/vscode-lsp-integration/vscode-lsp-integration.spw
[MOD] extensions/vscode-spw/package.json
[MOD] extensions/vscode-spw/src/extension.ts
[MOD] packages/spw-lsp/src/stdio-server.ts
[MOD] packages/spw-lsp/src/handlers/navigation.ts
[MOD] packages/spw-lsp/src/handlers/analysis.ts
[MOD] packages/spw-lsp/src/handlers/display.ts
[MOD] packages/spw-lsp/src/handlers/editing.ts
[MOD] packages/spw-lsp/src/handlers/semantic-tokens.ts
[MOD] packages/spw-lsp/src/context.ts
[MOD] packages/spw-lsp/src/types.ts
[MOD] packages/spw-seed/src/lexer/index.ts
[MOD] packages/spw-seed/src/grammar/seed.ts
[NEW] packages/spw-lsp/src/__tests__/lsp.test.ts
[NEW] packages/spw-lsp/src/__tests__/stdio-server.test.ts
```

### Craft guard
- LSP handler modules are already split (navigation, analysis, display, editing, semantic-tokens). If any grows past 400 lines, extract further.
- Extension should remain thin — delegate all intelligence to LSP.

### Status of original commits
- Commits ~[1]-~[9] are substantially complete (extension has vscode-languageclient ^9.0.1, LanguageClient initialized, monorepo restructure done, path literals highlighted, and architecture documented).
- Remaining work begins at ~[10] (verify semantic tokens for all path variants).

## Commits

Commits ~[10]-~[16] form the language-service correctness lane. Commits ~[17]-~[21] form the editor cleanup/documentation lane and can proceed in parallel once semantic-token verification stops moving underneath them.

1. `&[hygiene]` — rebase feature branch onto `origin/main` and isolate unrelated drift in a hygiene split branch
2. `&[lsp]` — harden stdio-server with robust message partitioning and error boundaries
3. `![lsp]` — add unit tests for stdio-server message parsing edge cases
4. `vocab[lsp]` — strict types for LSP request/response envelopes
5. `.[extension]` — add vscode-languageclient dependency and update npm scripts
6. `&[extension]` — replace regex-based outline/hover with native LSP client initialization
7. `&[extension]` — maintain regex DocumentLinkProvider while delegating other features to LSP
8. `.[docs]` — document LSP client architecture and fallback behaviors
9. `&[analyzer]` — parse path literals (tilde-strings, sigil-paths) into semantic tokens
10. `![analyzer]` — verify semantic token generation for all path variants
11. `vocab[analyzer]` — expand Symbol kind union to include file and directory types
12. `&[lsp]` — implement context-aware completions API reading from analyzer scope
13. `&[lsp]` — add file-system resolution to path completions within `SpwLanguageService`
14. `![lsp]` — end-to-end tests for file-system auto-completions via LanguageService
15. `&[lsp]` — implement textDocument/rename routing in `SpwLspHandler`
16. `&[analyzer]` — refactor symbol resolution graph to support cascading rename edits
17. `&[lsp]` — implement textDocument/documentLink in LSP to replace extension regex regex
18. `&[extension]` — remove legacy regex DocumentLinkProvider now that LSP supplies links
19. `&[lsp]` — enhance HoverProvider to perform cross-file peeking via analyzer graph
20. `![lsp]` — verify safe cross-file reading for hover peeks
21. `.[docs]` — update spw-feature-planning and editor ecosystem guide with new LSP capabilities
27. `.[release]` — declare v0.2.0-alpha for VS Code extension and LSP

## Dependencies

none

## Principal Engineering Orientation

- Ladder position: `service`
- Judgment target: make editor trust, preview discipline, and thin-client boundaries legible enough that the extension can teach Spw without owning a second semantics stack
- Commit bar: each slice should leave behind one testable capability, one stable user-facing phrase, and one clearer boundary between server truth and client packaging

## Review Surfaces

- Tooling/spec: `.spw/tooling/vscode-spw.spw`, `.spw/conventions/selection.spw`
- Code: `packages/spw-lsp/src/handlers/editing.ts`, `packages/spw-lsp/src/handlers/navigation.ts`, `packages/spw-lsp/src/stdio-server.ts`, `extensions/vscode-spw/src/extension.ts`
- Planning artifact: `.agents/plans/vscode-lsp-integration/vscode-lsp-integration.spw`

## Recursive Improvement

- Start from the current handlers and capability claims, not wishful roadmap language.
- Ship one semantic capability at a time with smoke/tests or preview evidence.
- Preserve the same wording across code action copy, docs, and release notes.
- Keep the extension thinner than the LSP even as authoring/refactor ambitions grow.

## Spw Artifact

```text
.agents/plans/vscode-lsp-integration/vscode-lsp-integration.spw
```
