/**
 * Formula discovery — find named and surface-embedded math patterns in Spw text.
 *
 * Portable: no DOM/CLI deps. Used by `spw formula` and analysis inventories.
 *
 * Families align with docs/theory/spw/math-modeling.spw:
 *   hold | measure | field | graph | loop | literacy | axis | constraint
 */

export type FormulaFamily =
  | 'hold'
  | 'measure'
  | 'field'
  | 'graph'
  | 'loop'
  | 'literacy'
  | 'axis'
  | 'constraint'

export interface FormulaHit {
  family: FormulaFamily
  patternId: string
  line: number
  snippet: string
  /** Heuristic confidence 0–1 */
  score: number
}

export interface FormulaCatalogEntry {
  id: string
  family: FormulaFamily
  formula: string
  meaning: string
  machine: string
}

/** Named formulas the machine already owns (emit axes + seed math). */
export const FORMULA_CATALOG: FormulaCatalogEntry[] = [
  {
    id: 'F2.hold',
    family: 'hold',
    formula: 'Hold = ∏ h_i^{α_i(c)}',
    meaning: 'Product of clamped hold factors under context salience',
    machine: 'packages/spw-cli/src/emit/axes.ts#holdProduct',
  },
  {
    id: 'F4.canonize',
    family: 'constraint',
    formula: 'Canonize ⇔ Hold≥θ ∧ evidence ∧ episode',
    meaning: 'Promotion gate: hold threshold + evidence + episode lock',
    machine: 'packages/spw-cli/src/emit/axes.ts#cacheAxisContext',
  },
  {
    id: 'F8.literacy',
    family: 'literacy',
    formula: 'L = Form · Agency · Evidence · Memory',
    meaning: 'Literacy product; any zero collapses L',
    machine: 'packages/spw-cli/src/emit/axes.ts#literacyProduct',
  },
  {
    id: 'residual',
    family: 'measure',
    formula: 'r(x) = f(x)  (zero-seeking residual)',
    meaning: '%measure / Hold shortfall as error to drive',
    machine: 'packages/spw-seed/src/math/equation.ts#residual',
  },
  {
    id: 'productConstraint',
    family: 'constraint',
    formula: 'C = ∏ x_i^{w_i}',
    meaning: 'Multiplicative satisfaction under positive weights',
    machine: 'packages/spw-seed/src/math/equation.ts#productConstraint',
  },
  {
    id: 'field.decay',
    family: 'field',
    formula: 's′ = s · e^{−λΔt}',
    meaning: 'Carrier mass decay on sites',
    machine: 'packages/spw-seed/src/math/field.ts#decayField',
  },
  {
    id: 'field.diffuse',
    family: 'field',
    formula: 'mass-conserving neighbor transfer',
    meaning: 'Diffuse across undirected site edges',
    machine: 'packages/spw-seed/src/math/field.ts#diffuseField',
  },
  {
    id: 'field.affinity',
    family: 'field',
    formula: 'allocate by affinity weights under capacity',
    meaning: 'Binding sites compete for carrier mass',
    machine: 'packages/spw-seed/src/math/field.ts#affinityAllocate',
  },
  {
    id: 'graph.topo',
    family: 'graph',
    formula: 'layers = Kahn freelist of DAG',
    meaning: 'Dependency stack; cycles break topo',
    machine: 'packages/spw-seed/src/math/graph.ts + corpus.ts',
  },
  {
    id: 'loop.fixedPoint',
    family: 'loop',
    formula: 'x ← f(x) until |x−f(x)| < ε or maxIter',
    meaning: 'Saga / pulse stop law under measure plateau',
    machine: 'packages/spw-seed/src/math/loop.ts#fixedPoint',
  },
  {
    id: 'axis.salience',
    family: 'axis',
    formula: 'σ(c) = normalize(boost(axes, context))',
    meaning: 'Context-sensitive axis attention for Hold α',
    machine: 'packages/spw-cli/src/emit/axes.ts#salienceForContext',
  },
]

interface PatternRule {
  family: FormulaFamily
  patternId: string
  re: RegExp
  score: number
}

const RULES: PatternRule[] = [
  // Hold / product
  { family: 'hold', patternId: 'hold_product', re: /\bHold\b\s*=|\bholdProduct\b|∏\s*h_/i, score: 0.95 },
  { family: 'hold', patternId: 'hold_factor', re: /\bhold[_\s-]?(factor|α|alpha)\b|h_i\^α/i, score: 0.8 },
  { family: 'hold', patternId: 'hold_keyword', re: /\bHold_c\b|\bhold\s*≥|\bHold\s*>=/i, score: 0.75 },

  // Named F-series
  { family: 'hold', patternId: 'F2', re: /\bF2\b|Hold\s*=\s*∏/, score: 0.9 },
  { family: 'constraint', patternId: 'F4', re: /\bF4\b|Canonize\s*⇔|Canonize\s*iff/i, score: 0.9 },
  { family: 'literacy', patternId: 'F8', re: /\bF8\b|Form\s*[·*]\s*Agency\s*[·*]\s*Evidence/i, score: 0.9 },
  { family: 'axis', patternId: 'F_axis', re: /\bF[1-9]\b|\baxis\s*context\b|salienceForContext/i, score: 0.65 },

  // Measure / residual
  { family: 'measure', patternId: 'percent_measure', re: /%[a-zA-Z_][\w.]*/, score: 0.55 },
  { family: 'measure', patternId: 'residual', re: /\bresidual\b|\bf\(x\)\s*=\s*0\b|1\s*-\s*Hold/i, score: 0.85 },
  { family: 'measure', patternId: 'measure_keyword', re: /\bmeasure\b.*\b(error|delta|shortfall)\b|\b%measure\b/i, score: 0.7 },

  // Field dynamics
  { family: 'field', patternId: 'decay', re: /\bdecayField\b|\bhalfLife\b|\bdecay\s*(rate|field)?\b/i, score: 0.8 },
  { family: 'field', patternId: 'diffuse', re: /\bdiffuseField\b|\bdiffuse\b/i, score: 0.75 },
  { family: 'field', patternId: 'cascade', re: /\bcascadeChain\b|\bcascade\b/i, score: 0.75 },
  { family: 'field', patternId: 'affinity', re: /\baffinityAllocate\b|\baffinity\b/i, score: 0.75 },
  { family: 'field', patternId: 'capacity', re: /\bcapacityStep\b|\bcapacity\b/i, score: 0.7 },
  { family: 'field', patternId: 'field_beat', re: /\bfieldBeat\b|\bfield\s*beat\b/i, score: 0.85 },
  { family: 'field', patternId: 'carrier_site', re: /\bcarrier\b|\bbinding\s*site\b|\bBindingSite\b/i, score: 0.65 },

  // Graph
  { family: 'graph', patternId: 'cycle', re: /\bdetectCycle\b|\bcyclic\b|\bcycleWitness\b|\bSCC\b/i, score: 0.8 },
  { family: 'graph', patternId: 'topo', re: /\btopologicalSort\b|\btopoLayers\b|\btopo\s*layer/i, score: 0.8 },
  { family: 'graph', patternId: 'hub', re: /\bdegreeHubs\b|\bhub\s*(score|degree)?\b/i, score: 0.7 },
  { family: 'graph', patternId: 'path_edge', re: /~"[^"]+"|~`[^`]+`/, score: 0.45 },

  // Loop / fixed point
  { family: 'loop', patternId: 'fixed_point', re: /\bfixedPoint\b|\bfixed[-\s]?point\b|x\s*←\s*f\(x\)/i, score: 0.9 },
  { family: 'loop', patternId: 'orbit', re: /\blogisticOrbit\b|\borbit\b|\bdetectPeriod\b/i, score: 0.75 },
  { family: 'loop', patternId: 'max_iter', re: /\bmaxIter\b|\bmax[_\s-]?iter\b|\buntil\s+conver/i, score: 0.65 },

  // Constraints / equations
  { family: 'constraint', patternId: 'product_constraint', re: /\bproductConstraint\b|∏\s*x_/i, score: 0.9 },
  { family: 'constraint', patternId: 'linear_system', re: /\bsolveLinearSystem\b|\bA\s*x\s*=\s*b\b/i, score: 0.9 },
  { family: 'constraint', patternId: 'bisection', re: /\bbisectionRoot\b|\bbisection\b/i, score: 0.85 },
  { family: 'constraint', patternId: 'polynomial', re: /\bevalPolynomial\b|\bΣ\s*c\[i\]/i, score: 0.85 },

  // Literacy / pedagogy
  { family: 'literacy', patternId: 'literacy_parts', re: /\bliteracyProduct\b|\bForm\b.*\bAgency\b.*\bEvidence\b/i, score: 0.85 },
]

/**
 * Scan source text for formula-like patterns (line-oriented heuristics).
 * Dedupes (family, patternId, line). Caps hits for large files.
 */
export function scanFormulas(source: string, opts: { maxHits?: number } = {}): FormulaHit[] {
  const maxHits = opts.maxHits ?? 200
  const lines = source.split(/\r?\n/)
  const hits: FormulaHit[] = []
  const seen = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) continue
    // Skip pure prose comment lines that are only # without structure? keep # comments — often hold formulas

    for (const rule of RULES) {
      rule.re.lastIndex = 0
      if (!rule.re.test(line)) continue
      const key = `${rule.family}:${rule.patternId}:${i + 1}`
      if (seen.has(key)) continue
      seen.add(key)
      hits.push({
        family: rule.family,
        patternId: rule.patternId,
        line: i + 1,
        snippet: truncateSnippet(trimmed, 96),
        score: rule.score,
      })
      if (hits.length >= maxHits) return rankHits(hits)
    }
  }
  return rankHits(hits)
}

function rankHits(hits: FormulaHit[]): FormulaHit[] {
  return hits.sort(
    (a, b) => b.score - a.score || a.line - b.line || a.patternId.localeCompare(b.patternId),
  )
}

function truncateSnippet(s: string, max: number): string {
  const one = s.replace(/\s+/g, ' ')
  if (one.length <= max) return one
  return `${one.slice(0, max - 1)}…`
}

export function summarizeFormulaHits(hits: FormulaHit[]): Record<FormulaFamily, number> {
  const out: Record<string, number> = {}
  for (const h of hits) {
    out[h.family] = (out[h.family] ?? 0) + 1
  }
  return out as Record<FormulaFamily, number>
}

/** Aggregate pattern frequency across many files. */
export function aggregateFormulaPatterns(
  reports: Array<{ file: string; hits: FormulaHit[] }>,
): Array<{ patternId: string; family: FormulaFamily; count: number; files: number }> {
  const map = new Map<string, { patternId: string; family: FormulaFamily; count: number; files: Set<string> }>()
  for (const r of reports) {
    const filePatterns = new Set<string>()
    for (const h of r.hits) {
      const key = `${h.family}:${h.patternId}`
      let row = map.get(key)
      if (!row) {
        row = { patternId: h.patternId, family: h.family, count: 0, files: new Set() }
        map.set(key, row)
      }
      row.count++
      filePatterns.add(key)
    }
    for (const key of filePatterns) map.get(key)!.files.add(r.file)
  }
  return [...map.values()]
    .map(r => ({
      patternId: r.patternId,
      family: r.family,
      count: r.count,
      files: r.files.size,
    }))
    .sort((a, b) => b.count - a.count || a.patternId.localeCompare(b.patternId))
}
