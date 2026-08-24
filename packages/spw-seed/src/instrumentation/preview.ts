import type {
  SeedNode,
  ExpressionNode,
  BindingNode,
  BulletNode,
  PathRefNode,
  OperationNode,
  ScopeNode,
  ReferenceNode,
  FrameNode,
  BodyNode,
  NRangeNode,
  CapsuleNode,
  StreamNode,
  LiteralNode,
  IdentifierNode,
  AnnotationNode,
  ParameterNode,
  ProseNode,
} from '../types'

function describeOperation(op: OperationNode): string {
  const mod = op.modifiers ? op.modifiers.modifiers.map(m => m.value).join('.') + ' ' : ''
  const label = op.operatorLabel?.value ?? ''
  const subject = op.subject ? describeTerm(op.subject) : ''
  const frame = op.frame ? describeFrame(op.frame) : ''
  const body = op.body ? describeBody(op.body) : ''
  const inline = op.linePayload?.text ? ` ${op.linePayload.text}` : ''
  return `${mod}${op.operator.value}${label}${subject}${frame}${body ? ` {${body}}` : ''}${inline}`.trim()
}

function describePathRef(ref: PathRefNode): string {
  const tag = ref.tag ? `<${ref.tag.value}>` : ''
  return `~${tag}${ref.path.token.value}`
}

function describeReference(ref: ReferenceNode): string {
  const raw = ref.raw
  const path = raw ?? ref.path.map(p => p.value).filter(Boolean).join('.')
  return `@${path || ''}`
}

function describeFrame(frame: FrameNode): string {
  const items = frame.content.map(item => {
    switch (item.type) {
      case 'Reference':
        return describeReference(item as ReferenceNode)
      case 'Literal':
        return (item as LiteralNode).token.value
      case 'Parameter': {
        const param = item as ParameterNode
        const name = param.name ? param.name.value + ':' : ''
        if (param.value.type === 'Literal') {
          return `${name}${param.value.token.value}`
        }
        if (param.value.type === 'Reference') {
          return `${name}${describeReference(param.value)}`
        }
        if (param.value.type === 'Expression') {
          return `${name}${describeExpression(param.value)}`
        }
        return name
      }
      default:
        return ''
    }
  })
  return `[${items.filter(Boolean).join(', ')}]`
}

function describeBody(body: BodyNode): string {
  return describeSequence(body.sequence)
}

function describeCapsule(cap: CapsuleNode): string {
  const channel =
    cap.tag?.value
    ?? (cap.channel?.type === 'Literal'
      ? cap.channel.token.value
      : cap.channel?.type === 'Identifier'
        ? cap.channel.token.value
        : '')
  const frame = cap.frame ? describeFrame(cap.frame) : ''
  const body = cap.body ? `{${describeBody(cap.body)}}` : ''
  const shell = `<${channel || 'capsule'}${frame}>${body}`
  if (cap.placement === 'medial' || cap.left || cap.right) {
    const L = cap.left ? describeTerm(cap.left) : ''
    const R = cap.right ? describeTerm(cap.right) : ''
    return `${L}${shell}${R}`
  }
  return shell
}

function describeStream(stream: StreamNode): string {
  const seq = describeSequence(stream.sequence)
  const sink = stream.sink ? ` @${describeReference(stream.sink).replace(/^ref\(/, '').replace(/\)$/, '')}` : ''
  return `<< ${seq} >>${sink}`
}

function describeNRange(nr: NRangeNode): string {
  return `((${nr.expression ? describeExpression(nr.expression) : ''}))`
}

function describeScope(scope: ScopeNode): string {
  const name = scope.name ? scope.name.value : ''
  return `(${name ? name + ': ' : ''}${describeSequence(scope.sequence)})`
}

function describeTerm(term: ExpressionNode['terms'][number] | any): string {
  switch (term.type) {
    case 'Binding': return describeBinding(term as BindingNode)
    case 'Bullet': return describeBullet(term as BulletNode)
    case 'PathRef': return describePathRef(term as PathRefNode)
    case 'Operation': return describeOperation(term as OperationNode)
    case 'Reference': return describeReference(term as ReferenceNode)
    case 'Scope': return describeScope(term as ScopeNode)
    case 'Capsule': return describeCapsule(term as CapsuleNode)
    case 'Stream': return describeStream(term as StreamNode)
    case 'NRange': return describeNRange(term as NRangeNode)
    case 'Literal': return (term as LiteralNode).token.value
    case 'Identifier': return (term as IdentifierNode).token.value
    case 'Annotation': {
      const a = term as AnnotationNode
      if (!a.value) return `~#${a.name.value}`
      const v = a.value as any
      if (v.type === 'Literal') return `~#${a.name.value} ${v.token.value}`
      if (v.type === 'Reference') return `~#${a.name.value} ${describeReference(v)}`
      if (v.type === 'PathRef') return `~#${a.name.value} ${describePathRef(v)}`
      return `~#${a.name.value}`
    }
    default: return 'Unknown'
  }
}

function describeBinding(b: BindingNode): string {
  const key = describeTerm(b.key)
  const value = describeExpression(b.value)
  return `${key}: ${value}`
}

function describeBullet(b: BulletNode): string {
  const item = b.item.type === 'ProseChunk'
    ? (b.item.text || '').trim()
    : describeExpression(b.item)
  return `.. ${item}`.trim()
}

function describeExpression(expr: ExpressionNode): string {
  const parts: string[] = []
  expr.terms.forEach((term, idx) => {
    parts.push(describeTerm(term))
    if (expr.connectors[idx]) {
      parts.push(expr.connectors[idx].value)
    }
  })
  const head = parts.join(' ')
  const frame = expr.frame ? describeFrame(expr.frame) : ''
  const body = expr.body ? `{${describeBody(expr.body)}}` : ''
  const scope = expr.scope ? describeScope(expr.scope) : ''
  const capsule = expr.capsule ? describeCapsule(expr.capsule) : ''
  return `${head}${frame}${body}${scope}${capsule}`
}

function describeSequence(seq: { expressions: ExpressionNode[] }): string {
  return seq.expressions.map(describeExpression).join(' ; ')
}

function describeProse(prose: ProseNode): string {
  return prose.chunks.map(chunk => {
    switch (chunk.type) {
      case 'ProseChunk':
        return chunk.text
      case 'Expression':
        return describeExpression(chunk)
      case 'Operation':
        return describeOperation(chunk as OperationNode)
      case 'Reference':
        return describeReference(chunk as ReferenceNode)
      case 'Scope':
        return describeScope(chunk as ScopeNode)
      case 'Capsule':
        return describeCapsule(chunk as CapsuleNode)
      case 'Stream':
        return describeStream(chunk as StreamNode)
      case 'NRange':
        return describeNRange(chunk as NRangeNode)
      default:
        return ''
    }
  }).filter(Boolean).join(' ')
}

/**
 * Produce a lightweight natural language preview of a parsed AST.
 */
export function previewAST(ast: SeedNode | null | undefined): string {
  if (!ast) return 'No AST'
  const expr = ast.expression.type === 'Expression'
    ? describeExpression(ast.expression)
    : ast.expression.type === 'Sequence'
      ? describeSequence(ast.expression as any)
      : describeProse(ast.expression as ProseNode)
  const annotations = ast.annotations?.map(a => `#${a.name.value}`).join(' ')
  return [annotations, expr].filter(Boolean).join(' ').trim()
}
