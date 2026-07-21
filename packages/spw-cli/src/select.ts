import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { parse, spwq, type SpwMatch } from '@spwashi/spw-seed'
import { parseSelectArgs } from './args'
import {
  extractReferenceRaw,
  filterRootRefs,
  listCliSelectorPresetNames,
  resolveCliSelector,
} from './selectors'
import { printHelpPage } from './help'
import type { SelectArgs } from './types'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace } from './workspace'

export async function runSpwSelectCli(argv: string[]): Promise<void> {
  const args = parseSelectArgs(argv.slice(2))
  if (!args.file) {
    printSelectUsage()
    process.exitCode = 1
    return
  }

  const { selector, label } = resolveCliSelector(args.selector, args.expr)
  const workspace = await tryDiscoverSpwWorkspace()
  const filePath = workspace ? await resolveWorkspacePath(workspace, args.file) : resolve(args.file)
  const source = await readFile(filePath, 'utf8')
  const output = parse(source)

  if (!output.ast) {
    throw new Error(`Failed to parse ${filePath}`)
  }

  let matches = spwq(output.ast, selector)
  if (!args.expr && args.selector === 'rootRefs') {
    matches = filterRootRefs(matches)
  }

  renderSelectMatches(source, matches, args, label)
}

export function printSelectUsage(): void {
  printHelpPage({
    title: 'Spw Select',
    usage: [
      'npm run spw -- select <file.spw> [--selector=navigable] [--expr="$@_"] [--format=lines|json] [--summary]',
      'npm run spwq -- <file.spw> ...',
    ],
    sections: [
      {
        title: 'Selectors',
        lines: listCliSelectorPresetNames(),
      },
    ],
  })
}

function renderSelectMatches(source: string, matches: SpwMatch[], args: SelectArgs, selectorLabel: string): void {
  if (args.format === 'json') {
    const payload = matches.map((match) => ({
      type: match.node.type,
      label: getMatchLabel(match),
      span: match.span,
      depth: match.depth,
    }))
    console.log(JSON.stringify(payload, null, 2))
  } else {
    for (const match of matches) {
      const label = getMatchLabel(match)
      const loc = `${match.span.startLine + 1}:${match.span.startCharacter + 1}-${match.span.endLine + 1}:${match.span.endCharacter + 1}`
      const raw = source.slice(match.span.startOffset, match.span.endOffset)
      console.log(`${label}\t${loc}\t${JSON.stringify(raw)}`)
    }
  }

  if (!args.summary) return

  const maxDepth = matches.reduce((max, match) => Math.max(max, match.depth), 0)
  const types = new Set(matches.map((match) => match.node.type))
  const byDepth = new Map<number, number>()
  for (const match of matches) {
    byDepth.set(match.depth, (byDepth.get(match.depth) ?? 0) + 1)
  }

  console.error('')
  console.error('── summary ──────────────────────────────────')
  console.error(`  selector:   ${selectorLabel}`)
  console.error(`  matches:    ${matches.length}`)
  console.error(`  max depth:  ${maxDepth}`)
  console.error(`  node types: ${[...types].join(', ')}`)
  console.error(`  by depth:   ${[...byDepth.entries()].map(([depth, count]) => `${depth}:${count}`).join('  ')}`)
}

function getMatchLabel(match: SpwMatch): string {
  const node = match.node
  switch (node.type) {
    case 'PathRef': {
      const raw = (node as { path?: { token?: { value?: string } } }).path?.token?.value ?? ''
      const unquoted = raw.replace(/^["'`]|["'`]$/g, '')
      return `pathRef\t${unquoted}`
    }
    case 'Reference': {
      const raw = extractReferenceRaw(match)
      if (raw.includes('/')) {
        const parts = raw.split('/').filter(Boolean)
        const [root, ...rest] = parts
        return `rootRef ${root}\t${rest.join('/')}`
      }
      return `ref\t${raw}`
    }
    case 'Operation': {
      const op = node as { operator?: { value?: string }, operatorLabel?: { value?: string } }
      const sigil = op.operator?.value ?? '?'
      const label = op.operatorLabel?.value ?? ''
      return `op:${sigil}${label ? `:${label}` : ''}`
    }
    default:
      return node.type
  }
}
