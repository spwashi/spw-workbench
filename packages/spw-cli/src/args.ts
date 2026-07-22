import type { QueryArgs, SelectArgs, SpwCliCommand } from './types'

export interface CommonFlags {
  help: boolean
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
  const flags: CommonFlags = { help: false }

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      flags.help = true
      continue
    }

    nextArgs.push(arg)
  }

  return { args: nextArgs, flags }
}

export function parseQueryArgs(args: string[]): QueryArgs {
  const parsed: QueryArgs = {
    roots: ['.spw'],
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
      const value = args[i + 1] ?? ''
      parsed.roots = splitCsv(value)
      i += 1
      continue
    }
    if (arg.startsWith('--from=')) {
      parsed.roots = splitCsv(arg.slice('--from='.length))
      continue
    }
    if (arg.startsWith('--root=')) {
      parsed.roots = splitCsv(arg.slice('--root='.length))
      continue
    }

    if (arg === '--selector' || arg === '-s') {
      parsed.selector = args[i + 1] ?? parsed.selector
      i += 1
      continue
    }
    if (arg.startsWith('--selector=')) {
      parsed.selector = arg.slice('--selector='.length)
      continue
    }

    if (arg === '--expr' || arg === '-e') {
      parsed.expr = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--expr=')) {
      parsed.expr = arg.slice('--expr='.length)
      continue
    }

    if (arg === '--where' || arg === '-w') {
      parsed.where = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--where=')) {
      parsed.where = arg.slice('--where='.length)
      continue
    }

    if (arg === '--select') {
      parsed.select = args[i + 1] ?? parsed.select
      i += 1
      continue
    }
    if (arg.startsWith('--select=')) {
      parsed.select = arg.slice('--select='.length)
      continue
    }

    if (arg === '--format' || arg === '-f') {
      parsed.format = parseViewFormat(args[i + 1] ?? parsed.format)
      i += 1
      continue
    }
    if (arg.startsWith('--format=')) {
      parsed.format = parseViewFormat(arg.slice('--format='.length))
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
      const value = Number(args[i + 1] ?? String(parsed.limit))
      parsed.limit = Number.isFinite(value) && value > 0 ? Math.floor(value) : parsed.limit
      i += 1
      continue
    }
    if (arg.startsWith('--limit=')) {
      const value = Number(arg.slice('--limit='.length))
      parsed.limit = Number.isFinite(value) && value > 0 ? Math.floor(value) : parsed.limit
      continue
    }
    if (arg.startsWith('--top=')) {
      const value = Number(arg.slice('--top='.length))
      parsed.limit = Number.isFinite(value) && value > 0 ? Math.floor(value) : parsed.limit
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
      const value = Number(args[i + 1] ?? '2')
      parsed.context = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
      i += 1
      continue
    }
    if (arg.startsWith('--context=')) {
      const value = Number(arg.slice('--context='.length))
      parsed.context = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
      continue
    }
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

    if (!arg.startsWith('--') && !parsed.file) {
      parsed.file = arg
      continue
    }

    if (arg === '--selector' || arg === '-s') {
      parsed.selector = args[i + 1] ?? parsed.selector
      i += 1
      continue
    }
    if (arg.startsWith('--selector=')) {
      parsed.selector = arg.slice('--selector='.length)
      continue
    }

    if (arg === '--expr' || arg === '-e') {
      parsed.expr = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--expr=')) {
      parsed.expr = arg.slice('--expr='.length)
      continue
    }

    if (arg === '--format' || arg === '-f') {
      parsed.format = parseViewFormat(args[i + 1] ?? parsed.format)
      i += 1
      continue
    }
    if (arg.startsWith('--format=')) {
      parsed.format = parseViewFormat(arg.slice('--format='.length))
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
      const value = Number(args[i + 1] ?? String(parsed.limit))
      parsed.limit = Number.isFinite(value) && value > 0 ? Math.floor(value) : parsed.limit
      i += 1
      continue
    }
    if (arg.startsWith('--limit=')) {
      const value = Number(arg.slice('--limit='.length))
      parsed.limit = Number.isFinite(value) && value > 0 ? Math.floor(value) : parsed.limit
      continue
    }
    if (arg === '--context' || arg === '-C') {
      const value = Number(args[i + 1] ?? '2')
      parsed.context = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
      i += 1
      continue
    }
    if (arg.startsWith('--context=')) {
      const value = Number(arg.slice('--context='.length))
      parsed.context = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
      continue
    }
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
    if (!arg.startsWith('--') && !parsed.file) {
      parsed.file = arg
      continue
    }
    if (arg === '--limit' || arg === '-n') {
      parsed.limit = Math.max(1, Number(args[++i] ?? parsed.limit) || parsed.limit)
      continue
    }
    if (arg.startsWith('--limit=')) {
      parsed.limit = Math.max(1, Number(arg.slice('--limit='.length)) || parsed.limit)
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
      parsed.lines = args[++i] ?? ''
      continue
    }
    if (arg.startsWith('--lines=')) {
      parsed.lines = arg.slice('--lines='.length)
      continue
    }
    if (arg === '--around' || arg === '-a') {
      parsed.around = Math.max(1, Number(args[++i] ?? '1') || 1)
      continue
    }
    if (arg.startsWith('--around=')) {
      parsed.around = Math.max(1, Number(arg.slice('--around='.length)) || 1)
      continue
    }
    if (arg === '--context' || arg === '-C') {
      parsed.context = Math.max(0, Number(args[++i] ?? '2') || 0)
      continue
    }
    if (arg.startsWith('--context=')) {
      parsed.context = Math.max(0, Number(arg.slice('--context='.length)) || 0)
      continue
    }
    if (arg === '--no-outline') {
      parsed.outline = false
      continue
    }
  }
  return parsed
}

function parseViewFormat(raw: string): import('./types').ViewFormat {
  const v = raw.toLowerCase()
  if (v === 'json' || v === 'skim' || v === 'table' || v === 'lines') return v
  return 'lines'
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}
