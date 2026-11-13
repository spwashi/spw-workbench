import { afterEach, describe, expect, it, vi } from 'vitest'
import { COMMANDS, findCommand } from './commands'
import { commandFlags, helpText, readHelpFlags } from './help-flags'
import { rootHelpJson } from './help-json'
import { runSpwCli } from './run'

const flagsOf = (name: string) => commandFlags(findCommand(name)!).flags

describe('flags as data, read from each help page', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reads a flag line: names, spellings, value, what it does and its section', () => {
    const { flags } = readHelpFlags('Title\n\nFlags:\n  --width N / -w N   Print width (default 88)\n  --check            Report files\n  -h, --help   this help\n')
    expect(flags[0]).toEqual({ names: ['--width', '-w'], spellings: ['--width N', '-w N'], value: 'N', says: 'Print width (default 88)', section: 'Flags', writes: false })
    expect(flags[1]!.value).toBeUndefined()
    expect(flags[2]!.names).toEqual(['-h', '--help'])
  })

  it('reads usage lines as usage, never as declarations, and lists their flags as mentions', () => {
    const read = readHelpFlags('T\n\nUsage:\n  --interval 500    not a declaration\n\nNotes:\n  pass --count N to stop\n')
    expect(read.flags).toEqual([])
    expect(read.mentions).toEqual(['--count', '--interval'])
  })

  it('declares at least one flag for every command that takes any', () => {
    const flagless = COMMANDS.filter((spec) => commandFlags(spec).flags.length === 0).map((spec) => spec.name)
    expect(flagless).toEqual(['dev'])
  })

  it('names every declared flag on the help page it came from, once per command', () => {
    for (const spec of COMMANDS) {
      const text = helpText(spec)
      const seen = new Set<string>()
      for (const flag of commandFlags(spec).flags) {
        for (const name of flag.names) {
          expect(text, `${spec.name} ${name}`).toContain(name)
          expect(seen.has(name), `${spec.name} declares ${name} twice`).toBe(false)
          seen.add(name)
        }
      }
    }
  })

  it('reads what the census, format, atlas and hear pages declare', () => {
    expect(flagsOf('census').find((f) => f.names.includes('--sort'))?.value).toBe('<k>')
    expect(flagsOf('format').find((f) => f.names.includes('--width'))?.names).toEqual(['--width', '-w'])
    expect(flagsOf('atlas').find((f) => f.names.includes('--html'))?.writes).toBe(true)
    expect(flagsOf('hear').find((f) => f.names.includes('--out'))?.writes).toBe(true)
    expect(flagsOf('beat').map((f) => f.names[0])).toEqual(['--interval', '--count', '--json'])
  })

  it('puts the flags in help --json, and one command\'s in spw <command> --help --json', async () => {
    const help = rootHelpJson({ version: '0.0.0', commit: null, dirty: null })
    expect(help.flags.basis).toBe('help_page')
    expect(help.commands.find((c) => c.name === 'census')!.flags.length).toBeGreaterThan(5)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await runSpwCli(['node', 'spw', 'say', '--help', '--json'])
    const parsed = JSON.parse(String(log.mock.calls[0]?.[0]))
    expect(parsed.command.name).toBe('say')
    expect(parsed.command.flags.map((f: { names: string[] }) => f.names[0])).toContain('--clauses')
  })
})

describe('alias routes', () => {
  it('routes no alias that nothing writes', () => {
    for (const gone of ['inventory', 'formulas', 'thrift', 'q', 'spwq', 'snip']) expect(findCommand(gone), gone).toBeUndefined()
    expect(Object.keys(rootHelpJson({ version: '0.0.0', commit: null, dirty: null }).routes)).toHaveLength(19)
  })
})
