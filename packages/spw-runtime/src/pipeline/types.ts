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
}

export interface RunSpwSuccess {
  success: true
  source: string
  parse: ParseOutput<SeedNode>
  runtime: RuntimeInterpretation
  telemetry: RuntimeTelemetry
  /** Per-stage precipitates from the pipeline run */
  precipitates?: AnyPrecipitate[]
}

export interface RunSpwFailure {
  success: false
  source: string
  parse: ParseOutput<SeedNode>
  issues: RuntimeIssue[]
  telemetry: RuntimeTelemetry
}

export type RunSpwResult = RunSpwSuccess | RunSpwFailure
