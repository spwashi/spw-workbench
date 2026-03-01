import type { ParseOutput } from '../../seed/parser'
import type { SeedNode } from '../../seed/types'
import type { RuntimeInterpretation } from '../interpreter/types'
import type { RegisterBank } from '../state/register-bank'
import type { AnyPrecipitate } from './stages'

export interface RuntimeIssue {
  stage: 'desugar' | 'parse' | 'normalize' | 'interpret'
  message: string
}

export interface RunSpwOptions {
  desugar?: boolean
  captureTrace?: boolean
  registers?: RegisterBank
}

export interface RunSpwSuccess {
  success: true
  source: string
  parse: ParseOutput<SeedNode>
  runtime: RuntimeInterpretation
  /** Per-stage precipitates from the pipeline run */
  precipitates?: AnyPrecipitate[]
}

export interface RunSpwFailure {
  success: false
  source: string
  parse: ParseOutput<SeedNode>
  issues: RuntimeIssue[]
}

export type RunSpwResult = RunSpwSuccess | RunSpwFailure
