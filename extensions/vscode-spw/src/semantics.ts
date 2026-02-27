export interface SigilSemantic {
  role: string
  physics: string
  phase: string
}

export const SIGIL_SEMANTICS: Record<string, SigilSemantic> = {
  '^': { role: 'integration / framing', physics: 'emission — bind upward', phase: 'phase 6' },
  '!': { role: 'action / injection', physics: 'kinetic — fires effect on world', phase: 'phase 0' },
  '?': { role: 'wonder / probe', physics: 'measurement — is there something?', phase: 'phase 1' },
  '~': { role: 'potential / superposition', physics: 'wavefunction — defer, name', phase: 'phase 2' },
  '@': { role: 'perspective / observer', physics: 'observation — push scope', phase: 'phase 3' },
  '&': { role: 'confluence / merge', physics: 'entanglement — combine frames', phase: 'phase 4' },
  '*': { role: 'value / collapse', physics: 'collapse — scope to concrete', phase: 'phase 5' },
  '=': { role: 'config / constraint', physics: 'bias — forcing state', phase: 'binding' },
  '%': { role: 'measure / observation', physics: 'scalar — quantify relevance', phase: 'observe' },
  '#': { role: 'annotation / resonance', physics: 'vibration — self-reference, meta', phase: 'meta' },
  '.': { role: 'ground / access', physics: 'ground state — context, separator', phase: 'access' },
  '→': { role: 'flow / maps-to', physics: 'directed edge — A produces B', phase: 'transform' },
  '←': { role: 'receives / pulls', physics: 'directed edge — B draws from A', phase: 'transform' },
  '↔': { role: 'bidirectional / iso', physics: 'reversible transform', phase: 'equivalence' },
  '≡': { role: 'identity / congruence', physics: 'invariant assertion — structurally same', phase: 'verify' },
  '≈': { role: 'approximation', physics: 'near-equality — fuzzy match', phase: 'probe' },
  '∞': { role: 'unbounded / divergent', physics: 'open range — no upper limit', phase: 'probe' },
  '×': { role: 'product / cross', physics: 'combination — Cartesian product', phase: 'merge' },
  '∀': { role: 'universal / for-all', physics: 'quantifier — applies everywhere', phase: 'verify' },
  '∃': { role: 'existential / there-exists', physics: 'quantifier — at least one', phase: 'probe' },
  '∈': { role: 'membership / element-of', physics: 'containment test', phase: 'observe' },
  '∪': { role: 'union / combine', physics: 'set merge — include all', phase: 'merge' },
  '∩': { role: 'intersection / overlap', physics: 'set filter — shared only', phase: 'merge' },
  '∑': { role: 'summation', physics: 'accumulation over range', phase: 'materialize' },
  '∫': { role: 'integration', physics: 'continuous accumulation', phase: 'materialize' },
}
