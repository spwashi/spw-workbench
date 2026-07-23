/**
 * Spw Query — barrel export
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

// Types and combinators
export type {
    SpwPattern,
    SpwSelector,
    SpwAnd,
    SpwOr,
    SpwNot,
    SpwDescend,
    SpwSequence,
    SpwAny,
    SpwCapture,
    SpwMatch,
    SpwMatchParticipant,
    SpwMatchEvidence,
    SpwMatchSpan,
    SpwTermSlotCoordinate,
    SpwSequenceSeparator,
    SigilSelector,
    BraceSelector,
    BoundarySelector,
    AttachedBoundarySelector,
} from './types'

export {
    and,
    or,
    not,
    descend,
    seq,
    anyNode,
    capture,
    isAnd,
    isAny,
    isCapture,
    isOr,
    isNot,
    isDescend,
    isSequence,
    isPattern,
} from './types'

export { assertSpwSelector, isSpwSelector } from './validate'

// Matcher
export { matchAll, matchAt } from './match'

// Entry points
export { spwq } from './spwq'

// Presets
export {
    PATH_REFS,
    REFERENCES,
    NAVIGABLE,
    DOMAIN_ROOTS,
    DOMAIN_ROOTS_FULL,
    HYDRATE_OPS,
    DEFER_OPS,
    QUERY_OPS,
    CONFIG_OPS,
    BIAS,
    ANNOTATION_OPS,
    OPS_WITH_FRAMES,
    OPS_WITH_BODIES,
    SCOPES,
    BOON_OPS,
    BONE_OPS,
    ANY,
} from './presets'
