/**
 * Instrumentation Hooks
 *
 * Event-driven hooks for observing and reacting to parse operations.
 */

import type { Token, ParseEvent, ASTNode, ErrorEventData } from '../types'
import type { ParseOutput } from '../parser/output'

/**
 * Hook callbacks for parse instrumentation
 */
export interface InstrumentationHooks {
  // Lifecycle hooks
  onParseStart?: (input: string) => void
  onParseEnd?: (result: ParseOutput) => void

  // Event hooks
  onEvent?: (event: ParseEvent) => void
  onToken?: (token: Token) => void
  onEnterRule?: (rule: string, depth: number) => void
  onExitRule?: (rule: string, success: boolean, consumed: number) => void
  onBacktrack?: (rule: string, reason: string) => void
  onError?: (error: ErrorEventData) => void

  // AST hooks
  onNodeCreated?: (node: ASTNode) => void
}

/**
 * Default no-op hooks
 */
export const noopHooks: InstrumentationHooks = {}

/**
 * Create a hook set with selective overrides
 */
export function createHooks(overrides: Partial<InstrumentationHooks>): InstrumentationHooks {
  return { ...noopHooks, ...overrides }
}

/**
 * Combine multiple hook sets
 */
export function combineHooks(...hookSets: InstrumentationHooks[]): InstrumentationHooks {
  return {
    onParseStart: (input) => {
      hookSets.forEach(h => h.onParseStart?.(input))
    },
    onParseEnd: (result) => {
      hookSets.forEach(h => h.onParseEnd?.(result))
    },
    onEvent: (event) => {
      hookSets.forEach(h => h.onEvent?.(event))
    },
    onToken: (token) => {
      hookSets.forEach(h => h.onToken?.(token))
    },
    onEnterRule: (rule, depth) => {
      hookSets.forEach(h => h.onEnterRule?.(rule, depth))
    },
    onExitRule: (rule, success, consumed) => {
      hookSets.forEach(h => h.onExitRule?.(rule, success, consumed))
    },
    onBacktrack: (rule, reason) => {
      hookSets.forEach(h => h.onBacktrack?.(rule, reason))
    },
    onError: (error) => {
      hookSets.forEach(h => h.onError?.(error))
    },
    onNodeCreated: (node) => {
      hookSets.forEach(h => h.onNodeCreated?.(node))
    },
  }
}

/**
 * Process a parse event through hooks
 */
export function processEvent(event: ParseEvent, hooks: InstrumentationHooks): void {
  hooks.onEvent?.(event)

  switch (event.type) {
    case 'token':
      hooks.onToken?.((event.data as { token: Token }).token)
      break
    case 'enter':
      hooks.onEnterRule?.(event.rule, event.depth)
      break
    case 'exit': {
      const exitData = event.data as { success: boolean; consumed: number }
      hooks.onExitRule?.(event.rule, exitData.success, exitData.consumed)
      break
    }
    case 'backtrack': {
      const btData = event.data as { reason: string }
      hooks.onBacktrack?.(event.rule, btData.reason)
      break
    }
    case 'error':
      hooks.onError?.(event.data as ErrorEventData)
      break
  }
}
