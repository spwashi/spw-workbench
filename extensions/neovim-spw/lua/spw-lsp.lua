-- spw-lsp.lua — Neovim LSP client for the Spw Language Server
--
-- The LSP server is the same stdio-server.ts used by VS Code and IntelliJ.
-- It provides: diagnostics, hover (operator + symmetry), document links,
-- inlay hints (register slots), folding, and document symbols.
--
-- Usage:
--   1. Ensure this plugin is on your runtimepath (symlink or package manager)
--   2. The LSP starts automatically when a .spw file is opened (via ftplugin)
--   3. Override the command or root detection via vim.g.spw_lsp_*

local M = {}

--- Locate the workspace root by walking up from `bufpath` looking for
--- marker files that indicate an Spw project.
---@param bufpath string
---@return string
local function find_root(bufpath)
  local markers = { 'package.json', '.spw', 'index.spw', '.git' }
  local dir = vim.fn.fnamemodify(bufpath, ':h')

  -- Walk upward until we hit / or find a marker
  while dir ~= '/' and dir ~= '' do
    for _, marker in ipairs(markers) do
      local candidate = dir .. '/' .. marker
      if vim.fn.isdirectory(candidate) == 1 or vim.fn.filereadable(candidate) == 1 then
        return dir
      end
    end
    dir = vim.fn.fnamemodify(dir, ':h')
  end

  -- Fallback: directory of the current file
  return vim.fn.fnamemodify(bufpath, ':h')
end

--- Build the command to start the LSP server.
--- Checks `vim.g.spw_lsp_cmd` first, then falls back to `npm run lsp`
--- (which invokes `npx tsx scripts/lsp/stdio-server.ts` via package.json).
---@param root string  workspace root
---@return string[]
local function build_cmd(root)
  -- User override: vim.g.spw_lsp_cmd = { 'npx', 'tsx', 'scripts/lsp/stdio-server.ts' }
  if vim.g.spw_lsp_cmd then
    return vim.g.spw_lsp_cmd
  end

  -- Check for the npm "lsp" script in the workspace
  local pkg = root .. '/package.json'
  if vim.fn.filereadable(pkg) == 1 then
    local content = table.concat(vim.fn.readfile(pkg), '\n')
    if content:find('"lsp"') then
      return { 'npm', 'run', 'lsp' }
    end
  end

  -- Direct invocation fallback
  local server = root .. '/scripts/lsp/stdio-server.ts'
  if vim.fn.filereadable(server) == 1 then
    return { 'npx', 'tsx', server }
  end

  -- Last resort
  return { 'npm', 'run', 'lsp' }
end

--- Start (or attach to) the Spw LSP server for the current buffer.
function M.start()
  -- Guard: only in Neovim 0.8+ with the native LSP client
  if not vim.lsp or not vim.lsp.start then return end

  -- Respect a kill switch: vim.g.spw_lsp_disable = true
  if vim.g.spw_lsp_disable then return end

  local bufpath = vim.api.nvim_buf_get_name(0)
  if bufpath == '' then return end

  local root = vim.g.spw_lsp_root or find_root(bufpath)
  local cmd = build_cmd(root)

  vim.lsp.start({
    name = 'spw',
    cmd = cmd,
    root_dir = root,
    filetypes = { 'spw' },
    settings = {},
    capabilities = vim.lsp.protocol.make_client_capabilities(),

    -- Enable inlay hints if Neovim supports them (0.10+)
    init_options = {
      inlayHints = true,
    },
  })

  -- Auto-enable inlay hints when the server attaches (Neovim 0.10+)
  if vim.lsp.inlay_hint and vim.lsp.inlay_hint.enable then
    vim.api.nvim_create_autocmd('LspAttach', {
      buffer = 0,
      once = true,
      callback = function()
        vim.lsp.inlay_hint.enable(true, { bufnr = 0 })
      end,
    })
  end
end

return M
