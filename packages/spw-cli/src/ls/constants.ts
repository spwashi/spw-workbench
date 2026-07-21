import type { OperatorPayload } from './types'

export const OPERATOR_SET = new Set(['^', '!', '?', '~', '@', '&', '*', '=', '%', '#', '.', '$', '_'])
export const BRACE_SET = new Set(['(', ')', '[', ']', '{', '}', '<', '>'])
export const REGISTER_GATE_SET = new Set(['.[', '.]', '.(', '.)', '.{', '.}', '.<', '.>'])
export const IGNORED_DIRS = new Set(['.git', '_workbench', 'node_modules', 'dist', 'release'])

export const OPERATOR_PAYLOADS: Record<string, OperatorPayload> = {
  '?': { role: 'probe', physics: 'measurement onset', tuning: 'increase sampling density around high-drift zones' },
  '~': { role: 'potential', physics: 'superposition defer', tuning: 'delay collapse until ambiguity drops below threshold' },
  '@': { role: 'observer', physics: 'perspective push', tuning: 'cache scope-local reads aggressively (hot tier)' },
  '&': { role: 'merge', physics: 'entanglement/composition', tuning: 'cluster before merge to reduce coupling pressure' },
  '*': { role: 'collapse', physics: 'materialization', tuning: 'materialize selected projections only' },
  '^': { role: 'integrate', physics: 'upward emission', tuning: 'commit invariant summaries; avoid full replay' },
  '!': { role: 'action', physics: 'kinetic injection', tuning: 'gate effects behind deterministic spell macros' },
  '=': { role: 'constraint', physics: 'bias field', tuning: 'stabilize noisy branches with explicit bounds' },
  '%': { role: 'measure', physics: 'scalar observation', tuning: 'promote repeated measures into cached aggregates' },
  '#': { role: 'annotation', physics: 'resonance tag', tuning: 'use anchors/lenses to reduce lookup entropy' },
  '.': { role: 'ground_handle', physics: 'bound register/identifier handle', tuning: 'use as stable anchor for register lookup and replayability' },
  '$': { role: 'selector', physics: 'addressing potential', tuning: 'normalize selector forms to improve cache hit rate' },
  '_': { role: 'intrinsic', physics: 'identity/core register', tuning: 'carry stable label identity across transforms' },
}

const REGISTER_GATE_PAYLOADS: Record<string, OperatorPayload> = {
  '.[': { role: 'register_gate_open', physics: 'indexed aperture', tuning: 'use for bounded register reads' },
  '.]': { role: 'register_gate_close', physics: 'indexed closure', tuning: 'close register window explicitly' },
  '.(': { role: 'register_gate_open', physics: 'temporal aperture', tuning: 'scope ephemeral register context' },
  '.)': { role: 'register_gate_close', physics: 'temporal closure', tuning: 'seal transient context quickly' },
  '.{': { role: 'register_gate_open', physics: 'material aperture', tuning: 'materialize owned register body' },
  '.}': { role: 'register_gate_close', physics: 'material closure', tuning: 'commit and close owned body' },
  '.<': { role: 'register_gate_open', physics: 'liminal aperture', tuning: 'prime transition state before collapse' },
  '.>': { role: 'register_gate_close', physics: 'liminal closure', tuning: 'complete transition and emit summary' },
}

export const MODEL_HINTS: Record<string, string[]> = {
  fluid: [
    'optimize for flow continuity: prefer broad coverage over strict adjacency',
    'treat invalidation as turbulence; smooth via warm-tier aggregation',
  ],
  lattice: [
    'optimize for stable adjacency: maximize brace consistency and local symmetry',
    'reduce long-range coupling by strengthening local projection cells',
  ],
  thermal: [
    'optimize for energy minimization: collapse high-entropy branches sooner',
    'route repeated queries through low-temperature stable paths',
  ],
  quantum: [
    'optimize for deferred commitment: keep alternatives until measure fires',
    'track observer effect in trace before materialization',
  ],
}

const SOFT_TOKEN_EQUIVALENTS: Record<string, string[]> = {
  '#': ['#', '.[', '.]'],
  '.[': ['.[', '#', '.]'],
  '.]': ['.]', '#', '.['],
  '.': ['.', '.{', '{'],
  '.{': ['.{', '.', '{'],
  '{': ['{', '.{', '.'],
  '@': ['@', '.}'],
  '.}': ['.}', '@'],
  '&': ['&', '&dangling'],
  '&dangling': ['&dangling', '&'],
}

export function tokenVariants(token: string, mode: 'strict' | 'soft' = 'strict'): string[] {
  if (mode === 'strict') return [token]
  return SOFT_TOKEN_EQUIVALENTS[token] ?? [token]
}

export function tokenMatches(expected: string, actual: string, mode: 'strict' | 'soft' = 'strict'): boolean {
  return tokenVariants(expected, mode).includes(actual)
}

export function modelHints(model: string): string[] {
  return MODEL_HINTS[model] ?? MODEL_HINTS.fluid
}

export function payloadSummary(queryOps: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const op of queryOps) {
    if (seen.has(op)) continue
    seen.add(op)
    const payload = OPERATOR_PAYLOADS[op] ?? REGISTER_GATE_PAYLOADS[op]
    if (!payload) continue
    out.push(`${op}: ${payload.role} | ${payload.physics} | tune: ${payload.tuning}`)
  }
  return out
}
