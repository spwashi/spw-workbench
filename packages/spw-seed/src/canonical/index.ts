/**
 * Canonicalization, source differentials, and mutation automata.
 *
 * @see docs/theory/spw/operational-topography.spw
 * @see docs/theory/spw/mutation-automata.spw
 */

export {
  canonicalize,
  hashString,
  reflowProseBlocks,
  wrapWords,
  isProseCommentLine,
  isSlashLineComment,
  migrateSlashCommentsToHash,
  resolveFormatProfile,
  FORMAT_PROFILES,
  type CanonicalOptions,
  type CanonicalResult,
  type FormatProfileId,
} from './canonicalize'

export {
  readAuthorityDeclarations,
  reconcileAuthority,
  AUTHORITY_FACETS,
  type AuthorityKind,
  type AuthorityClaim,
  type AuthorityDeclaration,
  type ObservedAuthority,
  type AuthorityVerdict,
  type AuthorityFinding,
} from './authority'

export {
  readMassDeclarations,
  measureMass,
  reconcileMass,
  applyMassCorrections,
  MEASURABLE_KEYS,
  type MassDeclaration,
  type MeasuredMass,
  type MassReconciliation,
  type MassVerdict,
  type MeasurableKey,
  type DeclaredMeasure,
} from './self-mass'

export {
  CORE_SNIPPETS,
  SPW_SNIPPET_VERSION,
  getSnippet,
  listSnippets,
  snippetSource,
  hydrateSnippet,
  toVscodeSnippets,
  formatVscodeSnippetsJson,
  parseBindings,
  type SpwSnippet,
  type SnippetFamily,
  type SnippetBindings,
  type HydrateResult,
  type VscodeSnippetMap,
} from './snippet'

export {
  bootstrapMeasureRegistry,
  loadMeasureContextFromSpw,
  resolveFamily,
  reconcileMetric,
  reconcileFamily,
  contextForFamily,
  MASS_FAMILY,
  THRIFT_FILE_ALGORITHM,
  BUILTIN_FAMILIES,
  BUILTIN_ALGORITHMS,
  defaultScheme,
  type EvalSchemeId,
  type EvalScheme,
  type MeasureVerdict,
  type AttentionalScopeKind,
  type AttentionalScope,
  type PerceptivePlane,
  type RepresentationalForm,
  type MeasureFamilyDef,
  type MeasureAlgorithmDef,
  type DeclaredMetric,
  type MeasureDeclaration,
  type ObservedMetric,
  type MeasureReconciliation,
  type MeasureContextRegistry,
} from './measure-protocol'

export {
  formatPulses,
  compareFormatProfiles,
  diffLines,
  FORMAT_CAPABILITIES,
  type FormatCapability,
  type FormatPulse,
  type FormatPulseSequence,
  type ProfileComparison,
  type DiffLine,
} from './format-pulses'

export {
  applyEdits,
  differentialFromSources,
  effectGradeAtMost,
  mergeVectors,
  zeroVector,
  EVIDENCE_BASES,
  EVIDENCE_DOMAINS,
  EVIDENCE_ROLES,
  EFFECT_GRADE_ORDER,
  type DerivedEvidenceContribution,
  type DerivedEvidenceProvenance,
  type DifferentialStratum,
  type EvidenceArtifactRef,
  type EvidenceBasis,
  type EvidenceContribution,
  type EvidenceDomain,
  type EvidenceMethod,
  type EvidenceProducer,
  type EvidenceReporter,
  type EvidenceRole,
  type EvidenceUncertainty,
  type EffectGrade,
  type MutationVector,
  type ObservedEvidenceContribution,
  type ObservedEvidenceProvenance,
  type ReportedEvidenceContribution,
  type ReportedEvidenceProvenance,
  type SourceDifferential,
  type SourceEdit,
} from './differential'

export {
  BUILTIN_MUTATION_RULES,
  MUTATION_PROFILES,
  applyEquivScriptTransforms,
  collectPlannedEdits,
  planMutation,
  planMutationPass,
  planRuleDifferential,
  resolveMutationRules,
  runMutationAutomata,
  type MutationAutomataConfig,
  type MutationContext,
  type MutationProfileId,
  type MutationRule,
  type MutationRunResult,
  type MutationStep,
  type MutationStopReason,
} from './mutation-automata'

export {
  probeMutationTopography,
  snapshotTopography,
  topographyDelta,
  type PairedContainerCounts,
  type ParseHealth,
  type TopographyDelta,
  type TopographyMutationProbe,
  type TopographySnapshot,
} from './topography-probe'

export {
  extractBraceProjection,
  braceProjectionDelta,
  classifyMutationUsefulness,
  type BraceKind,
  type BraceKindCounts,
  type BracePlacement,
  type BraceProjection,
  type BraceProjectionDelta,
  type BraceDeltaSeverity,
  type MutationUseClass,
  type MutationUsefulness,
} from './brace-projection'

/** Unit-cell apposition lattice — parse-free readings for granules / pattern ecology. */
export {
  APPOSITION_SCAN_VERSION,
  scanAppositions,
  appositionSpectrum,
  appositionMasksEqual,
  diffAppositionLattices,
  type AppositionSpan,
  type AppositionCell,
  type AppositionLattice,
  type AppositionSpectrum,
  type AppositionLatticeDelta,
  type ScanAppositionsOptions,
} from './apposition-scan'

/** Lex + brace ChangeReport — two-revision narrative (path-match v1). */
export {
  CHANGE_REPORT_VERSION,
  compareLex,
  compareAst,
  buildChangeReport,
  formatChangeReportSpw,
  type LexOpKind,
  type LexTokenKey,
  type LexOp,
  type LexChangeReport,
  type AstChangeReport,
  type ChangeReport,
} from './change-report'

export {
  inspectGeometry,
  formatGeometryReport,
  type GeometryReport,
  type OperatorGeometryEntry,
  type BraceNestingStats,
} from './geometry-inspect'

export {
  scanFlowProtocol,
  formatFlowProtocolSummary,
  type FlowRole,
  type FlowFixity,
  type FlowUnit,
  type FlowProtocolModule,
} from './flow-protocol'

export {
  detectGeometricResonances,
  buildResonanceContext,
  runResonanceDetectors,
  compileGeometryBytecode,
  bytecodeOpSimilarity,
  buildGeometryField,
  resolveWeightScheme,
  formatResonanceSummary,
  formatGeometryFieldSummary,
  formatResonanceAsSpw,
  formatGeometryFieldAsSpw,
  DEFAULT_RESONANCE_DETECTORS,
  WEIGHT_SCHEME_DEFAULT,
  WEIGHT_SCHEME_AGENT,
  WEIGHT_SCHEME_THRIFT,
  WEIGHT_SCHEMES,
  detectOpCooccur,
  detectPhraseAdjacent,
  detectScheduleSlot,
  detectProbeMeasure,
  detectBiasPole,
  detectDepthBand,
  type GeometricResonanceType,
  type GeometricResonance,
  type GeometricResonanceReport,
  type GeometryBytecode,
  type ResonanceDetectionContext,
  type ResonanceDetector,
  type ResonanceWeightScheme,
  type ResonanceFeatureGains,
  type GeometrySurfaceCard,
  type GeometryStrand,
  type GeometryField,
  type BuildGeometryFieldOptions,
} from './geometric-resonance'

export {
  findNodeAtOffset,
  findNodePathAtOffset,
  positionToOffset,
  offsetToPosition,
} from './geometry-inspect-position'

export {
  resolveLabelPosition,
  resolveLabelContext,
} from './geometry-resolver'
export type { ResolvedLabelContext, LabelSurfaceSpan } from './geometry-resolver'

export {
  transformEdit,
  transformEditList,
  foldEdits,
  foldTransforms,
  composeEditLists,
  composeSequence,
  editLengthDelta,
  vectorToArray,
  vectorFromArray,
  scaleVector,
  dotVectors,
  vectorMagnitude,
  matrixFromVectors,
  matrixByStratum,
  matrixAdd,
  matrixVectorMul,
  matrixTranspose,
  formatMatrix,
  runOperationalSequence,
  sequenceContextFromMap,
  emptySequenceContext,
  OPERATIONAL_SEQUENCES,
  MUTATION_VECTOR_AXES,
  STRATUM_ORDER,
  type TransformResult,
  type TransformConflict,
  type MutationMatrix,
  type LabeledMatrix,
  type TransposedMutationMatrix,
  type MutationVectorAxis,
  type SequenceStep,
  type SequenceStepKind,
  type OperationalSequence,
  type SequenceRunResult,
  type ResolveStepContext,
} from './operational-transform'

export { mutationRulesAsSequenceContext } from './mutation-automata'

export {
  BOUNDARY_LADDERS,
  OPERATOR_LADDERS,
  BOUNDARY_AXIS_IMPLICATIONS,
  FORM_LADDER_PROFILE,
  boundaryLadder,
  operatorLadder,
  listBoundaryLadders,
  listOperatorLadders,
  listFormLadders,
  implicationsForBoundary,
  implicationsForAxis,
  probeBoundaryLadder,
  probeFormLadder,
  probeOperatorLadder,
  resolveLadderQuery,
  formatBoundaryAxisTable,
  formatAllLadderNotations,
  operatorLadderTable,
  boundaryLadderTable,
  type EnrichmentRole,
  type LadderStep,
  type FormLadder,
  type BoundaryLadder,
  type OperatorLadder,
  type ResolvedFormLadder,
  type FormAxis,
  type BoundaryLadderId,
  type FormLadderProbe,
  type OperatorLadderProbe,
  type LadderStepProbe,
  type BoundaryAxisImplication,
  type LadderArrow,
} from './form-ladders'

export {
  MOBILITY_RULES,
  REFERENCE_PROGRESSIONS,
  HIGHER_ORDER_FORMS,
  REGISTER_LIMINALITY_ORDER,
  LIMINAL_SHAPE_TO_REGISTER,
  FORM_GEOMETRY_PROFILE,
  FORM_MOBILITY_APPLICATION_PROFILE,
  mobilityRule,
  rulesFrom,
  rulesTo,
  rulesByMotion,
  rulesByStatus,
  applyMobilityRule,
  isFormLabel,
  walkReferenceProgression,
  runHigherOrderForm,
  labelSiteGraph,
  formatSiteGraph,
  formatHigherOrderForms,
  formatMobilityRules,
  computationalRuleIds,
  type LabelSite,
  type LiminalShape,
  type RegisterLiminality,
  type LabelPosition,
  type LabelPositionPattern,
  type MobilityRule,
  type MobilityApplication,
  type MobilityApplicationReceipt,
  type RuleStatus,
  type ReferenceProgression,
  type HigherOrderForm,
  type SiteEdge,
} from './form-geometry'

export {
  contourFormLadder,
  reduceFormContour,
  expandFormContour,
  restoreFormContour,
  formatFormContour,
  type FormContourView,
  type FormContourEvidence,
  type FormContourPoint,
  type FormContourDimensions,
  type FormContour,
  type FormReductionPolicy,
  type FormContourReduction,
  type FormContourExpansion,
} from './form-contours'

export {
  CONFLUENCE_WRAP_SEQUENCE,
  CONFLUENCE_REDUCE_SEQUENCE,
  BUILTIN_FORM_MASKS,
  parseFormSequence,
  classifySurface,
  applyFormMask,
  advanceFormSurface,
  runFormSequence,
  confluenceLadderCatalog,
  labelSelection,
  formatFormSequence,
  type FormSequenceOp,
  type FormSequenceStep,
  type FormSequence,
  type FormMask,
  type FormSequenceApplyResult,
} from './form-sequence'

export {
  contentHash,
  parseRangeFragment,
  splitPathFragment,
  spanToOffsets,
  resolveRange,
  planSpanTransform,
  applyRangePlan,
  formatRangePlan,
  type RangeEncoding,
  type SourcePosition,
  type SourceSpan,
  type ResolvedRange,
  type SpanTransformId,
  type SpanTransformOptions,
  type RangePlan,
} from './range-transform'

export {
  INDEX_PRESETS,
  INDEX_TRADEOFFS,
  resolveIndexConfig,
  applyDialectIndexBias,
  type IndexDepth,
  type IndexConfig,
} from './index-config'

export {
  DREAM_SCHEDULE_SOFT,
  DREAM_SCHEDULE_PLAY,
  DREAM_SCHEDULE_DEEP,
  DREAM_SCHEDULES,
  createDreamRunner,
  dreamTick,
  dreamPeek,
  listDreamSchedules,
  type DreamPhaseId,
  type DreamPhaseEffect,
  type DreamPhase,
  type DreamSchedule,
  type DreamTick,
  type DreamRunnerState,
} from './dream-schedule'

export {
  readBias,
  type BiasEdge,
  type BiasTarget,
  type BiasSign,
} from './read-bias'

export {
  particleBindings,
  deixisTable,
  particleMix,
  particleMixTotal,
  type ParticleBinding,
  type ParticleMix,
} from './particles'

export {
  resolveFragment,
  type ResolvedFragment,
} from './resolve-fragment'

export {
  planSemanticEdits,
  applySemanticPlan,
  renameMark,
  renameParticle,
  type SemanticRule,
  type SemanticRewrite,
  type SemanticEdit,
  type SemanticConflict,
  type SemanticPlan,
  type SemanticPlanOptions,
} from './semantic-edit'

export {
  deriveMark,
  countOps,
  latestTimestamp,
  type MarkDeriver,
  type DeriveContext,
} from './derived-marks'

export {
  MEDIAL_CAPSULE_CHANNELS,
  VALENCE_PARTICLES,
  TEMPLATE_SLOTS,
  SIGIL_SNIPPET_CATALOG,
  type MedialChannelDef,
  type ValenceParticleDef,
  type TemplateSlotDef,
  type SigilSnippetDef,
} from './catalog'

