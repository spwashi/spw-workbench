import type { GapClass, Token, TokenGap } from '../types'

function isGapAnchor(token: Token): boolean {
  return token.type !== 'WHITESPACE' && token.type !== 'COMMENT' && token.type !== 'EOF'
}

function countLineBreaks(raw: string): number {
  return raw.match(/\r\n|\r|\n/g)?.length ?? 0
}

export function classifyGap(raw: string): GapClass {
  if (raw.length === 0) return 'tight'
  const lineBreaks = countLineBreaks(raw)
  if (lineBreaks >= 2) return 'episode'
  if (lineBreaks === 1) return 'cadence'
  return 'open'
}

/**
 * Classify exact source intervals between adjacent lexical anchors.
 * Whitespace and comments remain available as trivia token indices rather than
 * being flattened into an anonymous width.
 */
export function classifyTokenGaps(source: string, tokens: readonly Token[]): TokenGap[] {
  const anchors = tokens
    .map((token, tokenIndex) => ({ token, tokenIndex }))
    .filter(({ token }) => isGapAnchor(token))
  const gaps: TokenGap[] = []

  for (let index = 0; index < anchors.length - 1; index++) {
    const left = anchors[index]!
    const right = anchors[index + 1]!
    const startOffset = left.token.span.end.offset
    const endOffset = right.token.span.start.offset
    const raw = source.slice(startOffset, endOffset)
    const triviaTokenIndices: number[] = []

    for (let tokenIndex = left.tokenIndex + 1; tokenIndex < right.tokenIndex; tokenIndex++) {
      const token = tokens[tokenIndex]
      if (token?.type === 'WHITESPACE' || token?.type === 'COMMENT') {
        triviaTokenIndices.push(tokenIndex)
      }
    }

    gaps.push({
      index,
      class: classifyGap(raw),
      raw,
      span: { start: left.token.span.end, end: right.token.span.start },
      leftTokenIndex: left.tokenIndex,
      rightTokenIndex: right.tokenIndex,
      triviaTokenIndices,
      lineBreaks: countLineBreaks(raw),
    })
  }

  return gaps
}
