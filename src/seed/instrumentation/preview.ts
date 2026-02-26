import type {
  SeedNode,
  ExpressionNode,
  OperationNode,
  ScopeNode,
  ReferenceNode,
  FrameNode,
  BodyNode,
  NRangeNode,
  CapsuleNode,
  StreamNode,
  LiteralNode,
  ParameterNode,
  ProseNode,
} from '../types'

function describeOperation(op: OperationNode): string {
  const mod = op.modifiers ? op.modifiers.modifiers.map(m => m.value).join('.') + ' ' : ''
  const label = op.operatorLabel?.value ?? ''
  const frame = op.frame ? describeFrame(op.frame) : ''
  const body = op.body ? describeBody(op.body) : ''
  const inline = op.linePayload?.text ? ` ${op.linePayload.text}` : ''
  return `${mod}${op.operator.value}${label}${frame}${body ? ` {${body}}` : ''}${inline}`.trim()
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
  const tag = cap.tag ? cap.tag.value : 'capsule'
  const frame = cap.frame ? describeFrame(cap.frame) : ''
  const body = cap.body ? `{${describeBody(cap.body)}}` : ''
  return `<${tag}${frame}>${body}`
}

function describeStream(stream: StreamNode): string {
  const seq = describeSequence(stream.sequence)
  const sink = stream.sink ? ` @${describeReference(stream.sink).replace(/^ref\(/, '').replace(/\)$/, '')}` : ''
  return `<< ${seq} >>${sink}`
}

function describeNRange(nr: NRangeNode): string {
  return `((${describeExpression(nr.expression)}))`
}

function describeScope(scope: ScopeNode): string {
  const name = scope.name ? scope.name.value : ''
  return `(${name ? name + ': ' : ''}${describeSequence(scope.sequence)})`
}

function describeTerm(term: ExpressionNode['terms'][number]): string {
  switch (term.type) {
    case 'Operation': return describeOperation(term as OperationNode)
    case 'Reference': return describeReference(term as ReferenceNode)
    case 'Scope': return describeScope(term as ScopeNode)
    case 'Capsule': return describeCapsule(term as CapsuleNode)
    case 'Stream': return describeStream(term as StreamNode)
    case 'NRange': return describeNRange(term as NRangeNode)
    default: return 'Unknown'
  }
}

function describeExpression(expr: ExpressionNode): string {
  const parts: string[] = []
  expr.terms.forEach((term, idx) => {
    parts.push(describeTerm(term))
    if (expr.connectors[idx]) {
      parts.push(expr.connectors[idx].value)
    }
  })
  return parts.join(' ')
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
    : describeProse(ast.expression as ProseNode)
  const annotations = ast.annotations?.map(a => `#${a.name.value}`).join(' ')
  return [annotations, expr].filter(Boolean).join(' ').trim()
}
