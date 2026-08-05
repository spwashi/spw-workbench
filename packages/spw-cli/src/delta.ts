/**
 * spw delta — two-revision ChangeReport (lex LCS + nest path-match).
 *
 * Collate-only sense verb: never writes. Names the *product gap* between two
 * cuts. Freeze a apply-ready **Patch** with `--patch` (alias `--cache`).
 *
 * Usage:
 *   spw delta <before.spw> <after.spw>
 *   spw delta --patch before.spw after.spw
 */

import { readFileSync } from 'node:fs'
import process from 'node:process'
import {
  buildPatch,
  buildChangeReport,
  formatPatchSpw,
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
  /** Emit Patch product card (selection + edits + store=memory). */
  patch: boolean
}

function parseArgs(argv: string[]): DeltaArgs {
  const args = argv[0] === 'delta' ? argv.slice(1) : argv
  let json = false
  let quiet = false
  let patch = false
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
    // --patch preferred; --cache retained as synonym for freeze-to-product
    if (a === '--patch' || a === '--cache' || a === '--cached') {
      patch = true
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
    patch,
  }
}

export function printDeltaHelp(): void {
  printHelpPage({
    name: 'delta',
    summary: 'Lex + nest-path ChangeReport for two surface revisions (collate-only)',
    usage: ['spw delta <before> <after> [--json] [--patch]'],
    groups: [
      {
        title: 'Options',
        lines: [
          '--json         Machine ChangeReport (or Patch with --patch)',
          '--patch        Freeze Patch product (selection + edits + IrRef); collate only',
          '--cache        Alias for --patch',
          '--quiet, -q    Suppress meta header',
        ],
      },
      {
        title: 'Notes',
        lines: [
          'delta = sense narrative; patch = apply-ready product (this command never writes)',
          'layoutOnly = brace ∧ nest skeleton ∧ labels ∧ structuralOps=0 ∧ triviaOnly',
          'Apply targets: file | files | nodes (seed applyPatch*)',
        ],
      },
    ],
    examples: [
      'spw delta a.spw b.spw',
      'spw delta --patch before.spw after.spw',
      'spw delta --json --patch before.spw after.spw',
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
        nestSkeletonEqual: report.ast.nest.skeletonEqual,
        nestBefore: report.ast.nest.beforeSkeleton,
        nestAfter: report.ast.nest.afterSkeleton,
        nestLabeledBefore: report.ast.nest.beforeLabeled,
        nestLabeledAfter: report.ast.nest.afterLabeled,
        labelsEqual: report.ast.nest.labelsEqual,
        labelsAdded: report.ast.nest.labelsAdded,
        labelsRemoved: report.ast.nest.labelsRemoved,
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

  if (parsed.patch) {
    const product = buildPatch(before, after, {
      uri: parsed.beforePath,
      store: 'memory',
      applyTarget: 'file',
      includeReport: true,
    })
    if (parsed.json) {
      console.log(
        JSON.stringify(
          {
            command: 'delta',
            mode: 'patch',
            version: product.version,
            ref: product.ref,
            selection: product.selection,
            narrative: product.narrative,
            edits: product.differential.edits.length,
            beforeHash: product.differential.beforeHash,
            afterHash: product.differential.afterHash,
            effectCeiling: product.effectCeiling,
            store: product.store,
            report: toJsonEnvelope(report, parsed.beforePath, parsed.afterPath).report,
          },
          null,
          2,
        ),
      )
      return
    }
    if (!parsed.quiet) {
      meta(
        `# spw delta --patch  edits=${product.differential.edits.length}` +
          ` store=${product.store} layoutOnly=${product.narrative.layoutOnly}` +
          ` applyTarget=${product.applyTarget}`,
      )
    }
    console.log(formatPatchSpw(product))
    console.log(formatChangeReportSpw(report))
    return
  }

  if (parsed.json) {
    console.log(JSON.stringify(toJsonEnvelope(report, parsed.beforePath, parsed.afterPath), null, 2))
    return
  }

  if (!parsed.quiet) {
    meta(
      `# spw delta  identity=${report.identity} layoutOnly=${report.layoutOnly}` +
        ` lexOps=${report.lex.structuralOps} brace=${report.ast.brace.severity}` +
        ` nest=${report.ast.nest.skeletonEqual ? 'eq' : 'moved'}` +
        ` labels=${report.ast.nest.labelsEqual ? 'eq' : 'moved'}`,
    )
  }
  console.log(formatChangeReportSpw(report))
}
