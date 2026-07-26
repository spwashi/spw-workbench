/**
 * Reference and Annotation Parsers
 *
 * @path.to.thing references and #annotation nodes.
 */

import type {
  Token,
  ReferenceNode,
  AnnotationNode,
  ParticleNode,
  LiteralNode,
  PathRefNode,
  ErrorEventData,
} from '../types'
import {
  type Parser,
  type TokenStream,
  getPosition,
  current,
  peek,
  advance,
  skipWhitespace,
  token,
  choice,
  named,
} from '../combinators'
import { annotation, particle, gloss, colon, capsuleOpen, capsuleClose, identifier, stringLit } from './tokens'
import { glossParts } from '../lexer/matchers'
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

function isBarePathStartToken(token: Token): boolean {
  if (token.type === 'OPERATOR' && token.value === '.') return true
  if (token.type === 'CONNECTOR' && (token.value === '..' || token.value === '/')) return true
  return false
}

function isBarePathToken(token: Token): boolean {
  if (token.type === 'IDENTIFIER' || token.type === 'NUMBER') return true
  if (token.type === 'CONNECTOR' && (token.value === '/' || token.value === '..')) return true
  if (token.type === 'OPERATOR' && (token.value === '.' || token.value === '*')) return true
  return false
}

function isContiguous(left: Token, right: Token): boolean {
  return left.span.end.offset === right.span.start.offset
}

function peekBarePathTokens(stream: TokenStream): Token[] {
  const first = stream.tokens[stream.position]
  if (!first || !isBarePathStartToken(first)) return []

  const tokens: Token[] = []
  let cursor = stream.position
  let previous: Token | undefined

  while (cursor < stream.tokens.length) {
    const token = stream.tokens[cursor]
    if (!token || !isBarePathToken(token)) break
    if (previous && !isContiguous(previous, token)) break
    tokens.push(token)
    previous = token
    cursor += 1
  }

  if (tokens.length === 0) return []
  const raw = tokens.map((token) => token.value).join('')
  if (!(raw.startsWith('./') || raw.startsWith('../') || raw.startsWith('/'))) {
    return []
  }
  return tokens
}

function consumeTokenCount(stream: TokenStream, count: number): void {
  for (let i = 0; i < count; i += 1) {
    advance(stream)
  }
}

function quotePath(path: string): string {
  return `"${path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function stringTokenFromBarePath(tokens: Token[]): Token<'STRING'> {
  const raw = tokens.map((token) => token.value).join('')
  return {
    type: 'STRING',
    value: quotePath(raw),
    span: {
      start: tokens[0].span.start,
      end: tokens[tokens.length - 1].span.end,
    },
    kind: '"',
  }
}

function emitPathSugarWarning(
  stream: TokenStream,
  depth: number,
  message: string
) {
  return {
    type: 'warning' as const,
    rule: 'pathRef.sugar',
    position: getPosition(stream),
    data: {
      message,
      expected: ['string'],
      found: current(stream).type,
      recoverable: true,
    } satisfies ErrorEventData,
    timestamp: performance.now(),
    depth,
  }
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

    // Required string literal path (high-context can desugar bare ./path tokens)
    skipWhitespace(stream)
    const strGen = stringLit(stream, depth + 1)
    let strStep = strGen.next()
    while (!strStep.done) {
      yield strStep.value
      strStep = strGen.next()
    }

    let strTok: Token<'STRING'> | undefined
    if (!strStep.value.success) {
      const barePathTokens = peekBarePathTokens(stream)
      if (barePathTokens.length > 0) {
        if (stream.contextMode === 'low') {
          return {
            success: false,
            consumed: 0,
            error: {
              message: 'Unquoted local path references are high-context sugar. Use ~"..." or parse with contextMode: "high".',
              expected: ['string'],
              found: current(stream).type,
              recoverable: false,
            },
          }
        }

        strTok = stringTokenFromBarePath(barePathTokens)
        consumeTokenCount(stream, barePathTokens.length)
        consumed += barePathTokens.length
        yield emitPathSugarWarning(
          stream,
          depth,
          'Desugared bare local path to canonical quoted path reference.'
        )
      } else {
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
    }

    if (!strTok) {
      strTok = strStep.value.value!
      consumed += strStep.value.consumed
    }

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
/**
 * Particle: `#⟨aim⟩name` — `#>anchor` (deixis), `#:layer` (case).
 * The token arrives pre-fused from the lexer; this node splits aim and name
 * and carries spans so the particle is addressable (fragments resolve to it).
 */
export const particleNode: Parser<ParticleNode> = named('particle',
  function* particleParser(stream, depth) {
    const partGen = particle(stream, depth + 1)
    let partStep = partGen.next()
    while (!partStep.done) {
      yield partStep.value
      partStep = partGen.next()
    }

    if (!partStep.value.success) {
      return { success: false, consumed: 0, error: partStep.value.error }
    }

    const partToken = partStep.value.value! as Token<'PARTICLE'>
    const aim = partToken.value.charAt(1) as ParticleNode['aim']
    const nameToken: Token<'IDENTIFIER'> = {
      type: 'IDENTIFIER',
      value: partToken.value.slice(2),
      span: partToken.span,
    }

    return {
      success: true,
      consumed: partStep.value.consumed,
      value: {
        type: 'Particle' as const,
        token: partToken,
        aim,
        name: nameToken,
        span: partToken.span,
      },
    }
  }
)

/**
 * `~#(nearest neighbor)` / `~#lens(living system)` — one GLOSS token becomes an
 * Annotation carrying a gloss.
 *
 * It stays an Annotation node rather than a type of its own so that everything
 * already counting marks — selectors, the taste instrument, the semantic index
 * — sees a gloss without being taught to. A reading that no instrument can
 * count is the comment we are replacing.
 */
export const glossNode: Parser<AnnotationNode> = named('gloss',
  function* glossParser(stream, depth) {
    const startPos = getPosition(stream)

    const glossGen = gloss(stream, depth + 1)
    let glossStep = glossGen.next()
    while (!glossStep.done) {
      yield glossStep.value
      glossStep = glossGen.next()
    }

    if (!glossStep.value.success) {
      return { success: false, consumed: 0, error: glossStep.value.error }
    }

    const glossToken = glossStep.value.value!
    const parts = glossParts(glossToken.value)

    const node: AnnotationNode = {
      type: 'Annotation',
      span: { start: startPos, end: getPosition(stream) },
      name: {
        type: 'IDENTIFIER',
        value: parts.name ?? '',
        span: glossToken.span,
      },
      gloss: { body: parts.body, anonymous: parts.name === null },
    }

    return { success: true, value: node, consumed: glossStep.value.consumed }
  }
)

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
        } else {
          const barePathTokens = peekBarePathTokens(stream)
          if (barePathTokens.length > 0) {
            if (stream.contextMode === 'low') {
              return {
                success: false,
                consumed: 0,
                error: {
                  message: 'Unquoted annotation path payload is high-context sugar. Use ~#tag "./path" or parse with contextMode: "high".',
                  expected: ['string'],
                  found: current(stream).type,
                  recoverable: false,
                },
              }
            }

            const strTok = stringTokenFromBarePath(barePathTokens)
            consumeTokenCount(stream, barePathTokens.length)
            consumed += barePathTokens.length
            valueNode = {
              type: 'Literal',
              span: { start: strTok.span.start, end: strTok.span.end },
              token: strTok,
            }
            yield emitPathSugarWarning(
              stream,
              depth,
              'Desugared unquoted annotation path payload to canonical quoted string.'
            )
          }
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
      } else {
        const barePathTokens = peekBarePathTokens(stream)
        if (barePathTokens.length > 0) {
          if (stream.contextMode === 'low') {
            return {
              success: false,
              consumed: 0,
              error: {
                message: 'Unquoted annotation path payload is high-context sugar. Use ~#tag "./path" or parse with contextMode: "high".',
                expected: ['string'],
                found: current(stream).type,
                recoverable: false,
              },
            }
          }

          const strTok = stringTokenFromBarePath(barePathTokens)
          consumeTokenCount(stream, barePathTokens.length)
          consumed += barePathTokens.length
          valueNode = {
            type: 'Literal',
            span: { start: strTok.span.start, end: strTok.span.end },
            token: strTok,
          }
          yield emitPathSugarWarning(
            stream,
            depth,
            'Desugared unquoted annotation path payload to canonical quoted string.'
          )
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
