/**
 * Dialect ids and multi-axis surface profile stack.
 *
 * Dialects govern parse-time geometry / metasyntax.
 * Review / format / mutation / reading are orthogonal policy axes.
 *
 * @see .spw/registries/dialect-spec.spw
 * @see docs/theory/spw/syntax-profile-stack.spw
 */

/** Core + extended dialect markers (Spw.<id>). */
export type DialectId =
  | 'Spw.b' // block — author geometry (default)
  | 'Spw.l' // line — compact; newline ≈ space
  | 'Spw.m' // mathematical / ONF-leaning machine
  | 'Spw.x' // executable / hot evolution
  | 'Spw.q' // query / selector compact (extends l)
  | 'Spw.f' // flow / mutation-CA authoring
  | 'Spw.p' // plan / agent stream surfaces
  | 'Spw.t' // template / expand lineage

export type DialectSource = 'header' | 'pragma' | 'path' | 'option' | 'default'

export interface DialectDetection {
  id: DialectId
  source: DialectSource
  /** Raw marker as written, when present. */
  raw?: string
  /** Header / pragma slice for tooling. */
  spanHint?: { start: number; end: number }
}

export type ReviewProfileId =
  | 'historical'
  | 'agent_surface'
  | 'runtime_state'
  | 'canon_surface'
  | 'narrative_surface'
  | 'strict_surface'
  | 'flow_surface'
  | 'query_surface'
  | 'plan_surface'

export type FormatProfileId =
  | 'canonical'
  | 'pretty'
  | 'layout'
  | 'prose'
  | 'culture'
  | 'wide'

export type MutationFamilyId = 'none' | 'hygiene' | 'measure' | 'explore' | 'stabilize'

export type ReadingProfileId = 'author' | 'prompt' | 'research' | 'creative'

export type DomainPackId =
  | 'general'
  | 'flow'
  | 'query'
  | 'plan'
  | 'gfx'
  | 'materials'
  | 'canon'

/**
 * Multi-axis profile stack for one surface.
 * Resolve once; consume from parse, format, review, LSP, pulse.
 */
export interface SurfaceProfileStack {
  dialect: DialectId
  dialectSource: DialectSource
  review: ReviewProfileId
  format: FormatProfileId
  /** Lex profile id passed to resolveLexProfile */
  lex: string
  mutation: MutationFamilyId
  reading: ReadingProfileId
  domain: DomainPackId
  /** Parse contextMode */
  contextMode: 'low' | 'high'
  /** Metasyntax flags enabled for this stack */
  metasyntax: MetasyntaxFlags
}

export interface MetasyntaxFlags {
  /** Collapse newlines to spaces before lex (Spw.l / Spw.q). */
  newlineAsSpace: boolean
  /** Prefer unknown-as-text (narrative / prose). */
  unknownAsText: boolean
  /** Allow high-context sugar when parser supports it. */
  highContext: boolean
  /** Emit soft warnings for forms discouraged in Spw.m. */
  machineLint: boolean
  /** Recognize flow CA glyphs as first-class authoring (docs + future lower). */
  flowGlyphs: boolean
  /** Plan/stream idioms (>> , open blocks). */
  planStream: boolean
}

export const DEFAULT_DIALECT: DialectId = 'Spw.b'

export const DIALECT_IDS: readonly DialectId[] = [
  'Spw.b',
  'Spw.l',
  'Spw.m',
  'Spw.x',
  'Spw.q',
  'Spw.f',
  'Spw.p',
  'Spw.t',
] as const
