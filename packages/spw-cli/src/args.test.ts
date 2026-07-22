import { describe, expect, it } from 'vitest'
import { parseCommand, parseCommonFlags, parseQueryArgs, parseSelectArgs, parseSkimArgs } from './args'

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

  it('falls back to .spw when --from is given an empty value', () => {
    expect(parseQueryArgs(['--from', '']).roots).toEqual(['.spw'])
  })

  it('ignores a non-finite or non-positive --limit', () => {
    expect(parseQueryArgs(['--limit', 'nope']).limit).toBe(100)
    expect(parseQueryArgs(['--limit', '-5']).limit).toBe(100)
  })

  it('rejects an unknown --format value, keeping the default', () => {
    expect(parseQueryArgs(['--format', 'yaml']).format).toBe('lines')
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
})
