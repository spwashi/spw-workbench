#!/usr/bin/env tsx
/**
 * Spw interpretive flow-profile and paired-boundary observer
 *
 * Reports deterministic token observations, plus one explicitly interpretive
 * ordering profile. It does not infer literal tense, capacitance, runtime
 * effect, or universal brace-set membership from glyphs.
 *
 * Grounded in:
 *   docs/theory/spw/operational-devices.spw
 *   .spw/registries/brace-physics.spw
 *
 * Usage:
 *   node --import tsx scripts/analyzers/spw-flow-scan.ts [options] [targets...]
 *
 * Options:
 *   --json             Emit structured JSON summary
 *   -v, --verbose      Show per-file breakdown
 *   -e, --exclude <p>  Exclude paths matching pattern
 *   -h, --help         Show help
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parse, snapshotTopography } from '@spwashi/spw-seed'
import type { ParseHealth, Token } from '@spwashi/spw-seed'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Sigils selected by the named interpretive flow profile. */
type FlowTense = '~' | '?' | '!' | '^' | '%'

const FLOW_TENSES: readonly FlowTense[] = ['~', '?', '!', '^', '%'] as const

const TENSE_NAMES: Record<FlowTense, string> = {
  '~': 'subjunctive',
  '?': 'interrogative',
  '!': 'imperative',
  '^': 'perfective',
  '%': 'observational',
}

const PROFILE_ORDER: readonly FlowTense[] = ['~', '?', '!', '^']

const FLOW_PROFILE = {
  id: 'potential-wonder-action-integration@0.1',
  status: 'interpretive' as const,
  order: PROFILE_ORDER,
  orderingScope: 'whole-file operator-token sequence',
  boundarySet: 'all Seed paired-boundary token kinds',
}

type ContainerBoundaryKind = 'body' | 'frame' | 'scope' | 'capsule' | 'stream' | 'nrange'

interface BoundaryObservationEntry {
  kind: ContainerBoundaryKind
  depth: number
  significantInteriorTokenCount: number
  flowMarkersInside: number
}

export interface FlowFileResult {
  file: string
  rel: string
  /** Per-tense operator counts. */
  tenses: Record<FlowTense, number>
  /** Total flow marker tokens across all five tenses. */
  totalFlowMarkers: number
  /** Other operator sigils (non-flow). */
  otherOperators: number
  /** Total significant (non-whitespace, non-comment, non-EOF) tokens. */
  significantTokens: number
  /** Flow marker density = totalFlowMarkers / significantTokens. */
  flowDensity: number
  parse: {
    health: ParseHealth
    success: boolean
    errorCount: number
    rootExpression: string | null
    lexemesClosed: boolean
    reasons: string[]
    topographyAuthority: 'seed_snapshot_topography'
    boundaryObservationMethod: 'strict_matched_token_stack'
  }
  /** Named-profile ordering score, or null when fewer than two markers exist. */
  profileOrderScore: number | null
  /** Paired-boundary observations stats. */
  boundaries: {
    body: BoundaryStat
    frame: BoundaryStat
    scope: BoundaryStat
    capsule: BoundaryStat
    stream: BoundaryStat
    nrange: BoundaryStat
  }
}

interface BoundaryStat {
  count: number
  totalSignificantInteriorTokens: number
  maxSignificantInteriorTokens: number
  maxDepth: number
  avgSignificantInteriorTokens: number
  totalFlowInside: number
}

export interface FlowSummary {
  profile: typeof FLOW_PROFILE
  totalFiles: number
  totalTenses: Record<FlowTense, number>
  totalFlowMarkers: number
  totalSignificantTokens: number
  overallFlowDensity: number
  avgProfileOrderScore: number | null
  globalBoundaries: {
    body: BoundaryStat
    frame: BoundaryStat
    scope: BoundaryStat
    capsule: BoundaryStat
    stream: BoundaryStat
    nrange: BoundaryStat
  }
  files: FlowFileResult[]
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`Usage: node --import tsx scripts/analyzers/spw-flow-scan.ts [options] [targets...]`)
    console.log(`Options:`)
    console.log(`  --json             Emit JSON report`)
    console.log(`  -v, --verbose      Verbose per-file breakdown`)
    console.log(`  -e, --exclude <p>  Exclude path pattern`)
    process.exit(0)
  }

  const json = args.includes('--json')
  const verbose = args.includes('-v') || args.includes('--verbose')
  const excludePatterns = getOptionValues(args, '-e', '--exclude')
  const targets = extractPositionalArgs(args)

  const scanRoots = targets.length > 0 ? targets : ['.spw', 'docs', 'lib', 'packages']
  const filePaths: string[] = []

  for (const root of scanRoots) {
    await collectSpwFiles(path.resolve(root), filePaths, excludePatterns)
  }
  const sortedFiles = [...new Set(filePaths)].sort((a, b) => a.localeCompare(b))

  const fileResults: FlowFileResult[] = []
  for (const file of sortedFiles) {
    const rel = path.relative(process.cwd(), file)
    try {
      const content = await fs.readFile(file, 'utf8')
      fileResults.push(analyzeFlow(file, rel, content))
    } catch (err: any) {
      if (verbose) console.error(`Error processing ${rel}:`, err?.message)
      fileResults.push(emptyResult(file, rel))
    }
  }

  const summary = computeFlowSummary(fileResults)

  if (json) {
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  printHumanReport(summary, verbose)
}

// ---------------------------------------------------------------------------
// Core Analysis
// ---------------------------------------------------------------------------

export function analyzeFlow(_file: string, rel: string, source: string): FlowFileResult {
  const topography = snapshotTopography(source)
  const parsed = parse(source)
  const { tokens } = parsed

  const significant = tokens.filter(isSignificant)
  const tenses: Record<FlowTense, number> = { '~': 0, '?': 0, '!': 0, '^': 0, '%': 0 }
  let otherOperators = 0

  for (const tok of significant) {
    if (tok.type === 'OPERATOR' && tok.kind) {
      if (isFlowTense(tok.kind)) {
        tenses[tok.kind] += 1
      } else {
        otherOperators += 1
      }
    }
  }

  const totalFlowMarkers = FLOW_TENSES.reduce((sum, t) => sum + tenses[t], 0)
  const flowDensity = topography.significantTokens > 0
    ? totalFlowMarkers / topography.significantTokens
    : 0
  const rootExpression = parsed.ast?.expression.type ?? null

  // Interpretive score is kept separate from deterministic observations.
  const profileOrderScore = computeProfileOrderScore(tokens)

  // --- Paired-boundary observations ---
  const containers = measureBoundaryObservations(tokens)
  const boundaries = aggregateBoundaries(containers)

  return {
    file: rel,
    rel,
    parse: {
      health: topography.parseHealth,
      success: topography.parserSuccess,
      errorCount: parsed.errors.length,
      rootExpression,
      lexemesClosed: topography.lexemesClosed,
      reasons: [...topography.reasons],
      topographyAuthority: 'seed_snapshot_topography',
      boundaryObservationMethod: 'strict_matched_token_stack',
    },
    tenses,
    totalFlowMarkers,
    otherOperators,
    significantTokens: topography.significantTokens,
    flowDensity,
    profileOrderScore,
    boundaries,
  }
}

// ---------------------------------------------------------------------------
// Named Profile Order Scoring
// ---------------------------------------------------------------------------

/**
 * Scores adjacency against this profile's `~ => ? => ! => ^` ordering.
 *
 * For each adjacent pair of flow tense tokens (ignoring non-flow tokens),
 * a pair is "in order" if the second tense appears at the same or later
 * position in PROFILE_ORDER. `%` (observational) is neutral and skipped.
 *
 * Returns null when fewer than two comparable markers exist; absence of
 * evidence is not treated as perfect adherence.
 */
function computeProfileOrderScore(tokens: Token[]): number | null {
  const flowSequence: FlowTense[] = []

  for (const tok of tokens) {
    if (tok.type === 'OPERATOR' && tok.kind && isFlowTense(tok.kind) && tok.kind !== '%') {
      flowSequence.push(tok.kind)
    }
  }

  if (flowSequence.length < 2) return null

  let inOrder = 0
  let total = 0

  for (let i = 0; i < flowSequence.length - 1; i += 1) {
    const a = PROFILE_ORDER.indexOf(flowSequence[i])
    const b = PROFILE_ORDER.indexOf(flowSequence[i + 1])
    if (a >= 0 && b >= 0) {
      total += 1
      if (b >= a) inOrder += 1
    }
  }

  return total > 0 ? inOrder / total : null
}

// ---------------------------------------------------------------------------
// Paired-Boundary Observations Measurement
// ---------------------------------------------------------------------------

/**
 * Walks the token stream tracking open/close nesting.
 * For each completed container, records:
 *   - boundary kind
 *   - nesting depth at open
 *   - number of significant tokens strictly inside its boundaries
 *   - number of flow marker tokens inside
 *
 * Any mismatched close invalidates the active stack. This prevents crossed
 * delimiters such as `{[}]` from later producing a false completed pair.
 */
function measureBoundaryObservations(tokens: Token[]): BoundaryObservationEntry[] {
  const entries: BoundaryObservationEntry[] = []
  const stack: {
    kind: ContainerBoundaryKind
    depth: number
    interiorStart: number
    flowCount: number
  }[] = []
  let depth = 0

  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i]
    const bk = openBoundaryKind(tok)
    if (bk) {
      depth += 1
      stack.push({ kind: bk, depth, interiorStart: i + 1, flowCount: 0 })
      continue
    }

    const closeKind = closeBoundaryKind(tok)
    if (closeKind) {
      if (stack.length === 0) continue
      if (stack[stack.length - 1].kind !== closeKind) {
        stack.length = 0
        depth = 0
        continue
      }

      const frame = stack.pop()!
      depth -= 1
      let significantInteriorTokenCount = 0
      for (let j = frame.interiorStart; j < i; j += 1) {
        if (isSignificant(tokens[j])) significantInteriorTokenCount += 1
      }
      entries.push({
        kind: frame.kind,
        depth: frame.depth,
        significantInteriorTokenCount,
        flowMarkersInside: frame.flowCount,
      })
      continue
    }

    // A nested marker is inside every currently open ancestor.
    if (tok.type === 'OPERATOR' && tok.kind && isFlowTense(tok.kind) && stack.length > 0) {
      for (const frame of stack) frame.flowCount += 1
    }
  }

  return entries
}

function openBoundaryKind(tok: Token): ContainerBoundaryKind | null {
  if (tok.type === 'CONTAINER_OPEN') {
    switch (tok.kind) {
      case '{': return 'body'
      case '[': return 'frame'
      case '(': return 'scope'
      default: return null
    }
  }
  if (tok.type === 'CAPSULE_OPEN') return 'capsule'
  if (tok.type === 'STREAM_OPEN') return 'stream'
  if (tok.type === 'NRANGE_OPEN') return 'nrange'
  return null
}

function closeBoundaryKind(tok: Token): ContainerBoundaryKind | null {
  if (tok.type === 'CONTAINER_CLOSE') {
    switch (tok.kind) {
      case '}': return 'body'
      case ']': return 'frame'
      case ')': return 'scope'
      default: return null
    }
  }
  if (tok.type === 'CAPSULE_CLOSE') return 'capsule'
  if (tok.type === 'STREAM_CLOSE') return 'stream'
  if (tok.type === 'NRANGE_CLOSE') return 'nrange'
  return null
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function emptyBoundaryStat(): BoundaryStat {
  return {
    count: 0,
    totalSignificantInteriorTokens: 0,
    maxSignificantInteriorTokens: 0,
    maxDepth: 0,
    avgSignificantInteriorTokens: 0,
    totalFlowInside: 0,
  }
}

type BoundaryKinds = 'body' | 'frame' | 'scope' | 'capsule' | 'stream' | 'nrange'
const ALL_BOUNDARY_KINDS: BoundaryKinds[] = ['body', 'frame', 'scope', 'capsule', 'stream', 'nrange']

function aggregateBoundaries(entries: BoundaryObservationEntry[]): Record<BoundaryKinds, BoundaryStat> {
  const result: Record<BoundaryKinds, BoundaryStat> = {
    body: emptyBoundaryStat(), frame: emptyBoundaryStat(), scope: emptyBoundaryStat(),
    capsule: emptyBoundaryStat(), stream: emptyBoundaryStat(), nrange: emptyBoundaryStat(),
  }

  for (const e of entries) {
    const s = result[e.kind]
    s.count += 1
    s.totalSignificantInteriorTokens += e.significantInteriorTokenCount
    s.totalFlowInside += e.flowMarkersInside
    if (e.significantInteriorTokenCount > s.maxSignificantInteriorTokens) {
      s.maxSignificantInteriorTokens = e.significantInteriorTokenCount
    }
    if (e.depth > s.maxDepth) s.maxDepth = e.depth
  }

  for (const k of ALL_BOUNDARY_KINDS) {
    const s = result[k]
    s.avgSignificantInteriorTokens = s.count > 0
      ? Math.round((s.totalSignificantInteriorTokens / s.count) * 10) / 10
      : 0
  }

  return result
}

function computeFlowSummary(results: FlowFileResult[]): FlowSummary {
  const totalTenses: Record<FlowTense, number> = { '~': 0, '?': 0, '!': 0, '^': 0, '%': 0 }
  let totalFlow = 0
  let totalSig = 0
  let orderScoreSum = 0
  let orderScoreCount = 0

  const globalBoundaries: Record<BoundaryKinds, BoundaryStat> = {
    body: emptyBoundaryStat(), frame: emptyBoundaryStat(), scope: emptyBoundaryStat(),
    capsule: emptyBoundaryStat(), stream: emptyBoundaryStat(), nrange: emptyBoundaryStat(),
  }

  for (const r of results) {
    for (const t of FLOW_TENSES) totalTenses[t] += r.tenses[t]
    totalFlow += r.totalFlowMarkers
    totalSig += r.significantTokens
    if (r.profileOrderScore !== null) {
      orderScoreSum += r.profileOrderScore
      orderScoreCount += 1
    }
    for (const k of ALL_BOUNDARY_KINDS) {
      const g = globalBoundaries[k]
      const f = r.boundaries[k]
      g.count += f.count
      g.totalSignificantInteriorTokens += f.totalSignificantInteriorTokens
      g.totalFlowInside += f.totalFlowInside
      if (f.maxSignificantInteriorTokens > g.maxSignificantInteriorTokens) {
        g.maxSignificantInteriorTokens = f.maxSignificantInteriorTokens
      }
      if (f.maxDepth > g.maxDepth) g.maxDepth = f.maxDepth
    }
  }

  for (const k of ALL_BOUNDARY_KINDS) {
    const g = globalBoundaries[k]
    g.avgSignificantInteriorTokens = g.count > 0
      ? Math.round((g.totalSignificantInteriorTokens / g.count) * 10) / 10
      : 0
  }

  return {
    profile: FLOW_PROFILE,
    totalFiles: results.length,
    totalTenses,
    totalFlowMarkers: totalFlow,
    totalSignificantTokens: totalSig,
    overallFlowDensity: totalSig > 0 ? Math.round((totalFlow / totalSig) * 10000) / 10000 : 0,
    avgProfileOrderScore: orderScoreCount > 0 ? Math.round((orderScoreSum / orderScoreCount) * 1000) / 1000 : null,
    globalBoundaries,
    files: results,
  }
}

// ---------------------------------------------------------------------------
// CLI Output
// ---------------------------------------------------------------------------

function printHumanReport(summary: FlowSummary, verbose: boolean): void {
  console.log(`# Spw Flow Profile & Paired-Boundary Observation Report`)
  console.log(`Profile: ${summary.profile.id} (${summary.profile.status})`)
  console.log(`Ordering scope: ${summary.profile.orderingScope}`)
  console.log(`Boundary set: ${summary.profile.boundarySet}`)
  console.log(`Files scanned: ${summary.totalFiles}`)
  console.log(``)
  console.log(`## Flow Marker Tenses`)
  for (const t of FLOW_TENSES) {
    console.log(`  ${t} ${TENSE_NAMES[t].padEnd(15)} ${summary.totalTenses[t]}`)
  }
  console.log(`  ${'─'.repeat(30)}`)
  console.log(`  Total flow markers: ${summary.totalFlowMarkers}`)
  console.log(`  Significant tokens: ${summary.totalSignificantTokens}`)
  console.log(`  Flow density:       ${(summary.overallFlowDensity * 100).toFixed(2)}%`)
  const averageOrder = summary.avgProfileOrderScore === null
    ? 'n/a'
    : `${(summary.avgProfileOrderScore * 100).toFixed(1)}%`
  console.log(`  Profile order:      ${averageOrder}`)
  console.log(``)
  console.log(`## Paired-Boundary Observations`)
  console.log(`  ${'Kind'.padEnd(10)} ${'Count'.padStart(6)} ${'AvgTok'.padStart(8)} ${'MaxTok'.padStart(8)} ${'MaxDep'.padStart(8)} ${'FlowIn'.padStart(8)}`)
  for (const k of ALL_BOUNDARY_KINDS) {
    const s = summary.globalBoundaries[k]
    console.log(`  ${k.padEnd(10)} ${String(s.count).padStart(6)} ${String(s.avgSignificantInteriorTokens).padStart(8)} ${String(s.maxSignificantInteriorTokens).padStart(8)} ${String(s.maxDepth).padStart(8)} ${String(s.totalFlowInside).padStart(8)}`)
  }

  if (verbose) {
    console.log(`\n## Per-File Flow Breakdown`)
    for (const f of summary.files) {
      if (f.totalFlowMarkers === 0) continue
      const tenseStr = FLOW_TENSES.map((t) => `${t}=${f.tenses[t]}`).join(' ')
      const order = f.profileOrderScore === null ? 'n/a' : `${(f.profileOrderScore * 100).toFixed(0)}%`
      console.log(`  ${f.rel}  [${tenseStr}] density=${(f.flowDensity * 100).toFixed(1)}% order=${order} parse=${f.parse.health}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function isSignificant(tok: Token): boolean {
  return tok.type !== 'WHITESPACE' && tok.type !== 'EOF' && tok.type !== 'COMMENT'
}

function isFlowTense(kind: string): kind is FlowTense {
  return kind === '~' || kind === '?' || kind === '!' || kind === '^' || kind === '%'
}

function emptyResult(_file: string, rel: string): FlowFileResult {
  return {
    file: rel, rel,
    parse: {
      health: 'invalid',
      success: false,
      errorCount: 1,
      rootExpression: null,
      lexemesClosed: false,
      reasons: ['read_failure'],
      topographyAuthority: 'seed_snapshot_topography',
      boundaryObservationMethod: 'strict_matched_token_stack',
    },
    tenses: { '~': 0, '?': 0, '!': 0, '^': 0, '%': 0 },
    totalFlowMarkers: 0, otherOperators: 0, significantTokens: 0,
    flowDensity: 0, profileOrderScore: null,
    boundaries: {
      body: emptyBoundaryStat(), frame: emptyBoundaryStat(), scope: emptyBoundaryStat(),
      capsule: emptyBoundaryStat(), stream: emptyBoundaryStat(), nrange: emptyBoundaryStat(),
    },
  }
}

function extractPositionalArgs(args: string[]): string[] {
  const result: string[] = []
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '-e' || arg === '--exclude') { i += 1; continue }
    if (!arg.startsWith('-')) result.push(arg)
  }
  return result
}

function getOptionValues(args: string[], flag: string, longFlag: string): string[] {
  const values: string[] = []
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === flag || args[i] === longFlag) {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        values.push(args[i + 1])
        i += 1
      }
    }
  }
  return values
}

async function collectSpwFiles(dir: string, files: string[], excludePatterns: string[]): Promise<void> {
  const stat = await fs.stat(dir).catch(() => null)
  if (!stat) return
  if (stat.isFile()) {
    if (dir.endsWith('.spw') && !excludePatterns.some((p) => dir.includes(p))) {
      files.push(dir)
    }
    return
  }
  if (!stat.isDirectory()) return

  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
    const fullPath = path.join(dir, entry.name)
    if (excludePatterns.some((p) => fullPath.includes(p))) continue
    if (entry.isDirectory()) {
      await collectSpwFiles(fullPath, files, excludePatterns)
    } else if (entry.isFile() && entry.name.endsWith('.spw')) {
      files.push(fullPath)
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
