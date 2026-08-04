/**
 * Resolve multi-axis SurfaceProfileStack from path + source + options.
 */

import { detectDialect } from './detect'
import {
  DEFAULT_DIALECT,
  type DialectId,
  type DialectSource,
  type DomainPackId,
  type FormatProfileId,
  type MetasyntaxFlags,
  type MutationFamilyId,
  type ReadingProfileId,
  type ReviewProfileId,
  type SurfaceProfileStack,
} from './types'

export interface ResolveProfileOptions {
  /** Explicit dialect overrides detection. */
  dialect?: DialectId
  /** Repo-relative or absolute path for review/path defaults. */
  path?: string
  /** Override format axis. */
  format?: FormatProfileId
  /** Override review axis. */
  review?: ReviewProfileId
  /** Override reading axis. */
  reading?: ReadingProfileId
  /** Override mutation family. */
  mutation?: MutationFamilyId
  /** Override domain pack. */
  domain?: DomainPackId
}

const DIALECT_DEFAULTS: Record<
  DialectId,
  Pick<SurfaceProfileStack, 'lex' | 'contextMode' | 'mutation' | 'domain' | 'format' | 'reading'> & {
    metasyntax: MetasyntaxFlags
  }
> = {
  'Spw.b': {
    lex: 'default',
    contextMode: 'low',
    mutation: 'none',
    domain: 'general',
    format: 'pretty',
    reading: 'author',
    metasyntax: {
      newlineAsSpace: false,
      unknownAsText: false,
      highContext: false,
      machineLint: false,
      flowGlyphs: false,
      planStream: false,
    },
  },
  'Spw.l': {
    lex: 'default',
    contextMode: 'high',
    mutation: 'none',
    domain: 'query',
    format: 'canonical',
    reading: 'author',
    metasyntax: {
      newlineAsSpace: true,
      unknownAsText: false,
      highContext: true,
      machineLint: false,
      flowGlyphs: false,
      planStream: false,
    },
  },
  'Spw.m': {
    // Machine / ONF: hygiene mutation + machineLint train static-analysis literacy
    lex: 'default',
    contextMode: 'low',
    mutation: 'hygiene',
    domain: 'general',
    format: 'layout',
    reading: 'author',
    metasyntax: {
      newlineAsSpace: false,
      unknownAsText: false,
      highContext: false,
      machineLint: true,
      flowGlyphs: false,
      planStream: false,
    },
  },
  'Spw.x': {
    // Hot / executable: measure-first; research reading rewards cache literacy
    lex: 'default',
    contextMode: 'low',
    mutation: 'measure',
    domain: 'canon',
    format: 'pretty',
    reading: 'research',
    metasyntax: {
      newlineAsSpace: false,
      unknownAsText: false,
      highContext: false,
      machineLint: true,
      flowGlyphs: false,
      planStream: false,
    },
  },
  'Spw.q': {
    lex: 'default',
    contextMode: 'high',
    mutation: 'none',
    domain: 'query',
    format: 'canonical',
    reading: 'author',
    metasyntax: {
      newlineAsSpace: true,
      unknownAsText: false,
      highContext: true,
      machineLint: false,
      flowGlyphs: false,
      planStream: false,
    },
  },
  'Spw.f': {
    // Flow / CA: explore mutation + flow glyphs; research reading for schedules
    lex: 'default',
    contextMode: 'low',
    mutation: 'explore',
    domain: 'flow',
    format: 'pretty',
    reading: 'research',
    metasyntax: {
      newlineAsSpace: false,
      unknownAsText: false,
      highContext: false,
      machineLint: false,
      flowGlyphs: true,
      planStream: false,
    },
  },
  'Spw.p': {
    // Plan / agent streams: plan domain + planStream; prompt reading for agent wip
    lex: 'default',
    contextMode: 'low',
    mutation: 'none',
    domain: 'plan',
    format: 'pretty',
    reading: 'prompt',
    metasyntax: {
      newlineAsSpace: false,
      unknownAsText: false,
      highContext: false,
      machineLint: false,
      flowGlyphs: false,
      planStream: true,
    },
  },
  'Spw.t': {
    // Template / expand lineage: high context slots; prompt reading; never index expanded
    lex: 'default',
    contextMode: 'high',
    mutation: 'none',
    domain: 'general',
    format: 'pretty',
    reading: 'prompt',
    metasyntax: {
      newlineAsSpace: false,
      unknownAsText: false,
      highContext: true,
      machineLint: false,
      flowGlyphs: false,
      planStream: false,
    },
  },
}

/** Path → review profile (commit-review compatible + extensions). */
export function detectReviewProfile(normalizedPath: string): ReviewProfileId {
  const p = normalizedPath.replace(/\\/g, '/')

  if (
    p.includes('/_archive/')
    || p.startsWith('docs/archive/')
    || p.startsWith('lib/spw-v0.1.0-alpha/')
    || p.startsWith('lib/spw-v0.2.0-alpha/')
  ) {
    return 'historical'
  }

  if (p.startsWith('.agents/plans/') || p.includes('/.agents/plans/')) {
    return 'plan_surface'
  }

  if (p.startsWith('.agents/')) {
    return 'agent_surface'
  }

  if (
    p.endsWith('.state.spw')
    || p.startsWith('.agents/state/')
    || p.startsWith('.spw/state/')
  ) {
    return 'runtime_state'
  }

  if (
    p.includes('mutation-flow')
    || p.includes('/flow/')
    || p.endsWith('mutation-flow-automata.spw')
  ) {
    return 'flow_surface'
  }

  if (
    p.includes('/query/')
    || p.includes('selector')
    || p.endsWith('.q.spw')
  ) {
    return 'query_surface'
  }

  if (p === 'index.spw' || p === '.spw' || p.startsWith('.spw/')) {
    return 'canon_surface'
  }

  if (p.startsWith('docs/') || p.startsWith('lib/') || p.includes('/docs/')) {
    return 'narrative_surface'
  }

  if (p.startsWith('prompts/')) {
    return 'narrative_surface'
  }

  return 'strict_surface'
}

/** Path-only dialect default when header absent. */
export function detectDialectFromPath(normalizedPath: string): DialectId | undefined {
  const p = normalizedPath.replace(/\\/g, '/')
  const review = detectReviewProfile(p)

  if (review === 'plan_surface' || review === 'agent_surface') return 'Spw.p'
  if (review === 'flow_surface') return 'Spw.f'
  if (review === 'query_surface') return 'Spw.q'
  if (review === 'strict_surface' && p.startsWith('packages/')) return 'Spw.m'
  if (review === 'canon_surface') return 'Spw.b'
  if (review === 'narrative_surface') return 'Spw.b'
  if (review === 'historical') return 'Spw.b'
  return undefined
}

function formatForReview(review: ReviewProfileId): FormatProfileId {
  switch (review) {
    case 'strict_surface':
      return 'layout'
    case 'historical':
      return 'canonical'
    case 'narrative_surface':
      return 'prose'
    case 'query_surface':
      return 'canonical'
    default:
      return 'pretty'
  }
}

/**
 * Resolve full stack for a surface.
 */
export function resolveSurfaceProfile(
  source: string,
  options: ResolveProfileOptions = {},
): SurfaceProfileStack {
  const path = (options.path ?? '').replace(/\\/g, '/')

  let dialect: DialectId
  let dialectSource: DialectSource

  if (options.dialect) {
    dialect = options.dialect
    dialectSource = 'option'
  } else {
    const detected = detectDialect(source)
    if (detected.source !== 'default') {
      dialect = detected.id
      dialectSource = detected.source
    } else {
      const fromPath = path ? detectDialectFromPath(path) : undefined
      if (fromPath) {
        dialect = fromPath
        dialectSource = 'path'
      } else {
        dialect = DEFAULT_DIALECT
        dialectSource = 'default'
      }
    }
  }

  const base = DIALECT_DEFAULTS[dialect]
  const review = options.review ?? (path ? detectReviewProfile(path) : 'canon_surface')
  const format = options.format ?? formatForReview(review)

  return {
    dialect,
    dialectSource,
    review,
    format,
    lex: base.lex,
    mutation: options.mutation ?? base.mutation,
    reading: options.reading ?? base.reading,
    domain: options.domain ?? base.domain,
    contextMode: base.contextMode,
    metasyntax: { ...base.metasyntax },
  }
}

/** Machine-lint soft warnings for Spw.m (source scan; not parse errors). */
export function collectMachineLintWarnings(source: string): string[] {
  const out: string[] = []
  if (/^\s*\^"/m.test(source)) {
    out.push('Spw.m: quoted frame ^"…" is discouraged; prefer ^["id"]')
  }
  if (/@domain\s*:/.test(source)) {
    out.push('Spw.m: @domain: is historical meta; prefer #:layer / structured facets')
  }
  if ((source.match(/~#/g) ?? []).length > 24) {
    out.push('Spw.m: high ~# trait density; consider explicit .{} facets for machine surfaces')
  }
  return out
}
