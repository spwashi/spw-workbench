/**
 * Reference and Annotation Parsers
 *
 * @path.to.thing references and #annotation nodes.
 */

import type {
  Token,
  ReferenceNode,
  AnnotationNode,
  LiteralNode,
} from '../types'
import {
  type Parser,
  getPosition,
  current,
  peek,
  advance,
  skipWhitespace,
  token,
  choice,
  named,
} from '../combinators'
import { annotation, colon } from './tokens'
import { literalNode } from './literals'

function isReferencePathToken(token: Token): boolean {
  if (token.type === 'IDENTIFIER' || token.type === 'TEXT' || token.type === 'NUMBER' || token.type === 'DOT') {
    return true
  }
  if (token.type === 'CONNECTOR' && (token.value === '/' || token.value === '..')) {
    return true
  }
  if (token.type === 'OPERATOR' && token.value === '.') {
    return true
  }
  return false
}

function buildReferencePath(tokens: Token[]): { raw: string; parts: string[]; span: { start: Token['span']['start']; end: Token['span']['end'] } } | null {
  if (tokens.length === 0) return null
  const raw = tokens.map((t) => t.value).join('')
  if (!raw) return null
  const hasSlash = raw.includes('/')
  const parts = hasSlash
    ? raw.split('/').filter(Boolean)
    : raw.split('.').filter(Boolean)
  const span = { start: tokens[0].span.start, end: tokens[tokens.length - 1].span.end }
  return { raw, parts, span }
}

/**
 * Reference node: @path.to.thing
 */
export const referenceNode: Parser<ReferenceNode> = named('reference',
  function* referenceParser(stream, depth) {
    const startPos = getPosition(stream)

    // Required @ operator
    const atGen = token('OPERATOR', '@')(stream, depth + 1)
    let atStep = atGen.next()
    while (!atStep.done) {
      yield atStep.value
      atStep = atGen.next()
    }

    if (!atStep.value.success) {
      return { success: false, consumed: 0, error: atStep.value.error }
    }
    let consumed = atStep.value.consumed

    // Path parts (supports dotted refs and file paths with / and -)
    skipWhitespace(stream)
    const pathTokens: Token[] = []
    let hasSlash = false
    while (true) {
      const token = current(stream)
      if (!isReferencePathToken(token)) break

      if (token.type === 'CONNECTOR' && token.value === '..') {
        const prevWasSlash = pathTokens[pathTokens.length - 1]?.type === 'CONNECTOR'
          && pathTokens[pathTokens.length - 1]?.value === '/'
        const next = peek(stream, 1)
        const nextIsSlash = next?.type === 'CONNECTOR' && next.value === '/'
        if (!hasSlash && !prevWasSlash && !nextIsSlash) break
      }

      pathTokens.push(token)
      if (token.type === 'CONNECTOR' && token.value === '/') {
        hasSlash = true
      }
      advance(stream)
      consumed += 1
    }

    const built = buildReferencePath(pathTokens)
    if (!built) {
      return {
        success: false,
        consumed: 0,
        error: {
          message: 'Expected reference path after @',
          expected: ['identifier'],
          found: current(stream).type,
          recoverable: true,
        },
      }
    }

    const pathParts = built.parts.map((part) => ({
      type: 'IDENTIFIER' as const,
      value: part,
      span: built.span, // Simplified - ideally track each part
    }))

    const endPos = getPosition(stream)
    const node: ReferenceNode = {
      type: 'Reference',
      span: { start: startPos, end: endPos },
      path: pathParts as Token<'IDENTIFIER'>[],
      raw: built.raw,
    }

    return { success: true, value: node, consumed }
  }
)

/**
 * Annotation node: ~#name or ~#name: value
 */
export const annotationNode: Parser<AnnotationNode> = named('annotation',
  function* annotationParser(stream, depth) {
    const startPos = getPosition(stream)

    // Match annotation token
    const annGen = annotation(stream, depth + 1)
    let annStep = annGen.next()
    while (!annStep.done) {
      yield annStep.value
      annStep = annGen.next()
    }

    if (!annStep.value.success) {
      return { success: false, consumed: 0, error: annStep.value.error }
    }

    let consumed = annStep.value.consumed
    const annToken = annStep.value.value!

    // Extract identifier from ~#name
    const nameToken: Token<'IDENTIFIER'> = {
      type: 'IDENTIFIER',
      value: annToken.value.startsWith('~#')
        ? annToken.value.slice(2)
        : annToken.value.slice(1),
      span: annToken.span,
    }

    // Optional : value
    let valueNode: LiteralNode | ReferenceNode | undefined

    skipWhitespace(stream)
    if (current(stream).type === 'COLON') {
      const colonGen = colon(stream, depth + 1)
      let colonStep = colonGen.next()
      while (!colonStep.done) {
        yield colonStep.value
        colonStep = colonGen.next()
      }

      if (colonStep.value.success) {
        consumed += colonStep.value.consumed

        // Try reference or literal
        const valueGen = choice<ReferenceNode | LiteralNode>(referenceNode, literalNode)(stream, depth + 1)
        let valueStep = valueGen.next()
        while (!valueStep.done) {
          yield valueStep.value
          valueStep = valueGen.next()
        }

        if (valueStep.value.success) {
          consumed += valueStep.value.consumed
          valueNode = valueStep.value.value as LiteralNode | ReferenceNode
        }
      }
    }

    const endPos = getPosition(stream)
    const node: AnnotationNode = {
      type: 'Annotation',
      span: { start: startPos, end: endPos },
      name: nameToken,
      value: valueNode,
    }

    return { success: true, value: node, consumed }
  }
)
