/**
 * ChangeReport — lex + brace/AST narrative for two source revisions.
 *
 * Path-match v1: token LCS on non-trivia sequences + brace projection delta.
 * Full tree-edit-distance AST diff is deferred; brace equal is the structural
 * gate for layout-only claims.
 *
 * Layout-only law (measured):
 *   brace.equal ∧ structuralOps === 0 ∧ lex.triviaOnly
 *
 * @see packages/spw-seed/src/canonical/differential.ts
 * @see packages/spw-seed/src/canonical/brace-projection.ts
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
  /** Brace projection equality — structure gate for layout-only. */
  braceEqual: boolean
  brace: BraceProjectionDelta
  /** Parse-free path-match v1: same brace signature is the AST path claim. */
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
  /** brace equal ∧ structuralOps === 0 ∧ triviaOnly */
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
 * Path-match AST compare v1 — brace projection is the structural path product.
 * Does not invent full TED; callers that need richer topology use topographyProbe.
 */
export function compareAst(before: string, after: string): AstChangeReport {
  const bProj = extractBraceProjection(before)
  const aProj = extractBraceProjection(after)
  const brace = braceProjectionDelta(bProj, aProj)
  const findings = [...brace.findings]
  if (brace.equal) {
    findings.push('brace path-match equal')
  } else {
    findings.push(`brace severity: ${brace.severity}`)
  }
  return {
    braceEqual: brace.equal,
    brace,
    pathMatch: brace.equal,
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
    lexReport.structuralOps === 0 &&
    lexReport.triviaOnly

  const noteParts = [
    options.uri ? `uri=${options.uri}` : '',
    identity ? 'identity' : layoutOnly ? 'layout-only' : 'structural-or-surface',
    `lexOps=${lexReport.structuralOps}`,
    `brace=${astReport.braceEqual ? 'eq' : astReport.brace.severity}`,
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

/** Spw dual-read card for agents / pulse disclosure. */
export function formatChangeReportSpw(report: ChangeReport): string {
  const lines = [
    `^["delta"]{`,
    `  ~#version: ${report.version}`,
    `  ~#before: ${report.beforeHash}`,
    `  ~#after: ${report.afterHash}`,
    `  ~#identity: ${report.identity ? '#yes' : '#no'}`,
    `  ~#layoutOnly: ${report.layoutOnly ? '#yes' : '#no'}`,
    `  ~#editSpans: ${report.editSpans}`,
    `  ~#lexStructuralOps: ${report.lex.structuralOps}`,
    `  ~#lexTriviaOnly: ${report.lex.triviaOnly ? '#yes' : '#no'}`,
    `  ~#lexInsert: ${report.lex.inserted}`,
    `  ~#lexDelete: ${report.lex.deleted}`,
    `  ~#lexReplace: ${report.lex.replaced}`,
    `  ~#braceEqual: ${report.ast.braceEqual ? '#yes' : '#no'}`,
    `  ~#braceSeverity: ${report.ast.brace.severity}`,
    `  ~#pathMatch: ${report.ast.pathMatch ? '#yes' : '#no'}`,
    `  ~#note: "${report.note.replace(/"/g, '\\"')}"`,
    `}`,
  ]
  return lines.join('\n')
}
