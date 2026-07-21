/**
 * Topographical mutation probes.
 *
 * Measure operational topography *before* and *after* a mutation automata
 * pass so layout/script rewrites can be falsified against parse health,
 * paired-container depth, and container counts — not only string hashes.
 *
 * Pulse stop reasons and mutation vectors come from the automata; this module
 * adds a stratified topographic delta (E0 when derived from parse).
 *
 * @see docs/theory/spw/operational-topography.spw
 * @see packages/spw-seed/src/canonical/mutation-automata.ts
 */

import { parse } from '../parser'
import type { ASTNode } from '../types/ast'
import { getMaxDepth, walkAST } from '../instrumentation/audit'
import {
  runMutationAutomata,
  type MutationAutomataConfig,
  type MutationRunResult,
} from './mutation-automata'
import type { MutationVector } from './differential'

export type ParseHealth = 'complete_structured' | 'recovered' | 'invalid'

export interface PairedContainerCounts {
  scope: number
  frame: number
  body: number
  capsule: number
  stream: number
  nrange: number
}

/** Compact topography snapshot for one source revision. */
export interface TopographySnapshot {
  parseHealth: ParseHealth
  parserSuccess: boolean
  proseFallback: boolean
  tokenCount: number
  significantTokens: number
  maxAstDepth: number | null
  maxPairedContainerDepth: number | null
  recognizedPairedContainers: PairedContainerCounts | null
  explicitCoupleOperations: number | null
  reasons: string[]
  sourceLength: number
}

/** Numeric / categorical delta across two snapshots. */
export interface TopographyDelta {
  parseHealthChanged: boolean
  parseHealthBefore: ParseHealth
  parseHealthAfter: ParseHealth
  /** True when after is worse than before (structured → recovered/invalid, etc.) */
  healthRegressed: boolean
  maxAstDepthDelta: number | null
  maxPairedContainerDepthDelta: number | null
  tokenCountDelta: number
  significantTokenDelta: number
  coupleOpsDelta: number | null
  containerDeltas: PairedContainerCounts | null
  sourceLengthDelta: number
  /** True when structure metrics moved (depth or container counts) */
  structureMoved: boolean
  /** True when only layout-ish surface metrics moved (tokens/length) and structure stable */
  layoutOnlyCandidate: boolean
}

export interface TopographyMutationProbe {
  /** Mutation automata result (plan or apply per config) */
  mutation: MutationRunResult
  before: TopographySnapshot
  /** Snapshot of mutated source when applied; equals before when dry-run with no apply */
  after: TopographySnapshot
  /** Topography of the *planned* output even when dry-run (virtual after) */
  plannedAfter: TopographySnapshot
  delta: TopographyDelta
  /** Planned vs input delta (always uses virtual post-mutation source) */
  plannedDelta: TopographyDelta
  vector: MutationVector
  /** Human-oriented summary lines for CLI */
  findings: string[]
}

function emptyContainers(): PairedContainerCounts {
  return { scope: 0, frame: 0, body: 0, capsule: 0, stream: 0, nrange: 0 }
}

function pairedKind(node: ASTNode): keyof PairedContainerCounts | null {
  switch (node.type) {
    case 'Scope':
      return 'scope'
    case 'Frame':
      return 'frame'
    case 'Body':
      return 'body'
    case 'Capsule':
      return 'capsule'
    case 'Stream':
      return 'stream'
    case 'NRange':
      return 'nrange'
    default:
      return null
  }
}

function haveClosedLexemes(tokens: { type: string; kind?: string; value: string }[]): boolean {
  return tokens.every(token => {
    if (token.type === 'COMMENT' && token.kind === 'block') {
      return token.value.endsWith('*/')
    }
    if (token.type === 'PHRASE') {
      return token.value.length >= 2 && token.value.startsWith('`') && token.value.endsWith('`')
    }
    if (token.type === 'STRING') {
      const q = token.value[0]
      return (
        (q === '"' || q === "'") &&
        token.value.length >= 2 &&
        token.value.endsWith(q) &&
        !token.value.endsWith(`\\${q}`)
      )
    }
    return true
  })
}

/**
 * Snapshot operational topography for a source string (E0 from parse path).
 */
export function snapshotTopography(source: string): TopographySnapshot {
  const output = parse(source)
  const { tokens, ast, errors } = output
  const significantTokens = tokens.filter(
    t => t.type !== 'WHITESPACE' && t.type !== 'COMMENT' && t.type !== 'EOF',
  ).length
  const proseFallback = ast?.expression?.type === 'Prose'
  const nonRecoverableError = errors.some(
    error => (error.data as { recoverable?: boolean } | undefined)?.recoverable === false,
  )
  const lexemesClosed = haveClosedLexemes(tokens)
  const reasons: string[] = []

  if (!output.success) reasons.push('parser_failure')
  if (!ast) reasons.push('missing_ast')
  if (nonRecoverableError) reasons.push('non_recoverable_error')
  if (!lexemesClosed) reasons.push('unterminated_lexeme')

  const invalid = reasons.length > 0
  if (!invalid && errors.length > 0) reasons.push('recoverable_errors')
  if (!invalid && proseFallback) reasons.push('prose_fallback')

  const parseHealth: ParseHealth = invalid
    ? 'invalid'
    : reasons.length > 0
      ? 'recovered'
      : 'complete_structured'

  const recognizedPairedContainers = ast ? emptyContainers() : null
  let explicitCoupleOperations: number | null = ast ? 0 : null
  let maxPairedContainerDepth: number | null = ast ? 0 : null

  if (ast && recognizedPairedContainers) {
    walkAST(ast, (node, path) => {
      const kind = pairedKind(node)
      if (kind) recognizedPairedContainers[kind] += 1
      if (
        node.type === 'Operation' &&
        (node as { operator?: { value?: string } }).operator?.value === '<>'
      ) {
        explicitCoupleOperations = (explicitCoupleOperations ?? 0) + 1
      }
      const ancestorPaired = path.reduce(
        (depth, ancestor) => depth + (pairedKind(ancestor) ? 1 : 0),
        0,
      )
      const nodeDepth = ancestorPaired + (kind ? 1 : 0)
      if (maxPairedContainerDepth === null || nodeDepth > maxPairedContainerDepth) {
        maxPairedContainerDepth = nodeDepth
      }
    })
  }

  return {
    parseHealth,
    parserSuccess: output.success,
    proseFallback: Boolean(proseFallback),
    tokenCount: tokens.filter(t => t.type !== 'EOF').length,
    significantTokens,
    maxAstDepth: ast ? getMaxDepth(ast) : null,
    maxPairedContainerDepth,
    recognizedPairedContainers,
    explicitCoupleOperations,
    reasons,
    sourceLength: source.length,
  }
}

function healthRank(h: ParseHealth): number {
  if (h === 'complete_structured') return 2
  if (h === 'recovered') return 1
  return 0
}

/**
 * Stratified delta between two topography snapshots.
 */
export function topographyDelta(
  before: TopographySnapshot,
  after: TopographySnapshot,
): TopographyDelta {
  const maxAstDepthDelta =
    before.maxAstDepth !== null && after.maxAstDepth !== null
      ? after.maxAstDepth - before.maxAstDepth
      : null
  const maxPairedContainerDepthDelta =
    before.maxPairedContainerDepth !== null && after.maxPairedContainerDepth !== null
      ? after.maxPairedContainerDepth - before.maxPairedContainerDepth
      : null

  let containerDeltas: PairedContainerCounts | null = null
  let containerMoved = false
  if (before.recognizedPairedContainers && after.recognizedPairedContainers) {
    containerDeltas = emptyContainers()
    for (const key of Object.keys(containerDeltas) as (keyof PairedContainerCounts)[]) {
      containerDeltas[key] =
        after.recognizedPairedContainers[key] - before.recognizedPairedContainers[key]
      if (containerDeltas[key] !== 0) containerMoved = true
    }
  }

  const coupleOpsDelta =
    before.explicitCoupleOperations !== null && after.explicitCoupleOperations !== null
      ? after.explicitCoupleOperations - before.explicitCoupleOperations
      : null

  const structureMoved =
    containerMoved ||
    (maxAstDepthDelta !== null && maxAstDepthDelta !== 0) ||
    (maxPairedContainerDepthDelta !== null && maxPairedContainerDepthDelta !== 0) ||
    (coupleOpsDelta !== null && coupleOpsDelta !== 0)

  const surfaceMoved =
    before.tokenCount !== after.tokenCount ||
    before.significantTokens !== after.significantTokens ||
    before.sourceLength !== after.sourceLength

  const parseHealthChanged = before.parseHealth !== after.parseHealth
  const healthRegressed = healthRank(after.parseHealth) < healthRank(before.parseHealth)

  return {
    parseHealthChanged,
    parseHealthBefore: before.parseHealth,
    parseHealthAfter: after.parseHealth,
    healthRegressed,
    maxAstDepthDelta,
    maxPairedContainerDepthDelta,
    tokenCountDelta: after.tokenCount - before.tokenCount,
    significantTokenDelta: after.significantTokens - before.significantTokens,
    coupleOpsDelta,
    containerDeltas,
    sourceLengthDelta: after.sourceLength - before.sourceLength,
    structureMoved,
    layoutOnlyCandidate:
      !structureMoved &&
      !parseHealthChanged &&
      !healthRegressed &&
      surfaceMoved &&
      before.parseHealth === after.parseHealth,
  }
}

function findingsFrom(
  mutation: MutationRunResult,
  delta: TopographyDelta,
  plannedDelta: TopographyDelta,
): string[] {
  const lines: string[] = []
  lines.push(
    `stop=${mutation.stopReason} profile=${mutation.profile} changed=${mutation.changed} dryRun=${mutation.dryRun}`,
  )
  lines.push(
    `vector edits=${mutation.vector.edit_count} layout=${mutation.vector.layout_delta} script=${mutation.vector.script_delta} bytes=${mutation.vector.bytes_delta}`,
  )

  const d = plannedDelta
  lines.push(
    `topo health ${d.parseHealthBefore} → ${d.parseHealthAfter}` +
      (d.healthRegressed ? ' (REGRESSED)' : d.parseHealthChanged ? ' (changed)' : ' (stable)'),
  )
  if (d.layoutOnlyCandidate) {
    lines.push('topo layout-only candidate: structure stable, surface metrics moved')
  }
  if (d.structureMoved) {
    lines.push(
      `topo structure moved: astDepthΔ=${d.maxAstDepthDelta ?? 'n/a'} pairedDepthΔ=${d.maxPairedContainerDepthDelta ?? 'n/a'} coupleΔ=${d.coupleOpsDelta ?? 'n/a'}`,
    )
  }
  if (d.containerDeltas) {
    const parts = Object.entries(d.containerDeltas)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`)
    if (parts.length) lines.push(`topo containers: ${parts.join(' ')}`)
  }
  if (!mutation.changed && mutation.vector.edit_count === 0) {
    lines.push('fixed point: no planned edits')
  }
  if (mutation.requiresWriteAuthority) {
    lines.push('S2 write authority required to persist')
  }
  // Keep delta (applied) vs planned when dry-run differs
  if (mutation.dryRun && plannedDelta.sourceLengthDelta !== delta.sourceLengthDelta) {
    lines.push('dry-run: applied snapshot unchanged; planned delta above is virtual')
  }
  return lines
}

/**
 * Run mutation automata and probe topography before / after (and planned).
 *
 * Default config is dry-run layout_canonical so CLI pulses are S0-safe.
 */
export function probeMutationTopography(
  source: string,
  config: MutationAutomataConfig = { profile: 'layout_canonical', dryRun: true },
): TopographyMutationProbe {
  const before = snapshotTopography(source)
  const mutation = runMutationAutomata(source, {
    dryRun: true,
    ...config,
  })

  const plannedAfter = snapshotTopography(mutation.plannedSource)
  const after = snapshotTopography(mutation.source)
  const delta = topographyDelta(before, after)
  const plannedDelta = topographyDelta(before, plannedAfter)

  return {
    mutation,
    before,
    after,
    plannedAfter,
    delta,
    plannedDelta,
    vector: mutation.vector,
    findings: findingsFrom(mutation, delta, plannedDelta),
  }
}
