import {
  normalizeToONF,
  $register,
  readCouplingFrame,
  type OperatorKind,
  type SeedNode,
  type ONFNode,
} from '@spwashi/spw-seed'
import { RegisterBank } from '../state/register-bank'
import { descriptorForKey } from '../state/type-affinities'
import type { RegisterId, RegisterWriteOptions, RuntimeValence, RuntimeValue } from '../state/types'
import type {
  RuntimeInterpretation,
  RuntimeInterpreterOptions,
  RuntimeTrace,
  RuntimeTracePolicy,
} from './types'
import { resolveRuntimeTracePolicy } from './types'
import { recordRuntimeTrace } from './trace'

interface EvalContext {
  registers: RegisterBank
  traces: RuntimeTrace[]
  tracePolicy: RuntimeTracePolicy
  generatedTraces: number
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

function frameValence(node: ONFNode): RuntimeValence[] | undefined {
  const raw = node.frames.valence
  if (!Array.isArray(raw)) {
    return undefined
  }

  const valence = raw.filter((item): item is RuntimeValence => typeof item === 'string')
  return valence.length > 0 ? valence : undefined
}

function semanticFrames(node: ONFNode): Record<string, unknown> | undefined {
  const { momentum, reg, valence, ...frames } = node.frames
  return Object.keys(frames).length > 0 ? { ...frames } : undefined
}

function operatorForNode(node: ONFNode): OperatorKind | undefined {
  if (node.sigil === '_') {
    return undefined
  }
  return node.sigil as OperatorKind
}

function writeSemantics(node: ONFNode): RegisterWriteOptions {
  const operator = operatorForNode(node)

  return {
    descriptor: operator ? descriptorForKey(operator) : undefined,
    operator,
    valence: frameValence(node),
    registerRole: frameString(node, 'reg'),
    semanticFrames: semanticFrames(node),
    phase: 'pragmatic',
  }
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

function registerKey(raw: string | undefined, fallback: RegisterId): RegisterId {
  return raw ? $register`${raw}` : fallback
}

function evaluate(node: ONFNode, context: EvalContext): RuntimeValue {
  const args = node.args.map(arg => evaluate(arg, context))

  recordRuntimeTrace(context, 'interpret', 'evaluation', `evaluate sigil ${node.sigil}`)

  switch (node.sigil) {
    case '_': {
      const reg = frameString(node, 'reg')

      // Marker: register as named mark position
      if (reg === 'marker') {
        const item = args[0] ?? null
        const markerName = frameString(node, 'marker')
        if (markerName) {
          context.registers.markPosition(markerName, item, {
            ...writeSemantics(node),
            source: 'interpret:marker',
          })
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
      const key = registerKey(
        frameString(node),
        $register`res-${context.registers.listKeys().length}`,
      )
      const lens = frameString(node, 'reg') ?? 'runtime'
      const reduced = reduceResonance(args)
      context.registers.resonate(key, reduced, lens, {
        ...writeSemantics(node),
        source: 'interpret:resonate',
      })
      return reduced
    }

    case '@': {
      const observer = frameString(node) ?? 'runtime'
      const value = args[0] ?? null
      return context.registers.observe(observer, value, {
        ...writeSemantics(node),
        source: 'interpret:observe',
      })
    }

    case '&': {
      const key = registerKey(
        frameString(node),
        $register`merge-${context.registers.listKeys().length}`,
      )
      return context.registers.confluent(key, args, {
        ...writeSemantics(node),
        source: 'interpret:confluent',
      })
    }

    case '=': {
      const key = registerKey(frameString(node), context.registers.getFocusKey())
      const value = args[0] ?? null
      context.registers.set(key, value, {
        ...writeSemantics(node),
        source: 'interpret:set',
        force: true,
      })
      return value
    }

    case '%': {
      if (typeof args[0] === 'string') {
        const scale = typeof args[1] === 'number' ? args[1] : 1
        return context.registers.measure($register`${args[0]}`, scale)
      }
      const fallbackKey = registerKey(frameString(node), context.registers.getFocusKey())
      return context.registers.measure(fallbackKey)
    }

    case '$': {
      const key = typeof args[0] === 'string'
        ? $register`${args[0]}`
        : registerKey(frameString(node), context.registers.getFocusKey())
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
      // Stream borrows `?` in ONF. Its structural coupling tag prevents it from
      // accidentally taking Wonder's conditional evaluator.
      const streamCoupling = readCouplingFrame(node.frames)
      if (streamCoupling?.form === 'boundary' && streamCoupling.kind === 'stream') {
        return args
      }
      // Wonder / probe: conditional
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
      const key = registerKey(frameString(node), context.registers.getFocusKey())
      context.registers.set(key, collapsed, {
        ...writeSemantics(node),
        source: 'interpret:collapse',
        force: true,
      })
      recordRuntimeTrace(context, 'interpret', 'evaluation', `collapse *${key} → ${typeof collapsed}`)
      return collapsed
    }

    case '<>': {
      // Explicit relation coupling. Boundary kinds never reach this evaluator.
      if (args.length >= 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
        context.registers.couple($register`${args[0]}`, $register`${args[1]}`)
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
  const tracePolicy = resolveRuntimeTracePolicy(options)
  const context: EvalContext = {
    registers,
    traces: [],
    tracePolicy,
    generatedTraces: 0,
  }

  recordRuntimeTrace(context, 'normalize', 'stage', 'normalize seed AST into ONF')
  const onf = normalizeToONF(ast)

  recordRuntimeTrace(context, 'interpret', 'stage', 'run ONF interpreter')
  const value = evaluate(onf, context)

  return {
    ast,
    onf,
    value,
    registers: registers.snapshot(),
    traces: context.traces,
    tracePolicy,
    traceCounts: {
      generated: context.generatedTraces,
      retained: context.traces.length,
    },
  }
}
