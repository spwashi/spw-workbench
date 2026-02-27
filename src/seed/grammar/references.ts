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
  PathRefNode,
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
import { annotation, colon, capsuleOpen, capsuleClose, identifier, stringLit } from './tokens'
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
 * Local path reference node: ~"./path" or ~<tag>"./path"
 */
export const pathRefNode: Parser<PathRefNode> = named('pathRef',
  function* pathRefParser(stream, depth) {
    const startPos = getPosition(stream)

    // Required ~ operator
    const tildeGen = token('OPERATOR', '~')(stream, depth + 1)
    let tildeStep = tildeGen.next()
    while (!tildeStep.done) {
      yield tildeStep.value
      tildeStep = tildeGen.next()
    }

    if (!tildeStep.value.success) {
      return { success: false, consumed: 0, error: tildeStep.value.error }
    }

    let consumed = tildeStep.value.consumed
    const tildeToken = tildeStep.value.value! as Token<'OPERATOR'>

    // Optional <tag>
    skipWhitespace(stream)
    let tag: Token<'IDENTIFIER'> | undefined

    if (current(stream).type === 'CAPSULE_OPEN') {
      const openGen = capsuleOpen(stream, depth + 1)
      let openStep = openGen.next()
      while (!openStep.done) {
        yield openStep.value
        openStep = openGen.next()
      }

      if (!openStep.value.success) {
        return { success: false, consumed: 0, error: openStep.value.error }
      }
      consumed += openStep.value.consumed

      skipWhitespace(stream)
      const tagGen = identifier(stream, depth + 1)
      let tagStep = tagGen.next()
      while (!tagStep.done) {
        yield tagStep.value
        tagStep = tagGen.next()
      }

      if (!tagStep.value.success) {
        return {
          success: false,
          consumed: 0,
          error: tagStep.value.error ?? {
            message: 'Expected tag identifier inside <...>',
            expected: ['identifier'],
            found: current(stream).type,
            recoverable: false,
          },
        }
      }

      tag = tagStep.value.value!
      consumed += tagStep.value.consumed

      skipWhitespace(stream)
      const closeGen = capsuleClose(stream, depth + 1)
      let closeStep = closeGen.next()
      while (!closeStep.done) {
        yield closeStep.value
        closeStep = closeGen.next()
      }

      if (!closeStep.value.success) {
        return { success: false, consumed: 0, error: closeStep.value.error }
      }
      consumed += closeStep.value.consumed
    }

    // Required string literal path
    skipWhitespace(stream)
    const strGen = stringLit(stream, depth + 1)
    let strStep = strGen.next()
    while (!strStep.done) {
      yield strStep.value
      strStep = strGen.next()
    }

    if (!strStep.value.success) {
      return {
        success: false,
        consumed: 0,
        error: strStep.value.error ?? {
          message: 'Expected string literal path after ~',
          expected: ['string'],
          found: current(stream).type,
          recoverable: false,
        },
      }
    }

    const strTok = strStep.value.value!
    consumed += strStep.value.consumed

    const endPos = getPosition(stream)

    const node: PathRefNode = {
      type: 'PathRef',
      span: { start: startPos, end: endPos },
      operator: tildeToken,
      tag,
      path: {
        type: 'Literal',
        span: { start: strTok.span.start, end: strTok.span.end },
        token: strTok,
      },
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

    // Optional value: either : value, or whitespace-delimited value (common in docs)
    let valueNode: LiteralNode | ReferenceNode | PathRefNode | undefined

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

        // Try pathRef, reference, or literal
        const valueGen = choice<PathRefNode | ReferenceNode | LiteralNode>(pathRefNode, referenceNode, literalNode)(stream, depth + 1)
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
    } else {
      // Whitespace-delimited value (e.g. ~#example "./examples")
      skipWhitespace(stream)
      const valueGen = choice<PathRefNode | ReferenceNode | LiteralNode>(pathRefNode, referenceNode, literalNode)(stream, depth + 1)
      let valueStep = valueGen.next()
      while (!valueStep.done) {
        yield valueStep.value
        valueStep = valueGen.next()
      }

      if (valueStep.value.success) {
        consumed += valueStep.value.consumed
        valueNode = valueStep.value.value as PathRefNode | ReferenceNode | LiteralNode
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
