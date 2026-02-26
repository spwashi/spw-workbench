/**
 * Event Streaming
 *
 * Real-time event streaming and filtering for parse operations.
 */

import type { ParseEvent } from '../types'

/**
 * Event filter predicate
 */
export type EventFilter = (event: ParseEvent) => boolean

/**
 * Event subscriber callback
 */
export type EventSubscriber = (event: ParseEvent) => void

/**
 * Event stream for real-time event observation
 */
export class EventStream {
  private readonly subscribers = new Set<EventSubscriber>()
  private readonly filters: EventFilter[] = []
  private buffer: ParseEvent[] = []
  private readonly bufferSize: number
  private paused = false

  constructor(options: { bufferSize?: number } = {}) {
    this.bufferSize = options.bufferSize ?? 1000
  }

  /**
   * Subscribe to events
   */
  subscribe(callback: EventSubscriber): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  /**
   * Add a filter (events must pass all filters)
   */
  addFilter(filter: EventFilter): () => void {
    this.filters.push(filter)
    return () => {
      const index = this.filters.indexOf(filter)
      if (index >= 0) this.filters.splice(index, 1)
    }
  }

  /**
   * Push an event to the stream
   */
  push(event: ParseEvent): void {
    // Apply filters
    if (!this.filters.every(f => f(event))) {
      return
    }

    // Buffer management
    this.buffer.push(event)
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift()
    }

    // Notify subscribers if not paused
    if (!this.paused) {
      this.subscribers.forEach(sub => sub(event))
    }
  }

  /**
   * Pause event delivery (events still buffered)
   */
  pause(): void {
    this.paused = true
  }

  /**
   * Resume event delivery
   */
  resume(): void {
    this.paused = false
  }

  /**
   * Get buffered events
   */
  getBuffer(): ParseEvent[] {
    return [...this.buffer]
  }

  /**
   * Clear the buffer
   */
  clearBuffer(): void {
    this.buffer = []
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.paused
  }
}

/**
 * Common event filters
 */
export const eventFilters = {
  /**
   * Filter by event type
   */
  byType(...types: ParseEvent['type'][]): EventFilter {
    return (event) => types.includes(event.type)
  },

  /**
   * Filter by rule name
   */
  byRule(...rules: string[]): EventFilter {
    return (event) => rules.includes(event.rule)
  },

  /**
   * Filter by depth
   */
  byDepth(maxDepth: number): EventFilter {
    return (event) => event.depth <= maxDepth
  },

  /**
   * Filter to only errors
   */
  errorsOnly(): EventFilter {
    return (event) => event.type === 'error'
  },

  /**
   * Filter to only tokens
   */
  tokensOnly(): EventFilter {
    return (event) => event.type === 'token'
  },

  /**
   * Filter to entry/exit events
   */
  ruleEvents(): EventFilter {
    return (event) => event.type === 'enter' || event.type === 'exit'
  },

  /**
   * Exclude whitespace tokens
   */
  noWhitespace(): EventFilter {
    return (event) => {
      if (event.type !== 'token') return true
      const token = (event.data as { token?: { type?: string } }).token
      return token?.type !== 'WHITESPACE' && token?.type !== 'COMMENT'
    }
  },
}

/**
 * Create event stream hooks
 */
export function createStreamHooks(options?: { bufferSize?: number }) {
  const stream = new EventStream(options)

  return {
    stream,
    hooks: {
      onEvent: (event: ParseEvent) => stream.push(event),
    },
  }
}
