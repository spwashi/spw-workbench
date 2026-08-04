/**
 * Bullet Parser
 *
 * Line-level prose items: .. <expression|text>
 *
 * Separated from expressions.ts because bullets are a presentation
 * concern (literate-style line items) distinct from the core
 * expression/operation/term grammar.
 */

import type {
    Token,
    BulletNode,
    ProseChunkNode,
} from '../types'
import {
    type Parser,
    getPosition,
    current,
    advance,
    skipWhitespace,
    token,
    named,
} from '../combinators'
import { expressionNode } from './expressions'

/** Collect the rest of the marker's line as one prose chunk. */
function readLineText(
    stream: Parameters<Parser<BulletNode>>[0],
    marker: Token,
): { chunk: ProseChunkNode; consumed: number } {
    const markerLine = marker.span.start.line
    const collected: Token[] = []
    let consumed = 0

    while (true) {
        const tok = current(stream)
        if (tok.type === 'EOF') break
        if (tok.span.start.line !== markerLine) break
        if (tok.type === 'COMMENT') break
        collected.push(tok)
        advance(stream)
        consumed += 1
    }

    let startIdx = 0
    while (startIdx < collected.length && collected[startIdx]!.type === 'WHITESPACE') startIdx++
    let endIdx = collected.length - 1
    while (endIdx >= startIdx && collected[endIdx]!.type === 'WHITESPACE') endIdx--

    const text = startIdx <= endIdx
        ? collected.slice(startIdx, endIdx + 1).map((t) => t.value).join('')
        : ''

    return {
        chunk: {
            type: 'ProseChunk',
            span: startIdx <= endIdx
                ? { start: collected[startIdx]!.span.start, end: collected[endIdx]!.span.end }
                : { start: marker.span.end, end: marker.span.end },
            text,
        },
        consumed,
    }
}

/**
 * Stream entry: `>>[2026-07-27 13:15] observe — text`
 *
 * `.agents/plans/*​/wip.spw` records development streams this way. `>>` lexes as
 * STREAM_CLOSE, so this only applies where no `<<` is open — inside stream
 * bounds the token still closes the stream. Requires the marker to start its
 * line, which a closing `>>` on its own line does too; `streamDepth` is what
 * separates them.
 */
export const streamEntryNode: Parser<BulletNode> = named('streamEntry',
    function* streamEntryParser(stream, _depth) {
        if (stream.streamDepth > 0) return { success: false, consumed: 0 }
        if (current(stream).type !== 'STREAM_CLOSE') return { success: false, consumed: 0 }

        const startPos = getPosition(stream)
        const marker = current(stream) as Token<'STREAM_CLOSE'>
        advance(stream)
        let consumed = 1

        const { chunk, consumed: textConsumed } = readLineText(stream, marker)
        consumed += textConsumed

        yield* []
        return {
            success: true,
            value: {
                type: 'Bullet',
                span: { start: startPos, end: getPosition(stream) },
                marker,
                item: chunk,
            },
            consumed,
        }
    }
)

/**
 * Bullet item: .. <expression>
 */
export const bulletNode: Parser<BulletNode> = named('bullet',
    function* bulletParser(stream, depth) {
        const startPos = getPosition(stream)

        const markGen = token('CONNECTOR', '..')(stream, depth + 1)
        let markStep = markGen.next()
        while (!markStep.done) {
            yield markStep.value
            markStep = markGen.next()
        }

        if (!markStep.value.success) {
            return { success: false, consumed: 0, error: markStep.value.error }
        }

        let consumed = markStep.value.consumed
        const marker = markStep.value.value! as Token<'CONNECTOR'>

        skipWhitespace(stream)

        // If the bullet starts with a Spw trigger, parse as expression;
        // otherwise capture prose text on the same line.
        const t0 = current(stream)
        const isSpw = (
            t0.type === 'OPERATOR'
            || t0.type === 'CAPSULE_OPEN'
            || t0.type === 'STREAM_OPEN'
            || t0.type === 'NRANGE_OPEN'
            || t0.type === 'CONTAINER_OPEN'
        )

        if (isSpw) {
            const itemGen = expressionNode(stream, depth + 1)
            let itemStep = itemGen.next()
            while (!itemStep.done) {
                yield itemStep.value
                itemStep = itemGen.next()
            }

            if (!itemStep.value.success) {
                return { success: false, consumed: 0, error: itemStep.value.error }
            }

            consumed += itemStep.value.consumed
            const endPos = getPosition(stream)

            const node: BulletNode = {
                type: 'Bullet',
                span: { start: startPos, end: endPos },
                marker,
                item: itemStep.value.value!,
            }

            return { success: true, value: node, consumed }
        }

        const { chunk, consumed: textConsumed } = readLineText(stream, marker)
        consumed += textConsumed

        const endPos = getPosition(stream)
        const node: BulletNode = {
            type: 'Bullet',
            span: { start: startPos, end: endPos },
            marker,
            item: chunk,
        }

        return { success: true, value: node, consumed }
    }
)
