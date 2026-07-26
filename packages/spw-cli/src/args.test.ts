import { describe, expect, it } from 'vitest'
import {
  parseCommand,
  parseCommonFlags,
  parseQueryArgs,
  parseSelectArgs,
  parseSkimArgs,
  splitCsv,
} from './args'

describe('parseCommand', () => {
  it('extracts the command and remaining args after node/script', () => {
    expect(parseCommand(['node', 'spw', 'query', '--from', 'prompts'])).toEqual({
      command: 'query',
      args: ['--from', 'prompts'],
    })
  })

  it('defaults to help with no command given', () => {
    expect(parseCommand(['node', 'spw'])).toEqual({ command: 'help', args: [] })
  })

  it('lowercases the command', () => {
    expect(parseCommand(['node', 'spw', 'QUERY']).command).toBe('query')
  })
})

describe('parseCommonFlags', () => {
  it('extracts --help / -h from anywhere in the arg list', () => {
    expect(parseCommonFlags(['--from', 'prompts', '--help']).flags.help).toBe(true)
    expect(parseCommonFlags(['-h', '--from', 'prompts']).flags.help).toBe(true)
    expect(parseCommonFlags(['--from', 'prompts']).flags.help).toBe(false)
  })

  it('strips the help flag out of the returned args', () => {
    expect(parseCommonFlags(['--from', 'prompts', '--help']).args).toEqual(['--from', 'prompts'])
  })
})

describe('parseQueryArgs', () => {
  it('applies defaults with no args', () => {
    const parsed = parseQueryArgs([])
    expect(parsed.roots).toEqual(['.spw'])
    expect(parsed.selector).toBe('navigable')
    expect(parsed.format).toBe('lines')
    expect(parsed.limit).toBe(100)
  })

  it('accepts both "--flag value" and "--flag=value" forms identically', () => {
    const spaced = parseQueryArgs(['--from', 'prompts,docs', '--limit', '25'])
    const equals = parseQueryArgs(['--from=prompts,docs', '--limit=25'])
    expect(spaced.roots).toEqual(['prompts', 'docs'])
    expect(equals.roots).toEqual(['prompts', 'docs'])
    expect(spaced.limit).toBe(25)
    expect(equals.limit).toBe(25)
  })

  it('accumulates roots across repeated --from and --root flags', () => {
    const parsed = parseQueryArgs([
      '--from',
      'prompts,docs',
      '--root=.spw',
      '--from',
      'examples',
    ])
    expect(parsed.roots).toEqual(['prompts', 'docs', '.spw', 'examples'])
  })

  it('accepts --json as an alias for --format json', () => {
    expect(parseQueryArgs(['--json']).format).toBe('json')
    expect(parseQueryArgs(['--format', 'json']).format).toBe('json')
  })

  it('--skim narrows the default --select projection', () => {
    const parsed = parseQueryArgs(['--skim'])
    expect(parsed.format).toBe('skim')
    expect(parsed.select).toBe('file,line,kind,text')
  })

  it('--skim does not override an explicit --select', () => {
    const parsed = parseQueryArgs(['--select', 'file,line', '--skim'])
    expect(parsed.select).toBe('file,line')
  })

  it('rejects empty and missing option values', () => {
    expect(() => parseQueryArgs(['--from', ''])).toThrow(
      'spw query: --from requires a value',
    )
    expect(() => parseQueryArgs(['--selector', '--json'])).toThrow(
      'spw query: --selector requires a value',
    )
    expect(() => parseQueryArgs(['--where='])).toThrow(
      'spw query: --where requires a value',
    )
  })

  it('rejects invalid numeric values', () => {
    expect(() => parseQueryArgs(['--limit', 'nope'])).toThrow(
      'spw query: --limit must be a positive integer',
    )
    expect(() => parseQueryArgs(['--limit=-5'])).toThrow(
      'spw query: --limit must be a positive integer',
    )
    expect(() => parseQueryArgs(['--context=1.5'])).toThrow(
      'spw query: --context must be a non-negative integer',
    )
  })

  it('rejects unknown formats and flags', () => {
    expect(() => parseQueryArgs(['--format', 'yaml'])).toThrow(
      'spw query: --format must be lines|skim|table|json',
    )
    expect(() => parseQueryArgs(['--wat'])).toThrow('spw query: unknown flag --wat')
    expect(() => parseQueryArgs(['--no-wat'])).toThrow(
      'spw query: unknown flag --no-wat',
    )
  })

  it('rejects unexpected positional arguments', () => {
    expect(() => parseQueryArgs(['prompts'])).toThrow(
      'spw query: unexpected argument prompts',
    )
  })
})

describe('parseSelectArgs', () => {
  it('takes the first non-flag token as the file', () => {
    const parsed = parseSelectArgs(['prompts/index.spw', '--skim'])
    expect(parsed.file).toBe('prompts/index.spw')
    expect(parsed.format).toBe('skim')
  })

  it('accepts --json as an alias for --format json', () => {
    expect(parseSelectArgs(['file.spw', '--json']).format).toBe('json')
  })

  it('defaults limit to 200 (distinct from query\'s 100)', () => {
    expect(parseSelectArgs(['file.spw']).limit).toBe(200)
  })

  it('accepts value flags before the positional file', () => {
    expect(parseSelectArgs(['-s', 'all', 'file.spw'])).toMatchObject({
      file: 'file.spw',
      selector: 'all',
    })
  })

  it('rejects unknown formats, flags, missing values, and extra files', () => {
    expect(() => parseSelectArgs(['file.spw', '--format=yaml'])).toThrow(
      'spw select: --format must be lines|skim|table|json',
    )
    expect(() => parseSelectArgs(['file.spw', '--mystery'])).toThrow(
      'spw select: unknown flag --mystery',
    )
    expect(() => parseSelectArgs(['file.spw', '--expr'])).toThrow(
      'spw select: --expr requires a value',
    )
    expect(() => parseSelectArgs(['one.spw', 'two.spw'])).toThrow(
      'spw select: unexpected argument two.spw',
    )
  })
})

describe('parseSkimArgs', () => {
  it('parses a line range for --lines', () => {
    expect(parseSkimArgs(['file.spw', '--lines', '10-40'])).toMatchObject({
      file: 'file.spw',
      lines: '10-40',
    })
  })

  it('accepts --lines=a-b form', () => {
    expect(parseSkimArgs(['file.spw', '--lines=1-5']).lines).toBe('1-5')
  })

  it('--no-outline disables the outline', () => {
    expect(parseSkimArgs(['file.spw', '--no-outline']).outline).toBe(false)
  })

  it('defaults outline to true and limit to 80', () => {
    const parsed = parseSkimArgs(['file.spw'])
    expect(parsed.outline).toBe(true)
    expect(parsed.limit).toBe(80)
  })

  it('accepts value flags before the positional file', () => {
    expect(parseSkimArgs(['-n', '12', 'file.spw'])).toMatchObject({
      file: 'file.spw',
      limit: 12,
    })
  })

  it('rejects unknown flags, missing values, invalid ranges, and extra files', () => {
    expect(() => parseSkimArgs(['file.spw', '--no-mystery'])).toThrow(
      'spw skim: unknown flag --no-mystery',
    )
    expect(() => parseSkimArgs(['file.spw', '--lines', '--json'])).toThrow(
      'spw skim: --lines requires a value',
    )
    expect(() => parseSkimArgs(['file.spw', '--lines=20-10'])).toThrow(
      'spw skim: --lines must be an ascending positive range',
    )
    expect(() => parseSkimArgs(['one.spw', 'two.spw'])).toThrow(
      'spw skim: unexpected argument two.spw',
    )
  })
})

describe('splitCsv', () => {
  it('splits commas without treating whitespace or plus signs as separators', () => {
    expect(splitCsv('path with spaces,lib+examples')).toEqual([
      'path with spaces',
      'lib+examples',
    ])
  })
})
