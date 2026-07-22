import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { spwq, type SpwMatch } from '@spwashi/spw-seed'
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
import {
  contextAround,
  countMap,
  formatTable,
  meta,
  metaBlock,
  renderCounts,
  suggestClosest,
  truncate,
} from './view'

export async function runSpwSelectCli(argv: string[]): Promise<void> {
  const args = parseSelectArgs(argv.slice(2))
  if (!args.file) {
    printSelectUsage()
    process.exitCode = 1
    return
  }

  let selectorLabel: string
  let selector
  try {
    const resolved = resolveCliSelector(args.selector, args.expr)
    selector = resolved.selector
    selectorLabel = resolved.label
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.startsWith('Unknown selector:')) {
      const hint = suggestClosest(args.selector, listCliSelectorPresetNames())
      console.error(`spw select: ${msg}`)
      if (hint.length) console.error(`  did you mean: ${hint.join(', ')}?`)
      console.error(`  presets: ${listCliSelectorPresetNames().join(', ')}`)
      process.exitCode = 1
      return
    }
    throw err
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const filePath = workspace ? await resolveWorkspacePath(workspace, args.file) : resolve(args.file)

  let source: string
  try {
    source = await readFile(filePath, 'utf8')
  } catch {
    console.error(`spw select: cannot read ${args.file}`)
    process.exitCode = 1
    return
  }

  // Prefer fromSource for parity with query (full pipeline, recoverability)
  let matches: SpwMatch[]
  try {
    matches = spwq.fromSource(source, selector)
  } catch (err) {
    console.error(`spw select: query failed on ${args.file}`)
    console.error(`  ${err instanceof Error ? err.message : String(err)}`)
    process.exitCode = 1
    return
  }
  if (!args.expr && (args.selector === 'rootRefs' || selectorLabel === 'rootRefs')) {
    matches = filterRootRefs(matches)
  }

  const limited = matches.slice(0, Math.max(1, args.limit))
  renderSelectMatches(source, limited, matches, args, selectorLabel, args.file)

  if (matches.length > limited.length && !args.quiet) {
    meta(`  … truncated; ${matches.length - limited.length} more (raise --limit)`)
  }
}

export function printSelectUsage(): void {
  printHelpPage({
    title: 'Spw Select',
    usage: [
      'spw select <file.spw> [--selector navigable] [--expr "$@_"] [--format lines|skim|table|json]',
      'spw select <file.spw> --skim [--limit 40] [--context 2] [--summary]',
      'spw select <file.spw> --group --selector ops:frame',
    ],
    sections: [
      {
        title: 'View flags',
        lines: [
          '--skim / -f skim     Compact loc + label + snippet',
          '--table              Aligned columns',
          '--json               Structured JSON envelope',
          '--group / -g         Group matches by node type',
          '--context N / -C N   Show N source lines around each match',
          '--limit N / -n N     Cap matches (default 200)',
          '--quiet / -q         No header banner',
          '--summary            Type/depth histogram on stderr',
        ],
      },
      {
        title: 'Selectors',
        lines: listCliSelectorPresetNames().map(n => {
          const tip =
            n === 'navigable'
              ? ' — paths, refs, frames (default)'
              : n === 'pathRefs'
                ? ' — ~"…" only'
                : n === 'rootRefs'
                  ? ' — @root/… only'
                  : n === 'ops:frame'
                    ? ' — ^[…] style frames'
                    : ''
          return `${n}${tip}`
        }),
      },
      {
        title: 'Try',
        lines: [
          'spw select prompts/index.spw --skim',
          'spw select prompts/index.spw --selector pathRefs --context 1',
          'spw select prompts/sagas/profiles.spw --selector ops:frame --group --summary',
        ],
      },
    ],
  })
}

function renderSelectMatches(
  source: string,
  shown: SpwMatch[],
  all: SpwMatch[],
  args: SelectArgs,
  selectorLabel: string,
  fileLabel: string,
): void {
  const total = all.length
  if (args.format === 'json') {
    const payload = shown.map(match => ({
      type: match.node.type,
      label: getMatchLabel(match),
      span: match.span,
      depth: match.depth,
      snippet: truncate(source.slice(match.span.startOffset, match.span.endOffset), 120),
    }))
    console.log(
      JSON.stringify(
        {
          command: 'select',
          file: fileLabel,
          selector: selectorLabel,
          total,
          shown: shown.length,
          matches: payload,
        },
        null,
        2,
      ),
    )
    return
  }

  if (!args.quiet) {
    meta(`# spw select  file=${fileLabel}  selector=${selectorLabel}  hits=${total}  show=${shown.length}`)
  }

  if (shown.length === 0) {
    meta('  (no matches)')
    meta('  tip: try --selector all|refs|pathRefs|ops:frame or --expr')
    return
  }

  if (args.group) {
    const groups = new Map<string, SpwMatch[]>()
    for (const m of shown) {
      const k = m.node.type
      const list = groups.get(k) ?? []
      list.push(m)
      groups.set(k, list)
    }
    for (const [type, list] of groups) {
      console.log(`\n## ${type}  (${list.length})`)
      for (const match of list) printOne(source, match, args, true)
    }
  } else if (args.format === 'table') {
    const headers = ['loc', 'type', 'label', 'snippet']
    const rows = shown.map(m => {
      const loc = `${m.span.startLine + 1}:${m.span.startCharacter + 1}`
      const raw = source.slice(m.span.startOffset, m.span.endOffset)
      return [loc, m.node.type, getMatchLabel(m), truncate(raw, 48)]
    })
    console.log(formatTable(headers, rows))
  } else {
    for (const match of shown) printOne(source, match, args, false)
  }

  if (args.summary) {
    const maxDepth = all.reduce((max, match) => Math.max(max, match.depth), 0)
    const byType = countMap(all.map(m => m.node.type))
    const byDepth = countMap(all.map(m => String(m.depth)))
    metaBlock('summary', [
      ['selector', selectorLabel],
      ['matches', String(total)],
      ['max depth', String(maxDepth)],
      ['types', renderCounts(byType)],
      ['depth', renderCounts(byDepth)],
    ])
  }
}

function printOne(source: string, match: SpwMatch, args: SelectArgs, indent: boolean): void {
  const label = getMatchLabel(match)
  const loc = `${match.span.startLine + 1}:${match.span.startCharacter + 1}`
  const raw = source.slice(match.span.startOffset, match.span.endOffset)
  const prefix = indent ? '  ' : ''

  if (args.format === 'skim') {
    console.log(
      `${prefix}${loc.padEnd(10)} ${match.node.type.padEnd(12)} ${truncate(label, 28).padEnd(28)} ${truncate(raw, 56)}`,
    )
  } else {
    console.log(`${prefix}${label}\t${loc}\t${JSON.stringify(truncate(raw, 200))}`)
  }

  if (args.context > 0) {
    console.log(
      contextAround(source, match.span.startLine + 1, match.span.endLine + 1, args.context),
    )
    console.log('')
  }
}

function getMatchLabel(match: SpwMatch): string {
  const node = match.node
  switch (node.type) {
    case 'PathRef': {
      const raw = (node as { path?: { token?: { value?: string } } }).path?.token?.value ?? ''
      const unquoted = raw.replace(/^["'`]|["'`]$/g, '')
      return `pathRef ${unquoted}`
    }
    case 'Reference': {
      const raw = extractReferenceRaw(match)
      if (raw.includes('/')) {
        const parts = raw.split('/').filter(Boolean)
        const [root, ...rest] = parts
        return `rootRef ${root} ${rest.join('/')}`
      }
      return `ref ${raw}`
    }
    case 'Operation': {
      const op = node as { operator?: { value?: string }; operatorLabel?: { value?: string } }
      const sigil = op.operator?.value ?? '?'
      const label = op.operatorLabel?.value ?? ''
      return `op:${sigil}${label ? `:${label}` : ''}`
    }
    default:
      return node.type
  }
}
