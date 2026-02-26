/**
 * Prose Grammar
 *
 * Rules for parsing mixed text and Spw expressions.
 */

import type {
    ProseNode,
    ProseChunkNode,
    ExpressionNode,
    OperationNode,
    CapsuleNode,
    ReferenceNode,
    StreamNode,
    NRangeNode,
    ScopeNode,
    ParseEvent,
    Token
} from '../types'
import {
    type Parser,
    named,
    getPosition,
    current,
    advance,
    isAtEnd
} from '../combinators'
import { expressionNode } from './expressions'

/**
 * Check if token triggers Spw parsing mode
 */
function isSpwTrigger(token: Token): boolean {
    if (token.type === 'OPERATOR') return true
    if (token.type === 'CAPSULE_OPEN') return true
    if (token.type === 'STREAM_OPEN') return true
    if (token.type === 'NRANGE_OPEN') return true
    if (token.type === 'CONTAINER_OPEN') return true // ( { [
    return false
}

function collectFallbackText(stream: Parameters<Parser<ProseChunkNode>>[0]): { node: ProseChunkNode; consumed: number } {
    const first = current(stream)
    const start = first.span.start
    let end = first.span.end
    let text = first.value
    let consumed = 0

    while (!isAtEnd(stream)) {
        const token = current(stream)
        if (token.type === 'EOF') break
        if (consumed > 0 && isSpwTrigger(token)) break

        text += token.value
        end = token.span.end
        advance(stream)
        consumed++
    }

    return {
        node: {
            type: 'ProseChunk',
            span: { start, end },
            text,
        },
        consumed,
    }
}

/**
 * Parse text until a Spw trigger is found
 */
export const proseTextNode: Parser<ProseChunkNode> = named('proseText',
    function* proseTextParser(stream, _depth) {
        // This parser is intentionally yield-free; yield* [] keeps it compliant with require-yield.
        yield* []
        const startPos = getPosition(stream)
        let text = ''
        let consumed = 0

        while (true) {
            if (isAtEnd(stream)) break
            const token = current(stream)
            if (token.type === 'EOF') break
            if (isSpwTrigger(token)) break

            text += token.value
            // Note: we assume filtered stream might miss whitespace, 
            // but if includeWhitespace is enabled, we capture it here.

            advance(stream)
            consumed++
        }

        const endPos = getPosition(stream)

        if (consumed === 0) {
            return {
                success: false,
                consumed: 0,
                error: {
                    message: 'No text content',
                    recoverable: true,
                    expected: ['Text'],
                    found: isAtEnd(stream) ? 'EOF' : current(stream).type
                }
            }
        }

        const node: ProseChunkNode = {
            type: 'ProseChunk',
            span: { start: startPos, end: endPos },
            text,
        }

        return { success: true, value: node, consumed }
    }
)

/**
 * Prose: sequence of chunks (Text or Spw Term)
 */
export const proseNode: Parser<ProseNode> = named('prose',
    function* proseParser(stream, depth) {
        const startPos = getPosition(stream)
        const chunks: (ProseChunkNode | ExpressionNode | OperationNode | CapsuleNode | ReferenceNode | ScopeNode | StreamNode | NRangeNode)[] = []
        let consumed = 0

        while (!isAtEnd(stream)) {
            const token = current(stream)

            if (token.type === 'EOF') break

            if (isSpwTrigger(token)) {
                // Try parsing as Spw Expression
                const spwParser = expressionNode
                const gen = spwParser(stream, depth + 1)

                const eventsBuffer: ParseEvent[] = []
                let step = gen.next()
                while (!step.done) {
                    eventsBuffer.push(step.value)
                    step = gen.next()
                }

                if (step.value.success) {
                    // Success: yield buffered events and push node
                    for (const evt of eventsBuffer) {
                        yield evt
                    }
                    chunks.push(step.value.value!)
                    consumed += step.value.consumed
                } else {
                    // Failure: treat trigger as text
                    const fallback = collectFallbackText(stream)
                    chunks.push(fallback.node)
                    consumed += fallback.consumed
                }

            } else {
                // Parse Text
                const textGen = proseTextNode(stream, depth + 1)
                let step = textGen.next()
                while (!step.done) {
                    yield step.value
                    step = textGen.next()
                }

                if (step.value.success) {
                    chunks.push(step.value.value!)
                    consumed += step.value.consumed
                } else {
                    // Should not happen unless EOF (handled by loop) or trigger (handled by if)
                    // Safety valve: consume one token to avoid infinite loop
                    advance(stream)
                    consumed++
                }
            }
        }

        const endPos = getPosition(stream)
        const node: ProseNode = {
            type: 'Prose',
            span: { start: startPos, end: endPos },
            chunks,
        }

        return { success: true, value: node, consumed }
    }
)
