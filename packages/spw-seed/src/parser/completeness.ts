import type { ASTNode, Token } from '../types'
import type { ParseCompletenessReceipt, ParseExpectedRootKind } from './output'

export interface ParseCompletenessInput {
  source: string
  tokens: readonly Token[]
  expectedRootKind: ParseExpectedRootKind
  actualRoot?: ASTNode
  remainingToken?: Token
  proseFallback?: boolean
}

function satisfiesRoot(actualRoot: ASTNode | undefined, expectedRootKind: ParseExpectedRootKind): boolean {
  if (!actualRoot) return false
  if (expectedRootKind === 'Seed') return actualRoot.type === 'Seed'
  return actualRoot.type === 'Expression' || actualRoot.type === 'Sequence'
}

/** Build a source-coordinate receipt without retaining parser-internal cursor state. */
export function buildParseCompletenessReceipt(
  input: ParseCompletenessInput,
): ParseCompletenessReceipt {
  const first = input.tokens[0]
  const last = input.tokens[input.tokens.length - 1]
  const sourceStart = first?.span.start ?? { offset: 0, line: 1, column: 1 }
  const sourceEnd = last?.span.end ?? sourceStart
  const remainingStart = input.remainingToken && input.remainingToken.type !== 'EOF'
    ? input.remainingToken.span.start
    : sourceEnd
  const proseFallback = input.proseFallback === true

  return {
    complete:
      remainingStart.offset >= input.source.length
      && satisfiesRoot(input.actualRoot, input.expectedRootKind)
      && !proseFallback,
    consumed: {
      start: sourceStart,
      end: remainingStart,
    },
    remaining: {
      span: {
        start: remainingStart,
        end: sourceEnd,
      },
      text: input.source.slice(remainingStart.offset),
    },
    expectedRootKind: input.expectedRootKind,
    actualRootKind: input.actualRoot?.type,
    proseFallback,
  }
}
