import type { QueryArgs, SelectArgs, SpwCliCommand } from './types'

export interface CommonFlags {
  help: boolean
  json: boolean
}

export function parseCommand(argv: string[]): SpwCliCommand {
  const args = argv.slice(2)
  const command = (args[0] ?? 'help').toLowerCase()
  return {
    command,
    args: args.slice(1),
  }
}

export function parseCommonFlags(args: string[]): { args: string[]; flags: CommonFlags } {
  const nextArgs: string[] = []
  const flags: CommonFlags = { help: false, json: false }

  for (const arg of args) {
    // Help is owned by the root dispatcher; strip it so subcommands do not re-print.
    if (arg === '--help' || arg === '-h') {
      flags.help = true
      continue
    }
    // JSON is common but also re-parsed by many subcommands — keep it on the wire.
    if (arg === '--json') {
      flags.json = true
    }

    nextArgs.push(arg)
  }

  return { args: nextArgs, flags }
}

export function parseQueryArgs(args: string[]): QueryArgs {
  const parsed: QueryArgs = {
    roots: [],
    selector: 'navigable',
    expr: '',
    where: '',
    select: 'file,kind,sigil,brace,root,target,label,line,column,text',
    format: 'lines',
    limit: 100,
    summary: false,
    group: false,
    count: false,
    context: 0,
    quiet: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!

    if (arg === '--from' || arg === '--root') {
      const value = requireOptionValue('query', arg, args, i)
      parsed.roots.push(...parseRoots('query', arg, value))
      i += 1
      continue
    }
    if (arg.startsWith('--from=')) {
      parsed.roots.push(...parseRoots('query', '--from', inlineOptionValue('query', '--from', arg)))
      continue
    }
    if (arg.startsWith('--root=')) {
      parsed.roots.push(...parseRoots('query', '--root', inlineOptionValue('query', '--root', arg)))
      continue
    }

    if (arg === '--selector' || arg === '-s') {
      parsed.selector = requireOptionValue('query', arg, args, i)
      i += 1
      continue
    }
    if (arg.startsWith('--selector=')) {
      parsed.selector = inlineOptionValue('query', '--selector', arg)
      continue
    }

    if (arg === '--expr' || arg === '-e') {
      parsed.expr = requireOptionValue('query', arg, args, i)
      i += 1
      continue
    }
    if (arg.startsWith('--expr=')) {
      parsed.expr = inlineOptionValue('query', '--expr', arg)
      continue
    }

    if (arg === '--where' || arg === '-w') {
      parsed.where = requireOptionValue('query', arg, args, i)
      i += 1
      continue
    }
    if (arg.startsWith('--where=')) {
      parsed.where = inlineOptionValue('query', '--where', arg)
      continue
    }

    if (arg === '--select') {
      parsed.select = requireOptionValue('query', arg, args, i)
      i += 1
      continue
    }
    if (arg.startsWith('--select=')) {
      parsed.select = inlineOptionValue('query', '--select', arg)
      continue
    }

    if (arg === '--format' || arg === '-f') {
      parsed.format = parseViewFormat(requireOptionValue('query', arg, args, i), 'query')
      i += 1
      continue
    }
    if (arg.startsWith('--format=')) {
      parsed.format = parseViewFormat(inlineOptionValue('query', '--format', arg), 'query')
      continue
    }
    if (arg === '--skim') {
      parsed.format = 'skim'
      if (parsed.select === 'file,kind,sigil,brace,root,target,label,line,column,text') {
        parsed.select = 'file,line,kind,text'
      }
      continue
    }
    if (arg === '--table') {
      parsed.format = 'table'
      continue
    }
    if (arg === '--json') {
      parsed.format = 'json'
      continue
    }

    if (arg === '--limit' || arg === '--top' || arg === '-n') {
      parsed.limit = parseIntegerOption(
        'query',
        arg,
        requireOptionValue('query', arg, args, i),
        { minimum: 1 },
      )
      i += 1
      continue
    }
    if (arg.startsWith('--limit=')) {
      parsed.limit = parseIntegerOption(
        'query',
        '--limit',
        inlineOptionValue('query', '--limit', arg),
        { minimum: 1 },
      )
      continue
    }
    if (arg.startsWith('--top=')) {
      parsed.limit = parseIntegerOption(
        'query',
        '--top',
        inlineOptionValue('query', '--top', arg),
        { minimum: 1 },
      )
      continue
    }

    if (arg === '--summary') {
      parsed.summary = true
      continue
    }
    if (arg === '--group' || arg === '-g') {
      parsed.group = true
      continue
    }
    if (arg === '--count') {
      parsed.count = true
      continue
    }
    if (arg === '--quiet' || arg === '-q') {
      parsed.quiet = true
      continue
    }
    if (arg === '--context' || arg === '-C') {
      parsed.context = parseIntegerOption(
        'query',
        arg,
        requireOptionValue('query', arg, args, i),
        { minimum: 0 },
      )
      i += 1
      continue
    }
    if (arg.startsWith('--context=')) {
      parsed.context = parseIntegerOption(
        'query',
        '--context',
        inlineOptionValue('query', '--context', arg),
        { minimum: 0 },
      )
      continue
    }

    if (arg.startsWith('-')) throw unknownFlag('query', arg)
    throw new Error(`spw query: unexpected argument ${arg}`)
  }

  if (parsed.roots.length === 0) parsed.roots = ['.spw']
  return parsed
}

export function parseSelectArgs(args: string[]): SelectArgs {
  const parsed: SelectArgs = {
    file: '',
    selector: 'navigable',
    expr: '',
    format: 'lines',
    summary: false,
    limit: 200,
    context: 0,
    group: false,
    quiet: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!

    if (!arg.startsWith('-') && !parsed.file) {
      parsed.file = arg
      continue
    }

    if (arg === '--selector' || arg === '-s') {
      parsed.selector = requireOptionValue('select', arg, args, i)
      i += 1
      continue
    }
    if (arg.startsWith('--selector=')) {
      parsed.selector = inlineOptionValue('select', '--selector', arg)
      continue
    }

    if (arg === '--expr' || arg === '-e') {
      parsed.expr = requireOptionValue('select', arg, args, i)
      i += 1
      continue
    }
    if (arg.startsWith('--expr=')) {
      parsed.expr = inlineOptionValue('select', '--expr', arg)
      continue
    }

    if (arg === '--format' || arg === '-f') {
      parsed.format = parseViewFormat(requireOptionValue('select', arg, args, i), 'select')
      i += 1
      continue
    }
    if (arg.startsWith('--format=')) {
      parsed.format = parseViewFormat(inlineOptionValue('select', '--format', arg), 'select')
      continue
    }
    if (arg === '--skim') {
      parsed.format = 'skim'
      continue
    }
    if (arg === '--table') {
      parsed.format = 'table'
      continue
    }
    if (arg === '--json') {
      parsed.format = 'json'
      continue
    }

    if (arg === '--summary') {
      parsed.summary = true
      continue
    }
    if (arg === '--group' || arg === '-g') {
      parsed.group = true
      continue
    }
    if (arg === '--quiet' || arg === '-q') {
      parsed.quiet = true
      continue
    }
    if (arg === '--limit' || arg === '-n' || arg === '--top') {
      parsed.limit = parseIntegerOption(
        'select',
        arg,
        requireOptionValue('select', arg, args, i),
        { minimum: 1 },
      )
      i += 1
      continue
    }
    if (arg.startsWith('--limit=')) {
      parsed.limit = parseIntegerOption(
        'select',
        '--limit',
        inlineOptionValue('select', '--limit', arg),
        { minimum: 1 },
      )
      continue
    }
    if (arg.startsWith('--top=')) {
      parsed.limit = parseIntegerOption(
        'select',
        '--top',
        inlineOptionValue('select', '--top', arg),
        { minimum: 1 },
      )
      continue
    }
    if (arg === '--context' || arg === '-C') {
      parsed.context = parseIntegerOption(
        'select',
        arg,
        requireOptionValue('select', arg, args, i),
        { minimum: 0 },
      )
      i += 1
      continue
    }
    if (arg.startsWith('--context=')) {
      parsed.context = parseIntegerOption(
        'select',
        '--context',
        inlineOptionValue('select', '--context', arg),
        { minimum: 0 },
      )
      continue
    }

    if (arg.startsWith('-')) throw unknownFlag('select', arg)
    throw new Error(`spw select: unexpected argument ${arg}`)
  }

  return parsed
}

export function parseSkimArgs(args: string[]): import('./types').SkimArgs {
  const parsed: import('./types').SkimArgs = {
    file: '',
    outline: true,
    limit: 80,
    paths: false,
    json: false,
    context: 2,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!
    if (!arg.startsWith('-') && !parsed.file) {
      parsed.file = arg
      continue
    }
    if (arg === '--limit' || arg === '-n') {
      parsed.limit = parseIntegerOption(
        'skim',
        arg,
        requireOptionValue('skim', arg, args, i),
        { minimum: 1 },
      )
      i += 1
      continue
    }
    if (arg.startsWith('--limit=')) {
      parsed.limit = parseIntegerOption(
        'skim',
        '--limit',
        inlineOptionValue('skim', '--limit', arg),
        { minimum: 1 },
      )
      continue
    }
    if (arg === '--paths') {
      parsed.paths = true
      continue
    }
    if (arg === '--json') {
      parsed.json = true
      continue
    }
    if (arg === '--lines' || arg === '-L') {
      parsed.lines = parseLineRange(requireOptionValue('skim', arg, args, i))
      i += 1
      continue
    }
    if (arg.startsWith('--lines=')) {
      parsed.lines = parseLineRange(inlineOptionValue('skim', '--lines', arg))
      continue
    }
    if (arg === '--around' || arg === '-a') {
      parsed.around = parseIntegerOption(
        'skim',
        arg,
        requireOptionValue('skim', arg, args, i),
        { minimum: 1 },
      )
      i += 1
      continue
    }
    if (arg.startsWith('--around=')) {
      parsed.around = parseIntegerOption(
        'skim',
        '--around',
        inlineOptionValue('skim', '--around', arg),
        { minimum: 1 },
      )
      continue
    }
    if (arg === '--context' || arg === '-C') {
      parsed.context = parseIntegerOption(
        'skim',
        arg,
        requireOptionValue('skim', arg, args, i),
        { minimum: 0 },
      )
      i += 1
      continue
    }
    if (arg.startsWith('--context=')) {
      parsed.context = parseIntegerOption(
        'skim',
        '--context',
        inlineOptionValue('skim', '--context', arg),
        { minimum: 0 },
      )
      continue
    }
    if (arg === '--no-outline') {
      parsed.outline = false
      continue
    }

    if (arg.startsWith('-')) throw unknownFlag('skim', arg)
    throw new Error(`spw skim: unexpected argument ${arg}`)
  }
  return parsed
}

export function parseViewFormat(
  raw: string,
  command = 'view',
): import('./types').ViewFormat {
  const v = raw.toLowerCase()
  if (v === 'json' || v === 'skim' || v === 'table' || v === 'lines') return v
  throw new Error(
    `spw ${command}: --format must be lines|skim|table|json (got ${raw})`,
  )
}

export function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function requireOptionValue(
  command: string,
  flag: string,
  args: string[],
  index: number,
): string {
  const value = args[index + 1]
  if (value === undefined || value.length === 0 || value.startsWith('-')) {
    throw new Error(`spw ${command}: ${flag} requires a value`)
  }
  return value
}

function inlineOptionValue(command: string, flag: string, arg: string): string {
  const value = arg.slice(arg.indexOf('=') + 1)
  if (value.length === 0) {
    throw new Error(`spw ${command}: ${flag} requires a value`)
  }
  return value
}

function parseRoots(command: string, flag: string, value: string): string[] {
  const roots = splitCsv(value)
  if (roots.length === 0) {
    throw new Error(`spw ${command}: ${flag} requires at least one root`)
  }
  return roots
}

function parseIntegerOption(
  command: string,
  flag: string,
  raw: string,
  bounds: { minimum: number },
): number {
  const value = Number(raw)
  if (!Number.isInteger(value) || value < bounds.minimum) {
    const kind = bounds.minimum === 0 ? 'a non-negative integer' : 'a positive integer'
    throw new Error(`spw ${command}: ${flag} must be ${kind} (got ${raw})`)
  }
  return value
}

function parseLineRange(raw: string): string {
  const match = raw.match(/^(\d+)(?:\s*[-:]\s*(\d+))?$/)
  if (!match) {
    throw new Error(`spw skim: --lines must be N or N-M (got ${raw})`)
  }

  const start = Number(match[1])
  const end = Number(match[2] ?? match[1])
  if (start < 1 || end < start) {
    throw new Error(`spw skim: --lines must be an ascending positive range (got ${raw})`)
  }
  return raw
}

function unknownFlag(command: string, arg: string): Error {
  const name = arg.split('=', 1)[0]!
  return new Error(`spw ${command}: unknown flag ${name}`)
}
