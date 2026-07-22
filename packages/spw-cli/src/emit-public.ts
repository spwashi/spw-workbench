/**
 * Public re-exports for emit (keeps package root tidy).
 */

export {
  emitPackFromFile,
  emitPackFromSource,
  listBuiltinRegisters,
  renderPack,
  writePack,
} from './emit/index'
export type {
  ContinuityReport,
  DimMap,
  EmitDocument,
  EmitHost,
  EmitMeasure,
  EmitOptions,
  EmitPackResult,
  HostPacket,
} from './emit/types'
export { EMIT_HOSTS } from './emit/types'
export { printEmitHelp, runSpwEmitCli } from './emit'
