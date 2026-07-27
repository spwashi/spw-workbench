-- spw-lsp.lua — Neovim LSP client for the Spw Language Server
-- Entrypoint for ftplugin/spw.vim (lua require('spw-lsp').start())

local lsp = require('spw.lsp')
local nav = require('spw.navigation')
local form = require('spw.form')
local completion = require('spw.completion')

local M = {}

for k, v in pairs(lsp) do M[k] = v end
for k, v in pairs(nav) do M[k] = v end
for k, v in pairs(form) do M[k] = v end
for k, v in pairs(completion) do M[k] = v end

return M
