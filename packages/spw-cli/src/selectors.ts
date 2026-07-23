import {
  ANY,
  ANNOTATION_OPS,
  BIAS,
  BOON_OPS,
  BONE_OPS,
  CONFIG_OPS,
  DEFER_OPS,
  DOMAIN_ROOTS,
  DOMAIN_ROOTS_FULL,
  HYDRATE_OPS,
  NAVIGABLE,
  OPS_WITH_BODIES,
  OPS_WITH_FRAMES,
  PATH_REFS,
  QUERY_OPS,
  REFERENCES,
  SCOPES,
  type SpwMatch,
  type SpwSelector,
  tryParseSelector,
} from '@spwashi/spw-seed'

export const CLI_SELECTOR_PRESETS: Record<string, SpwSelector> = {
  navigable: NAVIGABLE,
  refs: REFERENCES,
  pathRefs: PATH_REFS,
  rootRefs: REFERENCES,
  domains: DOMAIN_ROOTS,
  'domains+': DOMAIN_ROOTS_FULL,
  scopes: SCOPES,
  hydrate: HYDRATE_OPS,
  probes: QUERY_OPS,
  configs: CONFIG_OPS,
  bias: BIAS,
  defers: DEFER_OPS,
  taps: DOMAIN_ROOTS,
  annotations: ANNOTATION_OPS,
  'ops:frame': OPS_WITH_FRAMES,
  'ops:body': OPS_WITH_BODIES,
  boon: BOON_OPS,
  bone: BONE_OPS,
  all: ANY,
}

export interface ResolvedCliSelector {
  selector: SpwSelector
  label: string
}

export function listCliSelectorPresetNames(): string[] {
  return Object.keys(CLI_SELECTOR_PRESETS)
}

const SELECTOR_ALIASES: Record<string, string> = {
  path: 'pathRefs',
  pathref: 'pathRefs',
  pathrefs: 'pathRefs',
  paths: 'pathRefs',
  ref: 'refs',
  references: 'refs',
  root: 'rootRefs',
  rootref: 'rootRefs',
  rootrefs: 'rootRefs',
  frame: 'ops:frame',
  frames: 'ops:frame',
  body: 'ops:body',
  bodies: 'ops:body',
  nav: 'navigable',
  any: 'all',
  probe: 'probes',
  domain: 'domains',
}

export function resolveCliSelector(selectorName: string, expr: string): ResolvedCliSelector {
  if (expr) {
    const parsed = tryParseSelector(expr)
    if (!parsed) {
      throw new Error(`--expr parse failed: ${expr}`)
    }
    return {
      selector: parsed,
      label: expr,
    }
  }

  const raw = selectorName.trim()
  const preset = CLI_SELECTOR_PRESETS[raw]
  if (preset) {
    return {
      selector: preset,
      label: raw,
    }
  }

  // Case-insensitive + alias resolution before free-form expr
  const lower = raw.toLowerCase()
  const alias = SELECTOR_ALIASES[lower]
  if (alias && CLI_SELECTOR_PRESETS[alias]) {
    return {
      selector: CLI_SELECTOR_PRESETS[alias]!,
      label: alias,
    }
  }
  const fuzzyKey = Object.keys(CLI_SELECTOR_PRESETS).find(k => k.toLowerCase() === lower)
  if (fuzzyKey) {
    return {
      selector: CLI_SELECTOR_PRESETS[fuzzyKey]!,
      label: fuzzyKey,
    }
  }

  // Free-form selector expressions must look like selector syntax, not bare words
  if (/[$@~?^&*!%#.|\[\]]/.test(raw) || raw.includes(':') && !CLI_SELECTOR_PRESETS[raw]) {
    const parsed = tryParseSelector(raw)
    if (parsed) {
      return {
        selector: parsed,
        label: raw,
      }
    }
  }

  throw new Error(`Unknown selector: ${raw}`)
}

export function filterRootRefs(matches: SpwMatch[]): SpwMatch[] {
  return matches.filter((match) => match.node.type === 'Reference' && extractReferenceRaw(match).includes('/'))
}

export function extractReferenceRaw(match: Pick<SpwMatch, 'node'>): string {
  return (match.node as { raw?: string }).raw ?? ''
}
