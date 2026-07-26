/**
 * Grammar Rule Coverage
 *
 * Track which grammar rules are exercised during parsing.
 */

import type { ParseEvent } from '../types'

/**
 * Coverage data for a single grammar rule
 */
export interface RuleCoverage {
  rule: string
  enterCount: number
  successCount: number
  failCount: number
  totalTime: number
  avgTime: number
}

/**
 * Overall coverage report
 */
export interface CoverageReport {
  rules: Map<string, RuleCoverage>
  coveredRules: number
  totalRules: number
  coveragePercent: number
  totalEvents: number
  duration: number
}

/**
 * Coverage tracker state
 */
interface RuleState {
  enterTime: number
  depth: number
}

/**
 * Coverage collector for tracking rule execution
 */
export class CoverageCollector {
  private readonly rules = new Map<string, RuleCoverage>()
  private ruleStack: RuleState[] = []
  private startTime = 0
  private eventCount = 0

  /**
   * Known grammar rules (for computing coverage percentage)
   */
  private static readonly knownRules = new Set([
    'tokenize', 'seed', 'expression', 'term', 'operation',
    'scope', 'frame', 'body', 'sequence', 'reference',
    'literal', 'identifier', 'annotation', 'modifierChain',
    'parameter', 'frameContent',
    // Extended forms
    'capsule',
    'stream',
    'nrange',
    // Pipeline helper
    'lex',
    // Token rules
    'whitespace', 'lineComment', 'operator',
    'connector', 'container', 'modifier', 'boolean', 'string',
    'number', 'dot', 'colon', 'comma', 'comparison',
  ])

  /**
   * Process a parse event for coverage tracking
   */
  processEvent(event: ParseEvent): void {
    this.eventCount++

    if (this.startTime === 0) {
      this.startTime = event.timestamp
    }

    if (event.type === 'enter') {
      this.handleEnter(event)
    } else if (event.type === 'exit') {
      this.handleExit(event)
    }
  }

  private handleEnter(event: ParseEvent): void {
    const rule = this.normalizeRuleName(event.rule)

    if (!this.rules.has(rule)) {
      this.rules.set(rule, {
        rule,
        enterCount: 0,
        successCount: 0,
        failCount: 0,
        totalTime: 0,
        avgTime: 0,
      })
    }

    const coverage = this.rules.get(rule)!
    coverage.enterCount++

    this.ruleStack.push({
      enterTime: event.timestamp,
      depth: event.depth,
    })
  }

  private handleExit(event: ParseEvent): void {
    const rule = this.normalizeRuleName(event.rule)
    const coverage = this.rules.get(rule)

    if (!coverage) return

    const state = this.ruleStack.pop()
    if (state) {
      const duration = event.timestamp - state.enterTime
      coverage.totalTime += duration
      coverage.avgTime = coverage.totalTime / coverage.enterCount
    }

    const data = event.data as { success: boolean }
    if (data.success) {
      coverage.successCount++
    } else {
      coverage.failCount++
    }
  }

  private normalizeRuleName(rule: string): string {
    // Remove parameters from rule names like "token(OPERATOR)"
    const match = rule.match(/^([a-zA-Z0-9_]+)/)
    return match ? match[1] : rule
  }

  /**
   * Get the coverage report
   */
  getReport(): CoverageReport {
    const coveredRules = this.rules.size
    const totalRules = CoverageCollector.knownRules.size

    return {
      rules: new Map(this.rules),
      coveredRules,
      totalRules,
      coveragePercent: (coveredRules / totalRules) * 100,
      totalEvents: this.eventCount,
      duration: this.eventCount > 0
        ? performance.now() - this.startTime
        : 0,
    }
  }

  /**
   * Reset the collector
   */
  reset(): void {
    this.rules.clear()
    this.ruleStack = []
    this.startTime = 0
    this.eventCount = 0
  }

  /**
   * Get rules that were never entered
   */
  getUncoveredRules(): string[] {
    const covered = new Set(this.rules.keys())
    return Array.from(CoverageCollector.knownRules).filter(r => !covered.has(r))
  }

  /**
   * Get rules sorted by failure rate
   */
  getRulesByFailureRate(): RuleCoverage[] {
    return Array.from(this.rules.values())
      .filter(r => r.enterCount > 0)
      .map(r => ({
        ...r,
        failureRate: r.failCount / r.enterCount,
      }))
      .sort((a, b) => (b as { failureRate: number }).failureRate - (a as { failureRate: number }).failureRate)
  }

  /**
   * Get rules sorted by average time
   */
  getRulesByTime(): RuleCoverage[] {
    return Array.from(this.rules.values())
      .filter(r => r.enterCount > 0)
      .sort((a, b) => b.avgTime - a.avgTime)
  }
}

/**
 * Create coverage tracking hooks
 */
export function createCoverageHooks() {
  const collector = new CoverageCollector()

  return {
    collector,
    hooks: {
      onEvent: (event: ParseEvent) => collector.processEvent(event),
    },
  }
}
