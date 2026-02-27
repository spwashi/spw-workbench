#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parse, spwq, ANY } from '../src/seed'

type SurfaceMode = 'ast' | 'raw' | 'hybrid'
type MatchMode = 'ordered' | 'set' | 'hybrid'

interface CliArgs {
  sequence: string
  braces: string
  roots: string[]
  top: number
  strict: boolean
  json: boolean
  model: string
  label: string
  surface: SurfaceMode
  mode: MatchMode
  probeOp: string
  probeWindow: number
}

interface SequenceCell {
  token: string
  offset: number
}

interface MatchStats {
  matched: number
  coverage: number
  strictHit: boolean
}

interface OperatorProbeStats {
  sequenceHits: number
  blockHits: number
  immediateHits: number
  immediateOpportunities: number
  downstreamHits: number
  downstreamOpportunities: number
  immediateRate: number
  downstreamRate: number
  support: number
  value: number
}

interface FileResult {
  file: string
  opStreamLength: number
  braceStreamLength: number
  opOrdered: MatchStats
  opSet: MatchStats
  opEffective: MatchStats
  braceOrdered: MatchStats
  braceSet: MatchStats
  braceEffective: MatchStats
  labels: string[]
  labelCoverage: number
  labelOperatorCount: number
  labelBracePairCount: number
  overallCoverage: number
  strictHit: boolean
  probe: OperatorProbeStats | null
  opPreview: string
  bracePreview: string
}

interface OperatorPayload {
  role: string
  physics: string
  tuning: string
}

interface BlockRange {
  start: number
  end: number
}

const OPERATOR_SET = new Set(['^', '!', '?', '~', '@', '&', '*', '=', '%', '#', '.', '$', '_'])
const BRACE_SET = new Set(['(', ')', '[', ']', '{', '}', '<', '>'])
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'release'])

const OPERATOR_PAYLOADS: Record<string, OperatorPayload> = {
  '?': { role: 'probe', physics: 'measurement onset', tuning: 'increase sampling density around high-drift zones' },
  '~': { role: 'potential', physics: 'superposition defer', tuning: 'delay collapse until ambiguity drops below threshold' },
  '@': { role: 'observer', physics: 'perspective push', tuning: 'cache scope-local reads aggressively (hot tier)' },
  '&': { role: 'merge', physics: 'entanglement/composition', tuning: 'cluster before merge to reduce coupling pressure' },
  '*': { role: 'collapse', physics: 'materialization', tuning: 'materialize selected projections only' },
  '^': { role: 'integrate', physics: 'upward emission', tuning: 'commit invariant summaries; avoid full replay' },
  '!': { role: 'action', physics: 'kinetic injection', tuning: 'gate effects behind deterministic spell macros' },
  '=': { role: 'constraint', physics: 'bias field', tuning: 'stabilize noisy branches with explicit bounds' },
  '%': { role: 'measure', physics: 'scalar observation', tuning: 'promote repeated measures into cached aggregates' },
  '#': { role: 'annotation', physics: 'resonance tag', tuning: 'use anchors/lenses to reduce lookup entropy' },
  '.': { role: 'ground', physics: 'reference state', tuning: 'ground refs early for replayability' },
  '$': { role: 'selector', physics: 'addressing potential', tuning: 'normalize selector forms to improve cache hit rate' },
  '_': { role: 'intrinsic', physics: 'identity/core register', tuning: 'carry stable label identity across transforms' },
}

const MODEL_HINTS: Record<string, string[]> = {
  fluid: [
    'optimize for flow continuity: prefer broad coverage over strict adjacency',
    'treat invalidation as turbulence; smooth via warm-tier aggregation',
  ],
  lattice: [
    'optimize for stable adjacency: maximize brace consistency and local symmetry',
    'reduce long-range coupling by strengthening local projection cells',
  ],
  thermal: [
    'optimize for energy minimization: collapse high-entropy branches sooner',
    'route repeated queries through low-temperature stable paths',
  ],
  quantum: [
    'optimize for deferred commitment: keep alternatives until measure fires',
    'track observer effect in trace before materialization',
  ],
}

function printHelp(): void {
  console.log(`
Spw Operator/Brace Sequence Query

Usage:
  node --import tsx scripts/spw-seq.ts --seq '?~@&*^' [--probe-op '&'] [--probe-window 12] [--braces '<>{}'] [--label query] [--surface hybrid] [--mode hybrid] [--root .spw] [--top 20] [--strict] [--model lattice] [--json]

Flags:
  --seq <sequence>      Operator sequence. Example: '?~@&*^' or '?_query'
  --braces <sequence>   Brace sequence. Example: '<>{}'
  --label <name>        Label filter (in addition to inline labels from --seq)
  --surface <mode>      Operator stream source: ast|raw|hybrid (default: hybrid)
  --mode <mode>         Match mode: ordered|set|hybrid (default: hybrid)
  --probe-op <op>       Probe operator value after sequence completion in blocks
  --probe-window <n>    Lookahead window for probe downstream score (default: 12)
  --root <path>         Root(s) to scan for .spw files (comma-separated)
  --top <n>             Max results to print (default: 20)
  --strict              Require full strict hit in selected match mode
  --model <name>        Optimization lens: fluid|lattice|thermal|quantum
  --json                Emit JSON output
`)
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2)
  const parsed: CliArgs = {
    sequence: '',
    braces: '',
    roots: ['.spw'],
    top: 20,
    strict: false,
    json: false,
    model: 'fluid',
    label: '',
    surface: 'hybrid',
    mode: 'hybrid',
    probeOp: '',
    probeWindow: 12,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }

    if (arg === '--seq') {
      parsed.sequence = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--seq=')) {
      parsed.sequence = arg.slice('--seq='.length)
      continue
    }

    if (arg === '--braces') {
      parsed.braces = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--braces=')) {
      parsed.braces = arg.slice('--braces='.length)
      continue
    }

    if (arg === '--label') {
      parsed.label = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--label=')) {
      parsed.label = arg.slice('--label='.length)
      continue
    }

    if (arg === '--surface') {
      const value = (args[i + 1] ?? 'hybrid').toLowerCase()
      if (value === 'ast' || value === 'raw' || value === 'hybrid') parsed.surface = value
      i += 1
      continue
    }
    if (arg.startsWith('--surface=')) {
      const value = arg.slice('--surface='.length).toLowerCase()
      if (value === 'ast' || value === 'raw' || value === 'hybrid') parsed.surface = value
      continue
    }

    if (arg === '--mode') {
      const value = (args[i + 1] ?? 'hybrid').toLowerCase()
      if (value === 'ordered' || value === 'set' || value === 'hybrid') parsed.mode = value
      i += 1
      continue
    }
    if (arg.startsWith('--mode=')) {
      const value = arg.slice('--mode='.length).toLowerCase()
      if (value === 'ordered' || value === 'set' || value === 'hybrid') parsed.mode = value
      continue
    }

    if (arg === '--probe-op') {
      parsed.probeOp = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--probe-op=')) {
      parsed.probeOp = arg.slice('--probe-op='.length)
      continue
    }

    if (arg === '--probe-window') {
      parsed.probeWindow = Number(args[i + 1] ?? '12') || 12
      i += 1
      continue
    }
    if (arg.startsWith('--probe-window=')) {
      parsed.probeWindow = Number(arg.slice('--probe-window='.length)) || 12
      continue
    }

    if (arg === '--root') {
      const value = args[i + 1] ?? ''
      parsed.roots = value.split(',').map((part) => part.trim()).filter(Boolean)
      i += 1
      continue
    }
    if (arg.startsWith('--root=')) {
      const value = arg.slice('--root='.length)
      parsed.roots = value.split(',').map((part) => part.trim()).filter(Boolean)
      continue
    }

    if (arg === '--top') {
      parsed.top = Number(args[i + 1] ?? '20') || 20
      i += 1
      continue
    }
    if (arg.startsWith('--top=')) {
      parsed.top = Number(arg.slice('--top='.length)) || 20
      continue
    }

    if (arg === '--strict') {
      parsed.strict = true
      continue
    }

    if (arg === '--json') {
      parsed.json = true
      continue
    }

    if (arg === '--model') {
      parsed.model = (args[i + 1] ?? 'fluid').toLowerCase()
      i += 1
      continue
    }
    if (arg.startsWith('--model=')) {
      parsed.model = arg.slice('--model='.length).toLowerCase()
      continue
    }
  }

  return parsed
}

function parseOperatorQuery(input: string): { tokens: string[]; inlineLabels: string[] } {
  const tokens: string[] = []
  const labels = new Set<string>()

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    if (!OPERATOR_SET.has(ch)) continue

    tokens.push(ch)

    if (ch === '_' || i + 1 >= input.length || input[i + 1] !== '_') continue

    let j = i + 2
    if (j >= input.length || !/[A-Za-z]/.test(input[j])) continue

    let label = input[j]
    j += 1
    while (j < input.length && /[A-Za-z0-9_-]/.test(input[j])) {
      label += input[j]
      j += 1
    }
    labels.add(label)
  }

  return { tokens, inlineLabels: [...labels] }
}

function normalizeBraces(input: string): string[] {
  return [...input].filter((ch) => BRACE_SET.has(ch))
}

async function collectSpwFiles(root: string): Promise<string[]> {
  const absRoot = path.resolve(root)
  const stat = await fs.stat(absRoot).catch(() => null)
  if (!stat) return []

  if (stat.isFile()) {
    return absRoot.endsWith('.spw') ? [absRoot] : []
  }

  if (!stat.isDirectory()) return []

  const out: string[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue
      const target = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(target)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.spw')) {
        out.push(target)
      }
    }
  }

  await walk(absRoot)
  return out
}

function extractAstOperatorStream(source: string): SequenceCell[] {
  const parsed = parse(source)
  if (!parsed.ast) return []

  const matches = spwq(parsed.ast, ANY)
  const ops: SequenceCell[] = []
  for (const match of matches) {
    if (match.node.type !== 'Operation') continue
    const op = (match.node as any).operator?.value as string | undefined
    if (!op || !OPERATOR_SET.has(op)) continue
    ops.push({ token: op, offset: match.span.startOffset })
  }

  return ops.sort((a, b) => a.offset - b.offset)
}

function extractRawOperatorStream(source: string): SequenceCell[] {
  const out: SequenceCell[] = []
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]
    if (!OPERATOR_SET.has(ch)) continue
    out.push({ token: ch, offset: i })
  }
  return out
}

function extractBraceStream(source: string): SequenceCell[] {
  const braces: SequenceCell[] = []
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]
    if (!BRACE_SET.has(ch)) continue
    braces.push({ token: ch, offset: i })
  }
  return braces
}

function mergeStreams(a: SequenceCell[], b: SequenceCell[]): SequenceCell[] {
  const merged = [...a, ...b].sort((x, y) => x.offset - y.offset)
  const seen = new Set<string>()
  const out: SequenceCell[] = []
  for (const cell of merged) {
    const key = `${cell.offset}:${cell.token}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(cell)
  }
  return out
}

function selectOperatorStream(source: string, surface: SurfaceMode): SequenceCell[] {
  if (surface === 'ast') return extractAstOperatorStream(source)
  if (surface === 'raw') return extractRawOperatorStream(source)
  return mergeStreams(extractAstOperatorStream(source), extractRawOperatorStream(source))
}

function parseLabelAt(source: string, start: number): { label: string; next: number } | null {
  if (source[start] !== '_') return null
  let i = start + 1
  if (i >= source.length || !/[A-Za-z]/.test(source[i])) return null
  let label = source[i]
  i += 1
  while (i < source.length && /[A-Za-z0-9_-]/.test(source[i])) {
    label += source[i]
    i += 1
  }
  return { label, next: i }
}

function extractLabelStats(source: string): {
  labels: string[]
  operatorCount: number
  bracePairCount: number
} {
  const labels = new Set<string>()
  let operatorCount = 0
  let bracePairCount = 0
  const stack = new Map<string, number>()
  const opens = new Set(['(', '[', '{', '<'])
  const closes = new Set([')', ']', '}', '>'])

  for (let i = 0; i < source.length - 1; i += 1) {
    const ch = source[i]
    if (source[i + 1] !== '_') continue

    const parsed = parseLabelAt(source, i + 1)
    if (!parsed) continue

    labels.add(parsed.label)
    if (OPERATOR_SET.has(ch)) operatorCount += 1

    if (opens.has(ch)) {
      stack.set(parsed.label, (stack.get(parsed.label) ?? 0) + 1)
    } else if (closes.has(ch)) {
      const current = stack.get(parsed.label) ?? 0
      if (current > 0) {
        bracePairCount += 1
        if (current === 1) stack.delete(parsed.label)
        else stack.set(parsed.label, current - 1)
      }
    }

    i = parsed.next - 1
  }

  return {
    labels: [...labels].sort(),
    operatorCount,
    bracePairCount,
  }
}

function orderedStats(stream: SequenceCell[], query: string[]): MatchStats {
  if (query.length === 0) return { matched: 0, coverage: 0, strictHit: true }

  let q = 0
  for (const cell of stream) {
    if (q >= query.length) break
    if (cell.token !== query[q]) continue
    q += 1
  }

  return {
    matched: q,
    coverage: q / query.length,
    strictHit: q === query.length,
  }
}

function setStats(stream: SequenceCell[], query: string[]): MatchStats {
  if (query.length === 0) return { matched: 0, coverage: 0, strictHit: true }

  const counts = new Map<string, number>()
  for (const cell of stream) {
    counts.set(cell.token, (counts.get(cell.token) ?? 0) + 1)
  }

  let matched = 0
  for (const token of query) {
    const current = counts.get(token) ?? 0
    if (current <= 0) continue
    matched += 1
    counts.set(token, current - 1)
  }

  return {
    matched,
    coverage: matched / query.length,
    strictHit: matched === query.length,
  }
}

function selectStats(ordered: MatchStats, set: MatchStats, mode: MatchMode): MatchStats {
  if (mode === 'ordered') return ordered
  if (mode === 'set') return set

  if (ordered.coverage > set.coverage) return ordered
  if (set.coverage > ordered.coverage) return set
  if (ordered.strictHit && !set.strictHit) return ordered
  if (set.strictHit && !ordered.strictHit) return set
  return ordered
}

function modelHints(model: string): string[] {
  return MODEL_HINTS[model] ?? MODEL_HINTS.fluid
}

function payloadSummary(queryOps: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const op of queryOps) {
    if (seen.has(op)) continue
    seen.add(op)
    const payload = OPERATOR_PAYLOADS[op]
    if (!payload) continue
    out.push(`${op}: ${payload.role} | ${payload.physics} | tune: ${payload.tuning}`)
  }
  return out
}

function extractCurlyBlocks(source: string): BlockRange[] {
  const ranges: BlockRange[] = []
  const stack: number[] = []
  let quote: '"' | '\'' | '`' | null = null
  let escaped = false

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]

    if (quote) {
      if (escaped) {
        escaped = false
        continue
      }
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === '"' || ch === '\'' || ch === '`') {
      quote = ch
      continue
    }

    if (ch === '{') {
      stack.push(i)
      continue
    }

    if (ch === '}') {
      const start = stack.pop()
      if (typeof start === 'number' && start < i) {
        ranges.push({ start, end: i })
      }
    }
  }

  if (ranges.length === 0 && source.length > 0) {
    ranges.push({ start: 0, end: source.length - 1 })
  }

  return ranges
}

function firstCompletionIndex(tokens: string[], query: string[]): number {
  if (query.length === 0) return -1
  let q = 0
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i] !== query[q]) continue
    q += 1
    if (q === query.length) return i
  }
  return -1
}

function probeOperatorValueInBlocks(
  opStream: SequenceCell[],
  source: string,
  queryOps: string[],
  probeOp: string,
  probeWindow: number,
): OperatorProbeStats {
  const blocks = extractCurlyBlocks(source)

  let sequenceHits = 0
  let blockHits = 0
  let immediateHits = 0
  let immediateOpportunities = 0
  let downstreamHits = 0
  let downstreamOpportunities = 0

  for (const block of blocks) {
    const blockStream = opStream.filter((cell) => cell.offset >= block.start && cell.offset <= block.end)
    if (blockStream.length === 0) continue

    const tokens = blockStream.map((cell) => cell.token)
    const completion = firstCompletionIndex(tokens, queryOps)
    if (completion < 0) continue

    sequenceHits += 1
    blockHits += 1

    const nextIdx = completion + 1
    if (nextIdx < tokens.length) {
      immediateOpportunities += 1
      if (tokens[nextIdx] === probeOp) immediateHits += 1
    }

    const to = Math.min(tokens.length - 1, completion + Math.max(1, probeWindow))
    for (let i = nextIdx; i <= to; i += 1) {
      if (i < 0 || i >= tokens.length) continue
      downstreamOpportunities += 1
      if (tokens[i] === probeOp) downstreamHits += 1
    }
  }

  const immediateRate = immediateOpportunities > 0 ? immediateHits / immediateOpportunities : 0
  const downstreamRate = downstreamOpportunities > 0 ? downstreamHits / downstreamOpportunities : 0
  const support = Math.min(1, sequenceHits / 3)
  const value = support * (0.55 * immediateRate + 0.45 * downstreamRate)

  return {
    sequenceHits,
    blockHits,
    immediateHits,
    immediateOpportunities,
    downstreamHits,
    downstreamOpportunities,
    immediateRate,
    downstreamRate,
    support,
    value,
  }
}

async function analyzeFile(
  filePath: string,
  queryOps: string[],
  queryBraces: string[],
  requiredLabels: string[],
  strict: boolean,
  mode: MatchMode,
  surface: SurfaceMode,
  probeOp: string,
  probeWindow: number,
): Promise<FileResult | null> {
  const source = await fs.readFile(filePath, 'utf8').catch(() => null)
  if (source === null) return null

  const opStream = selectOperatorStream(source, surface)
  const braceStream = extractBraceStream(source)

  const opOrdered = orderedStats(opStream, queryOps)
  const opSet = setStats(opStream, queryOps)
  const opEffective = selectStats(opOrdered, opSet, mode)

  const braceOrdered = orderedStats(braceStream, queryBraces)
  const braceSet = setStats(braceStream, queryBraces)
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

  if (strict) {
    if (queryOps.length > 0 && !opEffective.strictHit) return null
    if (queryBraces.length > 0 && !braceEffective.strictHit) return null
    if (requiredCount > 0 && labelCoverage < 1) return null
  } else {
    const anySignal =
      (queryOps.length > 0 && opEffective.matched > 0) ||
      (queryBraces.length > 0 && braceEffective.matched > 0) ||
      (requiredCount > 0 && labelCoverage > 0)
    if (!anySignal) return null
  }

  let probe: OperatorProbeStats | null = null
  if (probeOp) {
    probe = probeOperatorValueInBlocks(opStream, source, queryOps, probeOp, probeWindow)
  }

  const coverageParts: number[] = []
  if (queryOps.length > 0) coverageParts.push(opEffective.coverage)
  if (queryBraces.length > 0) coverageParts.push(braceEffective.coverage)
  if (requiredCount > 0) coverageParts.push(labelCoverage)
  if (probe) coverageParts.push(probe.value)

  const overallCoverage = coverageParts.length > 0
    ? coverageParts.reduce((sum, value) => sum + value, 0) / coverageParts.length
    : 0

  return {
    file: filePath,
    opStreamLength: opStream.length,
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
    overallCoverage,
    strictHit:
      (queryOps.length === 0 || opEffective.strictHit) &&
      (queryBraces.length === 0 || braceEffective.strictHit) &&
      (requiredCount === 0 || labelCoverage === 1),
    probe,
    opPreview: opStream.slice(0, 80).map((cell) => cell.token).join(''),
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv)
  const parsedOps = parseOperatorQuery(args.sequence)
  const queryOps = parsedOps.tokens
  const queryBraces = normalizeBraces(args.braces)

  const requiredLabels = new Set<string>()
  for (const label of parsedOps.inlineLabels) requiredLabels.add(label)
  if (args.label) requiredLabels.add(args.label)

  const probeOp = args.probeOp.trim()
  if (probeOp && !OPERATOR_SET.has(probeOp)) {
    console.error(`spw-seq: --probe-op must be one operator token, got '${probeOp}'`)
    process.exit(1)
  }
  if (probeOp && queryOps.length === 0) {
    console.error('spw-seq: --probe-op requires --seq with at least one operator token')
    process.exit(1)
  }

  if (queryOps.length === 0 && queryBraces.length === 0 && requiredLabels.size === 0) {
    console.error('spw-seq: provide --seq and/or --braces and/or --label')
    printHelp()
    process.exit(1)
  }

  const filesSet = new Set<string>()
  for (const root of args.roots) {
    const files = await collectSpwFiles(root)
    for (const file of files) filesSet.add(file)
  }

  const files = Array.from(filesSet)
  if (files.length === 0) {
    console.error('spw-seq: no .spw files found in roots')
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
      probeOp,
      args.probeWindow,
    )
    if (item) results.push(item)
  }

  const ranked = rank(results).slice(0, Math.max(1, args.top))
  const payload = payloadSummary(queryOps)
  const hints = modelHints(args.model)

  if (args.json) {
    console.log(JSON.stringify({
      operator_sequence: queryOps.join(''),
      brace_sequence: queryBraces.join(''),
      required_labels: [...requiredLabels],
      probe_operator: probeOp || null,
      probe_window: args.probeWindow,
      model: args.model,
      mode: args.mode,
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

  console.log(`operators: ${queryOps.join('') || '(none)'}`)
  console.log(`braces: ${queryBraces.join('') || '(none)'}`)
  console.log(`required_labels: ${[...requiredLabels].join(', ') || '(none)'}`)
  console.log(`probe_operator: ${probeOp || '(none)'}`)
  if (probeOp) console.log(`probe_window: ${args.probeWindow}`)
  console.log(`surface: ${args.surface}`)
  console.log(`mode: ${args.mode}`)
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
      ? ` seqHits=${item.probe.sequenceHits} imm=${item.probe.immediateHits}/${item.probe.immediateOpportunities} down=${item.probe.downstreamHits}/${item.probe.downstreamOpportunities}`
      : ''

    console.log(
      `${rel}\toverall=${overallPct}%\top=${item.opEffective.matched}/${queryOps.length || 0}(${opPct}%)\tbrace=${item.braceEffective.matched}/${queryBraces.length || 0}(${bracePct}%)\tlabels=${labelPct}%\tpairs=${item.labelBracePairCount}\tprobe=${probePct}\tstrict=${item.strictHit}${probeSignal}`,
    )
  }
}

main().catch((error) => {
  console.error(`spw-seq: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
