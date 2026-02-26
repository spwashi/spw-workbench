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

      let reg = 'op'
      switch (sigil) {
        case '!': reg = 'hydrate'; break
        case '~': reg = 'defer'; break
        case '=': reg = 'config'; break
        case '&': reg = 'merge'; break
        case '%': reg = 'measure'; break
        case '$': reg = 'substrate'; break
      }
      return { sigil: sigil as any, args, frames: { reg } }
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

    default:
      return { sigil: '_', args: [], frames: { reg: 'unknown', nodeType: node.type } }
  }
}

export type { ONFNode, FrameMap } from './types/ast/onf'
