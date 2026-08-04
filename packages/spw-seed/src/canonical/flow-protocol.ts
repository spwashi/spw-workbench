/**
 * Flow protocol — prefix/postfix sigils × brace × spacing/adjacency
 * define flows, routines, strategies, procedures, biases, probes.
 *
 * Heuristic recognition for tooling (LSP/CLI/session). Not ONF evaluation law.
 *
 * @see docs/theory/spw/flow-protocol-sigils.spw
 * @see docs/theory/spw/fixity-brace-phrases.spw
 */

export type FlowRole =
  | 'flow' // ordered schedule / CA pipeline
  | 'routine' // repeated integrate/collapse pattern
  | 'strategy' // bias-weighted choice
  | 'procedure' // action sequence (!…)
  | 'bias' // =[axis] product
  | 'probe' // ? / !probe / wonder
  | 'measure' // % / $%[…]
  | 'hold' // @() / path hold
  | 'unknown'

export type FlowFixity = 'prefix' | 'postfix' | 'interior' | 'schedule' | 'adjacent' | 'none'

/** One recognized protocol unit (phrase or schedule). */
export interface FlowUnit {
  role: FlowRole
  fixity: FlowFixity
  /** Primary sigil or digraph when known. */
  sigil?: string
  /** Matched surface slice. */
  surface: string
  index: number
  line: number
  /** Adjacent bound kind if detected. */
  bound?: 'frame' | 'body' | 'scope' | 'stream' | 'capsule' | 'none'
  /** Spacing class: tight ActBound, spaced, newline. */
  spacing: 'tight' | 'spaced' | 'newline' | 'schedule'
  /** Confidence 0–1. */
  confidence: number
  note?: string
}

export interface FlowProtocolModule {
  /** Module / surface id when known. */
  id?: string
  /** Units in source order. */
  units: FlowUnit[]
  /** Role histogram. */
  roles: Record<FlowRole, number>
  /** Schedule pipelines found (stream with ; or ||). */
  schedules: string[]
  /** Declared bias axes. */
  biasAxes: string[]
  /** Protocol hooks cited (=exp / =phi / =ceiling). */
  hooks: string[]
}

const ROLE_ZERO = (): Record<FlowRole, number> => ({
  flow: 0,
  routine: 0,
  strategy: 0,
  procedure: 0,
  bias: 0,
  probe: 0,
  measure: 0,
  hold: 0,
  unknown: 0,
})

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

function push(
  units: FlowUnit[],
  unit: Omit<FlowUnit, 'line'> & { line?: number },
  source: string,
): void {
  units.push({
    ...unit,
    line: unit.line ?? lineOf(source, unit.index),
  })
}

/**
 * Scan source for flow-protocol units.
 */
export function scanFlowProtocol(source: string, moduleId?: string): FlowProtocolModule {
  const units: FlowUnit[] = []
  const schedules: string[] = []
  const biasAxes: string[] = []
  const hooks: string[] = []
  const roles = ROLE_ZERO()

  // Stream schedules: << … ; … || … >>
  const streamRe = /<<([\s\S]*?)>>/g
  let m: RegExpExecArray | null
  while ((m = streamRe.exec(source)) !== null) {
    const inner = m[1] ?? ''
    const hasSeq = inner.includes(';')
    const hasPar = inner.includes('||')
    if (hasSeq || hasPar || /[~?!*^%@#.&$]/.test(inner)) {
      const surface = m[0]
      schedules.push(surface.length > 80 ? `${surface.slice(0, 77)}...` : surface)
      push(
        units,
        {
          role: 'flow',
          fixity: 'schedule',
          surface,
          index: m.index,
          bound: 'stream',
          spacing: 'schedule',
          confidence: hasSeq || hasPar ? 0.95 : 0.7,
          note: hasPar ? 'parallel||' : hasSeq ? 'sequential;' : 'stream',
        },
        source,
      )
    }
  }

  // Bias: =[axis] or =axis[ or =phi[ / =ceiling[
  const biasRe = /=(?:\[([^\]]+)\]|([A-Za-z_][\w]*)\s*\[)/g
  while ((m = biasRe.exec(source)) !== null) {
    const axis = (m[1] ?? m[2] ?? '').trim()
    if (axis) biasAxes.push(axis)
    const isHook = /^(phi|ceiling|exp|lock|channel|id)\b/i.test(axis) || m[0].startsWith('=phi') || m[0].startsWith('=ceiling') || m[0].startsWith('=exp')
    if (isHook || /phi|ceiling|exp|lock|channel/i.test(m[0])) {
      hooks.push(m[0].slice(0, 40))
    }
    push(
      units,
      {
        role: /phi|strategy|soft|hard/i.test(axis) ? 'strategy' : 'bias',
        fixity: 'prefix',
        sigil: '=',
        surface: m[0],
        index: m.index,
        bound: 'frame',
        spacing: 'tight',
        confidence: 0.9,
        note: axis ? `axis:${axis}` : undefined,
      },
      source,
    )
  }

  // Probes: !probe{…} and ?["…"]{
  const probeRe = /!probe\s*\{|\?\["[^"]*"\]\s*\{/g
  while ((m = probeRe.exec(source)) !== null) {
    push(
      units,
      {
        role: 'probe',
        fixity: 'prefix',
        sigil: m[0].startsWith('!') ? '!' : '?',
        surface: m[0],
        index: m.index,
        bound: 'body',
        spacing: m[0].includes(' ') ? 'spaced' : 'tight',
        confidence: 0.95,
      },
      source,
    )
  }

  // Measure: $%[…] or bare %[ when not part of $%
  const measureRe = /\$%?\[[^\]]*\]|%\[([^\]]+)\]/g
  while ((m = measureRe.exec(source)) !== null) {
    push(
      units,
      {
        role: 'measure',
        fixity: 'prefix',
        sigil: '%',
        surface: m[0],
        index: m.index,
        bound: 'frame',
        spacing: 'tight',
        confidence: 0.9,
      },
      source,
    )
  }

  // Procedure: !label{ or ![ or !boon{
  const procRe = /!(?:[a-zA-Z_][\w]*)?\s*(?:\{|\[)/g
  while ((m = procRe.exec(source)) !== null) {
    if (m[0].startsWith('!probe')) continue
    push(
      units,
      {
        role: 'procedure',
        fixity: 'prefix',
        sigil: '!',
        surface: m[0],
        index: m.index,
        bound: m[0].includes('{') ? 'body' : 'frame',
        spacing: /\s/.test(m[0]) ? 'spaced' : 'tight',
        confidence: 0.85,
      },
      source,
    )
  }

  // Routine: ^["…"]{ integrate frames
  const routineRe = /\^\s*\[[^\]]*\]\s*\{/g
  while ((m = routineRe.exec(source)) !== null) {
    push(
      units,
      {
        role: 'routine',
        fixity: 'prefix',
        sigil: '^',
        surface: m[0],
        index: m.index,
        bound: 'body',
        spacing: /\s/.test(m[0].slice(1, 3)) ? 'spaced' : 'tight',
        confidence: 0.85,
      },
      source,
    )
  }

  // Hold: @(…)
  const holdRe = /@\([^)]*\)/g
  while ((m = holdRe.exec(source)) !== null) {
    push(
      units,
      {
        role: 'hold',
        fixity: 'prefix',
        sigil: '@',
        surface: m[0],
        index: m.index,
        bound: 'scope',
        spacing: 'tight',
        confidence: 0.8,
      },
      source,
    )
  }

  // Postfix potential: word~
  const postRe = /\b([A-Za-z_][\w]*)~/g
  while ((m = postRe.exec(source)) !== null) {
    push(
      units,
      {
        role: 'flow',
        fixity: 'postfix',
        sigil: '~',
        surface: m[0],
        index: m.index,
        bound: 'none',
        spacing: 'tight',
        confidence: 0.75,
        note: 'postfix potential',
      },
      source,
    )
  }

  // Adjacency: Act immediately followed by Bound on same line (already mostly covered)
  // Collapse/value *{ or *boon{
  const collapseRe = /\*(?:[a-zA-Z_][\w]*)?\s*\{/g
  while ((m = collapseRe.exec(source)) !== null) {
    push(
      units,
      {
        role: 'procedure',
        fixity: 'prefix',
        sigil: '*',
        surface: m[0],
        index: m.index,
        bound: 'body',
        spacing: /\s/.test(m[0]) ? 'spaced' : 'tight',
        confidence: 0.85,
        note: 'collapse discharge',
      },
      source,
    )
  }

  units.sort((a, b) => a.index - b.index)
  for (const u of units) {
    roles[u.role] = (roles[u.role] ?? 0) + 1
  }

  return {
    id: moduleId,
    units,
    roles,
    schedules: [...new Set(schedules)],
    biasAxes: [...new Set(biasAxes)],
    hooks: [...new Set(hooks)],
  }
}

/** Summarize module as one-line protocol signature. */
export function formatFlowProtocolSummary(mod: FlowProtocolModule): string {
  const parts = (Object.entries(mod.roles) as [FlowRole, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([r, n]) => `${r}×${n}`)
  const sched = mod.schedules.length ? ` schedules=${mod.schedules.length}` : ''
  const bias = mod.biasAxes.length ? ` bias=[${mod.biasAxes.slice(0, 4).join(',')}]` : ''
  return `flow-protocol ${parts.join(' ')}${sched}${bias}`
}
