import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COMMAND_GROUPS, COMMANDS, findCommand } from './commands'
import { HELP_JSON_SCHEMA, rootHelpJson, workbenchProvenance } from './help-json'
import { runSpwCli } from './run'

describe('spw help --json', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lists every routed command once, in its declared group', () => {
    const help = rootHelpJson({ version: '0.0.0', commit: null, dirty: null })
    const groupIds = new Set(COMMAND_GROUPS.map((group) => group.id))
    expect(help.schema).toBe(HELP_JSON_SCHEMA)
    expect(help.commands.map((command) => command.name)).toEqual(COMMANDS.map((spec) => spec.name))
    for (const command of help.commands) expect(groupIds.has(command.group), command.name).toBe(true)
  })

  it('routes every alias to the command that answers it', () => {
    const help = rootHelpJson({ version: '0.0.0', commit: null, dirty: null })
    for (const [alias, name] of Object.entries(help.routes)) expect(findCommand(alias)?.name, alias).toBe(name)
  })

  it('says the effect band is declared, not verified', () => {
    expect(rootHelpJson({ version: '0.0.0', commit: null, dirty: null }).effects.basis).toBe('declared')
  })

  it.each([['help', '--json'], ['--help', '--json'], ['-h', '--json']])('prints parseable JSON alone for spw %s %s', async (...args) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await runSpwCli(['node', 'spw', ...args])
    expect(log).toHaveBeenCalledTimes(1)
    const parsed = JSON.parse(String(log.mock.calls[0]?.[0]))
    expect(parsed.schema).toBe(HELP_JSON_SCHEMA)
    expect(parsed.commands.length).toBe(COMMANDS.length)
  })

  it('never reports a host repository\'s commit for a workbench copied into it', () => {
    const host = mkdtempSync(path.join(tmpdir(), 'spw-help-host-'))
    execFileSync('git', ['init', '-q', host])
    const copy = path.join(host, 'vendor', 'workbench')
    mkdirSync(copy, { recursive: true })
    writeFileSync(path.join(copy, 'package.json'), JSON.stringify({ version: '9.9.9' }))
    expect(workbenchProvenance(copy)).toEqual({ version: '9.9.9', commit: null, dirty: null })
  })

  it('reports nothing it cannot read', () => {
    expect(workbenchProvenance(path.join(tmpdir(), 'spw-help-missing-root'))).toEqual({ version: null, commit: null, dirty: null })
  })

  it('leaves the text help page as it was', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await runSpwCli(['node', 'spw', 'help'])
    expect(String(log.mock.calls[0]?.[0])).toContain('Spw CLI')
  })
})
