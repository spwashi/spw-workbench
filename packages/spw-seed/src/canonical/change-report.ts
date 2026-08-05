/**
 * ChangeReport — lex + brace/AST narrative for two source revisions.
 *
 * Path-match: token LCS + brace projection + nest-path skeleton (phase 4b).
 * Container labels ride on nest paths for delta; label renames are not layout-only.
 * Full TED AST diff remains deferred.
 *
 * Layout-only law (measured):
 *   brace.equal ∧ nest.skeletonEqual ∧ nest.labelsEqual
 *   ∧ structuralOps === 0 ∧ lex.triviaOnly
 *
 * @see packages/spw-seed/src/canonical/differential.ts
 * @see packages/spw-seed/src/canonical/brace-projection.ts
 * @see packages/spw-seed/src/canonical/nest-path.ts
 * @see docs/theory/spw/operational-field.spw
 */

import { lex } from '../lexer'
import type { Token, TokenType } from '../types'
import { hashString } from './canonicalize'
import {
  extractBraceProjection,
  braceProjectionDelta,
  type BraceProjectionDelta,
} from './brace-projection'
import { differentialFromSources } from './differential'
import {
  scanNestPaths,
  nestPathDelta,
  type NestPathDelta,
  type NestPathLattice,
} from './nest-path'
import { facet, formatSpwCard } from './spw-card'

export const CHANGE_REPORT_VERSION = 'spw.change_report/1' as const

/** Token kinds that never alone refute a layout-only claim. */
const TRIVIA_TYPES = new Set<TokenType>(['WHITESPACE', 'COMMENT', 'EOF'])

export type LexOpKind = 'equal' | 'insert' | 'delete' | 'replace'

export interface LexTokenKey {
  type: TokenType
  value: string
  trivia: boolean
}

export interface LexOp {
  kind: LexOpKind
  /** Condensed key for the before token (delete/replace/equal). */
  before?: LexTokenKey
  /** Condensed key for the after token (insert/replace/equal). */
  after?: LexTokenKey
}

export interface LexChangeReport {
  beforeCount: number
  afterCount: number
  triviaBefore: number
  triviaAfter: number
  /** Non-trivia sequence lengths. */
  structuralBefore: number
  structuralAfter: number
  inserted: number
  deleted: number
  replaced: number
  equal: number
  /** True when non-trivia sequences are identical (only trivia may differ). */
  triviaOnly: boolean
  /** Count of insert+delete+replace on the structural sequence. */
  structuralOps: number
  /** Capped op sample for dual-read / debug (not full LCS dump). */
  sampleOps: LexOp[]
}

export interface AstChangeReport {
  /** Brace projection equality — count/signature gate. */
  braceEqual: boolean
  brace: BraceProjectionDelta
  /** Nest-path forests for both revisions. */
  nestBefore: NestPathLattice
  nestAfter: NestPathLattice
  /** Nest skeleton + label delta (container labels where present). */
  nest: NestPathDelta
  /**
   * Structural path-match: brace equal ∧ nest skeleton equal.
   * Label renames keep pathMatch true but clear layoutOnly.
   */
  pathMatch: boolean
  findings: string[]
}

export interface ChangeReport {
  version: typeof CHANGE_REPORT_VERSION
  beforeHash: string
  afterHash: string
  identity: boolean
  lex: LexChangeReport
  ast: AstChangeReport
  /**
   * brace equal ∧ nest skeleton equal ∧ nest labels equal
   * ∧ structuralOps === 0 ∧ triviaOnly
   */
  layoutOnly: boolean
  /** Line-oriented edit count from differential (not identity of layoutOnly). */
  editSpans: number
  note: string
}

function isTrivia(t: Token): boolean {
  return TRIVIA_TYPES.has(t.type)
}

function tokenKey(t: Token): LexTokenKey {
  return {
    type: t.type,
    value: t.value,
    trivia: isTrivia(t),
  }
}

function keyEquals(a: LexTokenKey, b: LexTokenKey): boolean {
  return a.type === b.type && a.value === b.value
}

function structuralKeys(tokens: readonly Token[]): LexTokenKey[] {
  return tokens.filter(t => !isTrivia(t)).map(tokenKey)
}

/**
 * Classic LCS backtrack → insert/delete/replace/equal ops on two sequences.
 * O(nm) — fine for surface-sized files; not for multi-MB dumps.
 */
function lcsOps(before: readonly LexTokenKey[], after: readonly LexTokenKey[]): LexOp[] {
  const n = before.length
  const m = after.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (keyEquals(before[i - 1]!, after[j - 1]!)) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
      }
    }
  }

  const ops: LexOp[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && keyEquals(before[i - 1]!, after[j - 1]!)) {
      ops.push({ kind: 'equal', before: before[i - 1], after: after[j - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      ops.push({ kind: 'insert', after: after[j - 1] })
      j--
    } else if (i > 0) {
      ops.push({ kind: 'delete', before: before[i - 1] })
      i--
    }
  }
  ops.reverse()

  // Coalesce adjacent delete+insert into replace for dual-read thrift
  const coalesced: LexOp[] = []
  for (let k = 0; k < ops.length; k++) {
    const cur = ops[k]!
    const next = ops[k + 1]
    if (cur.kind === 'delete' && next?.kind === 'insert') {
      coalesced.push({ kind: 'replace', before: cur.before, after: next.after })
      k++
    } else {
      coalesced.push(cur)
    }
  }
  return coalesced
}

const SAMPLE_CAP = 24

/** Compare two sources at the token level (structural sequence + trivia counts). */
export function compareLex(before: string, after: string): LexChangeReport {
  const beforeTokens = lex(before).tokens
  const afterTokens = lex(after).tokens
  const bStruct = structuralKeys(beforeTokens)
  const aStruct = structuralKeys(afterTokens)
  const ops = lcsOps(bStruct, aStruct)

  let inserted = 0
  let deleted = 0
  let replaced = 0
  let equal = 0
  for (const op of ops) {
    switch (op.kind) {
      case 'insert':
        inserted++
        break
      case 'delete':
        deleted++
        break
      case 'replace':
        replaced++
        break
      case 'equal':
        equal++
        break
    }
  }

  const structuralOps = inserted + deleted + replaced
  const triviaBefore = beforeTokens.filter(isTrivia).length
  const triviaAfter = afterTokens.filter(isTrivia).length

  return {
    beforeCount: beforeTokens.length,
    afterCount: afterTokens.length,
    triviaBefore,
    triviaAfter,
    structuralBefore: bStruct.length,
    structuralAfter: aStruct.length,
    inserted,
    deleted,
    replaced,
    equal,
    triviaOnly: structuralOps === 0,
    structuralOps,
    sampleOps: ops.filter(o => o.kind !== 'equal').slice(0, SAMPLE_CAP),
  }
}

/**
 * AST/form compare — brace counts + nest-path skeleton (with container labels).
 * Does not invent full TED; topographyProbe remains for richer topology.
 */
export function compareAst(before: string, after: string): AstChangeReport {
  const bProj = extractBraceProjection(before)
  const aProj = extractBraceProjection(after)
  const brace = braceProjectionDelta(bProj, aProj)
  const nestBefore = scanNestPaths(before)
  const nestAfter = scanNestPaths(after)
  const nest = nestPathDelta(nestBefore, nestAfter)
  const findings = [...brace.findings, ...nest.findings]
  if (brace.equal) {
    findings.push('brace path-match equal')
  } else {
    findings.push(`brace severity: ${brace.severity}`)
  }
  const pathMatch = brace.equal && nest.skeletonEqual
  if (pathMatch) findings.push('nest skeleton path-match')
  return {
    braceEqual: brace.equal,
    brace,
    nestBefore,
    nestAfter,
    nest,
    pathMatch,
    findings,
  }
}

/** Build a full ChangeReport for two revisions of one surface. */
export function buildChangeReport(
  before: string,
  after: string,
  options: { uri?: string } = {},
): ChangeReport {
  const beforeHash = hashString(before).slice(0, 16)
  const afterHash = hashString(after).slice(0, 16)
  const identity = before === after
  const lexReport = compareLex(before, after)
  const astReport = compareAst(before, after)
  const differential = differentialFromSources(
    before,
    after,
    'change_report',
    'source',
    hashString,
  )
  const layoutOnly =
    !identity &&
    astReport.braceEqual &&
    astReport.nest.skeletonEqual &&
    astReport.nest.labelsEqual &&
    lexReport.structuralOps === 0 &&
    lexReport.triviaOnly

  const noteParts = [
    options.uri ? `uri=${options.uri}` : '',
    identity ? 'identity' : layoutOnly ? 'layout-only' : 'structural-or-surface',
    `lexOps=${lexReport.structuralOps}`,
    `brace=${astReport.braceEqual ? 'eq' : astReport.brace.severity}`,
    `nest=${astReport.nest.skeletonEqual ? 'eq' : 'moved'}`,
    `labels=${astReport.nest.labelsEqual ? 'eq' : 'moved'}`,
  ].filter(Boolean)

  return {
    version: CHANGE_REPORT_VERSION,
    beforeHash,
    afterHash,
    identity,
    lex: lexReport,
    ast: astReport,
    layoutOnly,
    editSpans: differential.edits.length,
    note: noteParts.join(' · '),
  }
}

/**
 * Spw dual-read disclosure of a ChangeReport.
 * Nested frames = groups (representational-disclosure doctrine).
 */
export function formatChangeReportSpw(report: ChangeReport): string {
  const nest = report.ast.nest
  const labelBits = [
    ...nest.labelsRemoved.map(l => `-${l}`),
    ...nest.labelsAdded.map(l => `+${l}`),
  ]
  return formatSpwCard('delta', [
    facet.group('identity', [
      facet.atom('version', report.version),
      facet.atom('before', report.beforeHash),
      facet.atom('after', report.afterHash),
      facet.flag('identity', report.identity),
      facet.flag('layoutOnly', report.layoutOnly),
      facet.atom('editSpans', report.editSpans),
    ]),
    facet.group('lex', [
      facet.atom('ops', report.lex.structuralOps),
      facet.flag('trivia', report.lex.triviaOnly),
      facet.atom('insert', report.lex.inserted),
      facet.atom('delete', report.lex.deleted),
      facet.atom('replace', report.lex.replaced),
    ]),
    facet.group('form', [
      facet.flag('braceEq', report.ast.braceEqual),
      facet.atom('brace', report.ast.brace.severity),
      facet.flag('pathMatch', report.ast.pathMatch),
      facet.state('nest', nest.skeletonEqual),
      facet.str('nestBefore', nest.beforeSkeleton || undefined),
      facet.str('nestAfter', nest.afterSkeleton || undefined),
      facet.str('labeledBefore', nest.beforeLabeled || undefined),
      facet.str('labeledAfter', nest.afterLabeled || undefined),
      facet.state('labels', nest.labelsEqual),
      facet.list('labelDelta', labelBits),
    ]),
    facet.group('note', [facet.str('text', report.note)]),
  ])
}
