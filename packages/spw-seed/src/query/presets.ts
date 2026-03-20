/**
 * Spw Query Presets
 *
 * Common selector patterns built from Spw's structural vocabulary.
 * Each preset is a plain object — serializable for lore-remote dispatch.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

import type { SpwSelector, SpwPattern } from './types'
import { or, and } from './types'

// ── Navigation ───────────────────────────────────────────────

/** $~"_" — all path references (~"./path") */
export const PATH_REFS: SpwPattern = { sigil: '~', nodeType: 'PathRef' }

/** $@_ — all @ references */
export const REFERENCES: SpwPattern = { sigil: '@', nodeType: 'Reference' }

/** $~"_" | $@_ — all navigable references (path-refs or @-refs) */
export const NAVIGABLE: SpwSelector = or(PATH_REFS, REFERENCES)

// ── Domain structure ─────────────────────────────────────────

/** $^[_] — domain roots with frames */
export const DOMAIN_ROOTS: SpwPattern = { sigil: '^', brace: '[]' }

/** $^[_]{_} — domain roots with both frame and body */
export const DOMAIN_ROOTS_FULL: SpwSelector = and(
    { sigil: '^', brace: '[]' },
    { sigil: '^', brace2: '{}' },
)

// ── Operations by sigil ──────────────────────────────────────

/** $!_ — all hydrate operations */
export const HYDRATE_OPS: SpwPattern = { sigil: '!', nodeType: 'Operation' }

/** $~_ — all defer/tilde operations */
export const DEFER_OPS: SpwPattern = { sigil: '~', nodeType: 'Operation' }

/** $?_ — all query/stream operations */
export const QUERY_OPS: SpwPattern = { sigil: '?', nodeType: 'Operation' }

/** $=_ — all config/binding operations */
export const CONFIG_OPS: SpwPattern = { sigil: '=', nodeType: 'Operation' }

/** $#_ — all annotation/set operations */
export const ANNOTATION_OPS: SpwPattern = { sigil: '#', nodeType: 'Operation' }

// ── Operations by shape ──────────────────────────────────────

/** $![_] — operations with frames */
export const OPS_WITH_FRAMES: SpwPattern = { nodeType: 'Operation', brace: '[]' }

/** $!{_} — operations with bodies */
export const OPS_WITH_BODIES: SpwPattern = { nodeType: 'Operation', brace: '{}' }

/** $(_) — scopes */
export const SCOPES: SpwPattern = { nodeType: 'Scope', brace: '()' }

// ── Modified operations ──────────────────────────────────────

/** $!boon — boon-labelled operations */
export const BOON_OPS: SpwPattern = { sigil: '!', nodeType: 'Operation', modifier: 'boon' }

/** $!bone — bone-labelled operations */
export const BONE_OPS: SpwPattern = { sigil: '!', nodeType: 'Operation', modifier: 'bone' }

// ── Wildcard ─────────────────────────────────────────────────

/** $_ — any node */
export const ANY: SpwPattern = { sigil: '*' }
