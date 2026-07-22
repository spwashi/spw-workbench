/**
 * Built-in voice registers (feel-physics only — no vendor names).
 * Mirrors prompts/substrate/tone-anatomy.spw defaults for deterministic emit.
 */

import type { DimMap } from './types'

export const BUILTIN_REGISTERS: Record<string, DimMap> = {
  voice_patient_precise: {
    temperature: { warm: 0.45, cool: 0.55 },
    density: { sparse: 0.7, lush: 0.3 },
    precision: { exact: 0.8, suggestive: 0.2 },
    pace: { patient: 0.7, kinetic: 0.3 },
    relation: { companion: 0.4, sovereign: 0.6 },
    material: { fused: 0.4, mineral: 0.35, organic: 0.25 },
    structure: { linear: 0.7, spatial: 0.3 },
    authority: { evidenced: 0.75, confiding: 0.25 },
  },
  voice_hospitable_craft: {
    temperature: { warm: 0.7, cool: 0.3 },
    density: { sparse: 0.5, lush: 0.5 },
    precision: { exact: 0.45, suggestive: 0.55 },
    pace: { patient: 0.65, kinetic: 0.35 },
    relation: { companion: 0.65, sovereign: 0.35 },
    material: { organic: 0.55, fused: 0.35, mineral: 0.1 },
    structure: { spatial: 0.55, linear: 0.45 },
    authority: { confiding: 0.55, evidenced: 0.45 },
  },
  voice_kinetic_clear: {
    temperature: { warm: 0.4, cool: 0.6 },
    density: { sparse: 0.75, lush: 0.25 },
    precision: { exact: 0.7, suggestive: 0.3 },
    pace: { kinetic: 0.75, patient: 0.25 },
    relation: { sovereign: 0.6, companion: 0.4 },
    material: { fused: 0.5, mineral: 0.3, organic: 0.2 },
    structure: { linear: 0.8, spatial: 0.2 },
    authority: { evidenced: 0.65, confiding: 0.35 },
  },
  voice_braided_relation: {
    temperature: { warm: 0.55, cool: 0.45 },
    density: { lush: 0.55, sparse: 0.45 },
    precision: { exact: 0.5, suggestive: 0.5 },
    pace: { patient: 0.5, kinetic: 0.5 },
    relation: { companion: 0.5, sovereign: 0.5 },
    material: { fused: 0.7, organic: 0.15, mineral: 0.15 },
    structure: { spatial: 0.5, linear: 0.5 },
    authority: { evidenced: 0.5, confiding: 0.5 },
  },
  voice_web_quiet: {
    temperature: { warm: 0.5, cool: 0.5 },
    density: { sparse: 0.8, lush: 0.2 },
    precision: { exact: 0.7, suggestive: 0.3 },
    pace: { patient: 0.55, kinetic: 0.45 },
    relation: { companion: 0.45, sovereign: 0.55 },
    material: { fused: 0.45, mineral: 0.3, organic: 0.25 },
    structure: { linear: 0.65, spatial: 0.35 },
    authority: { evidenced: 0.7, confiding: 0.3 },
  },
}

/** Phrase injectors from material / temperature poles (positive fill only). */
export const TONE_PHRASES: Record<string, string[]> = {
  'temperature.warm': ['warm invitation', 'hearth-side clarity', 'human scale'],
  'temperature.cool': ['cool precision', 'clear edge', 'quiet structure'],
  'material.fused': ['two materials negotiate', 'copper through glass', 'soft law in hard aperture'],
  'material.organic': ['worn grain', 'soft steam', 'linen dust'],
  'material.mineral': ['cut face', 'crystal rim', 'rigid aperture'],
  'pace.patient': ['ordered steps', 'breath between beats'],
  'pace.kinetic': ['forward verb first', 'struck once'],
  'density.sparse': ['one claim', 'one door', 'thrift of chrome'],
  'density.lush': ['layered motif', 'secondary image allowed'],
  'relation.companion': ['with you at the board'],
  'relation.sovereign': ['prefer this path', 'done when'],
  'authority.evidenced': ['one checkable line'],
  'authority.confiding': ['taste said aloud'],
}

export function listBuiltinRegisters(): string[] {
  return Object.keys(BUILTIN_REGISTERS)
}

export function resolveRegisterDims(name: string | undefined): DimMap {
  if (!name) return {}
  const key = name.replace(/^#/, '').replace(/^voice_/, 'voice_')
  const normalized = key.startsWith('voice_') ? key : `voice_${key}`
  return structuredClone(BUILTIN_REGISTERS[normalized] ?? BUILTIN_REGISTERS[key] ?? {})
}

export function applyDimSets(dims: DimMap, set: Record<string, number>): DimMap {
  const next = structuredClone(dims)
  for (const [path, value] of Object.entries(set)) {
    // tone.density.sparse=0.85 or density.sparse=0.85
    const parts = path.replace(/^tone\./, '').split('.')
    if (parts.length !== 2) continue
    const [dim, pole] = parts
    if (!next[dim]) next[dim] = {}
    next[dim][pole] = value
  }
  return next
}

/** Dominant pole phrases for dims that have phrase banks. */
export function phrasesForDims(dims: DimMap, limit = 6): string[] {
  const out: string[] = []
  for (const [dim, poles] of Object.entries(dims)) {
    let bestPole = ''
    let bestW = -1
    for (const [pole, w] of Object.entries(poles)) {
      if (w > bestW) {
        bestW = w
        bestPole = pole
      }
    }
    if (!bestPole || bestW < 0.45) continue
    const key = `${dim}.${bestPole}`
    const bank = TONE_PHRASES[key]
    if (bank) out.push(...bank.slice(0, 2))
  }
  return out.slice(0, limit)
}
