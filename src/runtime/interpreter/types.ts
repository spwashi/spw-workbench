import type { ONFNode } from '../../seed/types/ast/onf'
import type { SeedNode } from '../../seed/types'
import type { RegisterSnapshot, RuntimeValue } from '../state/types'

export type RuntimeStage = 'normalize' | 'interpret'

export interface RuntimeTrace {
  stage: RuntimeStage
  message: string
  at: string
}

export interface RuntimeInterpreterOptions {
  captureTrace?: boolean
}

export interface RuntimeInterpretation {
  ast: SeedNode
  onf: ONFNode
  value: RuntimeValue
  registers: RegisterSnapshot
  traces: RuntimeTrace[]
}
