/**
 * spw delta — two-revision ChangeReport (lex LCS + brace path-match).
 *
 * Collate-only sense verb: never writes. Names the *product gap* between two
 * cuts, not a VCS diff and not a workspace rewrite.
 *
 * Layout-only claim (measured):
 *   brace equal ∧ structuralOps === 0 ∧ triviaOnly
 *
 * Usage:
 *   spw delta <before.spw> <after.spw>
 *   spw delta --json before.spw after.spw
 */

import { readFileSync } from 'node:fs'
import process from 'node:process'
import {
  buildChangeReport,
  formatChangeReportSpw,
  type ChangeReport,
} from '@spwashi/spw-seed'
import { printHelpPage } from './help'
import { meta } from './view'

interface DeltaArgs {
  beforePath: string
  afterPath: string
  json: boolean
  quiet: boolean
}

function parseArgs(argv: string[]): DeltaArgs {
  const args = argv[0] === 'delta' ? argv.slice(1) : argv
  let json = false
  let quiet = false
  const paths: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '--json') {
      json = true
      continue
    }
    if (a === '--quiet' || a === '-q') {
      quiet = true
      continue
    }
    if (a === '--help' || a === '-h') {
      printDeltaHelp()
      process.exit(0)
    }
    if (a.startsWith('-')) {
      throw new Error(`spw delta: unknown flag ${a}`)
    }
    paths.push(a)
  }
  if (paths.length !== 2) {
    throw new Error('spw delta: need exactly two paths (before after)')
  }
  return {
    beforePath: paths[0]!,
    afterPath: paths[1]!,
    json,
    quiet,
  }
}

export function printDeltaHelp(): void {
  printHelpPage({
    name: 'delta',
    summary: 'Lex + brace ChangeReport for two surface revisions (collate-only)',
    usage: ['spw delta <before> <after> [--json]'],
    groups: [
      {
        title: 'Options',
        lines: [
          '--json       Machine ChangeReport envelope',
          '--quiet, -q  Suppress meta header',
        ],
      },
      {
        title: 'Notes',
        lines: [
          'layoutOnly = brace equal ∧ structuralOps=0 ∧ triviaOnly',
          'Product type remains ChangeReport; this verb names the gap, not a write',
          'Sense/collate only — never mutates the workspace',
        ],
      },
    ],
    examples: [
      'spw delta a.spw b.spw',
      'spw delta --json before.spw after.spw',
    ],
  })
}

function toJsonEnvelope(report: ChangeReport, beforePath: string, afterPath: string) {
  return {
    command: 'delta',
    version: report.version,
    beforePath,
    afterPath,
    report: {
      beforeHash: report.beforeHash,
      afterHash: report.afterHash,
      identity: report.identity,
      layoutOnly: report.layoutOnly,
      editSpans: report.editSpans,
      note: report.note,
      lex: {
        structuralOps: report.lex.structuralOps,
        triviaOnly: report.lex.triviaOnly,
        inserted: report.lex.inserted,
        deleted: report.lex.deleted,
        replaced: report.lex.replaced,
        equal: report.lex.equal,
      },
      ast: {
        braceEqual: report.ast.braceEqual,
        braceSeverity: report.ast.brace.severity,
        pathMatch: report.ast.pathMatch,
        findings: report.ast.findings,
      },
    },
  }
}

export async function runSpwDeltaCli(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv)
  const before = readFileSync(parsed.beforePath, 'utf8')
  const after = readFileSync(parsed.afterPath, 'utf8')
  const report = buildChangeReport(before, after, {
    uri: `${parsed.beforePath}→${parsed.afterPath}`,
  })

  if (parsed.json) {
    console.log(JSON.stringify(toJsonEnvelope(report, parsed.beforePath, parsed.afterPath), null, 2))
    return
  }

  if (!parsed.quiet) {
    meta(
      `# spw delta  identity=${report.identity} layoutOnly=${report.layoutOnly}` +
        ` lexOps=${report.lex.structuralOps} brace=${report.ast.brace.severity}`,
    )
  }
  console.log(formatChangeReportSpw(report))
}
