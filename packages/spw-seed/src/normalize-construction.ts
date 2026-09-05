import type { ASTNode, ExpressionNode } from './types/ast'
import type { ONFConstructionFrame, ONFNode, PostfixAttachmentKind } from './types/ast/onf'
import type { Span } from './types/position'

const POSTFIX_KINDS = ['frame', 'body', 'scope', 'capsule'] as const

function copySpan(span: Span): Span {
  return { start: { ...span.start }, end: { ...span.end } }
}

/** args[0] is the head; subsequent args follow the authored attachment order. */
export function preserveExpressionConstruction(
  expression: ExpressionNode,
  head: ONFNode,
  normalize: (node: ASTNode) => ONFNode,
): ONFNode {
  const attachments = POSTFIX_KINDS.flatMap(kind => {
    const node = expression[kind]
    return node ? [{ kind, node }] : []
  }).sort((a, b) => a.node.span.start.offset - b.node.span.start.offset)
  if (attachments.length === 0) return head

  const first = expression.terms[0]
  const last = expression.terms[expression.terms.length - 1]
  const construction: ONFConstructionFrame = {
    version: 'spw.onf.construction/1',
    // These spans belong to the caller's AST/source, not an invented file revision.
    source: copySpan(expression.span),
    head: copySpan(first && last ? { start: first.span.start, end: last.span.end } : expression.span),
    attachments: attachments.map(({ kind, node }) => ({ kind, source: copySpan(node.span) })),
  }
  return {
    sigil: '_',
    args: [head, ...attachments.map(({ node }) => normalize(node))],
    frames: { reg: 'construction', construction },
  }
}

export interface ONFValueOmission {
  /** Argument path to the construction in the unprojected ONF. */
  path: number[]
  source: Span
  /** Each omitted attachment includes its entire subtree. */
  attachments: Array<{ kind: PostfixAttachmentKind; source: Span }>
  reason: 'postfix-attachments-not-evaluated'
}

export interface ONFValueProjectionReceipt {
  profile: 'spw.onf.value/1'
  omissions: ONFValueOmission[]
}

/**
 * Preserve the existing evaluator's head-only reading explicitly. Structural
 * callers keep the original ONF; value consumers receive a receipt of loss.
 * This does not define an evaluation law for any attachment or change handlers.
 */
export function projectONFForValue(node: ONFNode): { node: ONFNode; receipt: ONFValueProjectionReceipt } {
  const omissions: ONFValueOmission[] = []
  function project(current: ONFNode, path: number[]): ONFNode {
    const construction = current.frames.construction
    if (current.frames.reg === 'construction' && construction?.version === 'spw.onf.construction/1') {
      const head = current.args[0]
      if (!head || current.args.length !== construction.attachments.length + 1) {
        throw new Error('Invalid ONF construction: head/attachment arity mismatch')
      }
      omissions.push({
        path,
        source: copySpan(construction.source),
        attachments: construction.attachments.map(({ kind, source }) => ({ kind, source: copySpan(source) })),
        reason: 'postfix-attachments-not-evaluated',
      })
      return project(head, [...path, 0])
    }
    const args = current.args.map((arg, index) => project(arg, [...path, index]))
    return args.every((arg, index) => arg === current.args[index]) ? current : { ...current, args }
  }
  return { node: project(node, []), receipt: { profile: 'spw.onf.value/1', omissions } }
}
