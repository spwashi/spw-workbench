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

// Greenfield session: channels, charge, crawl, consumer, brace phrases
export {
  type StabilityChannel,
  type EffectCeiling,
  type ChannelPolicy,
  type ChargeCarrierKind,
  type ChargeState,
  type ChargeProvenance,
  type ChargePacket,
  type CrawlVerb,
  type CrawlLens,
  type CrawlStep,
  type CrawlPlan,
  type ConsumerContext,
  type ConsumerMode,
  type FixityKind,
  type BracePhraseId,
  type PhraseHit,
  CHANNEL_POLICIES,
  REGIONAL_OCEAN_DIALECT,
  CORE_BRACE_PHRASES,
  isStabilityChannel,
  resolveChannelPolicy,
  channelAllowsDialect,
  channelAllowsCrawlVerb,
  channelCacheParts,
  makeValueCharge,
  makeSubjectCharge,
  makeSubstrateCharge,
  portabilityHint,
  isLeakyPortable,
  localIdCacheKey,
  applyCrawlVerbToState,
  assertCrawlAllowed,
  planLinearCrawl,
  stepCharge,
  consumerContextFromMount,
  consumerContextCanonical,
  consumerContextOcean,
  isInfrastructurePath,
  scanBracePhrases,
  phraseOptKey,
  countPhrasesById,
  prepareSource,
  type PrepareSourceOptions,
  type PreparedSource,
  PATH_RECEIPT_VERSION,
  PREPARE_PRODUCER_SCHEMA,
  type PathReceipt,
  hashSourceBytes,
  buildPathReceipt,
  formatPathReceiptSpw,
  MEDIUM_MATRIX_VERSION,
  type RuntimeMedium,
  resolveRuntimeMedium,
  mediumMatrixSnapshot,
  formatRuntimeMediumSpw,
  countFixity,
  phraseKeysForHits,
  HotRuntimeSession,
  createHotSession,
  type HotSessionOptions,
  type HotEvalOptions,
  type HotEvalRecord,
  type HotInspectRecord,
  type HotCiteHandle,
  resolveDialectPolicy,
  resolveProductCacheTier,
  DIALECT_RUNTIME_POLICIES,
  type DialectRuntimePolicy,
  type OptHandleId,
  measureProbes,
  measureSubstrate,
  measureProbesAndSubstrate,
  type ProbeHit,
  type SubstrateMeasure,
  type ProbeMeasureReport,
  runSenseCycle,
  type SenseCycleStepId,
  type SenseCycleSurface,
  type SenseCycleOptions,
  type CycleStepReceipt,
  type CycleCard,
  type SenseCycleResult,
} from './session'
