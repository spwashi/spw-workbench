/**
 * spw resolve — classify and follow parser-extracted pathRefs.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  classifyCitation,
  parse,
  PATH_REFS,
  sourceDeclaresAnchor,
  spwq,
  type ClassifiedCitation,
} from '@spwashi/spw-seed'
import { collectSpwFiles, DEFAULT_IGNORED_DIRS } from './fs-walk'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'
import { formatTable, meta } from './view'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace } from './workspace'

export type ResolveVerdict = 'ok' | 'missing-file' | 'missing-anchor' | 'malformed' | 'external'

export interface ResolvedCitationRow extends ClassifiedCitation {
  file: string
  line: number
  exists: boolean | null
  anchorExists: boolean | null
  verdict: ResolveVerdict
}

interface ResolveArgs {
  help: boolean
  json: boolean
  warn: boolean
  roots: string[]
}

function parseArgs(argv: string[]): ResolveArgs {
  const tokens = argv[0] === 'resolve' ? argv.slice(1) : argv
  const parsed: ResolveArgs = { help: false, json: false, warn: false, roots: [] }
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    if (token === '--help' || token === '-h') parsed.help = true
    else if (token === '--json') parsed.json = true
    else if (token === '--warn') parsed.warn = true
    else if (token === '--from' || token === '--root') parsed.roots.push(...(tokens[++i] ?? '').split(',').filter(Boolean))
    else if (token.startsWith('--from=')) parsed.roots.push(...token.slice('--from='.length).split(',').filter(Boolean))
    else if (token.startsWith('-')) throw new Error(`spw resolve: unknown flag ${token}`)
    else parsed.roots.push(token)
  }
  if (parsed.roots.length === 0) parsed.roots.push('.spw')
  return parsed
}

export function printResolveHelp(): void {
  printHelpPage({
    name: 'resolve',
    summary: 'Classify pathRefs into file, route, directory, or external targets',
    usage: ['spw resolve [--from .spw] [--json] [--warn]'],
    groups: [
      {
        title: 'Options',
        lines: [
          '--from, --root PATHS   Comma-separated roots (default .spw)',
          '--json                 Envelope of classified citations',
          '--warn                 Report dangling targets without failing',
        ],
      },
      {
        title: 'Notes',
        lines: [
          'Extraction uses the parser (pathRefs). Classification splits path and fragment.',
          'Does not treat ~": " prose as a citation — that is the regex failure this replaces.',
        ],
      },
    ],
    examples: ['spw resolve --from .spw --json', 'spw resolve prompts docs/theory'],
  })
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}

async function pathExists(abs: string): Promise<boolean> {
  try {
    await fs.stat(abs)
    return true
  } catch {
    return false
  }
}

async function resolveOne(
  citingFile: string,
  rawTarget: string,
  line: number,
  consumerRoot: string,
): Promise<ResolvedCitationRow> {
  const classified = classifyCitation(rawTarget)
  const row: ResolvedCitationRow = {
    ...classified,
    file: citingFile,
    line,
    exists: null,
    anchorExists: null,
    verdict: classified.kind === 'malformed' ? 'malformed' : 'ok',
  }

  if (classified.kind === 'malformed') return row
  if (classified.kind === 'external') {
    row.exists = true
    row.verdict = 'external'
    return row
  }

  const citingDir = path.dirname(path.resolve(consumerRoot, citingFile))
  const abs = classified.kind === 'route'
    ? path.resolve(consumerRoot, classified.targetPath.replace(/^\/+/, ''))
    : path.resolve(citingDir, classified.targetPath)

  row.exists = await pathExists(abs)
  if (!row.exists) {
    row.verdict = 'missing-file'
    return row
  }

  if (!classified.fragment || classified.kind === 'directory' || classified.kind === 'route') {
    row.anchorExists = classified.fragment ? null : true
    return row
  }

  try {
    const source = await fs.readFile(abs, 'utf8')
    row.anchorExists = sourceDeclaresAnchor(source, classified.fragment)
    if (!row.anchorExists) row.verdict = 'missing-anchor'
  } catch {
    row.anchorExists = false
    row.verdict = 'missing-anchor'
  }
  return row
}

export async function runSpwResolveCli(argv: string[]): Promise<void> {
  let args: ResolveArgs
  try {
    args = parseArgs(argv)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 2
    return
  }
  if (args.help) {
    printResolveHelp()
    return
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const consumerRoot = workspace?.consumerRoot ?? process.cwd()
  const absRoots = await Promise.all(
    args.roots.map(root => (
      path.isAbsolute(root)
        ? path.resolve(root)
        : workspace
          ? resolveWorkspacePath(workspace, root)
          : path.resolve(root)
    )),
  )
  const files = [...new Set((await Promise.all(absRoots.map(root => collectSpwFiles(root, { ignore: DEFAULT_IGNORED_DIRS })))).flat())].sort()

  const rows: ResolvedCitationRow[] = []
  for (const abs of files) {
    const source = await fs.readFile(abs, 'utf8')
    const output = parse(source)
    if (!output.ast) continue
    const matches = spwq(output.ast, PATH_REFS)
    const rel = path.relative(consumerRoot, abs)
    for (const match of matches) {
      const node = match.node as { path?: { token?: { value?: string } }; span?: { start?: { line?: number } } }
      const raw = unquote(node.path?.token?.value ?? '')
      const line = (match.span?.startLine ?? 0) + 1
      rows.push(await resolveOne(rel, raw, line, consumerRoot))
    }
  }

  const summary = {
    total: rows.length,
    ok: rows.filter(row => row.verdict === 'ok').length,
    external: rows.filter(row => row.verdict === 'external').length,
    missingFile: rows.filter(row => row.verdict === 'missing-file').length,
    missingAnchor: rows.filter(row => row.verdict === 'missing-anchor').length,
    malformed: rows.filter(row => row.verdict === 'malformed').length,
  }

  if (args.json) {
    console.log(formatJsonEnvelope('resolve', rows, summary))
  } else {
    meta(`# spw resolve  total=${summary.total} ok=${summary.ok} missing_file=${summary.missingFile} missing_anchor=${summary.missingAnchor} malformed=${summary.malformed}`)
    const broken = rows.filter(row => row.verdict !== 'ok' && row.verdict !== 'external')
    if (broken.length === 0) {
      console.log('all citations resolve')
    } else {
      console.log(
        formatTable(
          ['verdict', 'file', 'target'],
          broken.slice(0, 40).map(row => [row.verdict, row.file, `${row.targetPath}${row.fragment ? `#${row.fragment}` : ''}`]),
        ),
      )
    }
  }

  if (!args.warn && (summary.missingFile > 0 || summary.missingAnchor > 0 || summary.malformed > 0)) {
    process.exitCode = 1
  }
}
