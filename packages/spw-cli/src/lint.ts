/**
 * spw lint — well-formed annotations, unique #> anchors, optional citation check.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  ANCHORS,
  parse,
  scanMalformedAxes,
  spwq,
  type MalformedAxisFinding,
} from '@spwashi/spw-seed'
import { collectSpwFiles, DEFAULT_IGNORED_DIRS } from './fs-walk'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'
import { formatTable, meta } from './view'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace } from './workspace'

export type LintKind = 'malformed-axis' | 'duplicate-anchor'

export interface LintFinding {
  kind: LintKind
  file: string
  line: number
  message: string
}

interface LintArgs {
  help: boolean
  json: boolean
  roots: string[]
}

function parseArgs(argv: string[]): LintArgs {
  const tokens = argv[0] === 'lint' ? argv.slice(1) : argv
  const parsed: LintArgs = { help: false, json: false, roots: [] }
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    if (token === '--help' || token === '-h') parsed.help = true
    else if (token === '--json') parsed.json = true
    else if (token === '--from' || token === '--root') parsed.roots.push(...(tokens[++i] ?? '').split(',').filter(Boolean))
    else if (token.startsWith('--from=')) parsed.roots.push(...token.slice('--from='.length).split(',').filter(Boolean))
    else if (token.startsWith('-')) throw new Error(`spw lint: unknown flag ${token}`)
    else parsed.roots.push(token)
  }
  if (parsed.roots.length === 0) parsed.roots.push('.spw')
  return parsed
}

export function printLintHelp(): void {
  printHelpPage({
    name: 'lint',
    summary: 'Check axis annotations and unique #> anchors',
    usage: ['spw lint [--from .spw] [--json]'],
    groups: [
      {
        title: 'Options',
        lines: [
          '--from, --root PATHS   Comma-separated roots (default .spw)',
          '--json                 Envelope of findings',
        ],
      },
      {
        title: 'Notes',
        lines: [
          'Flags `#:operation contract` (missing #!). Pair with `spw resolve` for citation existence.',
          'Duplicate `#>` names inside one surface are findings; the same name on two surfaces is allowed.',
        ],
      },
    ],
    examples: ['spw lint .spw', 'spw lint --from .spw,docs/theory --json'],
  })
}

function axisFinding(file: string, finding: MalformedAxisFinding): LintFinding {
  return {
    kind: 'malformed-axis',
    file,
    line: finding.line,
    message: `#:${finding.axis} ${finding.value} should be #:${finding.axis} ${finding.expected}`,
  }
}

function duplicateAnchors(file: string, source: string): LintFinding[] {
  const output = parse(source)
  if (!output.ast) return []
  const hits = spwq(output.ast, ANCHORS)
  const byName = new Map<string, number[]>()
  for (const hit of hits) {
    const node = hit.node as { name?: { value?: string } }
    const name = node.name?.value
    if (!name) continue
    const line = (hit.span?.startLine ?? 0) + 1
    const lines = byName.get(name) ?? []
    lines.push(line)
    byName.set(name, lines)
  }
  const findings: LintFinding[] = []
  for (const [name, lines] of byName) {
    if (lines.length < 2) continue
    findings.push({
      kind: 'duplicate-anchor',
      file,
      line: lines[1]!,
      message: `#>${name} declared ${lines.length} times (lines ${lines.join(', ')})`,
    })
  }
  return findings
}

export async function runSpwLintCli(argv: string[]): Promise<void> {
  let args: LintArgs
  try {
    args = parseArgs(argv)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 2
    return
  }
  if (args.help) {
    printLintHelp()
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

  const findings: LintFinding[] = []
  for (const abs of files) {
    const source = await fs.readFile(abs, 'utf8')
    const rel = path.relative(consumerRoot, abs)
    for (const finding of scanMalformedAxes(source)) findings.push(axisFinding(rel, finding))
    findings.push(...duplicateAnchors(rel, source))
  }

  const summary = {
    files: files.length,
    findings: findings.length,
    malformedAxis: findings.filter(f => f.kind === 'malformed-axis').length,
    duplicateAnchor: findings.filter(f => f.kind === 'duplicate-anchor').length,
  }

  if (args.json) {
    console.log(formatJsonEnvelope('lint', findings, summary))
  } else {
    meta(`# spw lint  files=${summary.files} findings=${summary.findings} axis=${summary.malformedAxis} anchors=${summary.duplicateAnchor}`)
    if (findings.length === 0) {
      console.log('annotations and anchors are well-formed')
    } else {
      console.log(
        formatTable(
          ['kind', 'line', 'file', 'message'],
          findings.slice(0, 40).map(f => [f.kind, String(f.line), f.file, f.message]),
        ),
      )
    }
  }

  if (findings.length > 0) process.exitCode = 1
}
