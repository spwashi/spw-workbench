import { BRACE_SET, OPERATOR_SET, REGISTER_GATE_SET, tokenMatches } from './constants'
import { mergeStreams } from './scan'
import type { BlockRange, EquivMode, ProbePattern, SequenceCell, SequenceProbeStats } from './types'

export function parseProbeExpression(input: string): ProbePattern | null {
  const raw = input.trim()
  if (!raw) return null
  const canonical = raw
    .replace(/\.\*/g, '*()')
    .replace(/\.([!?~@&*=%#$^_])/g, '$1')

  const patternTokens: string[] = []
  const opTokens: string[] = []
  const braceTokens: string[] = []

  for (let i = 0; i < canonical.length; i += 1) {
    const ch = canonical[i]

    if (ch === '.' && i + 1 < canonical.length) {
      const gate = `.${canonical[i + 1]}`
      if (REGISTER_GATE_SET.has(gate)) {
        patternTokens.push(gate)
        opTokens.push(gate)
        i += 1
        continue
      }
    }

    if (OPERATOR_SET.has(ch) || BRACE_SET.has(ch)) {
      patternTokens.push(ch)
      if (OPERATOR_SET.has(ch)) opTokens.push(ch)
      if (BRACE_SET.has(ch)) braceTokens.push(ch)
    }
  }

  if (patternTokens.length === 0) {
    return null
  }

  const subjects = new Set<string>()

  const underscoreLabels = raw.matchAll(/_([A-Za-z][A-Za-z0-9_-]*)/g)
  for (const match of underscoreLabels) {
    if (match[1]) subjects.add(match[1])
  }

  const parenSubjects = raw.matchAll(/\(([A-Za-z][A-Za-z0-9_-]*)\)/g)
  for (const match of parenSubjects) {
    if (match[1]) subjects.add(match[1])
  }

  const kind = patternTokens.length === 1 && opTokens.length === 1 ? 'operator' : 'sequence'

  return {
    raw,
    canonical,
    kind,
    patternTokens,
    opTokens,
    braceTokens,
    subjects: [...subjects],
  }
}

function orderedContains(streamTokens: string[], patternTokens: string[], equivMode: EquivMode): boolean {
  if (patternTokens.length === 0) return true
  let p = 0
  for (const token of streamTokens) {
    if (!tokenMatches(patternTokens[p], token, equivMode)) continue
    p += 1
    if (p === patternTokens.length) return true
  }
  return false
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

function firstCompletionIndex(tokens: string[], query: string[], equivMode: EquivMode): number {
  if (query.length === 0) return -1
  let q = 0
  for (let i = 0; i < tokens.length; i += 1) {
    if (!tokenMatches(query[q], tokens[i], equivMode)) continue
    q += 1
    if (q === query.length) return i
  }
  return -1
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function evaluateProbeInBlocks(
  source: string,
  opStream: SequenceCell[],
  braceStream: SequenceCell[],
  baseOps: string[],
  probe: ProbePattern,
  probeWindow: number,
  equivMode: EquivMode,
): SequenceProbeStats {
  const blocks = extractCurlyBlocks(source)

  let sequenceHits = 0
  let immediateHits = 0
  let immediateOpportunities = 0
  let downstreamHits = 0
  let downstreamOpportunities = 0
  let subjectHits = 0
  let subjectOpportunities = 0
  let chargeHit = 0
  let chargeTotal = 0

  const tokenSet = new Set<string>([...baseOps, ...probe.patternTokens])

  for (const block of blocks) {
    const blockOps = opStream.filter((cell) => cell.offset >= block.start && cell.offset <= block.end)
    if (baseOps.length > 0 && blockOps.length === 0) continue

    const opTokens = blockOps.map((cell) => cell.token)
    const completion = baseOps.length > 0 ? firstCompletionIndex(opTokens, baseOps, equivMode) : -1
    if (baseOps.length > 0 && completion < 0) continue

    sequenceHits += 1

    const completionOffset = completion >= 0 ? blockOps[completion].offset : block.start - 1

    const blockBraces = braceStream.filter((cell) => cell.offset >= block.start && cell.offset <= block.end)
    const blockCombined = mergeStreams(blockOps, blockBraces)
    const startIndex = blockCombined.findIndex((cell) => cell.offset > completionOffset)
    const from = startIndex >= 0 ? startIndex : blockCombined.length
    const windowCells = blockCombined.slice(from, from + Math.max(1, probeWindow))
    const windowTokens = windowCells.map((cell) => cell.token)

    if (probe.patternTokens.length > 0) {
      if (windowTokens.length >= probe.patternTokens.length) {
        immediateOpportunities += 1
        const immediatePattern = windowTokens.slice(0, probe.patternTokens.length)
        const immediateMatch = immediatePattern.every((token, idx) => tokenMatches(probe.patternTokens[idx], token, equivMode))
        if (immediateMatch) immediateHits += 1
      }

      if (windowTokens.length > 0) {
        downstreamOpportunities += 1
        if (orderedContains(windowTokens, probe.patternTokens, equivMode)) downstreamHits += 1
      }
    }

    const blockSegment = source.slice(block.start, block.end + 1)
    if (probe.subjects.length > 0) {
      subjectOpportunities += 1
      const subjectMatch = probe.subjects.some((subject) => blockSegment.includes(subject))
      if (subjectMatch) subjectHits += 1
    }

    for (const cell of blockCombined) {
      chargeTotal += 1
      if (tokenSet.has(cell.token)) chargeHit += 1
    }
  }

  const immediateRate = immediateOpportunities > 0 ? immediateHits / immediateOpportunities : 0
  const downstreamRate = downstreamOpportunities > 0 ? downstreamHits / downstreamOpportunities : 0
  const subjectRate = subjectOpportunities > 0 ? subjectHits / subjectOpportunities : 1
  const charge = chargeTotal > 0 ? chargeHit / chargeTotal : 0
  const support = clamp01(sequenceHits / 3)

  const conceptPriming = clamp01(support * (0.65 * downstreamRate + 0.35 * charge) * subjectRate)
  const realization = clamp01(support * immediateRate * subjectRate)
  const collapseGap = conceptPriming - realization
  const deferred = clamp01(Math.max(0, collapseGap))
  const spin = downstreamRate - immediateRate
  const value = clamp01(0.55 * conceptPriming + 0.45 * realization)

  return {
    kind: probe.kind,
    pattern: probe.raw,
    patternTokens: probe.patternTokens,
    sequenceHits,
    immediateHits,
    immediateOpportunities,
    downstreamHits,
    downstreamOpportunities,
    subjectHits,
    subjectOpportunities,
    immediateRate,
    downstreamRate,
    subjectRate,
    charge,
    conceptPriming,
    realization,
    collapseGap,
    deferred,
    spin,
    support,
    value,
  }
}
