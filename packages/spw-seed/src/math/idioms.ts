/**
 * Spw algorithmic idioms — surfaces that map cleanly to seed math probes.
 *
 * Ethos: each idiom names a Spw form people already write and a machine
 * entrypoint (graph / loop / equation / field). Not automatic evaluation of
 * prose; a binding table for tools and agents.
 *
 * @see docs/theory/spw/math-modeling.spw
 */

export type MathFamily = 'graph' | 'loop' | 'equation' | 'field' | 'hold'

export interface SpwMathIdiom {
  id: string
  family: MathFamily
  /** Compact Spw surface example */
  surface: string
  /** Seed / emit machine */
  machine: string
  meaning: string
  /** What would falsify a claim that uses this idiom */
  falsify: string
}

export const SPW_MATH_IDIOMS: SpwMathIdiom[] = [
  {
    id: 'path_edge',
    family: 'graph',
    surface: '~"to.spw" under from-frame',
    machine: 'math/graph.ts + corpus graphFromLinks',
    meaning: 'Directed edge in topography / dependency graph',
    falsify: 'Cycle claimed acyclic under topologicalSort',
  },
  {
    id: 'couple_peer',
    family: 'graph',
    surface: '<>[a, b]',
    machine: 'math/graph.ts undirected weight 1',
    meaning: 'Symmetric peer relation (couple)',
    falsify: 'Asymmetric degree after couple without inverse edge',
  },
  {
    id: 'saga_fixed_point',
    family: 'loop',
    surface: 'observe → mutate → measure until plateau',
    machine: 'math/loop.ts#fixedPoint',
    meaning: 'Iterate until residual below ε or maxIter',
    falsify: 'maxIter exceeded while claiming convergence',
  },
  {
    id: 'hold_product',
    family: 'hold',
    surface: 'Hold = ∏ h_i^{α_i(c)}',
    machine: 'emit/axes.ts#holdProduct',
    meaning: 'Multiplicative satisfaction under context salience',
    falsify: 'productConstraint returns 1 with a zero factor',
  },
  {
    id: 'measure_residual',
    family: 'equation',
    surface: '%name or 1 - Hold',
    machine: 'math/equation.ts#residual',
    meaning: 'Zero-seeking error for control / stop laws',
    falsify: 'Residual ignored while stop claims Hold≥θ',
  },
  {
    id: 'field_decay',
    family: 'field',
    surface: 'site mass decay / half-life traits',
    machine: 'math/field.ts#decayField',
    meaning: 'Carrier mass exponential decay on sites',
    falsify: 'Mass increases under pure decay',
  },
  {
    id: 'field_diffuse',
    family: 'field',
    surface: 'neighbor transfer / ensemble mix',
    machine: 'math/field.ts#diffuseField',
    meaning: 'Mass-conserving undirected diffuse',
    falsify: 'Total mass drifts beyond tolerance',
  },
  {
    id: 'stream_fold',
    family: 'loop',
    surface: '<<a, b, c>> foldReady multi',
    machine: 'math/loop.ts#rangeFold + ONF stream foldReady',
    meaning: 'Ordered channel fold over multi payload',
    falsify: 'foldReady true with argCount < 2',
  },
  {
    id: 'select_arms',
    family: 'graph',
    surface: '&[a, b] or #[a, b] multi-arm',
    machine: 'ONF frames.select + graph fan-out',
    meaning: 'Explicit multi-arm selection / set product',
    falsify: 'select.armCount ≠ frame content length',
  },
]

export function idiomsForFamily(family: MathFamily): SpwMathIdiom[] {
  return SPW_MATH_IDIOMS.filter(i => i.family === family)
}

export function formatMathIdioms(family?: MathFamily): string {
  const list = family ? idiomsForFamily(family) : SPW_MATH_IDIOMS
  return list
    .map(
      i =>
        `${i.id.padEnd(18)} ${i.family.padEnd(9)} ${i.surface}\n  → ${i.machine}\n  ${i.meaning}`,
    )
    .join('\n\n')
}
