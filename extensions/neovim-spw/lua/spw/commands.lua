-- lua/spw/commands.lua — Spw user commands for Neovim
local lsp = require('spw.lsp')
local nav = require('spw.navigation')
local M = {}

---@param msg string
---@param level integer
local function notify(msg, level)
  if vim.notify then
    vim.notify(msg, level, { title = 'spw' })
  end
end

function M.setup()
  if vim.g._spw_lsp_commands_loaded then return end
  vim.g._spw_lsp_commands_loaded = true

  vim.api.nvim_create_user_command('SpwRestart', lsp.restart, {
    desc = 'Restart the Spw LSP server',
  })

  vim.api.nvim_create_user_command('SpwInlayHints', function()
    if vim.lsp.inlay_hint then
      local enabled = vim.lsp.inlay_hint.is_enabled({ bufnr = 0 })
      vim.lsp.inlay_hint.enable(not enabled, { bufnr = 0 })
    end
  end, { desc = 'Toggle Spw inlay hints for current buffer' })

  vim.api.nvim_create_user_command('SpwStop', lsp.stop, {
    desc = 'Stop the Spw LSP server',
  })

  vim.api.nvim_create_user_command('SpwOpenRef', function()
    nav.open_ref_under_cursor({ jump_anchor = true })
  end, {
    desc = 'Open Spw reference under cursor and jump to #anchor',
  })

  vim.api.nvim_create_user_command('SpwPeekRef', function()
    nav.peek_ref_under_cursor({ jump_anchor = true })
  end, {
    desc = 'Preview Spw reference under cursor and jump to #anchor',
  })

  vim.api.nvim_create_user_command('SpwOperatorFreq', function()
    lsp.request_custom('spw/operatorFrequency', {
      uri = vim.uri_from_bufnr(0),
    }, function(err, result)
      if err or not result then
        notify('operatorFrequency failed', vim.log.levels.WARN)
        return
      end
      local lines = { '# Spw operator frequency', 'dominant: ' .. tostring(result.dominantOperator), '' }
      for _, e in ipairs(result.entries or {}) do
        table.insert(lines, string.format('%s  %d  %.1f%%', e.operator, e.count, e.percent))
      end
      local buf = vim.api.nvim_create_buf(false, true)
      vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
      vim.bo[buf].filetype = 'markdown'
      vim.cmd('split')
      vim.api.nvim_win_set_buf(0, buf)
    end)
  end, { desc = 'Show operator frequency for current buffer' })

  vim.api.nvim_create_user_command('SpwPhase', function()
    local row, col = unpack(vim.api.nvim_win_get_cursor(0))
    lsp.request_custom('spw/phaseContext', {
      uri = vim.uri_from_bufnr(0),
      position = { line = row - 1, character = col },
    }, function(err, result)
      if err or not result then
        notify('phaseContext failed', vim.log.levels.WARN)
        return
      end
      if not result.sigil then
        notify('No sigil under cursor', vim.log.levels.INFO)
        return
      end
      notify(string.format(
        'sigil=%s phase=%s  %s — %s',
        tostring(result.sigil),
        tostring(result.phase),
        tostring(result.role or ''),
        tostring(result.physics or '')
      ), vim.log.levels.INFO)
    end)
  end, { desc = 'Show spirit-phase context at cursor' })

  vim.api.nvim_create_user_command('SpwFormSeq', function(opts)
    local notation = opts.args ~= '' and opts.args or '& => {&} => {&[#label]} => {&<#tag>_label}'
    lsp.request_custom('spw/formSequence', {
      notation = notation,
      catalog = true,
    }, function(err, result)
      if err or not result then
        notify('formSequence failed', vim.log.levels.WARN)
        return
      end
      local lines = { '# Form sequence', result.notation or '', '' }
      for i, s in ipairs(result.steps or {}) do
        table.insert(lines, string.format('%d. [%s] %s', i - 1, s.op, s.surface))
      end
      local buf = vim.api.nvim_create_buf(false, true)
      vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
      vim.bo[buf].filetype = 'markdown'
      vim.cmd('split')
      vim.api.nvim_win_set_buf(0, buf)
    end)
  end, { nargs = '?', desc = 'Explain form sequence (default confluence wrap)' })

  vim.api.nvim_create_user_command('SpwTemperature', function()
    lsp.request_custom('spw/workspaceTemperature', {}, function(err, result)
      if err or not result then
        notify('workspaceTemperature failed', vim.log.levels.WARN)
        return
      end
      local lines = { '# Workspace temperature', '' }
      for _, e in ipairs(result) do
        table.insert(lines, string.format('%s  w=%s  age=%s  %s', e.tier, e.writeCount, e.beatAge, e.uri))
      end
      if #result == 0 then
        table.insert(lines, '(empty — open/save .spw files to warm tiers)')
      end
      local buf = vim.api.nvim_create_buf(false, true)
      vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
      vim.bo[buf].filetype = 'markdown'
      vim.cmd('split')
      vim.api.nvim_win_set_buf(0, buf)
    end)
  end, { desc = 'Show workspace temperature tiers' })

  vim.api.nvim_create_user_command('SpwInsertFormWrap', function()
    local row, col = unpack(vim.api.nvim_win_get_cursor(0))
    local text = '& => {&} => {&[#label]}'
    vim.api.nvim_buf_set_text(0, row - 1, col, row - 1, col, { text })
  end, { desc = 'Insert confluence form wrap sequence at cursor' })

  vim.api.nvim_create_user_command('SpwRefsQuickfix', nav.references_to_quickfix, {
    desc = 'Populate quickfix with unresolved Spw references in current buffer',
  })

  vim.api.nvim_create_user_command('SpwCodeAction', nav.code_action_under_cursor, {
    desc = 'Spw local code actions under cursor',
  })

  vim.api.nvim_create_user_command('SpwWrapContainer', function(opts)
    local form = require('spw.form')
    local label = opts.args ~= '' and opts.args or 'label'
    form.wrap_selection_in_container(label)
  end, { nargs = '?', range = true, desc = 'Wrap visual selection or word under cursor in Spw container' })
end

return M
