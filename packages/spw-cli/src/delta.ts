/**
 * spw delta — sense narrative between two surface revisions.
 *
 *   delta   — ChangeReport (stdout dual-read)
 *   --patch — freeze apply-ready Patch product
 *   --cache — keep report/patch in workspace session memory (.spw/gen/session/cli-cache)
 *   --list / --show / --clear — inspect or wipe session cache
 *
 * Collate-only: never rewrites authored trees.
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
import { helpLoc, printHelpPage } from './help'
import { defineLoc } from './loc'
import {
  cacheDeltaReport,
  cachePatchProduct,
  clearCliCache,
  cliCacheDir,
  formatCliCacheIndexSpw,
  getCliCacheEntry,
  listCliCache,
} from './session/workspace-cache'
import { meta } from './view'

/** Copy for this module — revise here; keys are section.key → delta.section.key */
const d = defineLoc('delta', {
  'help.summary':
    'Lex + nest-path ChangeReport for two surface revisions (collate-only)',
  'help.usage': 'spw delta <before> <after> [--json] [--cache] [--patch]',
  'help.usage_list': 'spw delta --list [--json]',
  'help.usage_show': 'spw delta --show <id> [--json]',
  'help.opt_json': '--json         Machine envelope (report, patch, or cache entry)',
  'help.opt_patch':
    '--patch        Freeze Patch product to stdout (apply-ready; does not write workspace)',
  'help.opt_cache':
    '--cache        Keep delta/patch in workspace session memory for later inspect',
  'help.opt_list': '--list         List session-cached deltas for this workspace',
  'help.opt_show': '--show <id>    Show one cached delta/patch by id',
  'help.opt_clear': '--clear        Clear session delta cache for this workspace',
  'help.opt_quiet': '--quiet, -q    Suppress meta header',
  'help.note_vocab':
    'delta = sense narrative; patch = apply product; --cache = session memory (not a write to authored trees)',
  'help.note_layout':
    'layoutOnly = brace ∧ nest skeleton ∧ labels ∧ structuralOps=0 ∧ triviaOnly',
  'help.note_session':
    'Session cache lives under .spw/gen/session/cli-cache/ (skipped by invent/map as gen)',
  'help.ex_basic': 'spw delta a.spw b.spw',
  'help.ex_cache': 'spw delta --cache before.spw after.spw',
  'help.ex_patch': 'spw delta --patch before.spw after.spw',
  'help.ex_list': 'spw delta --list',
  'meta.header':
    '# spw delta  identity={identity} layoutOnly={layoutOnly} lexOps={lexOps} brace={brace} nest={nest} labels={labels}',
  'meta.cached':
    '# spw delta --cache  id={id}  edits={edits} layoutOnly={layoutOnly}  session={session}',
  'meta.patch':
    '# spw delta --patch  edits={edits} store={store} layoutOnly={layoutOnly} applyTarget={applyTarget}',
  'meta.list_header': '# spw delta --list  n={count}  session={session}',
  'error.need_paths': 'need exactly two paths (before after)',
  'error.unknown_flag': 'unknown flag {flag}',
  'error.missing_show_id': 'need --show <id>',
  'error.not_found': 'no cached entry with id {id}',
  'status.empty': 'no cached deltas in this workspace session',
  'status.stored': 'stored {id} in session cache ({kind})',
  'status.cleared': 'cleared {count} cached entr(y/ies)',
})

interface DeltaArgs {
  beforePath?: string
  afterPath?: string
  json: boolean
  quiet: boolean
  patch: boolean
  cache: boolean
  list: boolean
  clear: boolean
  showId?: string
}

function parseArgs(argv: string[]): DeltaArgs {
  const args = argv[0] === 'delta' ? argv.slice(1) : argv
  let json = false
  let quiet = false
  let patch = false
  let cache = false
  let list = false
  let clear = false
  let showId: string | undefined
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
    if (a === '--patch') {
      patch = true
      continue
    }
    if (a === '--cache' || a === '--cached') {
      cache = true
      continue
    }
    if (a === '--list') {
      list = true
      continue
    }
    if (a === '--clear') {
      clear = true
      continue
    }
    if (a === '--show') {
      const id = args[++i]
      if (!id || id.startsWith('-')) {
        throw new Error(`spw delta: ${d('error.missing_show_id')}`)
      }
      showId = id
      continue
    }
    if (a === '--help' || a === '-h') {
      printDeltaHelp()
      process.exit(0)
    }
    if (a.startsWith('-')) {
      throw new Error(`spw delta: ${d('error.unknown_flag', { flag: a })}`)
    }
    paths.push(a)
  }

  if (list || clear || showId) {
    return { json, quiet, patch, cache, list, clear, showId }
  }

  if (paths.length !== 2) {
    throw new Error(`spw delta: ${d('error.need_paths')}`)
  }
  return {
    beforePath: paths[0],
    afterPath: paths[1],
    json,
    quiet,
    patch,
    cache,
    list,
    clear,
  }
}

export function printDeltaHelp(): void {
  printHelpPage({
    name: 'delta',
    summary: d('help.summary'),
    usage: [d('help.usage'), d('help.usage_list'), d('help.usage_show')],
    groups: [
      {
        title: helpLoc('help.options'),
        lines: [
          d('help.opt_json'),
          d('help.opt_patch'),
          d('help.opt_cache'),
          d('help.opt_list'),
          d('help.opt_show'),
          d('help.opt_clear'),
          d('help.opt_quiet'),
        ],
      },
      {
        title: helpLoc('help.notes'),
        lines: [d('help.note_vocab'), d('help.note_layout'), d('help.note_session')],
      },
    ],
    examples: [
      d('help.ex_basic'),
      d('help.ex_cache'),
      d('help.ex_patch'),
      d('help.ex_list'),
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

function runList(json: boolean, quiet: boolean): void {
  const entries = listCliCache()
  if (json) {
    console.log(
      JSON.stringify(
        {
          command: 'delta',
          mode: 'list',
          session: cliCacheDir(),
          entries,
        },
        null,
        2,
      ),
    )
    return
  }
  if (!quiet) {
    meta(d('meta.list_header', { count: entries.length, session: cliCacheDir() }))
  }
  // Spw dual-read index — default surface (not a host table)
  console.log(formatCliCacheIndexSpw(entries, { session: cliCacheDir() }))
}

function runShow(id: string, json: boolean, quiet: boolean): void {
  const entry = getCliCacheEntry(id)
  if (!entry) {
    throw new Error(`spw delta: ${d('error.not_found', { id })}`)
  }
  if (json) {
    console.log(JSON.stringify({ command: 'delta', mode: 'show', entry }, null, 2))
    return
  }
  if (!quiet) {
    meta(
      `# spw delta --show ${entry.id}  kind=${entry.kind}  ${entry.beforePath ?? ''}→${entry.afterPath ?? ''}`,
    )
  }
  console.log(entry.dualReadSpw)
}

function runClear(json: boolean, quiet: boolean): void {
  const count = clearCliCache()
  if (json) {
    console.log(JSON.stringify({ command: 'delta', mode: 'clear', count }, null, 2))
    return
  }
  if (!quiet) meta(d('status.cleared', { count }))
  else console.log(d('status.cleared', { count }))
}

export async function runSpwDeltaCli(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv)

  if (parsed.clear) {
    runClear(parsed.json, parsed.quiet)
    return
  }
  if (parsed.list) {
    runList(parsed.json, parsed.quiet)
    return
  }
  if (parsed.showId) {
    runShow(parsed.showId, parsed.json, parsed.quiet)
    return
  }

  const beforePath = parsed.beforePath!
  const afterPath = parsed.afterPath!
  const before = readFileSync(beforePath, 'utf8')
  const after = readFileSync(afterPath, 'utf8')
  const report = buildChangeReport(before, after, {
    uri: `${beforePath}→${afterPath}`,
  })

  // Freeze patch product when requested
  const product = parsed.patch
    ? buildPatch(before, after, {
        uri: beforePath,
        store: parsed.cache ? 'file' : 'memory',
        applyTarget: 'file',
        includeReport: true,
      })
    : undefined

  // Session memory: --cache keeps inspectable shapes for this workspace
  let cacheId: string | undefined
  if (parsed.cache) {
    if (product) {
      const entry = cachePatchProduct(product, {
        beforePath,
        afterPath,
        report,
      })
      cacheId = entry.id
    } else {
      const entry = cacheDeltaReport(report, { beforePath, afterPath })
      cacheId = entry.id
    }
  }

  if (parsed.json) {
    const body: Record<string, unknown> = {
      ...toJsonEnvelope(report, beforePath, afterPath),
    }
    if (product) {
      body.mode = 'patch'
      body.patch = {
        version: product.version,
        ref: product.ref,
        selection: product.selection,
        narrative: product.narrative,
        edits: product.differential.edits.length,
        beforeHash: product.differential.beforeHash,
        afterHash: product.differential.afterHash,
        effectCeiling: product.effectCeiling,
        store: product.store,
      }
    }
    if (cacheId) {
      body.cached = {
        id: cacheId,
        session: cliCacheDir(),
        kind: product ? 'patch' : 'delta',
      }
    }
    console.log(JSON.stringify(body, null, 2))
    return
  }

  if (!parsed.quiet) {
    if (cacheId) {
      meta(
        d('meta.cached', {
          id: cacheId,
          edits: product?.differential.edits.length ?? report.editSpans,
          layoutOnly: report.layoutOnly,
          session: cliCacheDir(),
        }),
      )
      meta(d('status.stored', { id: cacheId, kind: product ? 'patch' : 'delta' }))
    } else if (product) {
      meta(
        d('meta.patch', {
          edits: product.differential.edits.length,
          store: product.store,
          layoutOnly: product.narrative.layoutOnly,
          applyTarget: product.applyTarget,
        }),
      )
    } else {
      meta(
        d('meta.header', {
          identity: report.identity,
          layoutOnly: report.layoutOnly,
          lexOps: report.lex.structuralOps,
          brace: report.ast.brace.severity,
          nest: report.ast.nest.skeletonEqual ? 'eq' : 'moved',
          labels: report.ast.nest.labelsEqual ? 'eq' : 'moved',
        }),
      )
    }
  }

  if (product) console.log(formatPatchSpw(product))
  console.log(formatChangeReportSpw(report))
}
