/**
 * Spw Query Presets
 *
 * Common selector patterns built from Spw's structural vocabulary.
 * Each preset is a plain object — serializable for lore-remote dispatch.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

import type { SpwAny, SpwSelector, SpwPattern } from './types'
import { or } from './types'

// ── Navigation ───────────────────────────────────────────────

/** All PathRefs; textual `$~"_"` additionally records `_` provenance. */
export const PATH_REFS: SpwPattern = { sigil: '~', nodeType: 'PathRef' }

/** All References; textual `$@_` additionally records `_` provenance. */
export const REFERENCES: SpwPattern = { sigil: '@', nodeType: 'Reference' }

/** All navigable references (PathRefs or References), without text provenance. */
export const NAVIGABLE: SpwSelector = or(PATH_REFS, REFERENCES)

// ── Domain structure ─────────────────────────────────────────

/** Domain roots carrying Frames; textual `$^[_]` also records `_` provenance. */
export const DOMAIN_ROOTS: SpwPattern = { sigil: '^', withBoundaries: ['frame'] }

/** Domain roots carrying both Frame and Body, without text provenance. */
export const DOMAIN_ROOTS_FULL: SpwPattern = {
    sigil: '^',
    withBoundaries: ['frame', 'body'],
}

// ── Operations by sigil ──────────────────────────────────────

/** All hydrate Operations, without text provenance. */
export const HYDRATE_OPS: SpwPattern = { sigil: '!', nodeType: 'Operation' }

/** All defer/tilde Operations, without text provenance. */
export const DEFER_OPS: SpwPattern = { sigil: '~', nodeType: 'Operation' }

/** All query/stream Operations, without text provenance. */
export const QUERY_OPS: SpwPattern = { sigil: '?', nodeType: 'Operation' }

/** All config/binding Operations, without text provenance. */
export const CONFIG_OPS: SpwPattern = { sigil: '=', nodeType: 'Operation' }

/** Bias edges: every `=` carrying a body (the verb-neutral resolution edge). */
export const BIAS: SpwPattern = { sigil: '=', product: 'bias' }

/** All annotation/set Operations, without text provenance. */
export const ANNOTATION_OPS: SpwPattern = { sigil: '#', nodeType: 'Operation' }

// ── Operations by shape ──────────────────────────────────────

/** Operations carrying Frames, without text provenance. */
export const OPS_WITH_FRAMES: SpwPattern = {
    nodeType: 'Operation',
    withBoundaries: ['frame'],
}

/** Operations carrying Bodies, without text provenance. */
export const OPS_WITH_BODIES: SpwPattern = {
    nodeType: 'Operation',
    withBoundaries: ['body'],
}

/** Scope boundary nodes, without text provenance. */
export const SCOPES: SpwPattern = { nodeType: 'Scope', boundary: 'scope' }

// ── Modified operations ──────────────────────────────────────

/** Boon-labelled hydrate Operations. */
export const BOON_OPS: SpwPattern = { sigil: '!', nodeType: 'Operation', modifier: 'boon' }

/** Bone-labelled hydrate Operations. */
export const BONE_OPS: SpwPattern = { sigil: '!', nodeType: 'Operation', modifier: 'bone' }

// ── Wildcard ─────────────────────────────────────────────────

/** Programmatic wildcard; textual `$_` additionally records `_` provenance. */
export const ANY: SpwAny = { any: true }
