import { parse, type ParseOutput } from './parser'
import type { SeedNode } from './types'
import type { ONFNode } from './types/ast/onf'
import { withCoupling } from './types/coupling'

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
      const frameArgs: ONFNode[] = op.frame
        ? (op.frame.content ?? []).map((content: any) => normalizeToONF(content))
        : []

      // The explicit couple operator uses its Frame as an operand list. Other
      // Acts retain Frame content as metadata under frames.bound.
      if (sigil === '<>' && frameArgs.length > 0) {
        args.push(...frameArgs)
      }

      // Preferred Act×Bound products: #[] set, .{} facet (machine-facing reg ids).
      let reg = 'op'
      const hasFrameOnly = Boolean(op.frame && !op.body && !op.subject)
      const hasBodyOnly = Boolean(op.body && !op.frame && !op.subject)
      switch (sigil) {
        case '!': reg = 'hydrate'; break
        case '~': reg = 'defer'; break
        case '*': reg = 'collapse'; break
        case '=': reg = 'config'; break
        case '@': reg = 'observe'; break
        case '#': reg = hasFrameOnly ? 'set' : 'resonate'; break
        case '&': reg = 'merge'; break
        case '^': reg = 'integrate'; break
        case '?': reg = 'probe'; break
        case '%': reg = 'measure'; break
        case '$': reg = 'substrate'; break
        case '.': reg = hasBodyOnly ? 'facet' : 'property'; break
        case '<>': reg = 'couple'; break
      }

      let frames: Record<string, unknown> = {
        reg,
        ...extractFrameBindings(op.frame),
      }

      // Digraph <> is an operator coupling. Zero operands means arity 0, not an empty Bound.
      if (sigil === '<>') {
        frames = withCoupling(frames, 'couple', {
          args,
          argCount: args.length,
        })
      }

      // Multi-arm frame content as select product (named params + bare arms).
      if (op.frame && frameArgs.length > 1) {
        frames.select = {
          armCount: frameArgs.length,
          named: frameArgs.filter((a: any) => a?.frames?.reg === 'parameter' && a?.frames?.name).length,
        }
      }

      // Preserve the paired-boundary side of a prefix Act·Frame product.
      if (op.frame && !op.body) {
        frames.bound = withCoupling({}, 'frame', {
          args: frameArgs,
          argCount: frameArgs.length,
          actPlacement: 'prefix',
          product: hasFrameOnly && (sigil === '#' || sigil === '&' || sigil === '?') ? 'select' : undefined,
        }).coupling
      }

      // Act·Body product (e.g. .{} facet, &{} wrap). `=` is handled below as a
      // bias edge so its body coupling is stamped uniformly whether or not an
      // anchor (subject) or axis (frame) decorates it.
      if (op.body && !op.frame && sigil !== '=') {
        const bodyArgs: ONFNode[] = op.body.sequence
          ? op.body.sequence.expressions.map((e: any) => normalizeToONF(e))
          : []
        frames.bound = withCoupling({}, 'body', {
          args: bodyArgs,
          argCount: bodyArgs.length,
          actPlacement: 'prefix',
          product: hasBodyOnly && sigil === '.' ? 'facet' : undefined,
        }).coupling
      }

      // Bias edge: `=`+body is a verb-neutral directed edge. The body carries the
      // ranked targets; an optional subject is the anchor (from-pole, elided =
      // enclosing node) and an optional frame `[reg=…]` is the axis. The product
      // tag names the shape only — no verb (resolve/rewrite/template) lives here;
      // consumers interpret the edge. See readBias() and .spw/registries/bias-product.spw.
      if (sigil === '=' && op.body) {
        const bodyArgs: ONFNode[] = op.body.sequence
          ? op.body.sequence.expressions.map((e: any) => normalizeToONF(e))
          : []
        frames.bound = withCoupling({}, 'body', {
          args: bodyArgs,
          argCount: bodyArgs.length,
          actPlacement: 'prefix',
          product: 'bias',
        }).coupling
      }

      const valence = extractValence(op)
      if (valence && valence.length > 0) {
        frames.valence = valence
      }
      if (op.operatorLabel?.value) {
        frames.label = op.operatorLabel.value
      }
      // OperationNode.position is declared but unset by the parser today.
      if (op.position === 'prefix' || op.position === 'postfix') {
        frames.fixity = op.position
      }

      return { sigil: sigil as any, args, frames }
    }

    case 'Capsule': {
      const cap = node as any
      const open = cap.open?.value ?? '<'
      const bodyArgs: ONFNode[] = (cap.body && cap.body.sequence)
        ? cap.body.sequence.expressions.map((e: any) => normalizeToONF(e))
        : []

      // Preferred Act×Bound idioms keep their register; Bounds carry structural fill data.
      if (open === '#[') {
        return {
          sigil: '#',
          args: bodyArgs,
          frames: withCoupling({ reg: 'set' }, 'frame', { args: bodyArgs, argCount: bodyArgs.length }),
        }
      }
      if (open === '.{') {
        return {
          sigil: '.',
          args: bodyArgs,
          frames: withCoupling({ reg: 'facet' }, 'body', { args: bodyArgs, argCount: bodyArgs.length }),
        }
      }

      // Channel atom: identifier tag or literal (quantitative / quoted label).
      let channel: string | undefined = cap.tag?.value
      let channelKind: 'id' | 'number' | 'string' | 'boolean' | undefined =
        channel !== undefined ? 'id' : undefined
      if (cap.channel?.type === 'Literal') {
        channel = String(cap.channel.token?.value ?? '')
        const lt = cap.channel.token?.type
        channelKind =
          lt === 'NUMBER' ? 'number' : lt === 'BOOLEAN' ? 'boolean' : 'string'
      } else if (cap.channel?.type === 'Identifier') {
        channel = cap.channel.token?.value ?? channel
        channelKind = 'id'
      }

      const left = cap.left ? normalizeToONF(cap.left) : undefined
      const right = cap.right ? normalizeToONF(cap.right) : undefined
      const medial = Boolean(cap.placement === 'medial' || left || right)
      const args: ONFNode[] = medial
        ? ([left, right].filter(Boolean) as ONFNode[])
        : bodyArgs

      // Shell tag/channel alone is not interior occupancy (form-ladder law).
      // Medial arms and body interiors are inhabited payload.
      const occupancy = medial || bodyArgs.length > 0 ? 'inhabited' : 'empty'
      const payload = medial
        ? args.length >= 2
          ? 'multi'
          : args.length === 1
            ? 'term'
            : 'void'
        : bodyArgs.length > 0
          ? bodyArgs.length > 1
            ? 'multi'
            : 'term'
          : 'void'

      // Preserve optional capsule frame (membrane + selection arms) without losing body.
      const frameArgs: ONFNode[] = cap.frame
        ? (cap.frame.content ?? []).map((c: any) => normalizeToONF(c))
        : []
      const capsuleFrames: Record<string, unknown> = {
        reg: medial ? 'composite' : 'capsule',
        placement: medial ? 'medial' : 'shell',
        ...(channel !== undefined ? { tag: channel, channel, channelKind } : {}),
        ...(bodyArgs.length > 0 ? { hasBody: true } : {}),
        ...(frameArgs.length > 0
          ? {
              bound: withCoupling({}, 'frame', {
                args: frameArgs,
                argCount: frameArgs.length,
                actPlacement: 'membrane',
              }).coupling,
            }
          : {}),
      }

      return {
        sigil: '<' as any,
        args,
        frames: withCoupling(
          capsuleFrames,
          'capsule',
          { args, argCount: args.length, occupancy, payload } as any,
        ),
      }
    }

    case 'Stream': {
      const stream = node as any
      const args: ONFNode[] = stream.sequence
        ? stream.sequence.expressions.map((e: any) => normalizeToONF(e))
        : []
      // Historical ? sigil borrow; coupling.form/kind disambiguate Stream from Wonder.
      const sinkNode = stream.sink ? normalizeToONF(stream.sink) : undefined
      // Fold/head: multi-arg streams expose foldReady when argCount > 1.
      return {
        sigil: '?',
        args,
        frames: withCoupling(
          {
            ...(sinkNode ? { sink: sinkNode } : {}),
            ...(args.length > 1 ? { foldReady: true, foldKind: 'sequence' } : {}),
          },
          'stream',
          {
            args,
            argCount: args.length,
            occupancy: args.length > 0 ? 'inhabited' : 'empty',
            payload: args.length > 1 ? 'multi' : args.length === 1 ? 'term' : 'void',
          } as any,
        ),
      }
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
      // Empty n-range: no expression → empty occupancy of kind nrange (not generic empty).
      if (!nrange.expression) {
        return {
          sigil: '_',
          args: [],
          frames: withCoupling({}, 'nrange', { occupancy: 'empty', payload: 'void' }),
        }
      }
      const exprNode = normalizeToONF(nrange.expression)
      return {
        sigil: '_',
        args: [exprNode],
        frames: withCoupling({}, 'nrange', { args: [exprNode], argCount: 1 }),
      }
    }

    case 'Frame': {
      const frame = node as any
      const contentArgs: ONFNode[] = (frame.content ?? []).map((c: any) => normalizeToONF(c))
      return {
        sigil: '_',
        args: contentArgs,
        frames: withCoupling({}, 'frame', { args: contentArgs, argCount: contentArgs.length }),
      }
    }

    case 'Body': {
      const body = node as any
      const bodyArgs: ONFNode[] = body.sequence
        ? body.sequence.expressions.map((e: any) => normalizeToONF(e))
        : []
      return {
        sigil: '_',
        args: bodyArgs,
        frames: withCoupling({}, 'body', { args: bodyArgs, argCount: bodyArgs.length }),
      }
    }

    case 'Scope': {
      const scope = node as any
      const scopeArgs: ONFNode[] = scope.sequence
        ? scope.sequence.expressions.map((e: any) => normalizeToONF(e))
        : []
      const scopeName = scope.name?.value
      return {
        sigil: '_',
        args: scopeArgs,
        frames: withCoupling(
          { ...(scopeName ? { name: scopeName } : {}) },
          'scope',
          { args: scopeArgs, argCount: scopeArgs.length },
        ),
      }
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
