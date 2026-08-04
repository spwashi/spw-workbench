import type { ParseOutput, SeedNode } from '@spwashi/spw-seed'
import type { RuntimeInterpretation } from '../interpreter/types'
import type { RegisterBank } from '../state/register-bank'
import type { AnyPrecipitate } from './stages'
import type { RegisterEvent, Resonance, Substrate } from './substrate'

export interface RuntimeIssue {
  stage: 'desugar' | 'parse' | 'normalize' | 'interpret'
  message: string
}

export interface RuntimeTelemetry {
  events: RegisterEvent[]
  resonances: Resonance[]
}

export interface RunSpwOptions {
  desugar?: boolean
  captureTrace?: boolean
  registers?: RegisterBank
  substrate?: Substrate
  /** File path for dialect path-defaults and stack resolve. */
  path?: string
  /** Force dialect id (Spw.b|l|m|…). */
  dialect?: string
  /**
   * When true (default), parse() auto-detects dialect and preprocesses.
   * Set false when caller already ran prepareSource / HotSession.
   */
  autoDialect?: boolean
  /** Stability channel for telemetry / future gates (not yet effect-enforcing here). */
  channel?: string
}

export interface RunSpwSuccess {
  success: true
  source: string
  parse: ParseOutput<SeedNode>
  runtime: RuntimeInterpretation
  telemetry: RuntimeTelemetry
  /** Per-stage precipitates from the pipeline run */
  precipitates?: AnyPrecipitate[]
  /** Dialect reported by parse when autoDialect / options applied. */
  dialect?: string
  channel?: string
}

export interface RunSpwFailure {
  success: false
  source: string
  parse: ParseOutput<SeedNode>
  issues: RuntimeIssue[]
  telemetry: RuntimeTelemetry
  dialect?: string
  channel?: string
}

export type RunSpwResult = RunSpwSuccess | RunSpwFailure
