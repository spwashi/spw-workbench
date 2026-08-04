/**
 * Probe + substrate measurement — census of wonder/probes and host metrics.
 *
 * @see docs/theory/spw/flow-protocol-sigils.spw
 */

import type { RegisterEvent, Resonance } from '../pipeline/substrate'
import { detectResonances } from '../pipeline/resonance'
import { Substrate } from '../pipeline/substrate'

export interface ProbeHit {
  kind: 'wonder' | 'probe' | 'metric' | 'measure_facet'
  surface: string
  index: number
  line: number
  /** Inner text when captured. */
  body?: string
}

export interface SubstrateMeasure {
  eventCount: number
  writeCount: number
  coupleCount: number
  phaseAdvanceCount: number
  uniqueKeys: number
  resonances: Resonance[]
  /** Writes per distinct key (vibration proxy). */
  frequencyByKey: Record<string, number>
}

export interface ProbeMeasureReport {
  probes: ProbeHit[]
  probeCount: number
  wonderCount: number
  metricCount: number
  substrate?: SubstrateMeasure
  summary: string
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

/**
 * Scan document for probes, wonder blocks, and measure facets.
 */
export function measureProbes(source: string): ProbeHit[] {
  const hits: ProbeHit[] = []

  const wonderRe = /\?\["([^"]+)"\]\s*\{/g
  let m: RegExpExecArray | null
  while ((m = wonderRe.exec(source)) !== null) {
    hits.push({
      kind: 'wonder',
      surface: m[0],
      index: m.index,
      line: lineOf(source, m.index),
      body: m[1],
    })
  }

  const probeRe = /!probe\s*\{([^}]*)\}/g
  while ((m = probeRe.exec(source)) !== null) {
    hits.push({
      kind: 'probe',
      surface: m[0].slice(0, 60),
      index: m.index,
      line: lineOf(source, m.index),
      body: m[1]?.trim().slice(0, 120),
    })
  }

  const metricRe = /\$%\[([^\]]+)\]/g
  while ((m = metricRe.exec(source)) !== null) {
    hits.push({
      kind: 'metric',
      surface: m[0],
      index: m.index,
      line: lineOf(source, m.index),
      body: m[1],
    })
  }

  // Bare %[…] not already captured as $%[…]
  const facetRe = /%\[([^\]]+)\]/g
  while ((m = facetRe.exec(source)) !== null) {
    if (m.index > 0 && source[m.index - 1] === '$') continue
    hits.push({
      kind: 'measure_facet',
      surface: m[0],
      index: m.index,
      line: lineOf(source, m.index),
      body: m[1],
    })
  }

  return hits.sort((a, b) => a.index - b.index)
}

/**
 * Summarize substrate event log for measurement / vibration.
 */
export function measureSubstrate(
  substrate: Substrate | readonly RegisterEvent[],
): SubstrateMeasure {
  const events = substrate instanceof Substrate ? substrate.peek() : substrate
  const frequencyByKey: Record<string, number> = {}
  let writeCount = 0
  let coupleCount = 0
  let phaseAdvanceCount = 0

  for (const e of events) {
    if (e.kind === 'write') {
      writeCount++
      frequencyByKey[e.key] = (frequencyByKey[e.key] ?? 0) + 1
    } else if (e.kind === 'couple') {
      coupleCount++
    } else if (e.kind === 'phase-advance') {
      phaseAdvanceCount++
    }
  }

  return {
    eventCount: events.length,
    writeCount,
    coupleCount,
    phaseAdvanceCount,
    uniqueKeys: Object.keys(frequencyByKey).length,
    resonances: detectResonances(events),
    frequencyByKey,
  }
}

/**
 * Combined probe document scan + optional substrate metrics.
 */
export function measureProbesAndSubstrate(
  source: string,
  substrate?: Substrate | readonly RegisterEvent[],
): ProbeMeasureReport {
  const probes = measureProbes(source)
  const probeCount = probes.filter(p => p.kind === 'probe').length
  const wonderCount = probes.filter(p => p.kind === 'wonder').length
  const metricCount = probes.filter(p => p.kind === 'metric' || p.kind === 'measure_facet').length
  const sub = substrate ? measureSubstrate(substrate) : undefined

  const parts = [
    `probes=${probeCount}`,
    `wonder=${wonderCount}`,
    `metrics=${metricCount}`,
  ]
  if (sub) {
    parts.push(`events=${sub.eventCount}`, `writes=${sub.writeCount}`, `reso=${sub.resonances.length}`)
  }

  return {
    probes,
    probeCount,
    wonderCount,
    metricCount,
    substrate: sub,
    summary: parts.join(' '),
  }
}
