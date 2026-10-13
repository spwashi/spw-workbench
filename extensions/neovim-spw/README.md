# neovim-spw

Neovim support for **Spw** (Symbolic Processing Workbench) files.

## Features

| Feature | Source | Notes |
|---------|--------|-------|
| Syntax highlighting | `syntax/spw.vim` | Operator-physics palette with valence, container, and sigil layers |
| LSP | `lua/spw-lsp.lua` | Connects to the shared `stdio-server.ts` used by VS Code and IntelliJ |
| Navigation | `lua/spw/navigation.lua`, `lua/spw/lsp_nav.lua` | LSP first: `gf`/`gF` use the server's definition (else documentLink); Lua patterns only with no client attached |
| Instruments | `lua/spw/inspect.lua`, `lua/spw/quest.lua` | `:SpwInspect`, `:SpwFingerprint`, `:SpwMemory`, `:SpwPerf`, `:SpwProject`, `:SpwQuest` through the `spw` CLI |
| Filetype detection | `ftdetect/spw.vim` | `*.spw` → `filetype=spw` |
| Editor defaults | `ftplugin/spw.vim` | `#` commentstring, fold method, suffix resolution |

## Install

### lazy.nvim
```lua
{ dir = '~/path/to/spw-workbench/extensions/neovim-spw' }
```

### Manual (symlink)
```sh
ln -s /path/to/spw-workbench/extensions/neovim-spw \
      ~/.local/share/nvim/site/pack/spw/start/neovim-spw
```

### Mounted consumers

Works from any repo that mounts the workbench at `.spw/_workbench` (see
`spw init`): the workspace root resolves to the consumer repo — so the server
reads its `.spw/shelves.spw` / `topology.spw` — while the server process
launches from the mounted workbench, where `npm run lsp` resolves. No
configuration needed; `vim.g.spw_lsp_cmd` / `vim.g.spw_lsp_root` still
override.

## Configuration

The LSP starts automatically when you open a `.spw` file. Override defaults:

```lua
-- Custom LSP command (default: npm run --silent lsp, launched from the
-- workbench that owns the script)
vim.g.spw_lsp_cmd = { 'npx', 'tsx', 'packages/spw-lsp/src/stdio-server.ts' }

-- Force a specific workspace root
vim.g.spw_lsp_root = '/path/to/spw-workbench'

-- Disable LSP entirely
vim.g.spw_lsp_disable = true

-- Auto-create missing parent directories when writing .spw files (default: true)
vim.g.spw_auto_mkdir = false

-- Pass server-side settings (overlaid on .spw/config.json)
vim.g.spw_lsp_settings = { inlayHints = { paths = false } }

-- Optional CLI tool root for corpus refactor plans. Relative paths resolve
-- from the consumer workspace; otherwise project and .spw/_workbench are discovered.
vim.g.spw_cli_root = '.spw/_workbench'

-- Disable the default buffer keymaps (set your own in on_attach)
vim.g.spw_lsp_keymaps = false

-- Disable LSP-driven folding (keeps syntax folding from ftplugin)
vim.g.spw_lsp_folds = false

-- Keep inlay hints off at attach (on by default; :SpwInlayHints toggles per buffer)
vim.g.spw_lsp_inlay_hints = false

-- Leave code lenses undrawn (on by default: frame counts and anchor refs)
vim.g.spw_lsp_codelens = false
```

## Default keymaps

Set by the ftplugin and again on attach (disable with `vim.g.spw_lsp_keymaps = false`):

`<localleader>` is your Neovim `maplocalleader` key. If you never set it, Vim default is `\`.

| Key | Action |
|-----|--------|
| `gf` | Open Spw reference under cursor (`~"…"`, `~<path>`, `~<label>"…"`, `@root/...`) |
| `gF` | Open Spw reference and jump to `#anchor` (line number or label) |

`gf`, `gF`, `:SpwOpenRef` and `:SpwPeekRef` ask the attached `spw` client first:
`textDocument/definition`, or `textDocument/documentLink` (its `#L<n>` target) when
definition is not served. The Lua patterns in `lua/spw/navigation.lua` run only when no
`spw` client is attached to the buffer. When the server resolves nothing under the cursor
(not a reference, or a missing target), Vim's own `gf` runs; `<localleader>a` offers to
create a missing target. Each run records `vim.b.spw_nav_path` (`lsp` | `lua`),
`vim.b.spw_nav_source`, and `vim.b.spw_nav_result`.
| `<localleader>a` | Spw code action at cursor (create missing target, or fallback LSP actions) |
| `<localleader>q` | Populate quickfix with unresolved references in current buffer |
| `<localleader>p` | Preview reference under cursor and jump to `#anchor` |
| `<localleader>c` | Open the git commit under the cursor as a read-only buffer |
| `<localleader>l` | Run the code lens on this line |
| `gd` | Go to definition |
| `K` | Hover docs |
| `gr` | References |
| `<leader>rn` | Rename symbol |
| `<leader>f` | Format document |
| `[d` / `]d` | Prev / next diagnostic |
| `<leader>e` | Diagnostic float |

## User commands

| Command | Description |
|---------|-------------|
| `:SpwRestart` | Restart the LSP server |
| `:SpwStop` | Stop the LSP server |
| `:SpwInlayHints` | Toggle inlay hints for current buffer |
| `:SpwCommit [hash]` | Open the commit under the cursor (or the one named) as a read-only `git show` buffer |
| `:SpwCommitFiles [hash]` | List the files that commit changed in the quickfix list |
| `:SpwOpenRef` | Open reference under cursor and jump to `#anchor` |
| `:SpwPeekRef` | Preview reference under cursor and jump to `#anchor` |
| `:SpwRefsQuickfix` | Quickfix list of unresolved references in current buffer |
| `:SpwCodeAction` | Local Spw code actions under cursor |
| `:SpwForm` | Inspect live brace geometry and resonance (`spw/geometry`) |
| `:SpwStack` | Inspect the live surface profile (`spw/surfaceProfile`) |
| `:SpwCache` | Inspect LSP session cache reflection; Neovim adds no client probe cache |
| `:SpwRename` | Rename the symbol at the caret through standard LSP Rename |
| `:SpwRefactorPlan [kind:from=to]` | Open a plan-only corpus refactor through the canonical CLI |
| `:SpwOperatorFreq` | Operator/sigil frequency for current buffer (`spw/operatorFrequency`) |
| `:SpwPhase` | Spirit-phase context at cursor (`spw/phaseContext`) |
| `:SpwFormSeq [notation]` | Explain form sequence (default confluence wrap) |
| `:SpwTemperature` | Workspace temperature tiers |
| `:SpwInspect [tokens\|structure\|trace]` | Progressive source products for the saved file (`spw inspect source <file> --through <stage>`, default `trace`); with a range or visual selection, `--text=` |
| `:SpwFingerprint` | AST node-type counts for the selection or current line (`spw fingerprint --expr=`) |
| `:SpwMemory` | Runtime memory status and dumps (`spw inspect memory`, which reads through `spw mem status`, then `spw mem list`) |
| `:SpwPerf` | pathRef count with walk/parse timing for the file's folder (`spw query --from <folder> --selector pathRefs --count --stats`) |
| `:SpwProject` | The saved file's `spw.emit/1` intermediate form as JSON (`spw emit ir <file>`; no `--out`, nothing written) |
| `:SpwQuest` | Quest panels from `spw quest --json` in an editable scratch buffer |
| `:SpwQuest check [step]` | `spw quest --check <step> "<current line>"`; the step defaults to the nearest panel heading |
| `:SpwInsertFormWrap` | Insert `& => {&} => {&[#label]}` at cursor |
| `:SpwWrapContainer [label]` | Wrap visual selection or word under cursor in Spw container `^["label"]{ ... }` |

### Instruments

`:SpwInspect`, `:SpwFingerprint`, `:SpwMemory` and `:SpwPerf` open a plain-text receipt in a
scratch split: a header naming what was read (saved file, line range passed inline, or the
runtime memory under the consumer root), then for each run its command, exit code and time,
the CLI's stderr (header cards, `--stats`), then its stdout. Inline source is summarized in
the receipt as `--text=<N chars>`. A non-zero exit that still carries a product (fingerprint
exit 1 for a prose fallback) is shown with its exit, not hidden behind an error.
File-backed instruments read the saved file and warn when the buffer has unsaved edits.
`:SpwProject` opens bare JSON so the buffer stays valid JSON; its command and time go to
`:messages`. Arguments match the VS Code and IntelliJ instruments, so one fixture reads the
same in every editor.

`:SpwQuest` draws the panels in their order with every `try` line verbatim; each try line
shows its check verdict as virtual text. Write or edit a line under a panel and run
`:SpwQuest check`: the verdict appears under the line and in `vim.b.spw_quest_last`.
The `grow` step runs `spw lint .spw && spw resolve --from .spw` only when checked.

All instruments run the CLI from the consumer root (`npm --prefix <tool root> run spw`,
discovered as for `:SpwRefactorPlan`) and are read-only.

The concise creative loop is `:SpwForm` → `:SpwStack` → `:SpwCache` → `:SpwRename` → `:SpwRefactorPlan`. File probes use live buffer text through the LSP. Results are ordinary scratch splits that can be searched, copied, remapped, or composed with the rest of a Neovim workflow. Corpus planning uses saved files, runs with the consumer root as `cwd`, opens JSON in a scratch buffer, and never adds `--write`.

## Auto-completion & Omnifunc

The plugin provides a native `omnifunc` provider (`<C-x><C-o>`). When an `spw` client serving
`textDocument/completion` is attached, it hands off to `vim.lsp.omnifunc`, so items come
from the server. With no client attached it falls back to:

- **`@`**: Autocompletes workspace root shelf aliases (`@biome/`, `@harness/`, `@gen/`, `@docs/`, etc.)
- **`#`**: Autocompletes directives (`#!pragmatics`, `#!semantics`, `#!physics`) and label anchors
- **`~`**: Autocompletes reference templates (`~"..."`, `~<...>`)

Works seamlessly with `nvim-cmp` or `blink.cmp` via the omni completion source. The path taken
is recorded in `vim.b.spw_completion_path` (`lsp` | `lua`).

## Tree-sitter queries

The plugin ships native Tree-sitter query captures under `queries/spw/`:

- `queries/spw/highlights.scm`: AST-level syntax highlighting for operators, sigils, and containers
- `queries/spw/folds.scm`: Structural folding for block and record containers
- `queries/spw/indents.scm`: Automatic indentation formatting inside container blocks

If a leader mapping does not trigger, inspect what owns it in the current buffer:

```vim
:verbose nmap <localleader>a
:verbose nmap <localleader>q
:verbose nmap <localleader>p
```

## File creation ergonomics

By default, this plugin creates missing parent directories on `:w` for `.spw` buffers.
This makes `gf` followed by `:w` work even when intermediate folders do not exist yet.

Disable it with:

```lua
vim.g.spw_auto_mkdir = false
```

## Folding

On Neovim 0.10+, brace-depth folding is driven by the LSP (`foldexpr=v:lua.vim.lsp.foldexpr()`), replacing the syntax fold. Falls back to `foldmethod=syntax` on older versions. Disable with `vim.g.spw_lsp_folds = false`.

## Git commits

The server links every git hash it confirms as a commit: a landed `.[name](hash)` in a plan, and any 7 to 40 character hash in prose that git knows. In Neovim:

- `gf` on a hash opens the commit when the server has no definition for it, through its document link.
- `:SpwCommit` (or `<localleader>c`) opens the commit as a read-only buffer named `spw-commit://<hash>?root=<repo>`, with `filetype=git`. With no server attached, it falls back to the word under the cursor, if git confirms it.
- `:SpwCommitFiles` lists the changed files in the quickfix list.
- Landed hashes take the `commitRef` semantic token, and any other hash-shaped run (7 to 40 hex characters with a digit and a letter) takes `hashlike`, whether or not git knows it. Both link to `@number` unless your colorscheme sets `@lsp.type.commitRef` or `@lsp.type.hashlike`. Hovering a hashlike git does not hold says it is not a commit here.

## Code lenses

Code lenses are refreshed on attach, `BufEnter`, `InsertLeave`, and `BufWritePost`. They show frame counts such as `2 #tags · 1 #: lens`, and anchor refs. Run one with `<localleader>l`. Turn them off with `vim.g.spw_lsp_codelens = false`.

## File watching

Neovim sends file events only for watchers a server registers. spw-lsp registers them at `initialized`: every `.spw` file, plus deletes of anything, so a deleted folder drops the files it held from the workspace index.

## Inlay hints

On Neovim 0.10+, inlay hints are enabled automatically when the LSP attaches. Keep them off with `vim.g.spw_lsp_inlay_hints = false`. Toggle with `:SpwInlayHints` or directly:

```lua
vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled(), { bufnr = 0 })
```

## `.spw/` workspace integration

The LSP server reads three files from the workspace's `.spw/` directory at startup to self-describe the project:

| File | Role |
|------|------|
| `.spw/shelves.spw` | Root aliases (`@biome`, `@harness`, `@gen`, …) — makes `@root/path` references resolve correctly |
| `.spw/topology.spw` | Subroot routing (`^subroot[name]`) — drives subroot classification and cache-tier detection |
| `.spw/editing.spw` | Editing categories (`^category[macro]`) — shown in code lens and used for per-file context |

Code lens on the first line of `.spw/` files shows the **workspace plane** and **editing category**:
```
◈ register · macro   ← plane · category
⚠ generated surface — do not hand-edit   ← files in .spw/gen/
```

## Health check

Run Neovim's health check to verify your setup (Node.js, LSP binary, Neovim version, workspace root resolution):

```vim
:checkhealth spw
```

It reports on the current `.spw` buffer (or the most recent one, since `:checkhealth` opens
its own buffer): whether an `spw` LSP client is attached, the active navigation path
(`lsp (textDocument/definition)`, `lsp (textDocument/documentLink)`, or `lua`), the
completion path, the last navigation in that buffer, whether every instrument command is
registered, and which CLI host the instruments will use.

## Headless testing

Run the headless suites from the repository root:

```sh
# Exports, reference patterns, mounted-consumer CLI command shape
nvim --headless -u NONE -l extensions/neovim-spw/tests/mounted-consumer-smoke.lua
# Command registration and the LSP-or-fallback choice (in-process fake server)
nvim --headless -u NONE -l extensions/neovim-spw/tests/lsp-route-smoke.lua
# Instrument builders, then real CLI runs against tests/fixtures/instrument.spw
nvim --headless -u NONE -l extensions/neovim-spw/tests/instrument-smoke.lua
# Commit links, the commit buffer and quickfix, code lenses and the inlay setting (git, fake server)
nvim --headless -u NONE -l extensions/neovim-spw/tests/commit-smoke.lua
# Opt-in: the LSP path against the real server (needs node deps)
nvim --headless -u NONE -l extensions/neovim-spw/tests/real-lsp-smoke.lua
```

`SPW_NVIM_SKIP_CLI=1` limits `instrument-smoke.lua` to the builder checks.
