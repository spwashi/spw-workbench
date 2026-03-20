import type { QueryArgs, SelectArgs, SpwCliCommand } from './types'

export function parseCommand(argv: string[]): SpwCliCommand {
  const args = argv.slice(2)
  const command = (args[0] ?? 'help').toLowerCase()
  return {
    command,
    args: args.slice(1),
  }
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
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]

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

    if (arg === '--selector') {
      parsed.selector = args[i + 1] ?? parsed.selector
      i += 1
      continue
    }
    if (arg.startsWith('--selector=')) {
      parsed.selector = arg.slice('--selector='.length)
      continue
    }

    if (arg === '--expr') {
      parsed.expr = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--expr=')) {
      parsed.expr = arg.slice('--expr='.length)
      continue
    }

    if (arg === '--where') {
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

    if (arg === '--format') {
      const value = (args[i + 1] ?? parsed.format).toLowerCase()
      parsed.format = value === 'json' ? 'json' : 'lines'
      i += 1
      continue
    }
    if (arg.startsWith('--format=')) {
      const value = arg.slice('--format='.length).toLowerCase()
      parsed.format = value === 'json' ? 'json' : 'lines'
      continue
    }

    if (arg === '--limit' || arg === '--top') {
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
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]

    if (!arg.startsWith('--') && !parsed.file) {
      parsed.file = arg
      continue
    }

    if (arg === '--selector') {
      parsed.selector = args[i + 1] ?? parsed.selector
      i += 1
      continue
    }
    if (arg.startsWith('--selector=')) {
      parsed.selector = arg.slice('--selector='.length)
      continue
    }

    if (arg === '--expr') {
      parsed.expr = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--expr=')) {
      parsed.expr = arg.slice('--expr='.length)
      continue
    }

    if (arg === '--format') {
      const value = (args[i + 1] ?? parsed.format).toLowerCase()
      parsed.format = value === 'json' ? 'json' : 'lines'
      i += 1
      continue
    }
    if (arg.startsWith('--format=')) {
      const value = arg.slice('--format='.length).toLowerCase()
      parsed.format = value === 'json' ? 'json' : 'lines'
      continue
    }

    if (arg === '--summary') {
      parsed.summary = true
      continue
    }
  }

  return parsed
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}
