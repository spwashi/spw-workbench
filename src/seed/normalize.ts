import { parse, type ParseOutput } from './parser'
import type { SeedNode } from './types'
import type { ONFNode } from './types/ast/onf'

export interface DesugarResult {
  source: string
  ast: ParseOutput<SeedNode>
}

/**
 * Apply sugar/alias rewrites to Spw source before parsing.
 * - A{} -> {_A }_A
 * - ?_op -> ?(op)
 */
export function desugar(source: string): string {
  let out = source
  // Guillemet → backtick normalization: «phrase» → `phrase`
  out = out.replace(/«([^»]*)»/g, '`$1`')
  // Label sugar: A{} -> {_A }_A
  out = out.replace(/([A-Za-z][A-Za-z0-9_-]*)\s*\{\s*\}/g, '{_$1 }_$1')
  // Intrinsic sugar: ?_query -> ?(query)
  out = out.replace(/([!?*^~=@])_([A-Za-z][A-Za-z0-9_-]*)/g, '$1($2)')
  return out
}

/**
 * Parse with desugaring step.
 */
export function parseDesugared(input: string): DesugarResult {
  const normalized = desugar(input)
  return { source: normalized, ast: parse(normalized) }
}

import type { ASTNode } from './types/ast'
import type { ModifierKind } from './types'

function frameScalar(node: any): unknown {
  if (!node || typeof node !== 'object') return undefined

  switch (node.type) {
    case 'Literal':
      return node.token?.value
    case 'Identifier':
      return node.token?.value
    case 'Reference':
      return node.raw ?? node.path?.map((part: any) => part.value).join('.')
    case 'PathRef':
      return node.path?.token?.value
    case 'ProseChunk':
      return node.text
    case 'Expression':
      if (node.terms?.length === 1) {
        return frameScalar(node.terms[0])
      }
      return undefined
    case 'Parameter':
      return frameScalar(node.value)
    default:
      return undefined
  }
}

function extractFrameBindings(frame: any): Record<string, unknown> {
  if (!frame?.content || !Array.isArray(frame.content)) {
    return {}
  }

  const bindings: Record<string, unknown> = {}
  let positionalAssigned = false

  for (const item of frame.content) {
    if (!item || typeof item !== 'object') {
      continue
    }

    if (item.type === 'Parameter') {
      const paramValue = frameScalar(item.value)
      const paramName = item.name?.value
      if (paramName && paramValue !== undefined) {
        bindings[paramName] = paramValue
        continue
      }
      if (!positionalAssigned && paramValue !== undefined) {
        bindings.value = paramValue
        positionalAssigned = true
      }
      continue
    }

    const scalar = frameScalar(item)
    if (!positionalAssigned && scalar !== undefined) {
      bindings.value = scalar
      positionalAssigned = true
    }
  }

  return bindings
}

function extractValence(op: any): ModifierKind[] | undefined {
  const modifiers = op.modifiers?.modifiers
  if (!Array.isArray(modifiers) || modifiers.length === 0) {
    return undefined
  }

  return modifiers
    .map((modifier: any) => modifier.value)
    .filter((modifier: unknown): modifier is ModifierKind => typeof modifier === 'string')
}

/**
 * Normalize an AST to Operator Normal Form.
 * Converts structural nodes (Operation, Capsule, Expression) into uniform σ(args)[frames].
 *
 * @see docs/theory/spw/onf.spw (tiered normalization)
 */
export function normalizeToONF(node: ASTNode): ONFNode {
  switch (node.type) {
    case 'Seed':
      return normalizeToONF((node as any).expression)

    case 'Expression': {
      const expr = node as any
      if (!expr.connectors || expr.connectors.length === 0) {
        if (expr.terms && expr.terms.length > 0) return normalizeToONF(expr.terms[0])
        return { sigil: '_', args: [], frames: { reg: 'empty' } }
      }
      let current = normalizeToONF(expr.terms[0])
      for (let i = 0; i < expr.connectors.length; i++) {
        const connector = expr.connectors[i].value
        const right = normalizeToONF(expr.terms[i + 1])
        const reg = connector === '/' ? 'proj' : 'conn'
        current = {
          sigil: connector as any,
          args: [current, right],
          frames: { reg }
        }
      }
      return current
    }

    case 'Operation': {
      const op = node as any
      const sigil = op.operator.value
      const args: ONFNode[] = []
      if (op.subject) args.push(normalizeToONF(op.subject))
      if (op.body) args.push(normalizeToONF(op.body))
      if (op.linePayload) args.push(normalizeToONF(op.linePayload))

      let reg = 'op'
      switch (sigil) {
        case '!': reg = 'hydrate'; break
        case '~': reg = 'defer'; break
        case '*': reg = 'collapse'; break
        case '=': reg = 'config'; break
        case '@': reg = 'observe'; break
        case '#': reg = 'resonate'; break
        case '&': reg = 'merge'; break
        case '^': reg = 'integrate'; break
        case '?': reg = 'probe'; break
        case '%': reg = 'measure'; break
        case '$': reg = 'substrate'; break
        case '.': reg = 'property'; break
        case '<>': reg = 'couple'; break
      }

      const frames: Record<string, unknown> = {
        reg,
        ...extractFrameBindings(op.frame),
      }
      const valence = extractValence(op)
      if (valence && valence.length > 0) {
        frames.valence = valence
      }
      if (op.operatorLabel?.value) {
        frames.label = op.operatorLabel.value
      }

      return { sigil: sigil as any, args, frames }
    }

    case 'Capsule': {
      const cap = node as any
      const open = cap.open.value
      const args: ONFNode[] = (cap.body && cap.body.sequence)
        ? cap.body.sequence.expressions.map((e: any) => normalizeToONF(e))
        : []

      if (open === '#[') return { sigil: '#', args, frames: { reg: 'set' } }
      if (open === '.{') return { sigil: '.', args, frames: { reg: 'facet' } }
      return { sigil: open.charAt(0) as any, args, frames: { reg: 'capsule' } }
    }

    case 'Stream': {
      const stream = node as any
      const args: ONFNode[] = stream.sequence
        ? stream.sequence.expressions.map((e: any) => normalizeToONF(e))
        : []
      return { sigil: '?', args, frames: { reg: 'stream' } }
    }

    case 'Identifier': {
      const id = (node as any).token.value
      if (id === '_') return { sigil: '_', args: [], frames: { reg: 'hole' } }
      return { sigil: '_', args: [], frames: { reg: 'id', value: id } }
    }

    case 'Literal': {
      const val = (node as any).token.value
      const type = (node as any).token.type
      if (type === 'PHRASE') return { sigil: '_', args: [], frames: { reg: 'phrase', value: val } }
      return { sigil: '_', args: [], frames: { reg: 'literal', value: val } }
    }

    case 'Wildcard': {
      return { sigil: '_', args: [], frames: { reg: 'hole' } }
    }

    case 'Reference': {
      return { sigil: '@', args: [], frames: { reg: 'ref', value: (node as any).raw || 'ref' } }
    }

    case 'Annotation': {
      const ann = node as any
      const name = ann.name?.value ?? 'annotation'
      const valueArgs: ONFNode[] = ann.value ? [normalizeToONF(ann.value)] : []
      return { sigil: '#', args: valueArgs, frames: { reg: 'annotation', value: name } }
    }

    case 'ModifierChain': {
      const chain = node as any
      const modifiers = (chain.modifiers ?? []).map((m: any) => m.value).join(',')
      return { sigil: '_', args: [], frames: { reg: 'fold', value: modifiers } }
    }

    case 'Binding': {
      const binding = node as any
      const keyNode = normalizeToONF(binding.key)
      const valueNode = normalizeToONF(binding.value)
      return { sigil: '=', args: [keyNode, valueNode], frames: { reg: 'changelist' } }
    }

    case 'Bullet': {
      const bullet = node as any
      const itemNode = bullet.item
        ? normalizeToONF(bullet.item)
        : { sigil: '_' as const, args: [], frames: { reg: 'empty' } }
      const markerValue = bullet.marker?.value ?? '..'
      return { sigil: '_', args: [itemNode], frames: { reg: 'marker', marker: markerValue } }
    }

    case 'PathRef': {
      const pathRef = node as any
      const pathNode = normalizeToONF(pathRef.path)
      const tag = pathRef.tag?.value
      return { sigil: '@', args: [pathNode], frames: { reg: 'pathref', ...(tag ? { tag } : {}) } }
    }

    case 'Prose': {
      const prose = node as any
      const chunkArgs: ONFNode[] = (prose.chunks ?? []).map((c: any) => normalizeToONF(c))
      return { sigil: '_', args: chunkArgs, frames: { reg: 'prose' } }
    }

    case 'ProseChunk': {
      const chunk = node as any
      return { sigil: '_', args: [], frames: { reg: 'text', value: chunk.text ?? '' } }
    }

    case 'NRange': {
      const nrange = node as any
      const exprNode = nrange.expression ? normalizeToONF(nrange.expression) : { sigil: '_' as const, args: [], frames: { reg: 'empty' } }
      return { sigil: '_', args: [exprNode], frames: { reg: 'range' } }
    }

    case 'Frame': {
      const frame = node as any
      const contentArgs: ONFNode[] = (frame.content ?? []).map((c: any) => normalizeToONF(c))
      return { sigil: '_', args: contentArgs, frames: { reg: 'inner' } }
    }

    case 'Body': {
      const body = node as any
      const bodyArgs: ONFNode[] = body.sequence
        ? body.sequence.expressions.map((e: any) => normalizeToONF(e))
        : []
      return { sigil: '_', args: bodyArgs, frames: { reg: 'around' } }
    }

    case 'Scope': {
      const scope = node as any
      const scopeArgs: ONFNode[] = scope.sequence
        ? scope.sequence.expressions.map((e: any) => normalizeToONF(e))
        : []
      const scopeName = scope.name?.value
      return { sigil: '_', args: scopeArgs, frames: { reg: 'scope', ...(scopeName ? { name: scopeName } : {}) } }
    }

    case 'Condition': {
      const cond = node as any
      const leftNode = normalizeToONF(cond.left)
      const rightNode = normalizeToONF(cond.right)
      const op = cond.operator?.value ?? '=='
      return { sigil: '?', args: [leftNode, rightNode], frames: { reg: 'condition', op } }
    }

    case 'Parameter': {
      const param = node as any
      const paramName = param.name?.value
      const paramValue = normalizeToONF(param.value)
      return { sigil: '=', args: [paramValue], frames: { reg: 'parameter', ...(paramName ? { name: paramName } : {}) } }
    }

    case 'Match': {
      const match = node as any
      const inputNode = normalizeToONF(match.input)
      const armNodes: ONFNode[] = (match.arms ?? []).map((a: any) => normalizeToONF(a))
      return { sigil: '?', args: [inputNode, ...armNodes], frames: { reg: 'match' } }
    }

    case 'MatchArm': {
      const arm = node as any
      const patternNode = normalizeToONF(arm.pattern)
      const handlerNode = normalizeToONF(arm.handler)
      return { sigil: '_', args: [patternNode, handlerNode], frames: { reg: 'arm' } }
    }

    case 'Spread': {
      const spread = node as any
      const captureArgs: ONFNode[] = spread.capture ? [normalizeToONF(spread.capture)] : []
      return { sigil: '_', args: captureArgs, frames: { reg: 'spread' } }
    }

    case 'Sequence': {
      const seq = node as any
      const exprNodes: ONFNode[] = (seq.expressions ?? []).map((e: any) => normalizeToONF(e))
      if (exprNodes.length === 1) return exprNodes[0]
      return { sigil: '_', args: exprNodes, frames: { reg: 'sequence' } }
    }

    default:
      return { sigil: '_', args: [], frames: { reg: 'unknown', nodeType: node.type } }
  }
}

export type { ONFNode, FrameMap } from './types/ast/onf'
