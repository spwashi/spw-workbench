-- lua/spw/commit.lua — git commits the language server links, opened in Neovim.
--
-- spw-lsp links every git hash it confirms as a commit — a landed
-- `.[name](hash)` in a plan, or a hash cited in prose that git knows — to
-- `spw-commit:/<full hash>?root=<percent-encoded repository path>`.
-- Here that link opens a read-only buffer of `git show` (header, stat, patch,
-- filetype git), and :SpwCommitFiles lists the files the commit changed in
-- the quickfix list: the Neovim side of VS Code's commit document and changes
-- view. Buffers are named `spw-commit://<hash>?root=<path>`; the double slash
-- keeps Vim from reading the name as a path under the working directory.
local M = {}

M.SCHEME = 'spw-commit'

---@param value string
---@return string
local function decode(value)
  return (value:gsub('%%(%x%x)', function(hex) return string.char(tonumber(hex, 16)) end))
end

--- The commit a spw-commit URI or buffer name names, or nil.
---@param uri string
---@return { hash: string, root: string }|nil
function M.parse(uri)
  local hash, root = uri:match('^spw%-commit:/*([0-9a-f]+)%?root=(.+)$')
  if not hash or #hash < 7 or #hash > 64 then return nil end
  return { hash = hash, root = decode(root) }
end

--- The buffer name a commit opens under.
---@param target { hash: string, root: string }
---@return string
function M.buffer_name(target)
  return 'spw-commit://' .. target.hash .. '?root=' .. target.root
end

---@param root string
---@param args string[]
---@return boolean ok
---@return string[] lines
local function git(root, args)
  local cmd = { 'git', '-C', root }
  vim.list_extend(cmd, args)
  local lines = vim.fn.systemlist(cmd)
  return vim.v.shell_error == 0, lines
end

--- Fill `bufnr` with the commit its name points at; the BufReadCmd for spw-commit://*.
---@param bufnr integer
---@param name string
function M.read(bufnr, name)
  local target = M.parse(name)
  local lines
  if not target then
    lines = { 'This link names no commit.' }
  else
    local ok, out = git(target.root, {
      '-c', 'core.quotepath=false', 'show', '--no-color', '--no-ext-diff', '--format=fuller', '--stat', '--patch', target.hash,
    })
    lines = ok and out or { ('git could not show %s in %s.'):format(target.hash, target.root) }
  end
  vim.bo[bufnr].modifiable = true
  vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, lines)
  vim.bo[bufnr].buftype = 'nofile'
  vim.bo[bufnr].swapfile = false
  vim.bo[bufnr].bufhidden = 'hide'
  vim.bo[bufnr].modifiable = false
  vim.bo[bufnr].modified = false
  vim.bo[bufnr].filetype = 'git'
end

--- Open the commit a link names, in this window or a split.
---@param uri string a spw-commit link target or buffer name
---@param opts? { split?: boolean }
---@return integer|nil bufnr
function M.open(uri, opts)
  local target = M.parse(uri)
  if not target then
    vim.notify('Spw: not a commit link: ' .. uri, vim.log.levels.WARN, { title = 'spw' })
    return nil
  end
  if opts and opts.split then vim.cmd('split') end
  local bufnr = vim.fn.bufadd(M.buffer_name(target))
  vim.bo[bufnr].buflisted = true
  vim.fn.bufload(bufnr)
  vim.api.nvim_win_set_buf(0, bufnr)
  return bufnr
end

--- The files a commit changed, as quickfix items in the working tree.
---@param target { hash: string, root: string }
---@return table[] items
function M.file_items(target)
  local ok, lines = git(target.root, { '-c', 'core.quotepath=false', 'show', '--numstat', '--format=', target.hash })
  if not ok then return {} end
  local items = {}
  for _, line in ipairs(lines) do
    local added, deleted, path = line:match('^(%S+)\t(%S+)\t(.+)$')
    if path then
      local counts = added == '-' and 'binary' or ('+%s −%s'):format(added, deleted)
      table.insert(items, {
        filename = target.root .. '/' .. path,
        lnum = 1,
        text = ('%s · %s'):format(counts, target.hash:sub(1, 8)),
      })
    end
  end
  return items
end

--- List a commit's changed files in the quickfix list and open it.
---@param uri string
---@return integer count
function M.files(uri)
  local target = M.parse(uri)
  if not target then return 0 end
  local items = M.file_items(target)
  vim.fn.setqflist({}, ' ', { title = 'Spw commit ' .. target.hash:sub(1, 8), items = items })
  if #items > 0 then vim.cmd('copen') end
  return #items
end

--- The commit link under the cursor: the server's document link when attached,
--- else a hash under the cursor that git confirms. Calls `cb(uri|nil)`.
---@param cb fun(uri: string|nil)
function M.link_under_cursor(cb)
  local bufnr = vim.api.nvim_get_current_buf()
  if vim.bo[bufnr].buftype == 'nofile' and M.parse(vim.api.nvim_buf_get_name(bufnr)) then
    return cb(vim.api.nvim_buf_get_name(bufnr))
  end
  local lsp = require('spw.lsp')
  local client = lsp.attached_client(bufnr, 'textDocument/documentLink')
  local function from_word()
    local word = vim.fn.expand('<cword>')
    if not word:match('^%x+$') or #word < 7 or #word > 64 or word:find('%u') then return cb(nil) end
    local file = vim.api.nvim_buf_get_name(bufnr)
    local dir = file ~= '' and vim.fn.fnamemodify(file, ':h') or vim.fn.getcwd()
    local ok_root, top = git(dir, { 'rev-parse', '--show-toplevel' })
    if not ok_root or not top[1] then return cb(nil) end
    local ok, full = git(top[1], { 'rev-parse', '--verify', '--quiet', word .. '^{commit}' })
    cb(ok and full[1] and ('spw-commit:/' .. full[1] .. '?root=' .. top[1]) or nil)
  end
  if not client then return from_word() end
  local params = vim.lsp.util.make_position_params(0, client.offset_encoding)
  lsp.client_call(client, 'request', 'textDocument/documentLink', { textDocument = params.textDocument }, function(err, links)
    if not err then
      local pos = params.position
      for _, link in ipairs(links or {}) do
        local r = link.range
        if link.target and link.target:match('^spw%-commit:') and r.start.line == pos.line
          and pos.character >= r.start.character and pos.character < r['end'].character then
          return cb(link.target)
        end
      end
    end
    from_word()
  end, bufnr)
end

--- :SpwCommit [hash] — open the commit under the cursor, or the one named.
---@param hash string|nil
function M.open_command(hash)
  if hash and hash ~= '' then
    local file = vim.api.nvim_buf_get_name(0)
    local dir = file ~= '' and vim.fn.fnamemodify(file, ':h') or vim.fn.getcwd()
    local ok_root, top = git(dir, { 'rev-parse', '--show-toplevel' })
    local ok, full = git(ok_root and top[1] or dir, { 'rev-parse', '--verify', '--quiet', hash .. '^{commit}' })
    if not (ok_root and ok and full[1]) then
      vim.notify('Spw: no commit ' .. hash .. ' here', vim.log.levels.WARN, { title = 'spw' })
      return
    end
    M.open('spw-commit:/' .. full[1] .. '?root=' .. top[1])
    return
  end
  M.link_under_cursor(function(uri)
    if uri then M.open(uri) else
      vim.notify('Spw: no commit under the cursor', vim.log.levels.INFO, { title = 'spw' })
    end
  end)
end

--- :SpwCommitFiles [hash] — the commit's changed files in the quickfix list.
---@param hash string|nil
function M.files_command(hash)
  local function run(uri)
    if not uri then
      vim.notify('Spw: no commit under the cursor', vim.log.levels.INFO, { title = 'spw' })
      return
    end
    M.files(uri)
  end
  if hash and hash ~= '' then
    local dir = vim.fn.getcwd()
    local ok_root, top = git(dir, { 'rev-parse', '--show-toplevel' })
    local ok, full = git(ok_root and top[1] or dir, { 'rev-parse', '--verify', '--quiet', hash .. '^{commit}' })
    return run(ok_root and ok and full[1] and ('spw-commit:/' .. full[1] .. '?root=' .. top[1]) or nil)
  end
  M.link_under_cursor(run)
end

--- The commitRef semantic token reads in the number color unless a colorscheme says otherwise.
function M.link_highlight()
  vim.api.nvim_set_hl(0, '@lsp.type.commitRef', { link = '@number', default = true })
end

function M.setup()
  if vim.g._spw_commit_loaded then return end
  vim.g._spw_commit_loaded = true
  local group = vim.api.nvim_create_augroup('spw_commit', { clear = true })
  vim.api.nvim_create_autocmd('BufReadCmd', {
    group = group,
    pattern = 'spw-commit://*',
    callback = function(args) M.read(args.buf, args.match) end,
  })
  vim.api.nvim_create_autocmd('ColorScheme', { group = group, callback = M.link_highlight })
  M.link_highlight()
end

return M
