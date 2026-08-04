/**
 * spw snippet — generate, list, hydrate, and emit editor snippets.
 *
 * Generation: catalog → stdout / VS Code JSON
 * Hydration: fill ${name=default} slots (does not mutate catalog)
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  CORE_SNIPPETS,
  formatVscodeSnippetsJson,
  getSnippet,
  hydrateSnippet,
  listSnippets,
  parseBindings,
  snippetSource,
  type SnippetFamily,
} from '@spwashi/spw-seed'
import { printHelpPage } from './help'

interface Args {
  help: boolean
  json: boolean
  sub: string
  rest: string[]
  family?: string
  bind: string[]
  out?: string
  strict: boolean
}

function parseArgs(argv: string[]): Args {
  const raw = argv.slice(2)
  const args: Args = {
    help: false,
    json: false,
    sub: 'list',
    rest: [],
    bind: [],
    strict: false,
  }
  const tokens = raw[0] === 'snippet' ? raw.slice(1) : raw
  if (tokens[0] && !tokens[0].startsWith('-')) {
    args.sub = tokens[0]!
    tokens.shift()
  }
  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i]!
    if (a === '--help' || a === '-h') args.help = true
    else if (a === '--json') args.json = true
    else if (a === '--strict') args.strict = true
    else if (a === '--family') {
      args.family = tokens[++i]
    } else if (a.startsWith('--family=')) {
      args.family = a.slice('--family='.length)
    } else if (a === '--bind' || a === '-b') {
      const v = tokens[++i]
      if (v) args.bind.push(v)
    } else if (a.startsWith('--bind=')) {
      args.bind.push(a.slice('--bind='.length))
    } else if (a === '--out' || a === '-o') {
      args.out = tokens[++i]
    } else if (a.startsWith('--out=')) {
      args.out = a.slice('--out='.length)
    } else if (a.startsWith('-')) {
      throw new Error(`spw snippet: unknown flag ${a}`)
    } else {
      args.rest.push(a)
    }
  }
  return args
}

export function printSnippetHelp(): void {
  printHelpPage({
    title: 'Spw Snippet — generate and hydrate seed templates',
    usage: [
      'spw snippet list [--family sense|measure|flow|…] [--json]',
      'spw snippet show <id>',
      'spw snippet hydrate <id> [--bind k=v]… [--strict] [--json]',
      'spw snippet emit vscode [--out extensions/vscode-spw/snippets/spw.json]',
      'spw snippet families',
    ],
    sections: [
      {
        title: 'Vocabulary',
        lines: [
          'snippet   tagged seed (prefix + body + holes) — unit of literate exchange',
          'generate  materialize catalog for humans/editors',
          'hydrate   fill ${name=default} slots; catalog stays immutable',
          'expand    (separate command) template lineage / bias projection',
          'Note: ONF ! → register hydrate is runtime; this command is authoring fill',
        ],
      },
      {
        title: 'Compose',
        lines: [
          'spw snippet hydrate measure.mass --bind subject=src/a.ts --bind lines=10',
          'spw snippet emit vscode --out extensions/vscode-spw/snippets/spw.json',
          'spw snippet list --family flow | spw snippet show flow.schedule',
        ],
      },
      {
        title: 'Families',
        lines: [
          'form · sense · measure · flow · dialect · plan · nav · wonder · general',
        ],
      },
    ],
  })
}

export async function runSpwSnippetCli(argv: string[] = process.argv): Promise<void> {
  let args: Args
  try {
    args = parseArgs(argv)
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
    return
  }

  if (args.help || args.sub === 'help') {
    printSnippetHelp()
    return
  }

  if (args.sub === 'list') {
    const items = listSnippets({
      family: args.family as SnippetFamily | undefined,
    })
    if (args.json) {
      console.log(JSON.stringify({ command: 'snippet', sub: 'list', items }, null, 2))
      return
    }
    for (const s of items) {
      console.log(`${s.id.padEnd(22)} ${s.prefix.padEnd(12)} ${s.family.padEnd(10)} ${s.description}`)
    }
    return
  }

  if (args.sub === 'families') {
    const counts = new Map<string, number>()
    for (const s of CORE_SNIPPETS) {
      counts.set(s.family, (counts.get(s.family) ?? 0) + 1)
    }
    if (args.json) {
      console.log(JSON.stringify(Object.fromEntries(counts), null, 2))
      return
    }
    for (const [f, n] of [...counts.entries()].sort()) {
      console.log(`${f.padEnd(12)} ${n}`)
    }
    return
  }

  if (args.sub === 'show') {
    const id = args.rest[0]
    if (!id) {
      console.error('spw snippet show: need <id>')
      process.exitCode = 1
      return
    }
    const snip = getSnippet(id)
    if (!snip) {
      console.error(`spw snippet: unknown id ${id}`)
      process.exitCode = 1
      return
    }
    if (args.json) {
      console.log(JSON.stringify(snip, null, 2))
      return
    }
    console.log(`# ${snip.id}  prefix=${snip.prefix}  family=${snip.family}`)
    console.log(snip.description)
    if (snip.docs) console.log(`docs: ${snip.docs}`)
    console.log('')
    console.log(snippetSource(snip))
    return
  }

  if (args.sub === 'hydrate') {
    const id = args.rest[0]
    if (!id) {
      console.error('spw snippet hydrate: need <id>')
      process.exitCode = 1
      return
    }
    const snip = getSnippet(id)
    if (!snip) {
      console.error(`spw snippet: unknown id ${id}`)
      process.exitCode = 1
      return
    }
    try {
      const result = hydrateSnippet(snip, parseBindings(args.bind), {
        strict: args.strict,
      })
      if (args.json) {
        console.log(JSON.stringify(result, null, 2))
        return
      }
      console.log(result.text)
      if (!result.complete) {
        console.error(`# open slots: ${result.open.join(', ')}`)
        process.exitCode = 1
      }
    } catch (e) {
      console.error(e instanceof Error ? e.message : e)
      process.exitCode = 1
    }
    return
  }

  if (args.sub === 'emit') {
    const target = args.rest[0] ?? 'vscode'
    if (target !== 'vscode') {
      console.error(`spw snippet emit: unknown target ${target} (only vscode)`)
      process.exitCode = 1
      return
    }
    const json = formatVscodeSnippetsJson()
    if (args.out) {
      const abs = path.resolve(args.out)
      await fs.mkdir(path.dirname(abs), { recursive: true })
      await fs.writeFile(abs, json, 'utf8')
      console.error(`wrote ${abs}`)
    } else {
      process.stdout.write(json)
    }
    return
  }

  console.error(`spw snippet: unknown subcommand ${args.sub}`)
  printSnippetHelp()
  process.exitCode = 1
}
