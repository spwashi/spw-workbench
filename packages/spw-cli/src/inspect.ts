/**
 * spw inspect — hooks into runtime cache, collate bank, medium, and memory planes.
 *
 * effect.l0.measure only. Names the retention *plane* so "cache" is not one word.
 *
 * @see docs/theory/spw/cache-field.spw
 * @see packages/spw-runtime/src/state/memory-cache.ts
 * @see packages/spw-cli/src/session/workspace-cache.ts
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  extractBraceProjection,
  inspectGeometry,
  parse,
  scanNestPaths,
  scanAppositions,
  appositionSpectrum,
  PARSE_EVENT_POLICIES,
  SOURCE_PRODUCT_DEPTHS,
  type ParseEventPolicy,
  type SourceProductDepth,
} from '@spwashi/spw-seed'
import {
  createHotSession,
  evaluateCompositionSource,
  formatRuntimeMediumSpw,
  resolveRuntimeMedium,
  resolveChannelPolicy,
  CHANNEL_POLICIES,
  type StabilityChannel,
} from '@spwashi/spw-runtime'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'
import {
  cliCacheDir,
  formatCliCacheIndexSpw,
  listCliCache,
  getCliCacheEntry,
} from './session/workspace-cache'
import {
  getCorpusMemoStats,
  listDiskCorpusMemos,
  resetCorpusMemo,
  corpusMemoDir,
} from './corpus-memo'
import { scanCorpus } from './corpus-scan'
import { emitDetail, emitHeader, emitNext, formatTable, setMetaQuiet } from './view'
import { runSpwMemCli } from './mem'
import { formatCorpusProductSpw } from '@spwashi/spw-seed'
import { runSpacingInspection } from './inspect-spacing'
import { runSourceInspection } from './inspect-source'

type InspectMode =
  | 'cache'
  | 'bank'
  | 'medium'
  | 'session'
  | 'memory'
  | 'static'
  | 'corpus'
  | 'compose'
  | 'source'
  | 'spacing'
  | 'help'

interface InspectArgs {
  mode: InspectMode
  targets: string[]
  json: boolean
  ndjson: boolean
  quiet: boolean
  help: boolean
  channel: string
  dialect?: string
  beats: number
  recompute: boolean
  showSpw: boolean
  limit: number
  eventPolicy: ParseEventPolicy
  product: SourceProductDepth
}

function parseArgs(argv: string[]): InspectArgs {
  const raw = argv[0] === 'inspect' ? argv.slice(1) : argv
  const parsed: InspectArgs = {
    mode: 'help',
    targets: [],
    json: false,
    ndjson: false,
    quiet: false,
    help: false,
    channel: 'trial',
    beats: 0,
    recompute: false,
    showSpw: false,
    limit: 24,
    eventPolicy: 'diagnostics',
    product: 'structure',
  }

  const modes = new Set<string>([
    'cache',
    'bank',
    'medium',
    'session',
    'memory',
    'static',
    'corpus',
    'compose',
    'source',
    'spacing',
    'help',
  ])

  for (let i = 0; i < raw.length; i++) {
    const a = raw[i]!
    if (a === '--help' || a === '-h') {
      parsed.help = true
      continue
    }
    if (a === '--json') {
      parsed.json = true
      continue
    }
    if (a === '--ndjson') {
      parsed.ndjson = true
      continue
    }
    if (a === '--quiet' || a === '-q') {
      parsed.quiet = true
      continue
    }
    if (a === '--spw') {
      parsed.showSpw = true
      continue
    }
    if (a === '--recompute') {
      parsed.recompute = true
      continue
    }
    if (a === '--channel') {
      parsed.channel = raw[++i] ?? 'trial'
      continue
    }
    if (a.startsWith('--channel=')) {
      parsed.channel = a.slice('--channel='.length) || 'trial'
      continue
    }
    if (a === '--dialect') {
      parsed.dialect = raw[++i]
      continue
    }
    if (a.startsWith('--dialect=')) {
      parsed.dialect = a.slice('--dialect='.length)
      continue
    }
    if (a === '--beats') {
      parsed.beats = Math.max(0, Number(raw[++i] ?? 0) || 0)
      continue
    }
    if (a.startsWith('--beats=')) {
      parsed.beats = Math.max(0, Number(a.slice('--beats='.length)) || 0)
      continue
    }
    if (a === '--limit' || a === '-n') {
      parsed.limit = Math.max(1, Number(raw[++i] ?? 24) || 24)
      continue
    }
    if (a.startsWith('--limit=')) {
      parsed.limit = Math.max(1, Number(a.slice('--limit='.length)) || 24)
      continue
    }
    if (a === '--event-policy') {
      const policy = raw[++i]
      if (!policy || !PARSE_EVENT_POLICIES.includes(policy as ParseEventPolicy)) {
        throw new Error('spw inspect: --event-policy must be none|diagnostics|trace')
      }
      parsed.eventPolicy = policy as ParseEventPolicy
      continue
    }
    if (a.startsWith('--event-policy=')) {
      const policy = a.slice('--event-policy='.length)
      if (!PARSE_EVENT_POLICIES.includes(policy as ParseEventPolicy)) {
        throw new Error('spw inspect: --event-policy must be none|diagnostics|trace')
      }
      parsed.eventPolicy = policy as ParseEventPolicy
      continue
    }
    if (a === '--product') {
      const product = raw[++i]
      if (!product || !SOURCE_PRODUCT_DEPTHS.includes(product as SourceProductDepth)) {
        throw new Error('spw inspect: --product must be tokens|structure|trace')
      }
      parsed.product = product as SourceProductDepth
      continue
    }
    if (a.startsWith('--product=')) {
      const product = a.slice('--product='.length)
      if (!SOURCE_PRODUCT_DEPTHS.includes(product as SourceProductDepth)) {
        throw new Error('spw inspect: --product must be tokens|structure|trace')
      }
      parsed.product = product as SourceProductDepth
      continue
    }
    if (!a.startsWith('-') && modes.has(a) && parsed.mode === 'help' && parsed.targets.length === 0) {
      parsed.mode = a as InspectMode
      continue
    }
    if (!a.startsWith('-')) {
      parsed.targets.push(a)
      continue
    }
    throw new Error(`spw inspect: unknown flag ${a}`)
  }

  // Bare file → static+cache sample when no mode word
  if (parsed.mode === 'help' && parsed.targets.length > 0 && !parsed.help) {
    parsed.mode = 'static'
  }
  if (parsed.ndjson && (parsed.json || parsed.showSpw)) {
    throw new Error('spw inspect: --ndjson cannot be combined with --json or --spw')
  }
  if (parsed.ndjson && parsed.mode !== 'source') {
    throw new Error('spw inspect: --ndjson is currently available for inspect source')
  }
  return parsed
}

export function printInspectHelp(): void {
  printHelpPage({
    title: 'Spw Inspect — source / product / runtime planes',
    usage: [
      'spw inspect cache <file.spw> [--channel trial] [--beats 2] [--json]',
      'spw inspect bank [--json] [--spw]',
      'spw inspect medium [--channel trial] [--dialect Spw.b] [--spw]',
      'spw inspect session <file.spw> [--beats 1] [--recompute]',
      'spw inspect memory [--json]',
      'spw inspect static <file.spw>',
      'spw inspect source <file.spw> [--product tokens|structure|trace] [--spw|--json|--ndjson]',
      'spw inspect spacing <file.spw> [--event-policy diagnostics] [--spw|--json]',
      'spw inspect corpus [roots...]',
      'spw inspect compose \'<file>@"appendix.spw"?\'',
      'spw inspect compose \'!{ do } ~<consequence>\'',
      'spw inspect compose \'?{ ask } ~<answer>\'',
    ],
    sections: [
      {
        title: 'Planes',
        lines: [
          'cache     beat_evaluate + beat_inspect (HotRuntimeSession)',
          'bank      collate products (delta/patch/stencil) under gen/session/cli-cache',
          'corpus    population + topography memo (mtime fingerprint)',
          'compose   geometric composition: conceptual probe / act|probe→membrane',
          'medium    RuntimeMedium matrix (channel × dialect)',
          'session   prepare/parse/inspect receipt + hit flags',
          'memory    durable fs dumps (spw mem status)',
          'static    parse + brace + nest summary',
          'source    progressive tokens → structure → trace intermediate products',
          'spacing   exact lexical gaps + tight identifier segments (observational)',
          'Theory: docs/theory/spw/cache-field.spw · composition-forms',
        ],
      },
      {
        title: 'Compose silhouettes',
        lines: [
          '<file>@"lens.spw"?     eval lens within host membrane space',
          '!{…} ~<name>           discharge then potential membrane (not PathRef)',
          '?{…} ~<name>           probe then potential membrane',
          '(!{…}) / (?{…})        same under observation scope ()',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--channel <id>   stability channel (default trial)',
          '--dialect <id>   force dialect for medium / session',
          '--beats N        tick session beat before re-sample',
          '--recompute      bypass evaluate / wipe corpus memo',
          '--limit / -n     bank / static / corpus / source / spacing row width',
          '--product        tokens | structure | trace (source; default structure)',
          '--event-policy   none | diagnostics | trace (source/spacing; default diagnostics)',
          '--spw            dual-read cards where available',
          '--json           machine envelope',
          '--ndjson         emit source stages as soon as each becomes available',
          '--quiet / -q     suppress headers',
        ],
      },
      {
        title: 'Examples',
        lines: [
          'spw inspect compose \'<file>@"appendix.spw"?\'',
          'spw inspect compose \'?{ ask } ~<answer>\'',
          'spw inspect corpus docs/runtime',
          'spw census docs/runtime -n 8',
          'spw inspect cache docs/theory/spw/cache-field.spw',
          'spw inspect source docs/index.spw --product structure --spw',
          'spw inspect spacing docs/index.spw --spw',
        ],
      },
    ],
  })
}

export async function runSpwInspectCli(argv: string[] = process.argv): Promise<void> {
  let args: InspectArgs
  try {
    args = parseArgs(argv.slice(2))
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 1
    return
  }

  if (args.help || args.mode === 'help') {
    printInspectHelp()
    return
  }

  setMetaQuiet(args.quiet)

  switch (args.mode) {
    case 'bank':
      await runBank(args)
      break
    case 'cache':
      await runCache(args)
      break
    case 'medium':
      runMedium(args)
      break
    case 'session':
      await runSession(args)
      break
    case 'memory':
      await runSpwMemCli(['node', 'mem', 'status', ...(args.json ? ['--json'] : [])])
      break
    case 'static':
      await runStatic(args)
      break
    case 'corpus':
      await runCorpus(args)
      break
    case 'compose':
      await runCompose(args)
      break
    case 'source': {
      const file = args.targets[0]
      if (!file || args.targets.length > 1) {
        console.error('spw inspect source: pass exactly one .spw file')
        process.exitCode = 1
        break
      }
      await runSourceInspection({
        file,
        product: args.product,
        eventPolicy: args.eventPolicy,
        json: args.json,
        ndjson: args.ndjson,
        showSpw: args.showSpw,
        limit: args.limit,
      })
      break
    }
    case 'spacing': {
      const file = args.targets[0]
      if (!file || args.targets.length > 1) {
        console.error('spw inspect spacing: pass exactly one .spw file')
        process.exitCode = 1
        break
      }
      await runSpacingInspection({
        file,
        json: args.json,
        showSpw: args.showSpw,
        limit: args.limit,
        eventPolicy: args.eventPolicy,
      })
      break
    }
    default:
      printInspectHelp()
      process.exitCode = 1
  }
}

async function runBank(args: InspectArgs): Promise<void> {
  const entries = listCliCache()
  const session = cliCacheDir()
  emitHeader('inspect', {
    plane: 'collate_bank',
    n: entries.length,
    session,
  })

  if (args.json) {
    console.log(
      formatJsonEnvelope('inspect.bank', entries, {
        session,
        plane: 'collate_bank',
      }),
    )
    return
  }

  if (args.showSpw) {
    console.log(formatCliCacheIndexSpw(entries, { session }))
    return
  }

  if (!entries.length) {
    emitDetail('(empty bank — pulse --stamp or delta --cache first)')
    emitNext('spw pulse <file> --stamp', 'spw delta a.spw b.spw --cache')
    return
  }

  console.log(
    formatTable(
      ['id', 'kind', 'layout', 'edits', 'before', 'note'],
      entries.slice(0, args.limit).map(e => [
        e.id,
        e.kind,
        e.layoutOnly ? 'yes' : '—',
        String(e.editCount ?? 0),
        e.beforePath ?? '—',
        (e.note ?? '').slice(0, 40),
      ]),
    ),
  )
  if (entries.length > args.limit) {
    emitDetail(`… ${entries.length - args.limit} more (raise --limit)`)
  }

  const first = getCliCacheEntry(entries[0]!.id)
  if (first?.dualReadSpw && !args.quiet) {
    emitDetail(`show: dual-read at ${path.join(session, entries[0]!.id + '.spw')}`)
  }
  emitNext('spw mutate --from <stencil-id> <targets>', 'spw delta --show <id>')
}

async function runCache(args: InspectArgs): Promise<void> {
  const file = args.targets[0]
  if (!file) {
    console.error('spw inspect cache: pass a .spw file to sample evaluate/inspect planes')
    process.exitCode = 1
    return
  }
  const abs = path.resolve(file)
  const source = await fs.readFile(abs, 'utf8')
  const rel = path.relative(process.cwd(), abs) || abs
  const channel = args.channel as StabilityChannel
  const session = createHotSession({ channel })

  if (args.beats > 0) session.tick(args.beats)

  const first = session.evaluate(source, {
    path: rel,
    dialect: args.dialect as never,
    recompute: args.recompute,
  })
  // Second evaluate exercises hit path
  const second = session.evaluate(source, {
    path: rel,
    dialect: args.dialect as never,
    recompute: false,
  })
  const inspect1 = session.inspect(source, { path: rel })
  const inspect2 = session.inspect(source, { path: rel })

  const stats = session.cacheStats()
  const policy = resolveChannelPolicy(channel)

  const payload = {
    plane: 'beat_evaluate+beat_inspect',
    file: rel,
    channel,
    channelTier: policy.cacheDefaultTier,
    beat: session.currentBeat(),
    firstHit: first.cacheHit,
    secondHit: second.cacheHit,
    inspectHit1: inspect1.cacheHit,
    inspectHit2: inspect2.cacheHit,
    contentHash: first.contentHash,
    dialect: first.prepared.stack.dialect,
    stats,
  }

  emitHeader('inspect', {
    plane: 'beat_cache',
    file: rel,
    channel,
    beat: payload.beat,
    hit1: first.cacheHit,
    hit2: second.cacheHit,
  })

  if (args.json) {
    console.log(formatJsonEnvelope('inspect.cache', payload))
    return
  }

  emitDetail(
    `evaluate  size=${stats.evaluate?.size ?? stats.size} hits=${stats.evaluate?.hits ?? stats.hits} misses=${stats.evaluate?.misses ?? stats.misses}`,
  )
  if (stats.inspect) {
    emitDetail(
      `inspect   size=${stats.inspect.size} hits=${stats.inspect.hits} misses=${stats.inspect.misses}`,
    )
  }
  emitDetail(
    `tiers     hot=${stats.byTier?.hot ?? stats.evaluate?.byTier?.hot ?? 0} warm=${stats.byTier?.warm ?? stats.evaluate?.byTier?.warm ?? 0} cold=${stats.byTier?.cold ?? stats.evaluate?.byTier?.cold ?? 0}`,
  )
  emitDetail(`hash      ${String(first.contentHash).slice(0, 16)}…  dialect=${payload.dialect}`)
  emitDetail(`policy    defaultTier=${policy.cacheDefaultTier}  ${policy.note ?? ''}`)
  emitNext('spw inspect session ' + rel, 'spw inspect medium --channel ' + channel)
}

function runMedium(args: InspectArgs): void {
  const channel = args.channel as StabilityChannel
  const dialect = args.dialect ?? 'Spw.b'
  const medium = resolveRuntimeMedium(channel, dialect)

  emitHeader('inspect', {
    plane: 'medium',
    channel,
    dialect,
    allowed: medium.dialectAllowed,
    ceiling: medium.effectCeiling,
  })

  if (args.json) {
    console.log(formatJsonEnvelope('inspect.medium', medium))
    return
  }

  if (args.showSpw) {
    console.log(formatRuntimeMediumSpw(medium))
    return
  }

  emitDetail(`allowed=${medium.dialectAllowed}  collateOnly=${medium.collateOnly}`)
  emitDetail(`ceiling=${medium.effectCeiling}  cacheTier=${medium.productCacheTier}`)
  emitDetail(`grain depth=${medium.defaultDepth} plane=${medium.defaultPlane} follow=${medium.maxFollowDefault}`)
  if (medium.note) emitDetail(medium.note)
  emitDetail(`channels  ${Object.keys(CHANNEL_POLICIES).join(' ')}`)
  emitNext('spw inspect cache <file> --channel ' + channel)
}

async function runSession(args: InspectArgs): Promise<void> {
  const file = args.targets[0]
  if (!file) {
    console.error('spw inspect session: pass a .spw file')
    process.exitCode = 1
    return
  }
  const abs = path.resolve(file)
  const source = await fs.readFile(abs, 'utf8')
  const rel = path.relative(process.cwd(), abs) || abs
  const session = createHotSession({ channel: args.channel as StabilityChannel })
  if (args.beats > 0) session.tick(args.beats)

  const evalRec = session.evaluate(source, {
    path: rel,
    dialect: args.dialect as never,
    recompute: args.recompute,
  })
  const parsed = parse(source, { path: rel })
  const geom = inspectGeometry(source)
  const brace = extractBraceProjection(source)
  const nest = scanNestPaths(source)
  const stats = session.cacheStats()

  const card = {
    plane: 'session',
    file: rel,
    channel: args.channel,
    beat: session.currentBeat(),
    cacheHit: evalRec.cacheHit,
    contentHash: evalRec.contentHash,
    dialect: evalRec.prepared.stack.dialect,
    parseOk: parsed.success,
    parseErrors: parsed.errors?.length ?? 0,
    maxDepth: geom.nesting.maxDepth,
    braceSignature: brace.signature.slice(0, 32),
    nestSkeleton: nest.skeleton.slice(0, 48),
    phraseCounts: evalRec.phraseCounts,
    lessons: geom.lessons?.slice(0, 4) ?? [],
    cache: stats,
  }

  emitHeader('inspect', {
    plane: 'session',
    file: rel,
    hit: evalRec.cacheHit,
    parse: parsed.success,
    beat: card.beat,
  })

  if (args.json) {
    console.log(formatJsonEnvelope('inspect.session', card))
    return
  }

  emitDetail(`dialect   ${card.dialect ?? '—'}  hash=${String(card.contentHash).slice(0, 12)}`)
  emitDetail(
    `parse     ok=${card.parseOk} errors=${card.parseErrors}  depth=${card.maxDepth}`,
  )
  emitDetail(`brace     ${card.braceSignature}…`)
  emitDetail(`nest      ${card.nestSkeleton || '(empty)'}`)
  if (card.phraseCounts && Object.keys(card.phraseCounts).length) {
    const top = Object.entries(card.phraseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => `${k}×${v}`)
      .join(' ')
    emitDetail(`phrases   ${top}`)
  }
  for (const lesson of card.lessons) {
    emitDetail(`lesson    ${lesson}`)
  }
  const ev = stats.evaluate ?? stats
  emitDetail(`cache     eval hits=${ev.hits} misses=${ev.misses} size=${ev.size}`)
  emitNext('spw form ' + rel + ' --static --resonance', 'spw cycle --before ' + rel)
}

async function runStatic(args: InspectArgs): Promise<void> {
  const files = args.targets.length ? args.targets : []
  if (!files.length) {
    console.error('spw inspect static: pass one or more .spw files')
    process.exitCode = 1
    return
  }

  const rows: Array<Record<string, unknown>> = []
  for (const t of files.slice(0, args.limit)) {
    const abs = path.resolve(t)
    let source: string
    try {
      source = await fs.readFile(abs, 'utf8')
    } catch (e) {
      rows.push({ file: t, error: e instanceof Error ? e.message : String(e) })
      continue
    }
    const rel = path.relative(process.cwd(), abs) || abs
    const parsed = parse(source, { path: rel })
    const geom = inspectGeometry(source)
    const brace = extractBraceProjection(source)
    const nest = scanNestPaths(source)
    const app = scanAppositions(source)
    const spectrum = appositionSpectrum(app)
    const issues: string[] = []
    if (!parsed.success) issues.push(`parse_errors=${parsed.errors?.length ?? 1}`)
    if (geom.nesting.openBalance !== 0) {
      issues.push(`unbalanced=${geom.nesting.openBalance}`)
    }
    if (geom.lessons?.length) {
      issues.push(geom.lessons[0]!.slice(0, 40))
    }

    rows.push({
      file: rel,
      parseOk: parsed.success,
      depth: geom.nesting.maxDepth,
      braces: brace.signature.slice(0, 20),
      nestLen: nest.skeleton.length,
      cells: spectrum.total,
      named: spectrum.named,
      issues: issues.join('; ') || '—',
    })
  }

  emitHeader('inspect', {
    plane: 'static',
    files: rows.length,
  })

  if (args.json) {
    console.log(formatJsonEnvelope('inspect.static', rows))
    return
  }

  console.log(
    formatTable(
      ['file', 'parse', 'depth', 'nest', 'cells', 'issues'],
      rows.map(r => [
        String(r.file),
        r.parseOk === false ? 'fail' : r.error ? 'err' : 'ok',
        String(r.depth ?? '—'),
        String(r.nestLen ?? '—'),
        String(r.cells ?? '—'),
        String(r.issues ?? '—').slice(0, 48),
      ]),
    ),
  )
  emitNext('spw form <file> --resonance', 'spw inspect session <file>')
}

async function runCorpus(args: InspectArgs): Promise<void> {
  const roots = args.targets.length ? args.targets : ['.spw']
  // Optional wipe: --recompute clears memo first
  if (args.recompute) resetCorpusMemo({ disk: true })

  const first = await scanCorpus({ roots, hubTop: 12 })
  const second = await scanCorpus({ roots, hubTop: 12 })
  const memo = getCorpusMemoStats()
  const disk = listDiskCorpusMemos()

  emitHeader('inspect', {
    plane: 'corpus_scan_memo',
    memo1: first.memoPlane,
    memo2: second.memoPlane,
    files: first.product.stats.files,
    fp: first.product.fingerprint.slice(0, 12),
  })

  if (args.json) {
    console.log(
      formatJsonEnvelope('inspect.corpus', {
        product: first.product,
        secondPlane: second.memoPlane,
        memo,
        disk,
      }),
    )
    return
  }

  if (args.showSpw) {
    console.log(formatCorpusProductSpw(first.product))
    return
  }

  emitDetail(
    `product   files=${first.product.stats.files} lines=${first.product.stats.lines} links=${first.product.topography.links} cyclic=${first.product.topography.cyclic}`,
  )
  emitDetail(
    `memo      memory hits=${memo.memoryHits} misses=${memo.memoryMisses} disk hits=${memo.diskHits} writes=${memo.diskWrites}`,
  )
  emitDetail(`session   ${corpusMemoDir()}`)
  emitDetail(
    `roles     ${Object.entries(first.product.stats.byRole)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ')}`,
  )
  if (disk.length) {
    emitDetail(`disk n=${disk.length} latest=${disk[0]?.fingerprint.slice(0, 12)}…`)
  }
  emitNext('spw census ' + roots.join(' '), 'spw graph ' + roots.join(' '))
}

async function runCompose(args: InspectArgs): Promise<void> {
  // Expr is remaining targets joined (shell-quoted surface form)
  const source = args.targets.join(' ').trim()
  if (!source) {
    console.error(
      'spw inspect compose: pass a surface form, e.g. \'<file>@"appendix.spw"?\' or \'?{ ask } ~<answer>\'',
    )
    process.exitCode = 1
    return
  }

  emitHeader('inspect', {
    plane: 'compose',
    channel: args.channel,
  })

  const result = await evaluateCompositionSource(source, {
    cwd: process.cwd(),
    channel: args.channel as StabilityChannel,
  })

  if (!result) {
    emitDetail('not a recognized composition silhouette')
    emitDetail('try: <host>@"lens.spw"?  |  !{…} ~<name>  |  ?{…} ~<name>')
    process.exitCode = 1
    return
  }

  if (args.json) {
    console.log(
      formatJsonEnvelope('inspect.compose', {
        ok: result.ok,
        kind: result.form.kind,
        product: result.product,
        findings: result.findings,
        hostPath: result.hostPath,
        lensPath: result.lensPath,
        hostDialect: result.hostDialect,
        lensParseOk: result.lensParseOk,
        cacheHit: result.cacheHit,
      }),
    )
    return
  }

  // Default dual-read card + findings
  console.log(result.dualReadSpw)
  console.log('')
  for (const f of result.findings) {
    emitDetail(f)
  }
  if (result.hostPath) emitDetail(`host  ${result.hostPath}`)
  if (result.lensPath) emitDetail(`lens  ${result.lensPath}`)
  if (result.hostDialect) emitDetail(`dialect  ${result.hostDialect}`)
  if (!result.ok) process.exitCode = 1
  emitNext(
    'spw inspect compose \'!{ do } ~<out>\'',
    'spw inspect session <file>',
  )
}
