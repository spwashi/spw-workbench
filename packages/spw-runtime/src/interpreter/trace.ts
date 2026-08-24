import type {
  RuntimeStage,
  RuntimeTrace,
  RuntimeTraceDetail,
  RuntimeTracePolicy,
} from './types'

export interface RuntimeTraceState {
  traces: RuntimeTrace[]
  tracePolicy: RuntimeTracePolicy
  generatedTraces: number
}

export function recordRuntimeTrace(
  state: RuntimeTraceState,
  stage: RuntimeStage,
  detail: RuntimeTraceDetail,
  message: string,
): void {
  state.generatedTraces++
  if (state.tracePolicy === 'none') return
  if (state.tracePolicy === 'stages' && detail !== 'stage') return
  state.traces.push({
    stage,
    detail,
    message,
    at: new Date().toISOString(),
  })
}
