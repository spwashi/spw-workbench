export type SurfaceMode = 'ast' | 'raw' | 'hybrid'
export type MatchMode = 'ordered' | 'set' | 'hybrid'
export type ProbeKind = 'operator' | 'sequence'
export type EquivMode = 'strict' | 'soft'

export interface CliArgs {
  sequence: string
  braces: string
  roots: string[]
  top: number
  strict: boolean
  json: boolean
  model: string
  label: string
  surface: SurfaceMode
  mode: MatchMode
  equiv: EquivMode
  probeExpr: string
  probeWindow: number
}

export interface SequenceCell {
  token: string
  offset: number
}

export interface MatchStats {
  matched: number
  coverage: number
  strictHit: boolean
}

export interface ProbePattern {
  raw: string
  canonical: string
  kind: ProbeKind
  patternTokens: string[]
  opTokens: string[]
  braceTokens: string[]
  subjects: string[]
}

export interface SequenceProbeStats {
  kind: ProbeKind
  pattern: string
  patternTokens: string[]
  sequenceHits: number
  immediateHits: number
  immediateOpportunities: number
  downstreamHits: number
  downstreamOpportunities: number
  subjectHits: number
  subjectOpportunities: number
  immediateRate: number
  downstreamRate: number
  subjectRate: number
  charge: number
  conceptPriming: number
  realization: number
  collapseGap: number
  deferred: number
  spin: number
  support: number
  value: number
}

export interface FileResult {
  file: string
  opStreamLength: number
  braceStreamLength: number
  opOrdered: MatchStats
  opSet: MatchStats
  opEffective: MatchStats
  braceOrdered: MatchStats
  braceSet: MatchStats
  braceEffective: MatchStats
  labels: string[]
  labelCoverage: number
  labelOperatorCount: number
  labelBracePairCount: number
  registerDanglingCount: number
  registerDanglingTokens: string[]
  danglingReferenceAvailable: boolean
  overallCoverage: number
  strictHit: boolean
  probe: SequenceProbeStats | null
  opPreview: string
  bracePreview: string
}

export interface OperatorPayload {
  role: string
  physics: string
  tuning: string
}

export interface BlockRange {
  start: number
  end: number
}

export interface RegisterState {
  danglingCount: number
  danglingTokens: string[]
}
