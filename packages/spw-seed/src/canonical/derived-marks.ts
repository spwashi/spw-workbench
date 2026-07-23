/**
 * Derived marks — a mark whose value is computed from the surface, not stored.
 *
 * A cache block is a summary of the rest of a document: `~#open_count` counts
 * the open questions, `~#last_stream` names the newest entry. It goes stale
 * because nothing recomputes the summary — the value was written once by hand
 * and the document moved on without it. Every plan in this repository has a
 * cache block that lies for exactly this reason.
 *
 * A derived mark closes that gap. It is an ordinary annotation whose value is
 * produced by a *deriver* — a function handed the whole tree — and refreshed
 * as a semantic edit, so `~#` finally means what its stance claims: deferred
 * state, computed on demand rather than asserted and forgotten.
 *
 * The deriver signature is deliberately open. A structural deriver reads the
 * tree (the derivers here). A runtime-sourced deriver would evaluate the
 * surface and read register state — and because seed stays portable, that one
 * is supplied from outside through this same seam rather than imported here.
 * The selector locates; the deriver decides where the value comes from.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

import type { ASTNode } from '../types/ast'
import { parse } from '../parser'
import type { SemanticRule, SemanticRewrite } from './semantic-edit'

/** What a deriver is handed to compute a mark's new value. */
export interface DeriveContext {
  /** The matched annotation node. */
  node: ASTNode
  /** The whole parsed surface. */
  root: ASTNode
  /** The surface source, for derivers that read spans directly. */
  source: string
}

/** Computes a mark's value, or null to leave it untouched. */
export type MarkDeriver = (ctx: DeriveContext) => string | null

interface Span {
  start: { offset: number }
  end: { offset: number }
}

function spanOf(node: ASTNode | undefined): Span | null {
  const span = (node as { span?: Span } | undefined)?.span
  return span?.start && span.end ? span : null
}

/**
 * Re-wrap a derived value in the quote style the current value already uses,
 * so refreshing `~#count: "2"` yields `"3"` and a bare value stays bare.
 */
function rewrap(currentSlice: string, value: string): string {
  const quote = currentSlice[0]
  if ((quote === '"' || quote === "'" || quote === '`') && currentSlice.endsWith(quote)) {
    return `${quote}${value}${quote}`
  }
  return value
}

/**
 * A rule that refreshes the value of every `~#name` mark from a deriver.
 *
 * Matches the annotation by name across any stance, and replaces only the
 * value literal — the mark and its stance are never touched. A deriver that
 * returns null, or a value equal to what is already there, produces no edit.
 */
export function deriveMark(name: string, derive: MarkDeriver): SemanticRule {
  return {
    id: `derive_mark:${name}`,
    description: `Refresh ${name} from the surface`,
    select: { nodeType: 'Annotation', value: name },
    stratum: 'source',
    // Recomputing a summary of the document is a workspace edit like any other.
    effectGrade: 'effect.l2.workspace',
    rewrite(node, source, root): SemanticRewrite | null {
      const value = (node as { value?: ASTNode }).value
      const span = spanOf(value)
      // Only literal-valued marks are derivable; a reference or path is not a
      // summary to recompute.
      if (!span || value?.type !== 'Literal') return null

      const derived = derive({ node, root, source })
      if (derived === null) return null

      // A literal's span can include the leading whitespace after the colon;
      // replace only the value itself, so `~#count: "2"` keeps its spacing.
      const raw = source.slice(span.start.offset, span.end.offset)
      const lead = raw.length - raw.trimStart().length
      return {
        range: { start: span.start.offset + lead, end: span.end.offset },
        newText: rewrap(raw.slice(lead), derived),
        reason: `${name} derived from the surface`,
      }
    },
  }
}

// ── Structural derivers ─────────────────────────────────────────

/** Walk to the Body of `^["label"]{}`, or null if the surface has no such frame. */
function findFrameBody(root: ASTNode, label: string): ASTNode | null {
  const stack: unknown[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (Array.isArray(node)) { stack.push(...node); continue }
    if (!node || typeof node !== 'object') continue
    const typed = node as ASTNode & Record<string, unknown>

    if (typed.type === 'Operation' && (typed.operator as { value?: string })?.value === '^') {
      if (frameLabelOf(typed) === label) {
        return (typed.body as ASTNode) ?? null
      }
    }
    for (const key of Object.keys(typed)) {
      if (key === 'span' || key === 'token') continue
      stack.push(typed[key])
    }
  }
  return null
}

/** The label of a `^["…"]` frame: the first literal inside its Frame. */
function frameLabelOf(operation: Record<string, unknown>): string | null {
  const frame = operation.frame as ASTNode | undefined
  if (!frame) return null
  const stack: unknown[] = [frame]
  while (stack.length > 0) {
    const node = stack.pop()
    if (Array.isArray(node)) { stack.push(...node); continue }
    if (!node || typeof node !== 'object') continue
    const typed = node as ASTNode & Record<string, unknown>
    if (typed.type === 'Literal') {
      const raw = (typed.token as { value?: string })?.value ?? ''
      return raw.replace(/^["'`]|["'`]$/g, '')
    }
    for (const key of Object.keys(typed)) {
      if (key === 'span' || key === 'token') continue
      stack.push(typed[key])
    }
  }
  return null
}

/**
 * Count the operations of one operator kind directly inside a named frame.
 *
 * `countOps("open", "?")` is the number of open questions — the honest value of
 * `~#open_count`, recomputed from the questions themselves.
 */
export function countOps(frameLabel: string, operator: string): MarkDeriver {
  return ({ root }) => {
    const body = findFrameBody(root, frameLabel)
    if (!body) return null
    let count = 0
    const stack: unknown[] = [body]
    while (stack.length > 0) {
      const node = stack.pop()
      if (Array.isArray(node)) { stack.push(...node); continue }
      if (!node || typeof node !== 'object') continue
      const typed = node as ASTNode & Record<string, unknown>
      if (typed.type === 'Operation' && (typed.operator as { value?: string })?.value === operator) {
        count += 1
      }
      for (const key of Object.keys(typed)) {
        if (key === 'span' || key === 'token') continue
        stack.push(typed[key])
      }
    }
    return String(count)
  }
}

const TIMESTAMP = /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/g

/**
 * The source region a named frame's braces enclose, found from the token
 * stream rather than the tree.
 *
 * A frame full of prose — a stream of `>>[…]` entries — folds into prose chunks
 * in the AST, so its body is not structurally addressable. The lexer sees the
 * frame perfectly regardless, so the braces are matched over tokens: this is
 * the same lesson as brace physics, that the lexer already answered a question
 * a character re-scan would get wrong.
 */
function findFrameRegionByTokens(source: string, label: string): { start: number; end: number } | null {
  const sig = parse(source).tokens.filter((t) => t.type !== 'WHITESPACE' && t.type !== 'EOF')

  for (let i = 0; i < sig.length; i += 1) {
    if (sig[i]!.type !== 'OPERATOR' || sig[i]!.kind !== '^') continue

    // Accept `^["label"]{` and `^label{` and `^"label"{`.
    let j = i + 1
    if (sig[j]?.type === 'CONTAINER_OPEN' && sig[j]?.kind === '[') j += 1
    const nameTok = sig[j]
    const name = nameTok && (nameTok.type === 'STRING' || nameTok.type === 'IDENTIFIER')
      ? nameTok.value.replace(/^["'`]|["'`]$/g, '')
      : null
    if (name !== label) continue

    // Advance to the body brace.
    while (j < sig.length && !(sig[j]!.type === 'CONTAINER_OPEN' && sig[j]!.kind === '{')) j += 1
    const open = sig[j]
    if (!open) continue

    // Match the brace over tokens.
    let depth = 0
    for (let k = j; k < sig.length; k += 1) {
      const tok = sig[k]!
      if (tok.type === 'CONTAINER_OPEN' && tok.kind === '{') depth += 1
      else if (tok.type === 'CONTAINER_CLOSE' && tok.kind === '}') {
        depth -= 1
        if (depth === 0) {
          return { start: open.span.end.offset, end: tok.span.start.offset }
        }
      }
    }
  }
  return null
}

/**
 * The newest `YYYY-MM-DD HH:MM` timestamp inside a named frame.
 *
 * The honest value of `~#last_stream`, which had drifted hours behind the
 * entries it was meant to name. Scoped to the frame so the mark's own stale
 * value — a timestamp elsewhere in the cache block — cannot be what refreshes
 * it.
 */
export function latestTimestamp(frameLabel: string): MarkDeriver {
  return ({ source }) => {
    const region = findFrameRegionByTokens(source, frameLabel)
    if (!region) return null
    const text = source.slice(region.start, region.end)
    const stamps = text.match(TIMESTAMP)
    if (!stamps || stamps.length === 0) return null
    // ISO-ish timestamps sort lexically, so the max is the newest.
    return stamps.map((s) => s.replace('T', ' ')).sort().at(-1) ?? null
  }
}
