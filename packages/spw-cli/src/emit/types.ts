/**
 * Spw Emit IR — host-agnostic collapse of PE / brief surfaces.
 * Versioned so theme packs and plugins can depend on a stable shape.
 */

import type { ContinuityReport } from './continuity'

export const SPW_EMIT_IR_VERSION = 'spw.emit/1' as const

export type EmitHost =
  | 'plain'
  | 'mj'
  | 'web_copy'
  | 'eng_note'
  | 'json'
  | 'brief'
  | 'copy'
  | 'audio'
  | 'social'

export const EMIT_HOSTS: readonly EmitHost[] = [
  'plain',
  'mj',
  'web_copy',
  'eng_note',
  'json',
  'brief',
  'copy',
  'audio',
  'social',
] as const

export type DimMap = Record<string, Record<string, number>>

export interface EmitDocument {
  version: typeof SPW_EMIT_IR_VERSION
  sourcePath: string
  register?: string
  dims: DimMap
  traits: Record<string, string>
  slots: Record<string, string>
  includes: string[]
  optics: {
    lenses: string[]
    facets: string[]
  }
  /** Title continuity anchors */
  anchors: string[]
  /** Style genotype phrases */
  styleAnchors: string[]
  /** Subject name + tells */
  subjectAnchors: string[]
  /** Genre promise / weather */
  genreAnchors: string[]
  /** Bound pack ids when present */
  line: {
    style_id?: string
    subject_id?: string
    genre_id?: string
  }
  meta: {
    positive_ground: boolean
    vendor_free: true
    warnings: string[]
  }
}

export interface HostPacket {
  host: EmitHost
  /** Primary text body when the host is textual */
  text?: string
  /** Host-specific fields (mj short/final/negative, web claim/proof/door, …) */
  fields: Record<string, string>
  measure: EmitMeasure
}

export interface EmitMeasure {
  hold_positive: boolean
  negation_spine_hits: number
  trait_count: number
  slot_count: number
  sentence_estimate: number
  warnings: string[]
  continuity: ContinuityReport
  style_hold: ContinuityReport
  subject_hold: ContinuityReport
  genre_hold: ContinuityReport
}

export interface EmitPackResult {
  ir: EmitDocument
  pack: HostPacket
}

export interface EmitOptions {
  register?: string
  /** Overrides like tone.density.sparse=0.85 */
  set: Record<string, number>
  host: EmitHost
  /** If true, fail when positive-ground check fails */
  strictPositive?: boolean
  /** If true, fail when continuity anchors are missing from composed text */
  strictContinuity?: boolean
  /** Fail when style_lock phrases are missing */
  strictStyle?: boolean
  /** Fail when subject_lock phrases are missing */
  strictSubject?: boolean
  /** Fail when genre_lock phrases are missing */
  strictGenre?: boolean
}

export type { ContinuityReport }
