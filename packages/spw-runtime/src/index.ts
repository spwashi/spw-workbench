export type {
  RegisterAccessMode,
  ContainerAffinity,
  RegisterDescriptor,
  RuntimeValence,
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
  BOUNDARY_AFFINITIES,
  BRACE_AFFINITIES,
  COUPLING_KIND_BY_SURFACE,
  BRACE_COUPLING_KIND,
  DEFAULT_REGISTER_DESCRIPTOR,
  descriptorForKey,
  couplingKindForSurface,
  couplingKindForBrace,
  couplingDescriptorForSurface,
  couplingDescriptorForBrace,
} from './state/type-affinities'

export { RegisterBank } from './state/register-bank'

export {
  BeatCache,
  cacheKey,
  type CacheTier,
  type BeatCacheOptions,
  type BeatCacheEntry,
  type BeatCacheStats,
} from './state/memory-cache'

export {
  estimateCellCost,
  evictionScore,
  isProtectedKey,
  planEviction,
  reportMemoryPressure,
  stripEarlyFacets,
  type MemoryBudget,
  type MemoryPressureReport,
  type EvictionPlan,
  type FacetEviction,
  type CellEviction,
  type ScoredCell,
} from './state/memory-policy'

export {
  bridgeRegisterLiminality,
  applyRegisterBridgeEffect,
  parseSubstrateMetaSurface,
  REGISTER_LIMINALITY_BRIDGE_PROFILE,
  type LiminalityBridgeResult,
} from './state/liminality-bridge'

export type {
  RuntimeStage,
  RuntimeTrace,
  RuntimeInterpreterOptions,
  RuntimeInterpretation,
} from './interpreter/types'

export { interpretSeed } from './interpreter/interpreter'

export type {
  RuntimeIssue,
  RuntimeTelemetry,
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
  CollectedPrecipitates,
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

export type { SpwMountResolution } from './site-install'

export {
  deriveMountRoots,
  discoverSpwMountResolution,
  findSpwSiteRoot,
  loadSpwMountResolution,
} from './site-install'
