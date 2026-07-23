/**
 * Expression, Operation, Term, and Sequence Parsers
 *
 * Core grammar rules for Spw expressions.
 */

import type {
  Token,
  ExpressionNode,
  BindingNode,
  OperationNode,
  SequenceNode,
  FrameNode,
  BodyNode,
  ProseChunkNode,
  ModifierChainNode,
  TermNode,
  CapsuleNode,
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
  literal,
  choice,
  lazy,
  named,
} from '../combinators'
import { operator, connector, colon, identifier } from './tokens'
import { referenceNode, annotationNode, pathRefNode } from './references'
import { modifierChain } from './modifiers'
import { frameNode, bodyNode, scopeNode, capsuleNode, streamNode, nrangeNode } from './containers'
import { literalNode, identifierNode } from './literals'
import { wildcardNode, spreadNode } from './patterns'
import { matchNode } from './match'
import { bulletNode } from './bullets'

// matchNode — extracted to ./match.ts
export { matchNode } from './match'

const INLINE_PAYLOAD_OPERATORS = new Set(['#', '?'])
const INLINE_PAYLOAD_PUNCT = new Set(['.', '#', '?', '!'])
const LOW_CONTEXT_PATH_SUGAR_ERROR =
  'Unquoted local path references are high-context sugar. Use ~"..." or parse with contextMode: "high".'

function isBarePathStartToken(token: Token): boolean {
  if (token.type === 'OPERATOR' && token.value === '.') return true
  if (token.type === 'CONNECTOR' && (token.value === '..' || token.value === '/')) return true
  return false
}

function shouldStopLinePayload(token: Token, previous?: Token): boolean {
  if (token.type === 'COMMENT') return true
  if (token.type === 'CONNECTOR') return true
  if (token.type === 'CAPSULE_OPEN' || token.type === 'CAPSULE_CLOSE') return true
  if (token.type === 'STREAM_OPEN' || token.type === 'STREAM_CLOSE') return true
  if (token.type === 'NRANGE_OPEN' || token.type === 'NRANGE_CLOSE') return true
  if (token.type === 'WHITESPACE' && token.value.includes('\n')) return true
  if (token.type === 'OPERATOR') {
    const prevWasWhitespace = !previous || previous.type === 'WHITESPACE'
    const isPunctuation = INLINE_PAYLOAD_PUNCT.has(token.value)
    return prevWasWhitespace || !isPunctuation
  }
  return false
}

function readLinePayload(stream: TokenStream, opToken: Token): { node?: ProseChunkNode; consumed: number } {
  const opLine = opToken.span.start.line
  const collected: Token[] = []
  let consumed = 0
  let prev: Token | undefined

  while (true) {
    const token = current(stream)
    if (token.type === 'EOF') break
    if (token.span.start.line !== opLine) break
    if (shouldStopLinePayload(token, prev)) break
    collected.push(token)
    prev = token
    advance(stream)
    consumed++
  }

  let startIndex = 0
  while (startIndex < collected.length && collected[startIndex].type === 'WHITESPACE') startIndex++
  let endIndex = collected.length - 1
  while (endIndex >= startIndex && collected[endIndex].type === 'WHITESPACE') endIndex--

  if (startIndex > endIndex) {
    return { consumed }
  }

  const text = collected.slice(startIndex, endIndex + 1).map((t) => t.value).join('')
  const node: ProseChunkNode = {
    type: 'ProseChunk',
    span: {
      start: collected[startIndex].span.start,
      end: collected[endIndex].span.end,
    },
    text,
  }
  return { node, consumed }
}

// Forward declarations for recursive grammar
export const expressionNode: Parser<ExpressionNode> = lazy(() => expressionImpl)
export const sequenceNode: Parser<SequenceNode> = lazy(() => sequenceImpl)

/**
 * Operation: modifier_chain? operator frame? body?
 */
export const operationNode: Parser<OperationNode> = named('operation',
  function* operationParser(stream, depth) {
    const startPos = getPosition(stream)
    let consumed = 0
    let modifiers: ModifierChainNode | undefined
    let operatorLabel: Token<'IDENTIFIER'> | undefined

    skipWhitespace(stream)

    // Optional modifier chain (before operator) - legacy/alternate form: boon!["x"]
    if (current(stream).type === 'MODIFIER') {
      const modGen = modifierChain(stream, depth + 1)
      let modStep = modGen.next()
      while (!modStep.done) {
        yield modStep.value
        modStep = modGen.next()
      }

      if (modStep.value.success) {
        modifiers = modStep.value.value
        consumed += modStep.value.consumed
      }
    }

    // Required operator
    skipWhitespace(stream)
    const opGen = operator(stream, depth + 1)
    let opStep = opGen.next()
    while (!opStep.done) {
      yield opStep.value
      opStep = opGen.next()
    }

    if (!opStep.value.success) {
      return { success: false, consumed: 0, error: opStep.value.error }
    }

    const operatorToken = opStep.value.value!
    consumed += opStep.value.consumed

    // In low-context mode, `~` followed by ./, ../, or /... is reserved for quoted path refs only.
    // Prevent treating this form as a generic operation chain.
    skipWhitespace(stream)
    if (
      operatorToken.value === '~'
      && stream.contextMode === 'low'
      && isBarePathStartToken(current(stream))
    ) {
      return {
        success: false,
        consumed: 0,
        error: {
          message: LOW_CONTEXT_PATH_SUGAR_ERROR,
          expected: ['string'],
          found: current(stream).type,
          recoverable: false,
        },
      }
    }

    // Optional operator label (strict adjacency required: !label, not ! label)
    // Note: lexeme() skips trailing whitespace, so we must check token positions.
    const isAdjacent = (
      operatorToken.span.end.offset === current(stream).span.start.offset ||
      operatorToken.span.end.line === current(stream).span.start.line &&
      operatorToken.span.end.column === current(stream).span.start.column
    )

    if (isAdjacent && current(stream).type === 'IDENTIFIER') {
      const labelGen = identifier(stream, depth + 1)
      let labelStep = labelGen.next()
      while (!labelStep.done) {
        yield labelStep.value
        labelStep = labelGen.next()
      }

      if (labelStep.value.success) {
        operatorLabel = labelStep.value.value! as Token<'IDENTIFIER'>
        consumed += labelStep.value.consumed
      }
    }

    // Optional modifier chain (after operator) - canonical form: !boon["x"]
    skipWhitespace(stream)
    if (!modifiers && current(stream).type === 'MODIFIER') {
      const modGen = modifierChain(stream, depth + 1)
      let modStep = modGen.next()
      while (!modStep.done) {
        yield modStep.value
        modStep = modGen.next()
      }

      if (modStep.value.success) {
        modifiers = modStep.value.value
        consumed += modStep.value.consumed
      }
    }

    // Fallback: allow identifier chain as modifier (e.g. ^name["x"])
    skipWhitespace(stream)
    if (!modifiers && current(stream).type === 'IDENTIFIER' && !current(stream).value.startsWith('_')) {
      const idGen = identifier(stream, depth + 1)
      let idStep = idGen.next()
      while (!idStep.done) {
        yield idStep.value
        idStep = idGen.next()
      }

      if (idStep.value.success) {
        const modifierTokens: Token<'MODIFIER'>[] = [{
          type: 'MODIFIER',
          value: idStep.value.value!.value,
          span: idStep.value.value!.span,
          kind: idStep.value.value!.value,
        }]
        consumed += idStep.value.consumed

        skipWhitespace(stream)
        if (current(stream).value === '.') {
          const savedPos = stream.position
          const dotGen = literal('.')(stream, depth + 1)
          let dotStep = dotGen.next()
          while (!dotStep.done) {
            yield dotStep.value
            dotStep = dotGen.next()
          }

          if (dotStep.value.success) {
            const nextGen = identifier(stream, depth + 1)
            let nextStep = nextGen.next()
            while (!nextStep.done) {
              yield nextStep.value
              nextStep = nextGen.next()
            }

            if (nextStep.value.success) {
              modifierTokens.push({
                type: 'MODIFIER',
                value: nextStep.value.value!.value,
                span: nextStep.value.value!.span,
                kind: nextStep.value.value!.value,
              })
              consumed += dotStep.value.consumed + nextStep.value.consumed
            } else {
              stream.position = savedPos
            }
          }
        }

        const endPos = getPosition(stream)
        modifiers = {
          type: 'ModifierChain',
          span: { start: startPos, end: endPos },
          modifiers: modifierTokens,
        }
      }
    }

    // Optional subject for operators that take a direct term payload (e.g. ^"setup"{...})
    // Also: ? takes a Scope when the next token is `(` so probes stay structured.
    let subject: TermNode | undefined
    if (operatorToken.value === '^') {
      skipWhitespace(stream)
      if (current(stream).type === 'STRING' || current(stream).type === 'IDENTIFIER' || current(stream).type === 'OPERATOR' || current(stream).type === 'CAPSULE_OPEN') {
        const subjGen = choice<TermNode>(pathRefNode, referenceNode, identifierNode, literalNode, capsuleNode, scopeNode, wildcardNode, spreadNode)(stream, depth + 1)
        let subjStep = subjGen.next()
        while (!subjStep.done) {
          yield subjStep.value
          subjStep = subjGen.next()
        }

        if (subjStep.value.success) {
          subject = subjStep.value.value!
          consumed += subjStep.value.consumed
        }
      }
    } else if (operatorToken.value === '=') {
      // Bias anchor: the from-pole of a bias edge (`=@node{…}`, `=~"path"{…}`).
      // Only operator-led terms qualify — a bare identifier stays the operator
      // label (`=ref`) and a string stays a config value, so neither is grabbed
      // as an anchor. Elided anchor = the enclosing node (reflexive bias).
      skipWhitespace(stream)
      if (current(stream).type === 'OPERATOR') {
        const subjGen = choice<TermNode>(pathRefNode, referenceNode)(stream, depth + 1)
        let subjStep = subjGen.next()
        while (!subjStep.done) {
          yield subjStep.value
          subjStep = subjGen.next()
        }
        if (subjStep.value.success) {
          subject = subjStep.value.value!
          consumed += subjStep.value.consumed
        }
      }
    } else if (operatorToken.value === '?') {
      skipWhitespace(stream)
      if (current(stream).type === 'CONTAINER_OPEN' && current(stream).value === '(') {
        const scopeGen = scopeNode(stream, depth + 1)
        let scopeStep = scopeGen.next()
        while (!scopeStep.done) {
          yield scopeStep.value
          scopeStep = scopeGen.next()
        }
        if (scopeStep.value.success) {
          subject = scopeStep.value.value!
          consumed += scopeStep.value.consumed
        }
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

      if (!frameStep.value.success) {
        return { success: false, consumed: 0, error: frameStep.value.error }
      }

      frame = frameStep.value.value
      consumed += frameStep.value.consumed
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

      if (!bodyStep.value.success) {
        return { success: false, consumed: 0, error: bodyStep.value.error }
      }

      body = bodyStep.value.value
      consumed += bodyStep.value.consumed
    }

    // Optional inline payload for line-scoped operators (#, ?)
    // Skip when ? already bound a Scope subject — keep probes inspectable.
    let linePayload: ProseChunkNode | undefined
    if (
      !frame
      && !body
      && !subject
      && INLINE_PAYLOAD_OPERATORS.has(operatorToken.value)
    ) {
      skipWhitespace(stream)
      const payload = readLinePayload(stream, operatorToken)
      if (payload.node) {
        linePayload = payload.node
      }
      consumed += payload.consumed
    }

    const endPos = getPosition(stream)
    const node: OperationNode = {
      type: 'Operation',
      span: { start: startPos, end: endPos },
      modifiers,
      operator: operatorToken as Token<'OPERATOR'>,
      operatorLabel,
      frame,
      body,
      subject,
      linePayload,
    }

    return { success: true, value: node, consumed }
  }
)

// bulletNode — extracted to ./bullets.ts
export { bulletNode } from './bullets'

/**
 * Term: operation | scope | reference
 * Note: Uses lazy() to handle circular dependency with containers.ts
 */
export const termNode: Parser<TermNode> = lazy(() => named('term',
  function* termParser(stream, depth) {
    const token = current(stream)
    const nextToken = peek(stream, 1)

    // Commit ?match to the match grammar so malformed match syntax
    // cannot silently fall back to generic ? operation parsing.
    if (
      token.type === 'OPERATOR'
      && token.value === '?'
      && nextToken?.type === 'IDENTIFIER'
      && nextToken.value === 'match'
    ) {
      const matchGen = matchNode(stream, depth + 1)
      let matchStep = matchGen.next()
      while (!matchStep.done) {
        yield matchStep.value
        matchStep = matchGen.next()
      }

      if (matchStep.value.success) {
        return {
          success: true,
          value: matchStep.value.value!,
          consumed: matchStep.value.consumed,
        }
      }

      return {
        success: false,
        consumed: 0,
        error: matchStep.value.error ?? {
          message: 'Invalid match expression',
          expected: ['?match[expression]{ pattern => handler }'],
          found: current(stream).type,
          recoverable: false,
        },
      }
    }

    // Commit @_label to operation parsing so perspective labels are not
    // swallowed as bare references.
    if (
      token.type === 'OPERATOR'
      && token.value === '@'
      && nextToken?.type === 'IDENTIFIER'
      && nextToken.value.startsWith('_')
    ) {
      const opGen = operationNode(stream, depth + 1)
      let opStep = opGen.next()
      while (!opStep.done) {
        yield opStep.value
        opStep = opGen.next()
      }

      if (opStep.value.success) {
        return {
          success: true,
          value: opStep.value.value!,
          consumed: opStep.value.consumed,
        }
      }

      return {
        success: false,
        consumed: 0,
        error: opStep.value.error ?? {
          message: 'Invalid labeled perspective operation',
          expected: ['@_label[frame]{body}'],
          found: current(stream).type,
          recoverable: false,
        },
      }
    }

    const fallbackGen = choice<TermNode>(
      bulletNode,
      annotationNode,
      pathRefNode,
      referenceNode,
      operationNode,
      identifierNode,
      wildcardNode,
      spreadNode,
      scopeNode,
      literalNode,
      capsuleNode,
      frameNode,
      streamNode,
      nrangeNode,
      bodyNode
    )(stream, depth + 1)

    let fallbackStep = fallbackGen.next()
    while (!fallbackStep.done) {
      yield fallbackStep.value
      fallbackStep = fallbackGen.next()
    }

    return fallbackStep.value
  }
))

/**
 * Expression: term (connector term)*
 */
export const expressionImpl: Parser<ExpressionNode> = named('expression',
  function* expressionParser(stream, depth) {
    const startPos = getPosition(stream)

    // First term
    skipWhitespace(stream)
    const firstGen = termNode(stream, depth + 1)
    let firstStep = firstGen.next()
    while (!firstStep.done) {
      yield firstStep.value
      firstStep = firstGen.next()
    }

    if (!firstStep.value.success) {
      return { success: false, consumed: 0, error: firstStep.value.error }
    }

    // First term, then optional medial capsules: left<channel>right
    // e.g. bagel<scent>coffee, foo<5>bar, chain a<r>b<s>c
    let headTerm = firstStep.value.value!
    let consumed = firstStep.value.consumed

    while (true) {
      const saved = stream.position
      skipWhitespace(stream)
      if (current(stream).type !== 'CAPSULE_OPEN') {
        stream.position = saved
        break
      }

      const capGen = capsuleNode(stream, depth + 1)
      let capStep = capGen.next()
      while (!capStep.done) {
        yield capStep.value
        capStep = capGen.next()
      }

      if (!capStep.value.success) {
        stream.position = saved
        break
      }

      let right: TermNode | undefined
      const afterCap = stream.position
      skipWhitespace(stream)
      // Prefer a tight right arm; do not swallow connectors / closers.
      const rightTok = current(stream)
      if (
        rightTok.type !== 'EOF'
        && rightTok.type !== 'CONNECTOR'
        && rightTok.type !== 'COLON'
        && rightTok.type !== 'CONTAINER_CLOSE'
        && rightTok.type !== 'CAPSULE_CLOSE'
        && rightTok.type !== 'STREAM_CLOSE'
        && rightTok.type !== 'NRANGE_CLOSE'
        && !(rightTok.type === 'OPERATOR' && rightTok.value === '<>')
      ) {
        const rightGen = termNode(stream, depth + 1)
        let rightStep = rightGen.next()
        while (!rightStep.done) {
          yield rightStep.value
          rightStep = rightGen.next()
        }
        if (rightStep.value.success && rightStep.value.consumed > 0) {
          right = rightStep.value.value!
          consumed += rightStep.value.consumed
        } else {
          stream.position = afterCap
        }
      } else {
        stream.position = afterCap
      }

      const shell = capStep.value.value!
      consumed += capStep.value.consumed
      const endPos = getPosition(stream)
      const medial: CapsuleNode = {
        ...shell,
        type: 'Capsule',
        span: { start: headTerm.span.start, end: right?.span.end ?? shell.span.end ?? endPos },
        left: headTerm,
        right,
        placement: 'medial',
      }
      headTerm = medial
    }

    const terms: TermNode[] = [headTerm]
    const connectors: Token<'CONNECTOR'>[] = []

    // Binding: <term> : <expression>
    skipWhitespace(stream)
    if (current(stream).type === 'COLON') {
      const colonGen = colon(stream, depth + 1)
      let colonStep = colonGen.next()
      while (!colonStep.done) {
        yield colonStep.value
        colonStep = colonGen.next()
      }

      if (!colonStep.value.success) {
        return { success: false, consumed: 0, error: colonStep.value.error }
      }
      consumed += colonStep.value.consumed

      skipWhitespace(stream)
      const rhsGen = expressionNode(stream, depth + 1)
      let rhsStep = rhsGen.next()
      while (!rhsStep.done) {
        yield rhsStep.value
        rhsStep = rhsGen.next()
      }

      if (!rhsStep.value.success) {
        return { success: false, consumed: 0, error: rhsStep.value.error }
      }
      consumed += rhsStep.value.consumed

      const endPos = getPosition(stream)
      const binding: BindingNode = {
        type: 'Binding',
        span: { start: startPos, end: endPos },
        key: headTerm,
        value: rhsStep.value.value!,
      }

      const node: ExpressionNode = {
        type: 'Expression',
        span: { start: startPos, end: endPos },
        terms: [binding as unknown as TermNode],
        connectors: [],
      }

      return { success: true, value: node, consumed }
    }

    // (connector term)*
    while (true) {
      skipWhitespace(stream)
      if (current(stream).type !== 'CONNECTOR') break

      const connGen = connector(stream, depth + 1)
      let connStep = connGen.next()
      while (!connStep.done) {
        yield connStep.value
        connStep = connGen.next()
      }

      if (!connStep.value.success) break

      connectors.push(connStep.value.value! as Token<'CONNECTOR'>)
      consumed += connStep.value.consumed

      skipWhitespace(stream)
      const termGen = termNode(stream, depth + 1)
      let termStep = termGen.next()
      while (!termStep.done) {
        yield termStep.value
        termStep = termGen.next()
      }

      if (!termStep.value.success) break

      terms.push(termStep.value.value!)
      consumed += termStep.value.consumed
    }

    const endPos = getPosition(stream)
    const node: ExpressionNode = {
      type: 'Expression',
      span: { start: startPos, end: endPos },
      terms,
      connectors,
    }

    return { success: true, value: node, consumed }
  }
)

/**
 * Sequence: expression*
 */
export const sequenceImpl: Parser<SequenceNode> = named('sequence',
  function* sequenceParser(stream, depth) {
    const startPos = getPosition(stream)
    const expressions: ExpressionNode[] = []
    let consumed = 0

    while (true) {
      skipWhitespace(stream)

      // Check for end of sequence (closing delimiter or EOF)
      const curr = current(stream)
      if (curr.type === 'EOF' ||
        curr.type === 'CONTAINER_CLOSE' ||
        curr.type === 'STREAM_CLOSE' ||
        curr.type === 'NRANGE_CLOSE' ||
        curr.type === 'CAPSULE_CLOSE') {
        break
      }

      const exprGen = expressionNode(stream, depth + 1)
      let step = exprGen.next()
      while (!step.done) {
        yield step.value
        step = exprGen.next()
      }

      if (!step.value.success || step.value.consumed === 0) break

      expressions.push(step.value.value!)
      consumed += step.value.consumed

      // Skip optional comma
      skipWhitespace(stream)
      if (current(stream).type === 'COMMA') {
        advance(stream)
        consumed += 1
      }
    }

    const endPos = getPosition(stream)
    const node: SequenceNode = {
      type: 'Sequence',
      span: { start: startPos, end: endPos },
      expressions,
    }

    return { success: true, value: node, consumed }
  }
)
