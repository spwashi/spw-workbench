# neovim-spw

Neovim support for **Spw** (Symbolic Processing Workbench) files.

## Features

| Feature | Source | Notes |
|---------|--------|-------|
| Syntax highlighting | `syntax/spw.vim` | Operator-physics palette with valence, container, and sigil layers |
| LSP | `lua/spw-lsp.lua` | Connects to the shared `stdio-server.ts` used by VS Code and IntelliJ |
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
```

## Default keymaps

Set on attach (disable with `vim.g.spw_lsp_keymaps = false`):

`<localleader>` is your Neovim `maplocalleader` key. If you never set it, Vim default is `\`.

| Key | Action |
|-----|--------|
| `gf` | Open Spw reference under cursor (`~"…"`, `~<path>`, `~<label>"…"`, `@root/...`) |
| `gF` | Open Spw reference and jump to `#anchor` (line number or label) |
| `<localleader>a` | Spw code action at cursor (create missing target, or fallback LSP actions) |
| `<localleader>q` | Populate quickfix with unresolved references in current buffer |
| `<localleader>p` | Preview reference under cursor and jump to `#anchor` |
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
| `:SpwInsertFormWrap` | Insert `& => {&} => {&[#label]}` at cursor |
| `:SpwWrapContainer [label]` | Wrap visual selection or word under cursor in Spw container `^["label"]{ ... }` |

The concise creative loop is `:SpwForm` → `:SpwStack` → `:SpwCache` → `:SpwRename` → `:SpwRefactorPlan`. File probes use live buffer text through the LSP. Results are ordinary scratch splits that can be searched, copied, remapped, or composed with the rest of a Neovim workflow. Corpus planning uses saved files, runs with the consumer root as `cwd`, opens JSON in a scratch buffer, and never adds `--write`.

## Auto-completion & Omnifunc

The plugin provides a native `omnifunc` provider (`<C-x><C-o>`):

- **`@`**: Autocompletes workspace root shelf aliases (`@biome/`, `@harness/`, `@gen/`, `@docs/`, etc.)
- **`#`**: Autocompletes directives (`#!pragmatics`, `#!semantics`, `#!physics`) and label anchors
- **`~`**: Autocompletes reference templates (`~"..."`, `~<...>`)

Works seamlessly with `nvim-cmp` or `blink.cmp` via the omni completion source.

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

## Inlay hints

On Neovim 0.10+, inlay hints are enabled automatically when the LSP attaches. Toggle with `:SpwInlayHints` or directly:

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

## Headless testing

Run the headless smoke test suite:

```sh
nvim --headless -u NONE -l extensions/neovim-spw/tests/mounted-consumer-smoke.lua
```
