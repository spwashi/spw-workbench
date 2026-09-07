/**
 * Annotation lint — catch axis declarations that drop the mood sigil.
 *
 * `#:operation contract` looks like metadata and silently falls out of every
 * axis query. The well-formed twin is `#:operation #!contract`.
 */

import { lex } from '../lexer'
import { isSignificantToken } from '../types/token'

export const ANNOTATION_LINT_VERSION = 'spw.annotation.lint/1' as const

export interface MalformedAxisFinding {
  version: typeof ANNOTATION_LINT_VERSION
  kind: 'malformed-axis'
  line: number
  column: number
  axis: string
  value: string
  expected: string
}

/** Scan one source for `#:axis value` written without `#!value`. */
export function scanMalformedAxes(source: string): MalformedAxisFinding[] {
  const { tokens } = lex(source)
  const significant = tokens.filter(isSignificantToken)
  const findings: MalformedAxisFinding[] = []

  for (let i = 0; i < significant.length; i++) {
    const token = significant[i]!
    if (token.type !== 'PARTICLE' || token.kind !== ':') continue
    const next = significant[i + 1]
    if (!next || next.type !== 'IDENTIFIER') continue
    if (next.span.start.line !== token.span.start.line) continue
    const axis = token.value.slice(2)
    findings.push({
      version: ANNOTATION_LINT_VERSION,
      kind: 'malformed-axis',
      line: next.span.start.line,
      column: next.span.start.column,
      axis,
      value: next.value,
      expected: `#!${next.value}`,
    })
  }

  return findings
}
