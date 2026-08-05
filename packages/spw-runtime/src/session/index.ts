/**
 * Greenfield runtime session surface — channels, charge, crawl, consumer,
 * prepare, hot session.
 *
 * Prefer this seam for experimentation over ossifying runSpw options.
 */

export {
  type StabilityChannel,
  type EffectCeiling,
  type ChannelPolicy,
  CHANNEL_POLICIES,
  REGIONAL_OCEAN_DIALECT,
  isStabilityChannel,
  resolveChannelPolicy,
  channelAllowsDialect,
  channelAllowsCrawlVerb,
  channelCacheParts,
} from './channels'

export {
  type ChargeCarrierKind,
  type ChargeState,
  type ChargeProvenance,
  type ChargePacket,
  makeValueCharge,
  makeSubjectCharge,
  makeSubstrateCharge,
  portabilityHint,
  isLeakyPortable,
} from './charge'

export {
  type CrawlVerb,
  type CrawlLensLevel,
  type CrawlLens,
  type CrawlStep,
  type CrawlPlan,
  type LocalIdCacheEntry,
  localIdCacheKey,
  applyCrawlVerbToState,
  assertCrawlAllowed,
  planLinearCrawl,
  stepCharge,
} from './crawl'

export {
  type ConsumerMode,
  type ConsumerContext,
  consumerContextFromMount,
  consumerContextCanonical,
  consumerContextOcean,
  isInfrastructurePath,
} from './consumer'

export {
  type FixityKind,
  type BracePhraseId,
  type PhraseHit,
  CORE_BRACE_PHRASES,
  scanBracePhrases,
  phraseOptKey,
  countPhrasesById,
  countFixity,
  phraseKeysForHits,
} from './phrases'

export {
  MEDIUM_MATRIX_VERSION,
  type RuntimeMedium,
  resolveRuntimeMedium,
  mediumMatrixSnapshot,
  formatRuntimeMediumSpw,
} from './medium-matrix'

export {
  type PrepareSourceOptions,
  type PreparedSource,
  prepareSource,
} from './prepare'

export {
  PATH_RECEIPT_VERSION,
  PREPARE_PRODUCER_SCHEMA,
  type PathReceipt,
  hashSourceBytes,
  buildPathReceipt,
  formatPathReceiptSpw,
} from './path-receipt'

export {
  type HotSessionOptions,
  type HotEvalOptions,
  type HotEvalRecord,
  type HotInspectRecord,
  type HotCiteHandle,
  HotRuntimeSession,
  createHotSession,
} from './hot-session'

export {
  type DialectSubjectId,
  type OptHandleId,
  type DialectRuntimePolicy,
  DIALECT_RUNTIME_POLICIES,
  resolveDialectPolicy,
  resolveProductCacheTier,
} from './dialect-policy'

export {
  type ProbeHit,
  type SubstrateMeasure,
  type ProbeMeasureReport,
  measureProbes,
  measureSubstrate,
  measureProbesAndSubstrate,
} from './probe-measure'

export {
  type SenseCycleStepId,
  type SenseCycleSurface,
  type SenseCycleOptions,
  type CycleStepReceipt,
  type CycleCard,
  type SenseCycleResult,
  runSenseCycle,
} from './sense-cycle'
