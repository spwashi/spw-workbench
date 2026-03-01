import { normalizeToONF } from '../../seed/normalize'
import type { SeedNode } from '../../seed/types'
import type { ONFNode } from '../../seed/types/ast/onf'
import { RegisterBank } from '../state/register-bank'
import type { RuntimeValue } from '../state/types'
import type {
  RuntimeInterpretation,
  RuntimeInterpreterOptions,
  RuntimeStage,
  RuntimeTrace,
} from './types'

interface EvalContext {
  registers: RegisterBank
  traces: RuntimeTrace[]
  captureTrace: boolean
}

function trace(context: EvalContext, stage: RuntimeStage, message: string): void {
  if (!context.captureTrace) return
  context.traces.push({
    stage,
    message,
    at: new Date().toISOString(),
  })
}

function coerceRuntimeValue(value: unknown): RuntimeValue {
  if (value === undefined || value === null) return value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value

  if (Array.isArray(value)) {
    return value.map(item => coerceRuntimeValue(item))
  }

  if (typeof value === 'object') {
    const normalized: Record<string, RuntimeValue> = {}
    for (const [key, item] of Object.entries(value)) {
      normalized[key] = coerceRuntimeValue(item)
    }
    return normalized
  }

  return String(value)
}

function frameString(node: ONFNode, key = 'value'): string | undefined {
  const raw = node.frames[key]
  if (typeof raw === 'string' && raw.length > 0) {
    return raw
  }
  return undefined
}

function isRuntimeRecord(value: RuntimeValue): value is Record<string, RuntimeValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stableKey(value: RuntimeValue): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function intersectArrays(values: RuntimeValue[][]): RuntimeValue[] {
  const [head, ...tail] = values
  if (!head) return []

  const tailSets = tail.map(items => new Set(items.map(item => stableKey(item))))
  const seen = new Set<string>()
  const intersection: RuntimeValue[] = []

  for (const item of head) {
    const key = stableKey(item)
    if (seen.has(key)) continue
    if (tailSets.every(set => set.has(key))) {
      seen.add(key)
      intersection.push(item)
    }
  }

  return intersection
}

function intersectRecords(values: Record<string, RuntimeValue>[]): Record<string, RuntimeValue> {
  const [head, ...tail] = values
  if (!head) return {}

  const result: Record<string, RuntimeValue> = {}
  for (const [key, value] of Object.entries(head)) {
    const existsEverywhere = tail.every(record => key in record)
    if (!existsEverywhere) continue

    const sameEverywhere = tail.every(record => stableKey(record[key]) === stableKey(value))
    if (!sameEverywhere) continue
    result[key] = value
  }

  return result
}

function reduceResonance(args: RuntimeValue[]): RuntimeValue {
  if (args.length === 0) return null
  if (args.length === 1) return args[0]

  if (args.every(Array.isArray)) {
    return intersectArrays(args as RuntimeValue[][])
  }

  if (args.every(isRuntimeRecord)) {
    return intersectRecords(args as Record<string, RuntimeValue>[])
  }

  return args[args.length - 1]
}

function evaluate(node: ONFNode, context: EvalContext): RuntimeValue {
  const args = node.args.map(arg => evaluate(arg, context))

  trace(context, 'interpret', `evaluate sigil ${node.sigil}`)

  switch (node.sigil) {
    case '_': {
      const reg = frameString(node, 'reg')

      // Marker: register as named mark position
      if (reg === 'marker') {
        const item = args[0] ?? null
        const markerName = frameString(node, 'marker')
        if (markerName) {
          context.registers.markPosition(markerName, item)
        }
        return item
      }

      // Fold: return modifier metadata
      if (reg === 'fold') {
        const value = node.frames.value
        return value === undefined ? null : coerceRuntimeValue(value)
      }

      // Text: raw prose content
      if (reg === 'text' || reg === 'prose') {
        return args.length > 0 ? args : coerceRuntimeValue(node.frames.value ?? null)
      }

      // Sequence: return args array
      if (reg === 'sequence') {
        return args
      }

      // Default: return frames value or null
      const value = node.frames.value
      return value === undefined ? (args.length > 0 ? args[args.length - 1] : null) : coerceRuntimeValue(value)
    }

    case '#': {
      const key = frameString(node) ?? `res-${context.registers.listKeys().length}`
      const lens = frameString(node, 'reg') ?? 'runtime'
      const reduced = reduceResonance(args)
      context.registers.resonate(key, reduced, lens)
      return reduced
    }

    case '@': {
      const observer = frameString(node) ?? 'runtime'
      const value = args[0] ?? null
      return context.registers.observe(observer, value)
    }

    case '&': {
      const key = frameString(node) ?? `merge-${context.registers.listKeys().length}`
      return context.registers.confluent(key, ...args)
    }

    case '=': {
      const key = frameString(node) ?? context.registers.getFocusKey()
      const value = args[0] ?? null
      context.registers.set(key, value, { source: 'interpret:set', force: true })
      return value
    }

    case '%': {
      if (typeof args[0] === 'string') {
        const scale = typeof args[1] === 'number' ? args[1] : 1
        return context.registers.measure(args[0], scale)
      }
      const fallbackKey = frameString(node) ?? context.registers.getFocusKey()
      return context.registers.measure(fallbackKey)
    }

    case '$': {
      const key = typeof args[0] === 'string'
        ? args[0]
        : frameString(node) ?? context.registers.getFocusKey()
      const meta = context.registers.materialize(key)
      return meta ? coerceRuntimeValue(meta) : null
    }

    case '.': {
      const base = args[0]
      const path = frameString(node, 'path')
      if (!path) return base
      const segments = path.split('.').filter(Boolean)
      return context.registers.access(base, segments)
    }

    case '?': {
      const condition = args[0]
      if (condition) return args[1] ?? true
      return null
    }

    case '!': {
      return args[0] ?? null
    }

    case '^': {
      return { integrated: args }
    }

    case '~': {
      return { deferred: args[0] ?? null }
    }

    case '*': {
      // Value/collapse: resolve to concrete value, write to active register
      const collapsed = args[0] ?? null
      const key = frameString(node) ?? context.registers.getFocusKey()
      context.registers.set(key, collapsed, { source: 'interpret:collapse', force: true })
      trace(context, 'interpret', `collapse *${key} → ${typeof collapsed}`)
      return collapsed
    }

    case '<>': {
      // Coupling: couple registers
      if (args.length >= 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
        context.registers.couple(args[0], args[1])
      }
      return args
    }

    // ── Connector sigils ───────────────────────────────────────

    case '..' as any: {
      // Sequence connector: collect all args
      return args
    }

    case '|' as any: {
      // Alternative connector: return first truthy arg
      for (const arg of args) {
        if (arg !== null && arg !== undefined && arg !== false) return arg
      }
      return null
    }

    case '/' as any: {
      // Projection connector: project left through right
      const base = args[0]
      const projection = args[1]
      if (typeof projection === 'string' && isRuntimeRecord(base)) {
        return (base as Record<string, RuntimeValue>)[projection] ?? null
      }
      return args[args.length - 1] ?? null
    }

    case '->' as any: {
      // Transform connector: pipe left into right
      return args[args.length - 1] ?? null
    }

    default: {
      return {
        sigil: node.sigil,
        args,
        frames: coerceRuntimeValue(node.frames),
      }
    }
  }
}

export function interpretSeed(
  ast: SeedNode,
  options: RuntimeInterpreterOptions = {},
  registers = new RegisterBank()
): RuntimeInterpretation {
  const captureTrace = options.captureTrace ?? true
  const context: EvalContext = {
    registers,
    traces: [],
    captureTrace,
  }

  trace(context, 'normalize', 'normalize seed AST into ONF')
  const onf = normalizeToONF(ast)

  trace(context, 'interpret', 'run ONF interpreter')
  const value = evaluate(onf, context)

  return {
    ast,
    onf,
    value,
    registers: registers.snapshot(),
    traces: context.traces,
  }
}
