import {
  ANY,
  ANNOTATION_OPS,
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

  const preset = CLI_SELECTOR_PRESETS[selectorName]
  if (preset) {
    return {
      selector: preset,
      label: selectorName,
    }
  }

  const parsed = tryParseSelector(selectorName)
  if (parsed) {
    return {
      selector: parsed,
      label: selectorName,
    }
  }

  throw new Error(`Unknown selector: ${selectorName}`)
}

export function filterRootRefs(matches: SpwMatch[]): SpwMatch[] {
  return matches.filter((match) => match.node.type === 'Reference' && extractReferenceRaw(match).includes('/'))
}

export function extractReferenceRaw(match: Pick<SpwMatch, 'node'>): string {
  return (match.node as { raw?: string }).raw ?? ''
}
