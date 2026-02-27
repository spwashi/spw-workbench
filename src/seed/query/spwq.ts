/**
 * spwq — Spw Query Entry Points
 *
 * The main API for querying Spw ASTs with pattern-based selectors.
 *
 * @spw:portable - No DOM or app-specific imports allowed
 */

import type { ASTNode } from '../types'
import type { SpwSelector, SpwMatch } from './types'
import { matchAll, matchAt } from './match'
import { parse } from '../parser'

/**
 * Query an AST for all nodes matching a selector.
 *
 * @example
 * // All ! operations with frames
 * spwq(ast, { sigil: '!', brace: '[]' })
 *
 * // All path references
 * spwq(ast, { sigil: '~' })
 *
 * // All @ references OR ~"..." paths
 * spwq(ast, or({ sigil: '@' }, { sigil: '~' }))
 */
export function spwq(ast: ASTNode, selector: SpwSelector): SpwMatch[] {
    return matchAll(ast, selector)
}

/**
 * Find the deepest match at a cursor position (0-indexed line/character).
 */
spwq.at = function spwqAt(
    ast: ASTNode,
    position: { line: number; character: number },
    selector: SpwSelector,
): SpwMatch | null {
    return matchAt(ast, position.line, position.character, selector)
}

/**
 * Parse source text then query.
 * Convenience for CLI and testing.
 */
spwq.fromSource = function spwqFromSource(
    source: string,
    selector: SpwSelector,
): SpwMatch[] {
    const output = parse(source)
    if (!output.ast) return []
    return matchAll(output.ast, selector)
}
