/**
 * Portable math probes for Spw modeling (graphs, loops, equations).
 * No runtime/DOM deps — safe in seed kernel tests and CLI tooling.
 */

export {
  graphFromEdges,
  adjacencyList,
  adjacencyMatrix,
  detectCycle,
  topologicalSort,
  walkGraph,
  shortestPath,
  type DirectedGraph,
  type GraphEdge,
  type CycleReport,
} from './graph'

export {
  fixedPoint,
  boundedWhile,
  rangeFold,
  orbit,
  detectPeriod,
  logisticOrbit,
  type FixedPointResult,
} from './loop'

export {
  evalPolynomial,
  residual,
  bisectionRoot,
  solveLinearSystem,
  productConstraint,
  linearResidual,
  cosineSimilarity,
} from './equation'

export {
  zeros,
  cloneField,
  fieldNorm,
  fieldSum,
  decayField,
  halfLifeToRate,
  diffuseField,
  transfer,
  flux,
  cascadeChain,
  capacityStep,
  affinityAllocate,
  mixFields,
  fieldBeat,
  massConserved,
  type FieldState,
  type Carrier,
  type BindingSite,
} from './field'

export {
  graphFromLinks,
  degreeHubs,
  topoLayers,
  analyzeTopography,
  compareFamiliarity,
  basename,
  stem,
  heuristicSigilHistogram,
  heuristicFrameCount,
  heuristicAnnotationHints,
  CORPUS_PRODUCT_VERSION,
  CORPUS_PRODUCT_SCHEMA,
  topSigils,
  populationRoleOf,
  buildPopulation,
  populationStats,
  sortPopulation,
  filterPopulation,
  buildCorpusProduct,
  formatCorpusProductSpw,
  formatPopulationSpw,
  type RelationKind,
  type CorpusLink,
  type CorpusFileSignals,
  type HubScore,
  type FamiliarityStrand,
  type TopographyReport,
  type FamiliarityCompare,
  type PopulationRole,
  type PopulationRow,
  type PopulationStats,
  type CorpusProduct,
} from './corpus'

export {
  FORMULA_CATALOG,
  scanFormulas,
  summarizeFormulaHits,
  aggregateFormulaPatterns,
  type FormulaFamily,
  type FormulaHit,
  type FormulaCatalogEntry,
} from './formula-scan'

export {
  SPW_MATH_IDIOMS,
  idiomsForFamily,
  formatMathIdioms,
  type MathFamily,
  type SpwMathIdiom,
} from './idioms'
