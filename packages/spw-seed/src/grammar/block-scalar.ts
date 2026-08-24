/**
 * Indentation-bounded prose values: `key: |` followed by deeper lines.
 *
 * The pipe is a connector everywhere else. It becomes a block-scalar marker
 * only when it ends its line; the scalar then owns subsequent lines whose
 * first significant token is deeper than the binding key. This keeps sibling
 * keys and enclosing closes available to the surrounding sequence parser.
 */

import type { ProseChunkNode, Token } from '../types'
import {
  type Parser,
  advance,
  current,
  named,
} from '../combinators'

function isTrivia(token: Token): boolean {
  return token.type === 'WHITESPACE'
}

function firstSignificantColumnOnLine(tokens: Token[], pipeIndex: number): number {
  const line = tokens[pipeIndex]!.span.start.line
  let column = tokens[pipeIndex]!.span.start.column

  for (let index = pipeIndex - 1; index >= 0; index--) {
    const token = tokens[index]!
    if (token.span.end.line < line) break
    if (token.span.start.line === line && !isTrivia(token) && token.type !== 'COMMENT') {
      column = Math.min(column, token.span.start.column)
    }
  }

  return column
}

function nextNonWhitespace(tokens: Token[], from: number): Token | undefined {
  for (let index = from; index < tokens.length; index++) {
    const token = tokens[index]!
    if (!isTrivia(token)) return token
  }
  return undefined
}

function normalizeBlockText(raw: string): string {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  while (lines.length > 0 && lines[0]!.trim() === '') lines.shift()
  while (lines.length > 0 && lines[lines.length - 1]!.trim() === '') lines.pop()

  const indents = lines
    .filter(line => line.trim().length > 0)
    .map(line => line.match(/^[ \t]*/)?.[0].length ?? 0)
  const indent = indents.length > 0 ? Math.min(...indents) : 0

  return lines.map(line => line.slice(Math.min(indent, line.length))).join('\n')
}

/** Parse an indentation-bounded block scalar into the existing prose leaf. */
export const blockScalarNode: Parser<ProseChunkNode> = named('blockScalar',
  function* blockScalarParser(stream, _depth) {
    yield* []

    const pipeIndex = stream.position
    const pipe = current(stream)
    if (pipe.type !== 'CONNECTOR' || pipe.value !== '|') {
      return {
        success: false,
        consumed: 0,
        error: {
          message: 'Expected an indentation-bounded block scalar',
          expected: ['| followed by an indented line'],
          found: pipe.type,
          recoverable: true,
        },
      }
    }

    const afterPipe = nextNonWhitespace(stream.tokens, pipeIndex + 1)
    if (afterPipe && afterPipe.span.start.line === pipe.span.start.line) {
      return {
        success: false,
        consumed: 0,
        error: {
          message: 'Inline | remains a connector',
          expected: ['newline after |'],
          found: afterPipe.type,
          recoverable: true,
        },
      }
    }

    const baseColumn = firstSignificantColumnOnLine(stream.tokens, pipeIndex)
    const collected: Token[] = []
    let consumed = 1
    advance(stream)

    while (true) {
      const token = current(stream)
      if (token.type === 'EOF') break

      const next = isTrivia(token)
        ? nextNonWhitespace(stream.tokens, stream.position + 1)
        : token
      if (!next || next.type === 'EOF') break

      if (
        next.span.start.line > pipe.span.start.line
        && next.span.start.column <= baseColumn
      ) {
        break
      }

      collected.push(token)
      advance(stream)
      consumed++
    }

    const last = collected[collected.length - 1] ?? pipe
    return {
      success: true,
      consumed,
      value: {
        type: 'ProseChunk',
        span: { start: pipe.span.start, end: last.span.end },
        text: normalizeBlockText(collected.map(token => token.value).join('')),
      },
    }
  },
)
