import {
  PAIRED_BOUNDARY_KINDS,
  type ASTNodeType,
  type OperatorKind,
  type PairedBoundaryKind,
} from '../types'
import type { BraceSelector, SpwSelector } from './types'

const SIGILS = new Set<OperatorKind>([
  '!', '^', '~', '?', '*', '=', '@', '#', '.', '&', '$', '%', '<>',
])

const BOUNDARIES = new Set<PairedBoundaryKind>(PAIRED_BOUNDARY_KINDS)

const ATTACHED_BOUNDARIES = new Set<PairedBoundaryKind>(['frame', 'body'])

const BRACES = new Set<BraceSelector>(['[]', '{}', '()'])

const NODE_TYPES = new Set<ASTNodeType>([
  'Seed',
  'Expression',
  'Sequence',
  'Binding',
  'Bullet',
  'PathRef',
  'Prose',
  'ProseChunk',
  'Operation',
  'ModifierChain',
  'Capsule',
  'Stream',
  'NRange',
  'Scope',
  'Frame',
  'Body',
  'Reference',
  'Literal',
  'Identifier',
  'Annotation',
  'Parameter',
  'Condition',
  'Comment',
  'Match',
  'MatchArm',
  'Wildcard',
  'Spread',
])

const PATTERN_KEYS = new Set([
  'sigil',
  'nodeType',
  'brace',
  'brace2',
  'boundary',
  'withBoundaries',
  'modifier',
  'value',
  'depth',
  'depthRange',
  'placeholder',
])

interface ValidationContext {
  active: WeakSet<object>
  captures: Set<string>
}

/** Validate programmatic selectors before matcher dispatch. */
export function assertSpwSelector(value: unknown): asserts value is SpwSelector {
  validateSelector(value, '$', true, true, {
    active: new WeakSet<object>(),
    captures: new Set<string>(),
  })
}

export function isSpwSelector(value: unknown): value is SpwSelector {
  try {
    assertSpwSelector(value)
    return true
  } catch {
    return false
  }
}

function validateSelector(
  value: unknown,
  path: string,
  sequenceAllowed: boolean,
  captureAllowed: boolean,
  context: ValidationContext,
): void {
  const record = requireRecord(value, path)
  if (context.active.has(record)) fail(path, 'selector graph must be acyclic')
  context.active.add(record)

  try {
    if ('any' in record) {
      requireOnlyKeys(
        record,
        'placeholder' in record ? ['any', 'placeholder'] : ['any'],
        path,
      )
      if (record.any !== true) fail(`${path}.any`, 'must be true')
      if ('placeholder' in record && record.placeholder !== true) {
        fail(`${path}.placeholder`, 'must be true when present')
      }
      return
    }

    if ('capture' in record) {
      if (!captureAllowed) fail(path, 'captures are not allowed beneath not/or in query-truth-v1')
      requireOnlyKeys(record, ['capture'], path)
      const capture = requireRecord(record.capture, `${path}.capture`)
      requireOnlyKeys(capture, ['name', 'selector'], `${path}.capture`)
      if (typeof capture.name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(capture.name)) {
        fail(`${path}.capture.name`, 'must be an identifier')
      }
      if (context.captures.has(capture.name)) {
        fail(`${path}.capture.name`, `duplicate capture ${capture.name}`)
      }
      context.captures.add(capture.name)
      validateSelector(capture.selector, `${path}.capture.selector`, false, true, context)
      return
    }

    if ('and' in record || 'or' in record) {
      const key = 'and' in record ? 'and' : 'or'
      requireOnlyKeys(record, [key], path)
      const pair = requirePair(record[key], `${path}.${key}`)
      const childCapturesAllowed = key === 'and' ? captureAllowed : false
      validateSelector(pair[0], `${path}.${key}[0]`, false, childCapturesAllowed, context)
      validateSelector(pair[1], `${path}.${key}[1]`, false, childCapturesAllowed, context)
      return
    }

    if ('not' in record) {
      requireOnlyKeys(record, ['not'], path)
      validateSelector(record.not, `${path}.not`, false, false, context)
      return
    }

    if ('descend' in record) {
      requireOnlyKeys(record, ['descend'], path)
      const pair = requirePair(record.descend, `${path}.descend`)
      validateSelector(pair[0], `${path}.descend[0]`, false, captureAllowed, context)
      validateSelector(pair[1], `${path}.descend[1]`, false, captureAllowed, context)
      return
    }

    if ('seq' in record) {
      if (!sequenceAllowed) fail(path, 'sequence selectors are top-level in query-truth-v1')
      requireOnlyKeys(record, ['seq'], path)
      const selectors = requireSelectorList(record.seq, `${path}.seq`)
      for (let index = 0; index < selectors.length; index += 1) {
        if (!(index in selectors)) fail(`${path}.seq[${index}]`, 'missing selector')
        validateSelector(selectors[index], `${path}.seq[${index}]`, false, captureAllowed, context)
      }
      return
    }

    validatePattern(record, path)
  } finally {
    context.active.delete(record)
  }
}

function validatePattern(record: Record<string, unknown>, path: string): void {
  const keys = Object.keys(record)
  if (keys.length === 0) fail(path, 'empty patterns are not wildcards; use { any: true }')
  if (keys.every((key) => key === 'placeholder')) {
    fail(path, 'placeholder metadata requires a structural constraint')
  }
  for (const key of keys) {
    if (!PATTERN_KEYS.has(key)) fail(`${path}.${key}`, 'unknown pattern field')
  }

  if ('sigil' in record && !SIGILS.has(record.sigil as OperatorKind)) {
    fail(`${path}.sigil`, 'unknown operator sigil')
  }
  if ('nodeType' in record && !NODE_TYPES.has(record.nodeType as ASTNodeType)) {
    fail(`${path}.nodeType`, 'unknown AST node type')
  }
  if ('brace' in record && !BRACES.has(record.brace as BraceSelector)) {
    fail(`${path}.brace`, 'unknown brace selector')
  }
  if ('brace2' in record && !BRACES.has(record.brace2 as BraceSelector)) {
    fail(`${path}.brace2`, 'unknown secondary brace selector')
  }
  if ('brace2' in record && !('brace' in record)) {
    fail(`${path}.brace2`, 'requires brace')
  }
  if ('boundary' in record && !BOUNDARIES.has(record.boundary as PairedBoundaryKind)) {
    fail(`${path}.boundary`, 'unknown paired-boundary kind')
  }
  if ('withBoundaries' in record) {
    if (!Array.isArray(record.withBoundaries) || record.withBoundaries.length === 0) {
      fail(`${path}.withBoundaries`, 'must be a non-empty boundary array')
    }
    const seen = new Set<string>()
    for (const [index, boundary] of record.withBoundaries.entries()) {
      if (!ATTACHED_BOUNDARIES.has(boundary as PairedBoundaryKind)) {
        fail(`${path}.withBoundaries[${index}]`, 'only frame and body can be directly attached')
      }
      if (seen.has(String(boundary))) {
        fail(`${path}.withBoundaries[${index}]`, 'duplicate paired-boundary kind')
      }
      seen.add(String(boundary))
    }
  }
  if ('modifier' in record && (
    typeof record.modifier !== 'string' || record.modifier.length === 0
  )) {
    fail(`${path}.modifier`, 'must be a non-empty string')
  }
  if ('value' in record && typeof record.value !== 'string') {
    fail(`${path}.value`, 'must be a string')
  }
  if ('depth' in record && !isDepth(record.depth)) {
    fail(`${path}.depth`, 'must be a non-negative integer')
  }
  if ('depthRange' in record) {
    if (
      !Array.isArray(record.depthRange)
      || record.depthRange.length !== 2
      || !isDepth(record.depthRange[0])
      || !isDepth(record.depthRange[1])
      || record.depthRange[0] > record.depthRange[1]
    ) {
      fail(`${path}.depthRange`, 'must be an ascending pair of non-negative integers')
    }
  }
  if ('depth' in record && 'depthRange' in record) {
    fail(path, 'depth and depthRange are mutually exclusive')
  }
  if ('placeholder' in record && record.placeholder !== true) {
    fail(`${path}.placeholder`, 'must be true when present')
  }
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(path, 'must be an object')
  }
  return value as Record<string, unknown>
}

function requireOnlyKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  const keys = Object.keys(record)
  if (keys.length !== allowed.length || keys.some((key) => !allowed.includes(key))) {
    fail(path, `must contain only ${allowed.join(', ')}`)
  }
}

function requirePair(value: unknown, path: string): [unknown, unknown] {
  if (!Array.isArray(value) || value.length !== 2) {
    fail(path, 'must contain exactly two selectors')
  }
  return value as [unknown, unknown]
}

function requireSelectorList(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value) || value.length < 2) {
    fail(path, 'must contain at least two selectors')
  }
  return value
}

function isDepth(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function fail(path: string, message: string): never {
  throw new TypeError(`Invalid Spw selector at ${path}: ${message}`)
}
