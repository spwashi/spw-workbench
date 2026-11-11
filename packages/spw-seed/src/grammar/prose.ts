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
    if (token.type === 'PARTICLE') return true // #>deixis / #:case break prose into structure
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
 * What a sentence is made of beyond ASCII words: its punctuation, and letters
 * like the é of `Poincaré`. Deliberately narrower than TEXT: a bare `-` before
 * a digit, a `+` or an emoji stays a stop, because reading those as prose would
 * hide a dropped sign or a broken name.
 */
const PROSE_TEXT = /^['\u2018\u2019\u201C\u201D\u00B7\u2013\u2014\u2026\p{L}\p{M}]$/u

function isProseText(token: Token): boolean {
    return token.type === 'TEXT' && PROSE_TEXT.test(token.value)
}

/** True when the cursor sits against a sigil's name: `^caf|é`. A name stays ASCII even where prose may stand. */
function continuesLabel(stream: Parameters<Parser<ProseChunkNode>>[0]): boolean {
    const name = stream.tokens[stream.position - 1]
    const sigil = stream.tokens[stream.position - 2]
    return name?.type === 'IDENTIFIER'
        && sigil?.type === 'OPERATOR'
        && name.span.end.offset === current(stream).span.start.offset
        && sigil.span.end.offset === name.span.start.offset
}

/**
 * A run of prose text in a capsule-led block, with any word it is written against:
 * the `’s` of `maker’s`, the `’n’roll` of `rock’n’roll`. Only the prose profile
 * lexes these as TEXT, so other profiles never reach this.
 */
export const proseTextRunNode: Parser<ProseChunkNode> = named('proseTextRun',
    function* proseTextRunParser(stream, _depth) {
        // This parser is intentionally yield-free; yield* [] keeps it compliant with require-yield.
        yield* []
        const first = current(stream)
        if (!stream.proseGround || !isProseText(first) || continuesLabel(stream)) {
            return {
                success: false,
                consumed: 0,
                error: { message: 'No prose text', recoverable: true, expected: ['Text'], found: first.type },
            }
        }

        let text = ''
        let end = first.span.end
        let consumed = 0
        while (!isAtEnd(stream)) {
            const token = current(stream)
            const against = token.span.start.offset === end.offset
                && (token.type === 'IDENTIFIER' || token.type === 'NUMBER')
            if (!isProseText(token) && !(consumed > 0 && against)) break
            text += token.value
            end = token.span.end
            advance(stream)
            consumed++
        }

        const node: ProseChunkNode = { type: 'ProseChunk', span: { start: first.span.start, end }, text }
        return { success: true, value: node, consumed }
    }
)

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
