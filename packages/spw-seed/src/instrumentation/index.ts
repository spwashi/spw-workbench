/**
 * Spw Instrumentation Layer
 *
 * Tools for observing, auditing, and analyzing parse operations.
 */

// Hooks system
export {
  type InstrumentationHooks,
  noopHooks,
  createHooks,
  combineHooks,
  processEvent,
} from './hooks'

// AST audit utilities
export {
  type ASTVisitor,
  type AuditItem,
  type ASTAuditResult,
  walkAST,
  getNodeChildren,
  findNodes,
  getNodePath,
  getMaxDepth,
  countNodeTypes,
  auditAST,
} from './audit'

// Coverage tracking
export {
  type RuleCoverage,
  type CoverageReport,
  CoverageCollector,
  createCoverageHooks,
} from './coverage'

// Performance metrics
export {
  type TimingMetrics,
  type RuleTiming,
  MetricsCollector,
  createMetricsHooks,
} from './metrics'

// Event streaming
export {
  type EventFilter,
  type EventSubscriber,
  EventStream,
  eventFilters,
  createStreamHooks,
} from './stream'
