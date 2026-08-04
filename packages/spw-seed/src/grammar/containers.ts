/**
 * Container Parsers
 *
 * Frame [], Body {}, Scope ()
 */

import type {
  Token,
  FrameNode,
  BodyNode,
  ScopeNode,
  LiteralNode,
  IdentifierNode,
  ReferenceNode,
  ParameterNode,
  NRangeNode,
  StreamNode,
  CapsuleNode,
  ExpressionNode,
  SequenceNode,
  OperationNode,
} from '../types'
import {
  type Parser,
  getPosition,
  current,
  skipWhitespace,
  choice,
  sepByOptional,
  named,
} from '../combinators'
import {
  identifier,
  colon,
  comma,
  capsuleOpen,
  capsuleClose,
  streamOpen,
  streamClose,
  nrangeOpen,
  nrangeClose,
  openParen,
  closeParen,
  openBracket,
  closeBracket,
  openBrace,
  closeBrace,
} from './tokens'
import { literalNode } from './literals'
import { referenceNode } from './references'
import { parameterNode } from './parameters'
import { sequenceNode, expressionNode, operationNode } from './expressions'

/**
 * Frame content: parameters, references, literals, or operator terms.
 *
 * `operationNode` is last so it only claims what the others decline — chiefly
 * sigil-led arms like `[#label]` and `[=bias]`, which the cheat-sheet teaches
 * and which otherwise voided the frame and degraded the surface to prose.
 *
 * The comma is optional, matching sequences: canon writes list frames one item
 * per line without trailing commas, and those must read as items, not prose.
 */
const frameContent: Parser<(LiteralNode | ReferenceNode | ParameterNode | OperationNode)[]> = named('frameContent',
  sepByOptional(
    choice<LiteralNode | ReferenceNode | ParameterNode | OperationNode>(
      parameterNode,
      referenceNode,
      literalNode,
      operationNode,
    ),
    comma
  )
)

/**
 * Frame: "[" content "]"
 */
export const frameNode: Parser<FrameNode> = named('frame',
  function* frameParser(stream, depth) {
    const startPos = getPosition(stream)

    // Opening bracket
    const openGen = openBracket(stream, depth + 1)
    let openStep = openGen.next()
    while (!openStep.done) {
      yield openStep.value
      openStep = openGen.next()
    }

    if (!openStep.value.success) {
      return { success: false, consumed: 0, error: openStep.value.error }
    }

    let consumed = openStep.value.consumed

    // Content
    skipWhitespace(stream)
    const contentGen = frameContent(stream, depth + 1)
    let contentStep = contentGen.next()
    while (!contentStep.done) {
      yield contentStep.value
      contentStep = contentGen.next()
    }

    const content = contentStep.value.success ? contentStep.value.value! : []
    consumed += contentStep.value.consumed

    // Closing bracket
    skipWhitespace(stream)
    const closeGen = closeBracket(stream, depth + 1)
    let closeStep = closeGen.next()
    while (!closeStep.done) {
      yield closeStep.value
      closeStep = closeGen.next()
    }

    if (!closeStep.value.success) {
      return { success: false, consumed: 0, error: closeStep.value.error }
    }

    consumed += closeStep.value.consumed
    const endPos = getPosition(stream)

    const node: FrameNode = {
      type: 'Frame',
      span: { start: startPos, end: endPos },
      content,
    }

    return { success: true, value: node, consumed }
  }
)

/**
 * Body: "{" sequence "}"
 */
export const bodyNode: Parser<BodyNode> = named('body',
  function* bodyParser(stream, depth) {
    const startPos = getPosition(stream)

    // Opening brace
    const openGen = openBrace(stream, depth + 1)
    let openStep = openGen.next()
    while (!openStep.done) {
      yield openStep.value
      openStep = openGen.next()
    }

    if (!openStep.value.success) {
      return { success: false, consumed: 0, error: openStep.value.error }
    }

    let consumed = openStep.value.consumed

    // Sequence
    skipWhitespace(stream)
    const seqGen = sequenceNode(stream, depth + 1)
    let seqStep = seqGen.next()
    while (!seqStep.done) {
      yield seqStep.value
      seqStep = seqGen.next()
    }

    const seq = seqStep.value.success ? seqStep.value.value! : {
      type: 'Sequence' as const,
      span: { start: startPos, end: startPos },
      expressions: [],
    }
    consumed += seqStep.value.consumed

    // Closing brace
    skipWhitespace(stream)
    const closeGen = closeBrace(stream, depth + 1)
    let closeStep = closeGen.next()
    while (!closeStep.done) {
      yield closeStep.value
      closeStep = closeGen.next()
    }

    if (!closeStep.value.success) {
      return { success: false, consumed: 0, error: closeStep.value.error }
    }

    consumed += closeStep.value.consumed
    const endPos = getPosition(stream)

    const node: BodyNode = {
      type: 'Body',
      span: { start: startPos, end: endPos },
      sequence: seq,
    }

    return { success: true, value: node, consumed }
  }
)

/**
 * Scope: "(" (identifier ":")? sequence ")"
 */
export const scopeNode: Parser<ScopeNode> = named('scope',
  function* scopeParser(stream, depth) {
    const startPos = getPosition(stream)

    // Opening paren
    const openGen = openParen(stream, depth + 1)
    let openStep = openGen.next()
    while (!openStep.done) {
      yield openStep.value
      openStep = openGen.next()
    }

    if (!openStep.value.success) {
      return { success: false, consumed: 0, error: openStep.value.error }
    }

    let consumed = openStep.value.consumed
    let nameToken: Token<'IDENTIFIER'> | undefined

    // Optional name:
    skipWhitespace(stream)
    if (current(stream).type === 'IDENTIFIER') {
      const savedPos = stream.position

      const idGen = identifier(stream, depth + 1)
      let idStep = idGen.next()
      while (!idStep.done) {
        yield idStep.value
        idStep = idGen.next()
      }

      if (idStep.value.success) {
        skipWhitespace(stream)
        if (current(stream).type === 'COLON') {
          nameToken = idStep.value.value
          consumed += idStep.value.consumed

          const colonGen = colon(stream, depth + 1)
          let colonStep = colonGen.next()
          while (!colonStep.done) {
            yield colonStep.value
            colonStep = colonGen.next()
          }
          consumed += colonStep.value.consumed
        } else {
          stream.position = savedPos
        }
      }
    }

    // Sequence
    skipWhitespace(stream)
    const seqGen = sequenceNode(stream, depth + 1)
    let seqStep = seqGen.next()
    while (!seqStep.done) {
      yield seqStep.value
      seqStep = seqGen.next()
    }

    const seq = seqStep.value.success ? seqStep.value.value! : {
      type: 'Sequence' as const,
      span: { start: startPos, end: startPos },
      expressions: [],
    }
    consumed += seqStep.value.consumed

    // Closing paren
    skipWhitespace(stream)
    const closeGen = closeParen(stream, depth + 1)
    let closeStep = closeGen.next()
    while (!closeStep.done) {
      yield closeStep.value
      closeStep = closeGen.next()
    }

    if (!closeStep.value.success) {
      return { success: false, consumed: 0, error: closeStep.value.error }
    }

    consumed += closeStep.value.consumed
    const endPos = getPosition(stream)

    const node: ScopeNode = {
      type: 'Scope',
      span: { start: startPos, end: endPos },
      name: nameToken,
      sequence: seq,
    }

    return { success: true, value: node, consumed }
  }
)

/**
 * N-range: "(( expression? ))" — empty `(())` is structured empty occupancy.
 * Document line ranges use path fragments (`#:L12-L28`), not n-range Bounds.
 */
export const nrangeNode: Parser<NRangeNode> = named('nrange',
  function* nrangeParser(stream, depth) {
    const startPos = getPosition(stream)

    const openGen = nrangeOpen(stream, depth + 1)
    let openStep = openGen.next()
    while (!openStep.done) {
      yield openStep.value
      openStep = openGen.next()
    }
    if (!openStep.value.success) {
      return { success: false, consumed: 0, error: openStep.value.error }
    }

    let consumed = openStep.value.consumed
    let expression: ExpressionNode | undefined

    skipWhitespace(stream)
    // Optional interior: empty n-range before close
    if (current(stream).type !== 'NRANGE_CLOSE') {
      const exprGen = expressionNode(stream, depth + 1)
      let exprStep = exprGen.next()
      while (!exprStep.done) {
        yield exprStep.value
        exprStep = exprGen.next()
      }
      if (exprStep.value.success) {
        expression = exprStep.value.value!
        consumed += exprStep.value.consumed
      }
    }

    skipWhitespace(stream)
    const closeGen = nrangeClose(stream, depth + 1)
    let closeStep = closeGen.next()
    while (!closeStep.done) {
      yield closeStep.value
      closeStep = closeGen.next()
    }
    if (!closeStep.value.success) {
      return { success: false, consumed: 0, error: closeStep.value.error }
    }
    consumed += closeStep.value.consumed

    const endPos = getPosition(stream)
    const node: NRangeNode = {
      type: 'NRange',
      span: { start: startPos, end: endPos },
      ...(expression ? { expression } : {}),
      open: openStep.value.value!,
      close: closeStep.value.value!,
    }

    return { success: true, value: node, consumed }
  }
)

/**
 * Stream boundary: "<< sequence >>" "@sink"?
 */
export const streamNode: Parser<StreamNode> = named('stream',
  function* streamParser(stream, depth) {
    const startPos = getPosition(stream)

    const openGen = streamOpen(stream, depth + 1)
    let openStep = openGen.next()
    while (!openStep.done) {
      yield openStep.value
      openStep = openGen.next()
    }
    if (!openStep.value.success) {
      return { success: false, consumed: 0, error: openStep.value.error }
    }

    let consumed = openStep.value.consumed
    skipWhitespace(stream)

    // Inside these bounds a `>>` closes the stream; outside them it opens a
    // stream entry (see streamEntryNode).
    stream.streamDepth += 1
    const seqGen = sequenceNode(stream, depth + 1)
    let seqStep = seqGen.next()
    while (!seqStep.done) {
      yield seqStep.value
      seqStep = seqGen.next()
    }
    stream.streamDepth -= 1
    if (!seqStep.value.success) {
      return { success: false, consumed: 0, error: seqStep.value.error }
    }
    consumed += seqStep.value.consumed

    skipWhitespace(stream)
    const closeGen = streamClose(stream, depth + 1)
    let closeStep = closeGen.next()
    while (!closeStep.done) {
      yield closeStep.value
      closeStep = closeGen.next()
    }
    if (!closeStep.value.success) {
      return { success: false, consumed: 0, error: closeStep.value.error }
    }
    consumed += closeStep.value.consumed

    // Optional sink reference
    skipWhitespace(stream)
    let sink: ReferenceNode | undefined
    if (current(stream).type === 'OPERATOR' && current(stream).value === '@') {
      const sinkGen = referenceNode(stream, depth + 1)
      let sinkStep = sinkGen.next()
      while (!sinkStep.done) {
        yield sinkStep.value
        sinkStep = sinkGen.next()
      }
      if (sinkStep.value.success) {
        sink = sinkStep.value.value!
        consumed += sinkStep.value.consumed
      }
    }

    const endPos = getPosition(stream)
    const node: StreamNode = {
      type: 'Stream',
      span: { start: startPos, end: endPos },
      open: openStep.value.value!,
      sequence: seqStep.value.value!,
      close: closeStep.value.value!,
      sink,
    }

    return { success: true, value: node, consumed }
  }
)

/**
 * Capsule: "<" (atom frame? body? | sequence) ">"
 *
 * Two interiors, tried in order:
 *
 * - **atom** — identifier (qualitative) or number/string literal (quantitative /
 *   labeled), optionally followed by frame/body. Populates `tag`/`channel`,
 *   which medial composites and channel-census tooling read.
 * - **sequence** — any expression between the bounds (`<X@1>`, `<Module|null>`,
 *   `<scheduled Record>`), recorded on `interior`. Reached only by backtracking
 *   when the atom path fails to land on `>`, so atom capsules parse unchanged.
 *
 * Medial arms (`left`/`right`) are attached by expression composition, not here.
 */
export const capsuleNode: Parser<CapsuleNode> = named('capsule',
  function* capsuleParser(stream, depth) {
    const startPos = getPosition(stream)

    const openGen = capsuleOpen(stream, depth + 1)
    let openStep = openGen.next()
    while (!openStep.done) {
      yield openStep.value
      openStep = openGen.next()
    }
    if (!openStep.value.success) {
      return { success: false, consumed: 0, error: openStep.value.error }
    }

    const openConsumed = openStep.value.consumed
    const afterOpen = stream.position
    let consumed = openConsumed
    skipWhitespace(stream)

    // Optional channel atom: identifier tag or number/string literal
    let tag: Token<'IDENTIFIER'> | undefined
    let channel: LiteralNode | IdentifierNode | undefined

    const tok = current(stream)
    if (tok.type === 'IDENTIFIER') {
      const tagGen = identifier(stream, depth + 1)
      let tagStep = tagGen.next()
      while (!tagStep.done) {
        yield tagStep.value
        tagStep = tagGen.next()
      }
      if (tagStep.value.success) {
        tag = tagStep.value.value!
        consumed += tagStep.value.consumed
        channel = {
          type: 'Identifier',
          span: tag.span,
          token: tag,
        }
      }
    } else if (tok.type === 'NUMBER' || tok.type === 'STRING' || tok.type === 'BOOLEAN') {
      const litGen = literalNode(stream, depth + 1)
      let litStep = litGen.next()
      while (!litStep.done) {
        yield litStep.value
        litStep = litGen.next()
      }
      if (litStep.value.success) {
        channel = litStep.value.value!
        consumed += litStep.value.consumed
      }
    }

    // Optional frame
    let frame: FrameNode | undefined
    skipWhitespace(stream)
    if (current(stream).value === '[') {
      const frameGen = frameNode(stream, depth + 1)
      let frameStep = frameGen.next()
      while (!frameStep.done) {
        yield frameStep.value
        frameStep = frameGen.next()
      }
      if (frameStep.value.success) {
        frame = frameStep.value.value!
        consumed += frameStep.value.consumed
      }
    }

    // Optional body
    let body: BodyNode | undefined
    skipWhitespace(stream)
    if (current(stream).value === '{') {
      const bodyGen = bodyNode(stream, depth + 1)
      let bodyStep = bodyGen.next()
      while (!bodyStep.done) {
        yield bodyStep.value
        bodyStep = bodyGen.next()
      }
      if (bodyStep.value.success) {
        body = bodyStep.value.value!
        consumed += bodyStep.value.consumed
      }
    }

    skipWhitespace(stream)
    let closeGen = capsuleClose(stream, depth + 1)
    let closeStep = closeGen.next()
    while (!closeStep.done) {
      yield closeStep.value
      closeStep = closeGen.next()
    }

    // The atom path did not land on `>`. Rewind to just after `<` and read the
    // interior as a full sequence, so richer channels parse instead of voiding
    // the capsule and degrading the whole surface to prose.
    let interior: SequenceNode | undefined
    if (!closeStep.value.success) {
      stream.position = afterOpen
      consumed = openConsumed
      tag = undefined
      channel = undefined
      frame = undefined
      body = undefined

      skipWhitespace(stream)
      const seqGen = sequenceNode(stream, depth + 1)
      let seqStep = seqGen.next()
      while (!seqStep.done) {
        yield seqStep.value
        seqStep = seqGen.next()
      }
      if (!seqStep.value.success) {
        return { success: false, consumed: 0, error: seqStep.value.error }
      }
      consumed += seqStep.value.consumed

      skipWhitespace(stream)
      closeGen = capsuleClose(stream, depth + 1)
      closeStep = closeGen.next()
      while (!closeStep.done) {
        yield closeStep.value
        closeStep = closeGen.next()
      }
      if (!closeStep.value.success) {
        return { success: false, consumed: 0, error: closeStep.value.error }
      }

      const seq = seqStep.value.value!
      if (seq.expressions.length === 0) {
        // `<>` is the concept operator, not an empty capsule — leave it alone.
        return { success: false, consumed: 0 }
      }
      interior = seq
    }
    consumed += closeStep.value.consumed

    const endPos = getPosition(stream)
    const node: CapsuleNode = {
      type: 'Capsule',
      span: { start: startPos, end: endPos },
      open: openStep.value.value!,
      close: closeStep.value.value!,
      tag,
      channel,
      interior,
      frame,
      body,
      placement: 'shell',
    }

    return { success: true, value: node, consumed }
  }
)
