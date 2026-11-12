/**
 * Runtime values — the guards that tell a packet, a scope frame and a record
 * apart, and the deep copy the register bank hands out so no reader can
 * mutate a cell it was given.
 *
 * A packet is told by its kind, a closed set (RuntimePacket['kind']), so a
 * plain record that happens to carry a `kind` field stays a record and is
 * copied whole.
 */

import type { RuntimePacket, RuntimeRecord, RuntimeValue, ScopeFrame } from './types'

/** The kinds a RuntimePacket can carry; any other `kind` belongs to a plain record. */
export const RUNTIME_PACKET_KINDS: ReadonlySet<RuntimePacket['kind']> = new Set([
  'selection',
  'node',
  'landmark',
  'html',
  'operator',
  'runtime',
])

export function nowIso(): string {
  return new Date().toISOString()
}

export function isRuntimePacket(value: RuntimeValue): value is RuntimePacket {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && RUNTIME_PACKET_KINDS.has((value as { kind?: unknown }).kind as RuntimePacket['kind'])
}

export function isScopeFrame(value: RuntimeValue): value is ScopeFrame {
  return typeof value === 'object' && value !== null && 'observer' in value && 'capturedAt' in value
}

/** A keyed record: an object that is neither an array, a packet nor a scope frame. */
export function isRuntimeRecord(value: RuntimeValue): value is RuntimeRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !isRuntimePacket(value) && !isScopeFrame(value)
}

/** A deep copy: arrays, records, frames and packets are rebuilt; scalars are returned as they are. */
export function cloneRuntimeValue(value: RuntimeValue): RuntimeValue {
  if (value === undefined || value === null) return value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value

  if (Array.isArray(value)) return value.map(item => cloneRuntimeValue(item))

  if (isScopeFrame(value)) {
    return {
      observer: value.observer,
      capturedAt: value.capturedAt,
      value: cloneRuntimeValue(value.value),
    }
  }

  if (isRuntimePacket(value)) {
    const copy: RuntimePacket = { ...value }
    if ('payload' in value) copy.payload = cloneRuntimeValue(value.payload)
    if (value.tags) copy.tags = [...value.tags]
    return copy
  }

  const copy: RuntimeRecord = {}
  for (const [key, item] of Object.entries(value)) copy[key] = cloneRuntimeValue(item)
  return copy
}

/**
 * Two values as one: arrays concatenate, records take the right's keys over
 * the left's, and anything else is the right. Both sides are copied, so the
 * result shares nothing with either.
 */
export function mergeRuntimeValues(left: RuntimeValue, right: RuntimeValue): RuntimeValue {
  if (right === undefined) return cloneRuntimeValue(left)
  if (left === undefined) return cloneRuntimeValue(right)

  if (Array.isArray(left) && Array.isArray(right)) {
    return [...left.map(cloneRuntimeValue), ...right.map(cloneRuntimeValue)]
  }

  if (isRuntimeRecord(left) && isRuntimeRecord(right)) {
    const merged = cloneRuntimeValue(left) as RuntimeRecord
    for (const [key, value] of Object.entries(right)) merged[key] = cloneRuntimeValue(value)
    return merged
  }

  return cloneRuntimeValue(right)
}

/**
 * How much a value says, uncapped: a number's size, a string's length, an
 * array's or record's count, a frame's or packet's inner value. The bank's
 * measure divides it by the largest in a set. The memory policy's residency
 * cost (memory-policy.ts valueMagnitude) caps each of these on purpose and
 * scales strings down, since it prices keeping a value, not reading it.
 */
export function runtimeMagnitude(value: RuntimeValue): number {
  /**
   * @spw:axis[representation=4] - Absolute magnitude as weighted resolution.
   */
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') return Math.abs(value)
  if (typeof value === 'string') return value.length
  if (typeof value === 'boolean') return value ? 1 : 0
  if (Array.isArray(value)) return value.length
  if (isScopeFrame(value)) return runtimeMagnitude(value.value)
  if (isRuntimePacket(value)) return runtimeMagnitude(value.payload)
  return Object.keys(value).length
}
