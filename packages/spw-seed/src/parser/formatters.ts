/**
 * Event Log Formatters
 *
 * Different formatting strategies for parse events.
 */

import type { Token, ParseEvent, ErrorEventData } from '../types'

/**
 * Interface for event formatters
 */
export interface LogFormatter {
  format(event: ParseEvent): string
}

/**
 * Simple text formatter for console logging
 */
export const textFormatter: LogFormatter = {
  format(event: ParseEvent): string {
    const indent = '  '.repeat(event.depth)
    const pos = `${event.position.line}:${event.position.column}`

    switch (event.type) {
      case 'enter':
        return `${indent}→ ${event.rule} at ${pos}`

      case 'exit': {
        const data = event.data as { success: boolean; consumed: number }
        const status = data.success ? '✓' : '✗'
        return `${indent}← ${event.rule} ${status} (consumed: ${data.consumed})`
      }

      case 'match': {
        const data = event.data as { matched: string }
        return `${indent}  ✓ matched: "${data.matched}"`
      }

      case 'backtrack': {
        const data = event.data as { reason: string; tried: number }
        return `${indent}  ↺ backtrack: ${data.reason} (tried: ${data.tried})`
      }

      case 'token': {
        const data = event.data as { token: Token }
        return `${indent}  TOKEN: ${data.token.type} = "${data.token.value}"`
      }

      case 'error': {
        const data = event.data as ErrorEventData
        return `${indent}  ✗ ERROR: ${data.message} at ${pos}`
      }

      case 'warning': {
        const data = event.data as { message: string }
        return `${indent}  ⚠ WARNING: ${data.message}`
      }

      case 'debug':
        return `${indent}  [debug] ${JSON.stringify(event.data)}`

      default:
        return `${indent}  ${event.type}: ${JSON.stringify(event.data)}`
    }
  },
}

/**
 * JSON formatter for structured logging
 */
export const jsonFormatter: LogFormatter = {
  format(event: ParseEvent): string {
    return JSON.stringify({
      type: event.type,
      rule: event.rule,
      position: event.position,
      data: event.data,
      depth: event.depth,
      timestamp: event.timestamp,
    })
  },
}

/**
 * Compact formatter showing only key events
 */
export const compactFormatter: LogFormatter = {
  format(event: ParseEvent): string {
    if (event.type === 'token') {
      const data = event.data as { token: Token }
      return `[${data.token.type}:${data.token.value}]`
    }
    if (event.type === 'error') {
      const data = event.data as ErrorEventData
      return `ERROR@${event.position.line}:${event.position.column}: ${data.message}`
    }
    if (event.type === 'enter' || event.type === 'exit') {
      const success = event.type === 'exit' ? (event.data as { success?: boolean }).success : null
      return `${event.type === 'enter' ? '>' : '<'}${event.rule}${success !== null ? (success ? '✓' : '✗') : ''}`
    }
    return ''
  },
}
