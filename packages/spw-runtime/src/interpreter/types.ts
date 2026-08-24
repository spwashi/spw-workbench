import type { ONFNode, SeedNode } from '@spwashi/spw-seed'
import type { RegisterSnapshot, RuntimeValue } from '../state/types'

export type RuntimeStage = 'normalize' | 'interpret'
export type RuntimeTraceDetail = 'stage' | 'evaluation'

export const RUNTIME_TRACE_POLICIES = ['none', 'stages', 'evaluation'] as const

export type RuntimeTracePolicy = (typeof RUNTIME_TRACE_POLICIES)[number]

export interface RuntimeTraceCounts {
  generated: number
  retained: number
}

export interface RuntimeTrace {
  stage: RuntimeStage
  detail: RuntimeTraceDetail
  message: string
  at: string
}

export interface RuntimeInterpreterOptions {
  tracePolicy?: RuntimeTracePolicy
  /** @deprecated Prefer tracePolicy; false maps to none and true to evaluation. */
  captureTrace?: boolean
}

export function resolveRuntimeTracePolicy(options: RuntimeInterpreterOptions): RuntimeTracePolicy {
  if (options.tracePolicy) return options.tracePolicy
  if (options.captureTrace === false) return 'none'
  return 'evaluation'
}

export interface RuntimeInterpretation {
  ast: SeedNode
  onf: ONFNode
  value: RuntimeValue
  registers: RegisterSnapshot
  traces: RuntimeTrace[]
  tracePolicy: RuntimeTracePolicy
  traceCounts: RuntimeTraceCounts
}
