# Plan: plan-plugin-integration

Coordinate how VS Code, IntelliJ and Neovim read and act on plan files (`wip.spw`) themselves, through one plan-fact model served as standard LSP products. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

A plan file already carries facts an editor can use: the card, `^["cache"]` (status, base_ref, next_commit, open_count, last_stream), `^["stream"]` entries, `^["open"]` questions, wonder blocks, and the `^["done"]` local history (`~#resolved(label)`, `~#dropped(name)`), and the named `^["commits"]` rows.
Today three code paths read them and the LSP reads none of them by name. This plan is the contract between the plan-file format, the parser, and the editor plugins. It does not build client chrome; the VS Code plans own that.

Taste note:
- clarity / layering: one extractor, many projections; ownership stated once, in edges.

## Evidence (read on main at 551bb419)

- `outlineFromSource` (`packages/spw-lsp/src/handlers/outline.ts`) run on a real `wip.spw` returns the section frames, the `?[label]` lines under `^open`, and wonder blocks with their `!probe`. It returns no `~[N]` commit rows, no `^cache` keys, no `^stream` entries and no `^done` keys.
- Over the `wip.spw` of 80 plan folders, the count of `?` children under `^open` in that outline equals `~#open_count` in every file. Drift in `open_count` is therefore computable from document symbols.
- `.agents/scripts/agent-lib.sh` counts open questions by line grep and builds the stream stamp; `scripts/plans/plan-index.ts` reads the card with `lex` and `parse` from the seed; `packages/spw-lsp/src` has no handler naming `open_count`, `last_stream` or `next_commit`.
- No field named clock, timezone or tz exists in `workspace-protocol.ts`, `workspace-authority.ts` or `workspace-roots.ts`.
- `server-index.ts` skips only `.git`, `node_modules`, `dist`, `release`, `.claude`, `_workbench`, so `.agents/plans` is walked when it lies under an indexed root; the roadmap table's claim that the plans root is missing is about the manifest tier and readiness, not the walk (not re-verified end to end).

## Already owned (link, do not duplicate)

| Plan fact or surface | Owner plan | Layer |
|----------------------|------------|-------|
| Stream stamp completion from the manifest clock, entry hover, out-of-order diagnostic, Timeline | `vscode-authoring-probe-loop` | LSP product plus VS Code chrome |
| Plan context in hover and status bar (status, gate, next commit, wonder pointer) | `vscode-authoring-probe-loop` | LSP product plus VS Code chrome |
| Triggers: typing `>>[`, creating, saving, index ready | `vscode-authoring-probe-loop`, `vscode-plugin-performance` (budget) | chrome |
| Plans node, plans-touching-this-file, Questions view, Tending view | `vscode-workspace-atlas` | VS Code chrome |
| Plans root as a manifest root with an archived tier; readiness and fact store by content hash | `vscode-workspace-atlas`, `vscode-plugin-performance` | LSP |
| Layered hover rule; gesture table | `vscode-editor-contract` | contract |
| Capture mode; shared words for strip, atlas and hover | `vscode-cognitive-surface` | copy and profile |
| Outline nesting of facets and keys; path refs in plans | `citation-navigation` | LSP |
| Standard-method matrix for IntelliJ | `intellij-lsp4ij` | client |
| Neovim projections (`:Spw*`, quickfix, statusline) | `neovim-spw-surfaces` | client |
| Routing table for all of the above | `vscode-lsp-roadmap` | coordination |

## What the plan-file format needs from the parser

Owned by `plan-stream-parse-health` (link by edge; not edited here).
- A `>>[stamp] type — prose` line must parse as one entry whatever the caller's path argument, so a stream entry is a symbol or a diagnostic anchor and never an error.
- The LSP must resolve the plan dialect (`Spw.p`) from the document URI, or the outline and any plan diagnostics read prose as errors. Whether `outlineFromSource` takes a path today is a question for `shared_extractor` (see `?[extractor_home]`).

## The minimum shared contract

Plan facts served as standard LSP products, so VS Code, Neovim and IntelliJ receive them without client code. Facts live in `references/plan-facts.spw` (`plan_facts_table`).

| Product | Plan fact | Status |
|---------|-----------|--------|
| `textDocument/documentSymbol` | section frames, `?[label]` under `^open` | landed (measured) |
| `textDocument/documentSymbol` | `^cache` keys, `~[name]` and `.[name]` commit rows, `^done` keys as children | `outline_plan_facts` |
| `textDocument/hover` | card and `^cache` field values with derivation; `~#resolved(label)` answer and evidence | `plan_fact_hover` |
| `textDocument/publishDiagnostics` | drift: `~#open_count` vs live `?[` lines, `~#last_stream` vs last `>>` line, `~#next_commit` vs the first `~[name]` in `^commits` | `drift_diagnostics`, information severity, no write fix |
| completion after `>>[` | stamp from the manifest clock | `vscode-authoring-probe-loop`; blocked on `?[clock_field]` |

Rules: the editor reports drift and never repairs it; `plan:stream` and the human remain the only writers of cache facts.

## Files

[NEW] .agents/plans/plan-plugin-integration/references/plan-facts.spw (`plan_facts_table`)
[MOD] packages/spw-lsp/src/handlers/outline.ts (`outline_plan_facts`)
[MOD] packages/spw-lsp/src/handlers/display.ts (hover, `plan_fact_hover`)
[MOD] scripts/plans/plan-index.ts (call the shared extractor, `shared_extractor`)
[NEW] a plan-fact extractor file in the home chosen by `?[extractor_home]`

Craft guard:
- display.ts is a hot hover file; put plan hover in its own handler if it grows past 600 lines.

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

## Agentic Hygiene

- Rebase target: `main`
- Hygiene split: none; other agents are editing plan files in the same tree.

## Dependencies

- `plan-stream-parse-health` before `shared_extractor` (path-independent parsing of stream lines).
- Manifest tier and readiness from `vscode-workspace-atlas` and `vscode-plugin-performance` for facts beyond open documents.

## Failure Modes

- Hard: the editor and `plan:check` disagree on a fact, so two tools report different truths.
- Soft: facts only for open documents until the plans root is a manifest root.
- Non-negotiable: no editor write to cache facts.

## Validation

- Hypothesis: one extractor reproduces `plan:check` on every `wip.spw`.
- Negative control: outline output for non-plan files unchanged.
- Demo: open a `wip.spw` in three editors, see cache keys in the outline, hover `~#open_count`, break it and see the diagnostic.
