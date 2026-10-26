# Plan: neovim-spw-surfaces

Strengthen Neovim as a **native peer client** of `spw-lsp`: same truth density as VS Code without panel parity, earned custom requests only, and projections that match how Spw is actually written in vim (roots, wonder blocks, `$%` metrics, plans).

> Supersedes the archived audit stub at `.agents/plans/_archive/neovim-spw-surfaces/` (kept for history).

## Goal

`extensions/neovim-spw` already ships filetype, syntax, LSP attach, path navigation (`gf`/`gF`), quickfix for unresolved refs, form-wrap inserts, and several `:Spw*` commands. The gap is not “more UI” — it is **closing author loops** that live in the buffer:

- Canon roots and `~` path refs (screenshot: `.spw/index.spw`)
- Wonder blocks `?["…"]` with `!probe` and `$%[file.frame_count, …]`
- Plan / design surfaces under `.agents/plans/`
- `%mass` / authority claims once seed schemes exist
- Progressive source products at the cursor or selected structural range, with spans, profile provenance, omissions, event counts, elapsed time, and cache plane visible as a scientific receipt

End state: a Neovim session on a workbench or mounted consumer is a **peer host** — diagnostics, `:Spw*` receipts, and statusline can name structure, winning profile, and cache/runtime cost at comparable truth density to VS Code and IntelliJ, while remaining **builtins-first** (no telescope/nui dependency required). Builtins-first is the contour, not a depth cap. Missing receipts are kernel or runtime questions, not a reason to stay a sketch of another editor.

**Taste note:** native affordances, quiet feedback, capability honesty, thrift.

## Ecology

Parent: `.agents/plans/shape-syntax-ecology/PLAN.md`.  
Syntactic presence: project `parse().dialect`, stack, mass/σ probes via standard LSP + `:Spw*` — no second semantics.  
Screenshot/LLM: Neovim buffer is a valid capture target; dual-read with `:Spw` diagnostics still required.  
Commands to earn: `:SpwProfile`, dialect-aware statusline chip, plan context for `.agents/plans`.

## Imagination / play

| Mode | Play |
|------|------|
| **IDE** | Open index.spw; `gf` on path; check dialect default Spw.b; open wip under plans → expect plan_surface |
| **Screenshot** | Capture statusline + brace region; ask model for dialect guess; verify with header |
| **Learning** | Builtins-first path through shape literacy without VS Code panels |
| **Falsify** | Phantom custom requests presented as success; panel-parity program |

## Practical use

| Concern | Hook |
|---------|------|
| Selectors | quickfix + LSP |
| Intermediate | code actions only for exact/plan-gated |
| Memory | no local re-parse of wip semantics beyond thin :SpwPlan |
| Tests | mounted-consumer smoke + dialect path |
| Expand | open derived only as readonly |

## Ladder position

Roadmap rung **2n** (parallel with VS Code performance after capability honesty). See `.agents/plans/vscode-lsp-roadmap/PLAN.md`.

Depends on:

- Shared LSP methods and diagnostics (not Neovim-only parsers)
- Capability matrix: demote or implement wrappers for `spw/operatorFrequency`, `spw/phaseContext`, etc.
- Soft: `measure-invariant-generalization` for mass diagnostics
- Soft: authoring-probe-loop for wonder/plan actions (LSP-first)

## Current reality (2026-07-27)

### Landed

| Surface | Evidence |
|---------|----------|
| Filetype + ftplugin + syntax | `ftdetect/`, `ftplugin/spw.vim`, `syntax/spw.vim` |
| Treesitter queries (highlight/fold/indent) | `queries/spw/*.scm` |
| LSP start / mount discovery | `lua/spw/lsp.lua`, README mounted-consumer story |
| Navigation | `lua/spw/navigation.lua` — open/peek ref, anchors |
| Commands | `lua/spw/commands.lua` — Restart, Stop, InlayHints, OpenRef, PeekRef, OperatorFreq, Phase, FormSeq, Temperature, … |
| Cross-editor instruments | `:SpwForm`, `:SpwStack`, `:SpwCache`, `:SpwRename`, and plan-only `:SpwRefactorPlan`; live probes use LSP and results use scratch splits |
| Form inserts | `lua/spw/form.lua` |
| Health | `lua/spw/health.lua`, `lua/vim/health/spw.lua` |
| Smoke | `tests/mounted-consumer-smoke.lua` |

### Gaps

| Gap | Detail |
|-----|--------|
| **Phantom custom requests** | OperatorFreq / Phase may fail if server never earned methods — same honesty debt as VS Code |
| **No mass/authority diagnostics** | Seed+CLI only; buffer does not show drift |
| **Wonder / `$%` inert** | Screenshots show authored probes; editor does not run or validate them |
| **No plan context** | Editing `wip.spw` / plan artifacts has no statusline next-commit signal |
| **Statusline field** | VS Code context strip has no Neovim counterpart (optional lualine/heirline snippet, not required dependency) |
| **Reading profiles** | No `vim.g.spw_reading_profile` noise budget |
| **No progressive source inspector** | Current commands expose operator and phase probes, but not the shared tokens → structure → trace product or its completeness/cost receipt |
| **Panel temptation** | Avoid porting Concepts/Atlas trees; prefer quickfix + float + notify |

## Mounted-consumer asks (2026-10-12)

A mounted consumer's editor review (pin `229aedcf`) made no Neovim-specific ask. What follows is **derived** from the routing table in `vscode-lsp-roadmap/PLAN.md`, statuses re-checked against `main`. Under the held method matrix, nothing here earns a new `:Spw*` wrapper or custom request; native projections of standard LSP products only.

| Row (consumer name) | Neovim projection |
|---------------------|-------------------|
| `diagnostics_match_the_parser`, `one_fact_model` | Diagnostics and the references quickfix come from the server; no change once the server is parser-first |
| `file_navigation`, `symbol_resolution` | `gf`/`gF` and `:SpwOpenRef` should defer to `textDocument/definition` and `documentLink`, which now land fragments on their anchor line (`861fa214`) |
| `stream_time` | `>>[` completion arrives through the existing LSP completion path; Timeline is VS Code chrome, not ported |
| `plan_context` | The planned `:SpwPlan` and statusline helper are the projection; hover shows the wonder question |
| `fact_store_with_readiness` | Standard `$/progress` surfaces in the statusline or notify; no Spw view |
| `move_updates_citations` | `willRenameFiles` is client-capability dependent; confirm what `vim.lsp` sends and what file-tree plugins trigger before claiming it |
| `capture_mode` | A reading profile (`vim.g.spw_reading_profile = 'capture'`) turning inlay hints off; no lens setting to add |
| Plans, Questions, Tending views | Not ported; quickfix from a server product at most, once one exists |

- **A second extractor lives here.** `lua/spw/navigation.lua` finds citations with Lua patterns (`~"..."`, `~<...>`, `@root/path`), and `completion.lua` reads root aliases by pattern. These are the Neovim copy of the disagreement the consumer measured on the server (regex over strings, comments and backtick examples). This extends the plan's rule that Lua never parses Spw for meaning: audit them against the server's parser-first answers and prefer the LSP result when attached.
- **Grammar drift.** `syntax/spw.vim` is a copy to check when `?[words_travel]` (audit-ui-data-models) settles, including how a hash-space line reads as a comment. `queries/spw/*.scm` turned out to have no parser behind it (2026-10-26) and goes in `~[drop_treesitter_queries]`.
- **Placement preview.** `?[leaf_placement]` is held at the roadmap; no Neovim command until a transport exists.

## Navigable and learnable (2026-10-26)

Read with headless Neovim 0.11.6 and the real server attached:

- **Semantic tokens win, and they know less.** The built-in client paints spw-lsp tokens at priority 125 over `syntax/spw.vim`. The syntax file has a group per sigil; the tokens give `~` and `@` one type (`variable`) and `!` and `?` another (`function`). The fix is upstream, in `editor-reading-hierarchy` `~[operator_modifiers]`; here, `~[operator_highlight_links]` maps the new modifiers to the per-sigil groups.
- **The tree-sitter queries never ran.** No `spw` parser exists.
- **Vim's own learning paths are empty.** There is no `doc/`, so `:help spw` finds nothing; the only structural motions are `[d` and `]d`; there are no text objects; 30 `:Spw*` commands have no hub; folds come from syntax regex while the server serves `foldingRange`.

Spw should move the way Vim moves. A reader who knows `]]`, `daf`, `gO` and `:help` should find them already working:

| Vim idiom | Spw meaning | Source |
|---|---|---|
| `]]` `[[` | next or previous frame, any operator | `textDocument/documentSymbol` (the outline symbols) |
| `]a` `[a`, `]?` `[?` | anchors, probes | outline details `anchor`, `probe` |
| `af` `if` | a frame, its body | outline symbol range |
| `ae` `ie`, `ak` `ik` | an expression, a facet | new `textDocument/selectionRange` |
| `gO` | outline in the location list | `documentSymbol` |
| `zc` `zo` | folds | `vim.lsp.foldexpr()` over `foldingRange` |
| `:help spw-!` | what a sigil means | generated from the operator table |
| `:Spw <Tab>` | every command, grouped read / sense / mutate | `commands.lua`, as `spw help` groups the CLI |

The outline is already token-driven and hierarchical, so motions and frame text objects need no new server method. Lua still parses nothing.

## Scope

### In scope

- Audit configured → invoked → observed → tested (editor-surface-audit evidence ladder)
- Mounted-consumer startup truth and failure copy
- Capability honesty: only wrap **earned** `spw/*` methods; remove or soft-fail phantoms
- Project LSP diagnostics for mass/path/open-questions (once server emits them)
- Code actions via existing `<localleader>a` / `:SpwCodeAction` for exact mass fix, create-missing-target, mobility when earned
- Commands:
  - `:SpwMass` — request mass reconcile for buffer / selection (or rely on diagnostics alone)
  - `:SpwProbe` — run/show `!probe` / wonder block at cursor (when `spw/probe` or diagnostics-based path exists)
  - `:SpwPlan` — if path matches `.agents/plans/<slug>/`, show goal / next commit / open count from `wip.spw` (client parse of thin frames OK; do not re-parse full Spw semantics)
- Optional statusline helper module (pure Lua, no plugin dep) exposing phase/facet when `spw/contextAtPosition` is earned
- `vim.g.spw_reading_profile` = `author|prompt|research|creative` — maps to LSP init settings / diagnostic tag filters when server supports them
- `:SpwInspect [tokens|structure|trace]` — project the shared progressive source product for the file, cursor block, or selection into a scratch buffer/float. File-backed CLI fallback is acceptable; unsaved/range inspection requires an earned server request or stdin protocol, never a Lua parser.
- A research projection showing exact spans, resolved dialect/profile, included/omitted fields, completeness, generated/retained events, elapsed time, parser/product revision, and cache plane. A broad-audience site may render the same receipt as cards or expandable layers without changing its state or provenance.
- Local-only inspection by default. No editor activity telemetry, person-level inference, or authority effect follows from an exploratory source product.
- README + health checks for mount/workbench discovery
- Headless smoke expansion: open index.spw-like fixture, assert diagnostic or navigation contract

### Out of scope

- Parity with VS Code tree views or webviews
- External UI plugin dependencies (telescope optional later, not required)
- Re-implementing seed measure/geometry in Lua
- IntelliJ work

## Projection map (LSP → Neovim)

| Server product | Neovim projection |
|----------------|-------------------|
| `textDocument/publishDiagnostics` (mass drift, broken ref, scheme_mismatch) | location list / `[d` `]d` / float |
| `textDocument/codeAction` (exact mass rewrite, create target) | `<localleader>a`, `:SpwCodeAction` |
| `spw/contextAtPosition` | optional statusline / `:SpwPhase` if earned |
| `spw/workspaceTemperature` | `:SpwTemperature` (landed wrapper) |
| `spw/formContext` | float or notify when earned |
| progressive source products (`tokens → structure → trace`) | `:SpwInspect` scratch/float with range, omissions, cost, and cache receipt; quickfix only for actual diagnostics |
| Plan metadata | `:SpwPlan` (client thin-read) |

## Files

```text
[NEW] .agents/plans/neovim-spw-surfaces/PLAN.md
[MOD] .agents/plans/neovim-spw-surfaces/wip.spw
[MOD] extensions/neovim-spw/lua/spw/commands.lua
[MOD] extensions/neovim-spw/lua/spw/lsp.lua
[MOD?] extensions/neovim-spw/lua/spw/plan.lua          thin plan-context reader
[MOD?] extensions/neovim-spw/lua/spw/statusline.lua    optional context chip
[NEW?] extensions/neovim-spw/lua/spw/inspect.lua       progressive product projection; no parser
[MOD] extensions/neovim-spw/lua/spw/health.lua
[MOD] extensions/neovim-spw/README.md
[MOD] extensions/neovim-spw/tests/mounted-consumer-smoke.lua
[MOD] .spw/tooling/neovim-spw.spw
[DEL] extensions/neovim-spw/queries/spw/{highlights,folds,indents}.scm   no parser exists
[NEW] extensions/neovim-spw/lua/spw/motions.lua        motions and text objects over documentSymbol and selectionRange
[NEW] extensions/neovim-spw/tests/motions-smoke.lua
[MOD] extensions/neovim-spw/ftplugin/spw.vim           motion and text-object maps, gO, LSP folds
[MOD] extensions/neovim-spw/lua/spw/commit.lua         @lsp.typemod.operator.<word> links beside the commitRef links
[MOD] extensions/neovim-spw/lua/spw/quest.lua          a motion per quest step
[NEW] extensions/neovim-spw/doc/spw.txt                generated; tags per command, mapping and sigil
[NEW] help generator (+ check mode)                    home per ?[help_generator_home]
[NEW] packages/spw-lsp/src/handlers/selection-range.ts (+ test)
[MOD] packages/spw-lsp/src/stdio-server.ts             selectionRangeProvider
[REF] .agents/plans/vscode-lsp-roadmap/PLAN.md
[REF] .agents/plans/measure-invariant-generalization/PLAN.md
[REF] .agents/plans/vscode-authoring-probe-loop/PLAN.md
[REF] packages/spw-lsp/src/stdio-server.ts
```

### Craft guard

- Builtins first; every new module must justify itself against standard LSP UX.
- No second parser for Spw meaning in Lua.
- Custom requests only after protocol registry marks them earned.
- Keep `commands.lua` from becoming a kitchen sink — split plan/probe modules if >400 lines. The `:Spw` hub goes in its own module if it would push `commands.lua` (254 lines) past that.
- Motions read the server's outline; with no server attached they do nothing rather than fall back to Lua patterns.

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

## Agentic Hygiene

- Rebase target: `main@0c7cdfb7178079bf27a9a062ba1b310d07296f41`
- Rebase cadence: before `audit_surfaces`, before implementation after audit, before merge
- Hygiene split: audit evidence commits separate from feature commits

## Dependencies

- Hard: shared `spw-lsp` capability honesty (`lsp-custom-request-completions`)
- Soft: `measure-invariant-generalization` (diagnostics payload)
- Soft: `vscode-authoring-probe-loop` for shared probe semantics (implement once on server)
- Soft: `mounted-consumer-tooling`
- Related: `vscode-plugin-performance` (server cost bounds)

## Failure Modes

- **Hard:** Lua re-parses Spw and disagrees with LSP
- **Hard:** a bounded editor card drops exact spans or omissions while presenting itself as the recoverable source product
- **Hard:** commands advertise dead `spw/*` methods as success paths
- **Soft:** statusline spam on CursorHold
- **Non-negotiable:** no absolute user paths in docs/examples; placeholders only

## Validation

- **Hypotheses:** same diagnostic codes appear in VS Code Problems and Neovim quickfix for the same fixture; exact mass fix applies identical edits
- **Negative controls:** syntax highlighting and `gf` navigation still work with LSP disabled
- **Demo:** open `.spw/index.spw` → jump `@docs` root ref → open wonder block → see probe-related diagnostic or action → edit plan `wip.spw` → `:SpwPlan`
- **Moves demo:** open a plan `wip.spw` → `]]` to `^["open"]` → `daf` and `u` → `]a` to an anchor → `gO` → `:help spw-#>` → `:Spw <Tab>`. `motions-smoke.lua` asserts each landing line against the server outline.
- **Help drift:** the generator's check mode fails when a `:Spw*` command, a mapping or an operator lacks a tag.

## Spw Artifact

`.spw/tooling/neovim-spw.spw` remains the living tooling register; optional plan-local artifact only if Neovim-specific constraints diverge from the shared editor contract.
