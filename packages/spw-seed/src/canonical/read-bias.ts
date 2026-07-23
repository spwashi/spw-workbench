/**
 * readBias — the verb-neutral reader for the `bias` product.
 *
 * A bias edge is written `=[axis] anchor { targets }`. This reads the edge off
 * the AST *without interpreting it*: no consumer word (resolve / rewrite /
 * template) lives here. mount, mutate, and expand each read the same BiasEdge
 * and decide the verb. That separation is the whole point — see
 * `.spw/registries/bias-product.spw`.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */
import type { ASTNode } from '../types/ast'
import type {
  BodyNode,
  ExpressionNode,
  FrameNode,
  IdentifierNode,
  LiteralNode,
  OperationNode,
  ParameterNode,
  PathRefNode,
  ReferenceNode,
} from '../types/ast/nodes'
import { decodeQuotedToken } from '../query/quoted'

/** A pole of a bias edge, tagged by how it was written so consumers can route it. */
export interface BiasTarget {
  /** The pole as written, including any `#fragment`. */
  value: string
  kind: 'path' | 'ref' | 'name' | 'literal'
  /**
   * The `#anchor` sub-address of a path pole, when present. A fragment names a
   * deixis anchor inside the target surface — the granular part, not the file.
   */
  fragment?: string
}

/** Direction of the edge. boon → forward, bane → inverse. Verb-neutral by design. */
export type BiasSign = 'forward' | 'inverse'

/** The verb-neutral bias edge: anchor → targets, along an axis, with a sign. */
export interface BiasEdge {
  /** From-pole. Undefined = elided = the enclosing node (reflexive bias). */
  anchor?: BiasTarget
  /** Biased register (frame identifier). Undefined = the node's default axis. */
  axis?: string
  /** Toward-poles in body order — first is strongest (ranked). */
  targets: BiasTarget[]
  /** boon → forward, bane → inverse, otherwise forward. Raw pentad in `valence`. */
  sign: BiasSign
  /** Valence markers exactly as written, for consumers wanting the full pentad. */
  valence: string[]
}

function termScalar(node: ASTNode | undefined): BiasTarget | undefined {
  if (!node) return undefined
  switch (node.type) {
    case 'PathRef': {
      const value = decodeQuotedToken((node as PathRefNode).path.token.value)
      const hash = value.indexOf('#')
      if (hash > 0) return { value, kind: 'path', fragment: value.slice(hash + 1) }
      return { value, kind: 'path' }
    }
    case 'Reference': {
      const ref = node as ReferenceNode
      return { value: ref.raw ?? ref.path.map((t) => t.value).join('.'), kind: 'ref' }
    }
    case 'Identifier':
      return { value: (node as IdentifierNode).token.value, kind: 'name' }
    case 'Literal':
      return { value: decodeQuotedToken((node as LiteralNode).token.value), kind: 'literal' }
    case 'Expression':
      return termScalar((node as ExpressionNode).terms[0])
    default:
      return undefined
  }
}

function readAxis(frame: FrameNode | undefined): string | undefined {
  if (!frame) return undefined
  const param = frame.content.find((c): c is ParameterNode => c.type === 'Parameter')
  if (!param) return undefined
  if (param.name) return param.name.value
  return termScalar(param.value as ASTNode)?.value
}

function readTargets(body: BodyNode): BiasTarget[] {
  const out: BiasTarget[] = []
  for (const expr of body.sequence.expressions) {
    for (const term of expr.terms) {
      const scalar = termScalar(term)
      if (scalar) out.push(scalar)
    }
  }
  return out
}

/**
 * Read a bias edge off an AST node, or null if the node is not a bias product.
 * Verb-neutral: it reports the edge; it never acts on it.
 */
export function readBias(node: ASTNode): BiasEdge | null {
  if (node.type !== 'Operation') return null
  const op = node as OperationNode
  if (op.operator.value !== '=' || !op.body) return null

  const valence = op.modifiers?.modifiers.map((m) => m.value) ?? []
  const sign: BiasSign = valence.includes('bane') ? 'inverse' : 'forward'

  return {
    anchor: termScalar(op.subject as ASTNode | undefined),
    axis: readAxis(op.frame),
    targets: readTargets(op.body),
    sign,
    valence,
  }
}
