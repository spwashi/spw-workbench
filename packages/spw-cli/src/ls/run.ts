import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parseArgs, printHelp } from './args'
import { modelHints, payloadSummary } from './constants'
import { evaluateProbeInBlocks, parseProbeExpression } from './probe'
import {
  collectSpwFiles,
  extractBraceStream,
  extractLabelStats,
  extractRegisterState,
  normalizeBraces,
  orderedStats,
  parseOperatorQuery,
  selectOperatorStream,
  selectStats,
  setStats,
} from './scan'
import type { EquivMode, FileResult, MatchMode, ProbePattern, SequenceProbeStats, SurfaceMode } from './types'

async function analyzeFile(
  filePath: string,
  queryOps: string[],
  queryBraces: string[],
  requiredLabels: string[],
  strict: boolean,
  mode: MatchMode,
  surface: SurfaceMode,
  equivMode: EquivMode,
  probe: ProbePattern | null,
  probeWindow: number,
): Promise<FileResult | null> {
  const source = await fs.readFile(filePath, 'utf8').catch(() => null)
  if (source === null) return null

  const rawOpStream = selectOperatorStream(source, surface)
  const braceStream = extractBraceStream(source)
  const registerState = extractRegisterState(source)
  const opStream = registerState.danglingCount > 0
    ? [...rawOpStream, { token: '&dangling', offset: source.length }]
    : rawOpStream

  const opOrdered = orderedStats(opStream, queryOps, equivMode)
  const opSet = setStats(opStream, queryOps, equivMode)
  const opEffective = selectStats(opOrdered, opSet, mode)

  const braceOrdered = orderedStats(braceStream, queryBraces, equivMode)
  const braceSet = setStats(braceStream, queryBraces, equivMode)
  const braceEffective = selectStats(braceOrdered, braceSet, mode)

  const labelStats = extractLabelStats(source)
  const requiredSet = new Set(requiredLabels.filter(Boolean))
  const presentSet = new Set(labelStats.labels)
  const requiredCount = requiredSet.size
  let present = 0
  for (const label of requiredSet) {
    if (presentSet.has(label)) present += 1
  }
  const labelCoverage = requiredCount > 0 ? present / requiredCount : 0

  if (requiredCount > 0 && labelCoverage === 0) return null

  let probeStats: SequenceProbeStats | null = null
  if (probe) {
    probeStats = evaluateProbeInBlocks(source, opStream, braceStream, queryOps, probe, probeWindow, equivMode)
  }

  if (strict) {
    if (queryOps.length > 0 && !opEffective.strictHit) return null
    if (queryBraces.length > 0 && !braceEffective.strictHit) return null
    if (requiredCount > 0 && labelCoverage < 1) return null
    if (probeStats && probeStats.sequenceHits === 0) return null
  } else {
    const anySignal =
      (queryOps.length > 0 && opEffective.matched > 0) ||
      (queryBraces.length > 0 && braceEffective.matched > 0) ||
      (requiredCount > 0 && labelCoverage > 0) ||
      (probeStats !== null && probeStats.sequenceHits > 0)
    if (!anySignal) return null
  }

  const coverageParts: number[] = []
  if (queryOps.length > 0) coverageParts.push(opEffective.coverage)
  if (queryBraces.length > 0) coverageParts.push(braceEffective.coverage)
  if (requiredCount > 0) coverageParts.push(labelCoverage)
  if (probeStats) coverageParts.push(probeStats.value)

  const overallCoverage = coverageParts.length > 0
    ? coverageParts.reduce((sum, value) => sum + value, 0) / coverageParts.length
    : 0

  return {
    file: filePath,
    opStreamLength: rawOpStream.length,
    braceStreamLength: braceStream.length,
    opOrdered,
    opSet,
    opEffective,
    braceOrdered,
    braceSet,
    braceEffective,
    labels: labelStats.labels,
    labelCoverage,
    labelOperatorCount: labelStats.operatorCount,
    labelBracePairCount: labelStats.bracePairCount,
    registerDanglingCount: registerState.danglingCount,
    registerDanglingTokens: registerState.danglingTokens,
    danglingReferenceAvailable: registerState.danglingCount > 0,
    overallCoverage,
    strictHit:
      (queryOps.length === 0 || opEffective.strictHit) &&
      (queryBraces.length === 0 || braceEffective.strictHit) &&
      (requiredCount === 0 || labelCoverage === 1) &&
      (probeStats === null || probeStats.sequenceHits > 0),
    probe: probeStats,
    opPreview: rawOpStream.slice(0, 80).map((cell) => cell.token).join(''),
    bracePreview: braceStream.slice(0, 80).map((cell) => cell.token).join(''),
  }
}

function rank(results: FileResult[]): FileResult[] {
  return [...results].sort((a, b) => {
    const probeA = a.probe?.value ?? -1
    const probeB = b.probe?.value ?? -1
    const byProbe = probeB - probeA
    if (byProbe !== 0) return byProbe

    const byCoverage = b.overallCoverage - a.overallCoverage
    if (byCoverage !== 0) return byCoverage

    const byStrict = Number(b.strictHit) - Number(a.strictHit)
    if (byStrict !== 0) return byStrict

    const byLabel = b.labelCoverage - a.labelCoverage
    if (byLabel !== 0) return byLabel

    const byOp = b.opEffective.matched - a.opEffective.matched
    if (byOp !== 0) return byOp

    const byBrace = b.braceEffective.matched - a.braceEffective.matched
    if (byBrace !== 0) return byBrace

    return a.file.localeCompare(b.file)
  })
}

export interface RunOptions {
  argv?: string[]
  entryName: string
  compatNotice?: boolean
}

export async function runSpwLsCli(options: RunOptions): Promise<void> {
  const args = parseArgs(options.argv ?? process.argv, options.entryName)
  const parsedOps = parseOperatorQuery(args.sequence)
  const queryOps = parsedOps.tokens
  const queryBraces = normalizeBraces(args.braces)

  const requiredLabels = new Set<string>()
  for (const label of parsedOps.inlineLabels) requiredLabels.add(label)
  if (args.label) requiredLabels.add(args.label)

  const probePattern = parseProbeExpression(args.probeExpr)

  if (args.probeExpr.trim() && probePattern === null) {
    console.error(`${options.entryName}: --probe must include at least one operator or brace token`)
    process.exit(1)
  }

  if (queryOps.length === 0 && queryBraces.length === 0 && requiredLabels.size === 0 && probePattern === null) {
    console.error(`${options.entryName}: provide --seq and/or --braces and/or --label and/or --probe`)
    printHelp(options.entryName)
    process.exit(1)
  }

  const filesSet = new Set<string>()
  for (const root of args.roots) {
    const files = await collectSpwFiles(root)
    for (const file of files) filesSet.add(file)
  }

  const files = Array.from(filesSet)
  if (files.length === 0) {
    console.error(`${options.entryName}: no .spw files found in roots`)
    process.exit(1)
  }

  const results: FileResult[] = []
  for (const file of files) {
    const item = await analyzeFile(
      file,
      queryOps,
      queryBraces,
      [...requiredLabels],
      args.strict,
      args.mode,
      args.surface,
      args.equiv,
      probePattern,
      args.probeWindow,
    )
    if (item) results.push(item)
  }

  const ranked = rank(results).slice(0, Math.max(1, args.top))
  const payload = payloadSummary(queryOps)
  const hints = modelHints(args.model)

  if (args.json) {
    console.log(JSON.stringify({
      selector_sequence: queryOps.join(''),
      braces: queryBraces.join(''),
      required_labels: [...requiredLabels],
      probe: probePattern
        ? {
          raw: probePattern.raw,
          canonical: probePattern.canonical,
          kind: probePattern.kind,
          tokens: probePattern.patternTokens,
          subjects: probePattern.subjects,
        }
        : null,
      probe_window: args.probeWindow,
      model: args.model,
      mode: args.mode,
      equiv: args.equiv,
      surface: args.surface,
      model_hints: hints,
      operator_payload: payload,
      roots: args.roots,
      scanned: files.length,
      returned: ranked.length,
      results: ranked.map((item) => ({
        ...item,
        file: path.relative(process.cwd(), item.file),
      })),
    }, null, 2))
    return
  }

  if (options.compatNotice) {
    console.log('note: spw:seq is compatibility mode; prefer spw:ls for liminal selection + probe workflows')
  }

  console.log(`selector_sequence: ${queryOps.join('') || '(none)'}`)
  console.log(`braces: ${queryBraces.join('') || '(none)'}`)
  console.log(`required_labels: ${[...requiredLabels].join(', ') || '(none)'}`)
  console.log(`probe: ${probePattern ? `${probePattern.raw} [${probePattern.kind}]` : '(none)'}`)
  if (probePattern && probePattern.canonical !== probePattern.raw) {
    console.log(`probe_canonical: ${probePattern.canonical}`)
  }
  if (probePattern && probePattern.subjects.length > 0) {
    console.log(`probe_subjects: ${probePattern.subjects.join(', ')}`)
  }
  if (probePattern) console.log(`probe_window: ${args.probeWindow}`)
  console.log(`surface: ${args.surface}`)
  console.log(`mode: ${args.mode}`)
  console.log(`equiv: ${args.equiv}`)
  console.log(`model: ${args.model}`)
  for (const hint of hints) {
    console.log(`model_hint: ${hint}`)
  }
  for (const line of payload) {
    console.log(`payload: ${line}`)
  }

  console.log(`scanned: ${files.length}, returned: ${ranked.length}`)
  for (const item of ranked) {
    const rel = path.relative(process.cwd(), item.file)
    const overallPct = (item.overallCoverage * 100).toFixed(1)
    const opPct = (item.opEffective.coverage * 100).toFixed(1)
    const bracePct = (item.braceEffective.coverage * 100).toFixed(1)
    const labelPct = (item.labelCoverage * 100).toFixed(1)
    const probePct = item.probe ? `${(item.probe.value * 100).toFixed(1)}%` : 'n/a'
    const probeSignal = item.probe
      ? ` probe=${item.probe.pattern} seq=${item.probe.sequenceHits} prime=${item.probe.conceptPriming.toFixed(2)} realize=${item.probe.realization.toFixed(2)} deferred=${item.probe.deferred.toFixed(2)} spin=${item.probe.spin.toFixed(2)} gap=${item.probe.collapseGap.toFixed(2)}`
      : ''
    const registerSignal = ` reg=${item.registerDanglingCount}${item.danglingReferenceAvailable ? '(&dangling)' : ''}`

    console.log(
      `${rel}\toverall=${overallPct}%\top=${item.opEffective.matched}/${queryOps.length || 0}(${opPct}%)\tbrace=${item.braceEffective.matched}/${queryBraces.length || 0}(${bracePct}%)\tlabels=${labelPct}%\tpairs=${item.labelBracePairCount}\tprobeScore=${probePct}\tstrict=${item.strictHit}${registerSignal}${probeSignal}`,
    )
  }
}
