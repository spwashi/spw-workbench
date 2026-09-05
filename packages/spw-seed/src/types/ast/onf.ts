/**
 * Operator Normal Form (ONF) Types
 *
 * The canonical internal representation for Spw expressions.
 * Every surface expression reduces to: σ(args...)[frames...]
 *
 * Sigil is the callee. No named verbs. Arguments are positional.
 * Frames carry register bindings and semantic metadata.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 * @see src/lang/grammar/onf-spec.md for the full specification
 */

import type { ModifierKind, OperatorKind } from '../token'
import type { Span } from '../position'

export type PostfixAttachmentKind = 'frame' | 'body' | 'scope' | 'capsule'

/** AST-local provenance; offsets use the parser's source coordinate system. */
export interface ONFConstructionFrame {
    version: 'spw.onf.construction/1'
    source: Span
    head: Span
    /** Positional metadata for args[1..], sorted by original source offset. */
    attachments: Array<{ kind: PostfixAttachmentKind; source: Span }>
}

// =============================================================================
// Frame Map
// =============================================================================

/**
 * Key-value metadata attached to an ONF node.
 *
 * Standard frame keys:
 *   reg      — register binding (e.g. 'proj', 'hydrate', 'inner', 'couple')
 *   coupling — discriminated structural projection:
 *              operator { kind, form='operator', surface, arity }
 *              boundary { kind, form='boundary', occupancy, payload, surface, actPlacement? }
 *   actPlacement / fixity — prefix|postfix when known (parser position often unset)
 *   rewrite  — surface form this was desugared from
 *   momentum — ephemeral runtime data (excluded from semantic hash)
 */
export type FrameMap = {
    reg?: string
    valence?: ModifierKind[]
    label?: string
    rewrite?: string
    momentum?: unknown
    /** With reg=construction: args[0] is the head; args[1..] are postfix attachments. */
    construction?: ONFConstructionFrame
    [key: string]: unknown
}

// =============================================================================
// ONF Node
// =============================================================================

/**
 * Operator Normal Form node.
 *
 * Invariants:
 *   - sigil is the callee (operator character or '_' for hole)
 *   - args are positional, left-to-right
 *   - frames carry register bindings and metadata
 *   - momentum frames are excluded from semantic hash
 *
 * @example
 *   surface: x / y
 *   ONF:     { sigil: '/', args: [x, y], frames: { reg: 'proj' } }
 *
 *   surface: x!
 *   ONF:     { sigil: '!', args: [x], frames: { reg: 'hydrate' } }
 *
 *   surface: _
 *   ONF:     { sigil: '_', args: [], frames: { reg: 'hole' } }
 */
export interface ONFNode {
    /** The operator sigil (callee). '_' for hole/wildcard. */
    sigil: OperatorKind | '_'
    /** Positional arguments, left-to-right. */
    args: ONFNode[]
    /** Register bindings and semantic metadata. */
    frames: FrameMap
}

// =============================================================================
// Normalization Table (reference)
// =============================================================================

/**
 * Surface → ONF normalization targets.
 * Implemented in src/seed/normalize.ts normalizeToONF().
 *
 * | Surface       | ONF                                                              |
 * |---------------|------------------------------------------------------------------|
 * | x[a]{b}     | _(x, [a], {b})[reg=construction, construction={source,head,attachments}] |
 * | x / y         | /(x, y)[reg=proj]                                                |
 * | x!            | !(x)[reg=hydrate]                                                |
 * | ~x            | ~(x)[reg=defer]                                                  |
 * | #[a, b]       | #(a, b)[reg=set, coupling.kind=frame]                            |
 * | .{k: v}       | .({k: v})[reg=facet, coupling.kind=body]                         |
 * | <<a, b>>      | ?(a, b)[reg=stream, coupling.kind=stream]  (? sigil historical)  |
 * | <> / couple   | <>(…)[reg=couple, coupling={kind:couple,form:operator,arity:n}]  |
 * | <…> capsule   | …[reg=capsule, coupling.kind=capsule]                            |
 * | [] / {} / ()  | _[reg=inner|around|scope, coupling.kind=frame|body|scope]        |
 * | _             | _()[reg=hole]                                                    |
 *
 * All paired Bounds and the digraph operator share a tagged coupling interface
 * while retaining distinct lexical forms (see types/coupling.ts).
 */
export type _ONFNormalizationTable = never // documentation only
