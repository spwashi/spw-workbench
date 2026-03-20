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
    SpwMatch,
    SpwMatchSpan,
    SigilSelector,
    BraceSelector,
} from './types'

export {
    and,
    or,
    not,
    descend,
    seq,
    isAnd,
    isOr,
    isNot,
    isDescend,
    isSequence,
    isPattern,
} from './types'

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
    ANNOTATION_OPS,
    OPS_WITH_FRAMES,
    OPS_WITH_BODIES,
    SCOPES,
    BOON_OPS,
    BONE_OPS,
    ANY,
} from './presets'
