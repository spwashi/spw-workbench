# Plan: vscode-lsp-integration

Integrate the Spw Language Server Protocol (LSP) into the VS Code extension, enabling rich semantic features, renaming, advanced completions, and paving the way for experimental syntax development.

## Goal

The current VS Code extension relies on declarative TextMate grammars and simple regex-based providers for navigation. This plan transitions the extension to use the native `SpwLspHandler` via `stdio`, replacing fragile regex heuristics with precise AST and semantic analysis. This establishes a robust foundation for ecosystem enhancement and makes it possible to rapidly iterate on experimental syntax without duplicating parser logic in the editor.

**Taste note:** we are improving **correctness** and **expressiveness** by moving from regex approximations to a unified, rigorous semantic model that serves both the compiler and the editor ecosystem.

## Scope

- **In scope**: Integrating `vscode-languageclient`, replacing regex hover/outline providers with LSP responses, enhancing the LSP to support rename, native document links, and context-aware file completions. Introducing an experimental syntax parsing hook as a proof of concept for ecosystem evolution.
- **Out of scope**: Writing full Language Server features for external editors (e.g., Vim configuration) beyond ensuring the `stdio-server.ts` remains decoupled.

## Agentic Hygiene

- **Rebase target**: historical baseline `f53934f` (lore-era; not on rewritten main)
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated non-LSP drift into `feature/vscode-lsp-integration-agentic-hygiene` before implementation commits

## Files

[MOD] `extensions/vscode-spw/package.json`
[MOD] `extensions/vscode-spw/src/extension.ts`
[MOD] `scripts/lsp/stdio-server.ts`
[MOD] `src/lang/semantic/lsp.ts`
[MOD] `src/lang/semantic/analyzer.ts`
[MOD] `src/lang/semantic/types.ts`
[MOD] `src/platform/lsp/lsp-handler.ts`
[MOD] `src/platform/workers/symbol-navigation.ts`
[MOD] `src/lib/spw/lexer/index.ts`
[MOD] `src/lib/spw/grammar/seed.ts`
[NEW] `src/lang/semantic/__tests__/lsp.test.ts`
[NEW] `scripts/lsp/__tests__/stdio-server.test.ts`

### Craft guard
- `src/lang/semantic/lsp.ts` may risk exceeding 400 lines (currently 220). If the rename and document link logic becomes heavy, extract finding/resolution utilities into `src/platform/workers/symbol-navigation.ts` to maintain conceptual separation.

## Commits

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
22. `^seed[syntax]` — introduce experimental syntax node for 'operator injection' (`$<op>`)
23. `&[lang]` — parse operator injection syntax in lexer and AST builder
24. `&[analyzer]` — add semantic analysis rules for operator injection nodes
25. `&[lsp]` — provide semantic tokens and hover intelligence for operator injections
26. `&[viz]` — add differential syntax highlighting for operator injections in editor UI
27. `.[release]` — declare v0.2.0-alpha for VS Code extension and LSP

## Dependencies

none
