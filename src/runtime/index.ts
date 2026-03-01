export type {
  RegisterAccessMode,
  ContainerAffinity,
  RegisterDescriptor,
  RuntimeScalar,
  RuntimeRecord,
  RuntimePacket,
  RuntimeValue,
  ScopeFrame,
  RegisterMeta,
  RegisterEntry,
  RegisterSnapshot,
  RegisterWriteOptions,
} from './state/types'

export {
  OPERATOR_AFFINITIES,
  BRACE_AFFINITIES,
  DEFAULT_REGISTER_DESCRIPTOR,
  descriptorForKey,
} from './state/type-affinities'

export { RegisterBank } from './state/register-bank'

export type {
  RuntimeStage,
  RuntimeTrace,
  RuntimeInterpreterOptions,
  RuntimeInterpretation,
} from './interpreter/types'

export { interpretSeed } from './interpreter/interpreter'

export type {
  RuntimeIssue,
  RunSpwOptions,
  RunSpwSuccess,
  RunSpwFailure,
  RunSpwResult,
} from './pipeline/types'

export { runSpw } from './pipeline/run-spw'

export type {
  StageName,
  Precipitate,
  PipelineProjection,
  AnyPrecipitate,
  DesugarPrecipitate,
  ParsePrecipitate,
  NormalizePrecipitate,
  InterpretPrecipitate,
} from './pipeline/stages'

export {
  STAGE_ORDER,
  runSpwStepped,
  collectPrecipitates,
  buildProjection,
  precipitateToSpw,
  projectionToSpw,
} from './pipeline/stages'

export type {
  RegisterEvent,
  RegisterEventKind,
  Resonance,
  ResonanceType,
  SubstrateHandler,
} from './pipeline/substrate'

export { Substrate } from './pipeline/substrate'

export { detectResonances } from './pipeline/resonance'

