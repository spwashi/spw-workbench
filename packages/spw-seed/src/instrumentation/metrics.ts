/**
 * Performance Metrics
 *
 * Track timing and performance data for parse operations.
 */

import type { ParseEvent } from '../types'

/**
 * Timing metrics for parse operations
 */
export interface TimingMetrics {
  totalTime: number
  lexTime: number
  parseTime: number
  tokenCount: number
  eventCount: number
  tokensPerMs: number
  eventsPerMs: number
}

/**
 * Rule timing breakdown
 */
export interface RuleTiming {
  rule: string
  totalTime: number
  selfTime: number
  callCount: number
  avgTime: number
}

/**
 * Metrics collector for performance tracking
 */
export class MetricsCollector {
  private startTime = 0
  private lexEndTime = 0
  private parseEndTime = 0
  private tokenCount = 0
  private eventCount = 0

  private readonly ruleTimings = new Map<string, {
    totalTime: number
    selfTime: number
    callCount: number
    enterTime: number
    childTime: number
  }>()

  private ruleStack: string[] = []
  private childTimeStack: number[] = [0]

  /**
   * Process a parse event for metrics
   */
  processEvent(event: ParseEvent): void {
    this.eventCount++

    if (this.startTime === 0) {
      this.startTime = event.timestamp
    }

    // Track tokens
    if (event.type === 'token') {
      this.tokenCount++
    }

    // Track lex/parse boundary
    if (event.rule === 'tokenize' && event.type === 'exit') {
      this.lexEndTime = event.timestamp
    }

    // Track rule timings
    if (event.type === 'enter') {
      this.handleRuleEnter(event)
    } else if (event.type === 'exit') {
      this.handleRuleExit(event)
    }
  }

  private handleRuleEnter(event: ParseEvent): void {
    const rule = this.normalizeRuleName(event.rule)

    if (!this.ruleTimings.has(rule)) {
      this.ruleTimings.set(rule, {
        totalTime: 0,
        selfTime: 0,
        callCount: 0,
        enterTime: 0,
        childTime: 0,
      })
    }

    const timing = this.ruleTimings.get(rule)!
    timing.enterTime = event.timestamp
    timing.callCount++

    this.ruleStack.push(rule)
    this.childTimeStack.push(0)
  }

  private handleRuleExit(event: ParseEvent): void {
    const rule = this.normalizeRuleName(event.rule)
    const timing = this.ruleTimings.get(rule)

    if (!timing) return

    const duration = event.timestamp - timing.enterTime
    timing.totalTime += duration
    timing.selfTime += duration - timing.childTime
    timing.childTime = 0

    this.ruleStack.pop()
    this.childTimeStack.pop()

    // Add this rule's time to parent's child time
    if (this.childTimeStack.length > 0) {
      this.childTimeStack[this.childTimeStack.length - 1] += duration
    }

    this.parseEndTime = event.timestamp
  }

  private normalizeRuleName(rule: string): string {
    const match = rule.match(/^([a-zA-Z0-9_]+)/)
    return match ? match[1] : rule
  }

  /**
   * Mark the end of parsing
   */
  finish(): void {
    if (this.parseEndTime === 0) {
      this.parseEndTime = performance.now()
    }
  }

  /**
   * Get timing metrics
   */
  getMetrics(): TimingMetrics {
    const totalTime = this.parseEndTime - this.startTime
    const lexTime = this.lexEndTime - this.startTime
    const parseTime = this.parseEndTime - this.lexEndTime

    return {
      totalTime,
      lexTime,
      parseTime,
      tokenCount: this.tokenCount,
      eventCount: this.eventCount,
      tokensPerMs: this.tokenCount / (lexTime || 1),
      eventsPerMs: this.eventCount / (totalTime || 1),
    }
  }

  /**
   * Get rule timing breakdown
   */
  getRuleTimings(): RuleTiming[] {
    return Array.from(this.ruleTimings.entries())
      .map(([rule, data]) => ({
        rule,
        totalTime: data.totalTime,
        selfTime: data.selfTime,
        callCount: data.callCount,
        avgTime: data.totalTime / data.callCount,
      }))
      .sort((a, b) => b.selfTime - a.selfTime)
  }

  /**
   * Get hotspots (rules taking most time)
   */
  getHotspots(limit: number = 10): RuleTiming[] {
    return this.getRuleTimings().slice(0, limit)
  }

  /**
   * Reset the collector
   */
  reset(): void {
    this.startTime = 0
    this.lexEndTime = 0
    this.parseEndTime = 0
    this.tokenCount = 0
    this.eventCount = 0
    this.ruleTimings.clear()
    this.ruleStack = []
    this.childTimeStack = [0]
  }
}

/**
 * Create metrics tracking hooks
 */
export function createMetricsHooks() {
  const collector = new MetricsCollector()

  return {
    collector,
    hooks: {
      onEvent: (event: ParseEvent) => collector.processEvent(event),
      onParseEnd: () => collector.finish(),
    },
  }
}
