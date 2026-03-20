/**
 * Spw Pattern Matcher
 *
 * Walks an AST and matches nodes against SpwSelector patterns.
 * Uses Spw's own structural vocabulary: sigils identify operators,
 * braces identify container shapes, modifiers identify valence.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

import type { ASTNode, OperationNode, ReferenceNode, FrameNode, BodyNode, ScopeNode } from '../types'
import type { PathRefNode } from '../types/ast/nodes'
import { walkAST, getNodeChildren } from '../instrumentation'
import type {
    SpwPattern,
    SpwSelector,
    SpwMatch,
    SpwMatchSpan,
} from './types'
import {
    isAnd,
    isOr,
    isNot,
    isDescend,
    isSequence,
    isPattern,
} from './types'

// ── Span conversion ──────────────────────────────────────────

function toMatchSpan(node: ASTNode): SpwMatchSpan {
    return {
        startOffset: node.span.start.offset,
        endOffset: node.span.end.offset,
        // AST spans are 1-indexed; LSP/query results are 0-indexed
        startLine: Math.max(0, node.span.start.line - 1),
        startCharacter: Math.max(0, node.span.start.column - 1),
        endLine: Math.max(0, node.span.end.line - 1),
        endCharacter: Math.max(0, node.span.end.column - 1),
    }
}

// ── Node interrogation ───────────────────────────────────────

function getNodeSigil(node: ASTNode): string | undefined {
    switch (node.type) {
        case 'Operation':
            return (node as OperationNode).operator.value
        case 'Reference':
            return '@'
        case 'PathRef':
            return '~'
        case 'Annotation':
            return '#'
        default:
            return undefined
    }
}

function getNodeBrace(node: ASTNode): '[]' | '{}' | '()' | undefined {
    const any = node as unknown as Record<string, unknown>
    if (any.frame && typeof any.frame === 'object' && (any.frame as ASTNode).type === 'Frame') return '[]'
    if (any.body && typeof any.body === 'object' && (any.body as ASTNode).type === 'Body') return '{}'
    if (node.type === 'Scope') return '()'
    return undefined
}

function getNodeBrace2(node: ASTNode): '[]' | '{}' | '()' | undefined {
    const any = node as unknown as Record<string, unknown>
    const hasPrimary = getNodeBrace(node)
    if (!hasPrimary) return undefined

    // Check for secondary container
    if (hasPrimary === '[]' && any.body && typeof any.body === 'object' && (any.body as ASTNode).type === 'Body') return '{}'
    if (hasPrimary === '{}' && any.frame && typeof any.frame === 'object' && (any.frame as ASTNode).type === 'Frame') return '[]'
    return undefined
}

function getNodeModifier(node: ASTNode): string | undefined {
    if (node.type !== 'Operation') return undefined
    const op = node as OperationNode
    if (!op.modifiers) return undefined
    return op.modifiers.modifiers?.[0]?.value
}

function getNodeValue(node: ASTNode): string | undefined {
    switch (node.type) {
        case 'PathRef': {
            const pathRef = node as PathRefNode
            const raw = pathRef.path.token.value
            // Unquote
            if ((raw.startsWith('"') && raw.endsWith('"')) ||
                (raw.startsWith('`') && raw.endsWith('`')) ||
                (raw.startsWith("'") && raw.endsWith("'"))) {
                return raw.slice(1, -1)
            }
            return raw
        }
        case 'Reference': {
            return (node as ReferenceNode).raw ?? undefined
        }
        case 'Identifier': {
            return ((node as any).token as { value: string })?.value
        }
        case 'Literal': {
            return ((node as any).token as { value: string })?.value
        }
        case 'Operation': {
            const op = node as OperationNode
            return op.operatorLabel?.value
        }
        default:
            return undefined
    }
}

// ── Atomic match ─────────────────────────────────────────────

function matchPattern(node: ASTNode, pattern: SpwPattern, depth: number): boolean {
    // Sigil filter
    if (pattern.sigil !== undefined) {
        if (pattern.sigil === '*') {
            // wildcard: matches any node
        } else {
            const nodeSigil = getNodeSigil(node)
            if (nodeSigil !== pattern.sigil) return false
        }
    }

    // Node-type filter
    if (pattern.nodeType !== undefined && node.type !== pattern.nodeType) {
        return false
    }

    // Brace filter
    if (pattern.brace !== undefined) {
        const nodeBrace = getNodeBrace(node)
        if (nodeBrace !== pattern.brace) return false
    }

    // Secondary brace filter
    if (pattern.brace2 !== undefined) {
        const nodeBrace2 = getNodeBrace2(node)
        if (nodeBrace2 !== pattern.brace2) return false
    }

    // Modifier filter
    if (pattern.modifier !== undefined) {
        const nodeMod = getNodeModifier(node)
        if (nodeMod !== pattern.modifier) return false
    }

    // Value filter
    if (pattern.value !== undefined) {
        const nodeVal = getNodeValue(node)
        if (nodeVal !== pattern.value) return false
    }

    // Depth filter
    if (pattern.depth !== undefined) {
        if (depth !== pattern.depth) return false
    }

    // Depth range filter
    if (pattern.depthRange !== undefined) {
        const [min, max] = pattern.depthRange
        if (depth < min || depth > max) return false
    }

    return true
}

// ── Composite match ──────────────────────────────────────────

function matchSelector(node: ASTNode, selector: SpwSelector, depth: number, ancestors: ASTNode[]): boolean {
    if (isPattern(selector)) {
        return matchPattern(node, selector, depth)
    }

    if (isAnd(selector)) {
        const [a, b] = selector.and
        return matchSelector(node, a, depth, ancestors) && matchSelector(node, b, depth, ancestors)
    }

    if (isOr(selector)) {
        const [a, b] = selector.or
        return matchSelector(node, a, depth, ancestors) || matchSelector(node, b, depth, ancestors)
    }

    if (isNot(selector)) {
        return !matchSelector(node, selector.not, depth, ancestors)
    }

    if (isDescend(selector)) {
        // The node must match the child pattern, and some ancestor must match the parent pattern
        const [parentSel, childSel] = selector.descend
        if (!matchSelector(node, childSel, depth, ancestors)) return false
        return ancestors.some((anc, i) => matchSelector(anc, parentSel, i, ancestors.slice(0, i)))
    }

    if (isSequence(selector)) {
        // Sequence matching: not applicable to single-node match
        // The node must match either side
        const [a, b] = selector.seq
        return matchSelector(node, a, depth, ancestors) || matchSelector(node, b, depth, ancestors)
    }

    return false
}

// ── Public API ───────────────────────────────────────────────

/**
 * Find all AST nodes matching a selector pattern.
 * Results are sorted by source offset.
 */
export function matchAll(root: ASTNode, selector: SpwSelector): SpwMatch[] {
    const results: SpwMatch[] = []

    walkAST(root, (node, path) => {
        const depth = path.length
        if (matchSelector(node, selector, depth, path)) {
            results.push({
                node,
                span: toMatchSpan(node),
                path: [...path],
                depth,
            })
        }
    })

    results.sort((a, b) => a.span.startOffset - b.span.startOffset)
    return results
}

/**
 * Find the deepest (most specific) match at a given position.
 * Position is 0-indexed line/character.
 */
export function matchAt(
    root: ASTNode,
    line: number,
    character: number,
    selector: SpwSelector,
): SpwMatch | null {
    const hits = matchAll(root, selector)

    const containing = hits.filter((m) => {
        if (line < m.span.startLine || line > m.span.endLine) return false
        if (line === m.span.startLine && character < m.span.startCharacter) return false
        if (line === m.span.endLine && character > m.span.endCharacter) return false
        return true
    })

    if (containing.length === 0) return null

    // Return the smallest span (most specific)
    containing.sort((a, b) =>
        (a.span.endOffset - a.span.startOffset) - (b.span.endOffset - b.span.startOffset)
    )
    return containing[0] ?? null
}
