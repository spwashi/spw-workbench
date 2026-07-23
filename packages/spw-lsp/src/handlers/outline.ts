/**
 * Document Outline — structural symbols for breadcrumbs, the Outline view,
 * and Go-to-Symbol (Cmd+Shift+O).
 *
 * Token-driven rather than line-regex driven. Every Spw frame form shares one
 * token shape:
 *
 *     OPERATOR/⟨sigil⟩  [MODIFIER]  [label]  {
 *
 * where the label is an identifier (`^meta{`), a string (`&"compass"{`), a
 * bracket frame (`^["roots"]{`), or a capsule (`~<rationale>{`). Recognizing
 * the shape instead of enumerating regexes means new operators join the
 * outline for free, and braces inside strings never miscount.
 *
 * Containment comes from brace depth, not indentation. That distinction is
 * the correctness fix: a mark that opens no body — a header particle like
 * `#:layer` — is a single-line leaf and can never swallow the rest of the
 * file, so the breadcrumb reports the frame the cursor is actually inside.
 */

import { parse } from '@spwashi/spw-seed'
import type { Token } from '@spwashi/spw-seed'
import { SK, type LspDocumentSymbol, type LspRange } from '../types'

/** Sigil → how the symbol reads in the outline. */
const SIGIL_SYMBOL: Record<string, { kind: number; detail: string }> = {
  '^': { kind: SK.Module, detail: 'frame' },
  '&': { kind: SK.Struct, detail: 'confluence' },
  '~': { kind: SK.Variable, detail: 'potential' },
  '!': { kind: SK.Event, detail: 'action' },
  '?': { kind: SK.Boolean, detail: 'probe' },
  '=': { kind: SK.Property, detail: 'bias' },
  '@': { kind: SK.Interface, detail: 'observer' },
  '#': { kind: SK.Enum, detail: 'set' },
  '$': { kind: SK.Key, detail: 'substrate' },
  '%': { kind: SK.Key, detail: 'measure' },
  '*': { kind: SK.Key, detail: 'variant' },
}

/**
 * Only deixis earns an outline row.
 *
 * An anchor is a destination — `~"file#anchor"` resolves to it, so it belongs
 * in a list of places you can go. Case and mood classify the surface rather
 * than address it, and canon opens with four to six of them, which would put
 * a wall of metadata above the first real structure in every file.
 */
const ANCHOR_SYMBOL = { kind: SK.Key, detail: 'anchor' } as const

function isSignificant(token: Token): boolean {
  return token.type !== 'WHITESPACE' && token.type !== 'EOF'
}

/** Outline rows are one line tall; a prose-length label is truncated to fit. */
const MAX_LABEL = 44

function unquote(value: string): string {
  const bare = value.replace(/^["'`]|["'`]$/g, '')
  return bare.length > MAX_LABEL ? `${bare.slice(0, MAX_LABEL - 1).trimEnd()}…` : bare
}

/**
 * Read the label that names a frame: `^meta`, `&"compass"`, `^["roots"]`,
 * `~<rationale>`. Returns null when the operator carries no name.
 */
function readLabel(line: Token[], from: number): string | null {
  for (let i = from; i < line.length; i += 1) {
    const token = line[i]!
    if (token.type === 'MODIFIER') continue
    if (token.type === 'IDENTIFIER') return token.value
    if (token.type === 'STRING') return unquote(token.value)
    if (token.type === 'CONTAINER_OPEN' && (token.kind === '[' || token.kind === '(')) continue
    if (token.type === 'CAPSULE_OPEN') continue
    // A body brace or anything else ends the naming region.
    return null
  }
  return null
}

/** The symbol a line declares, if any — before we know whether it opens a body. */
function declaredSymbol(line: Token[]): { name: string; kind: number; detail: string } | null {
  const head = line[0]
  if (!head) return null

  if (head.type === 'PARTICLE') {
    if (head.kind !== '>') return null
    return { name: head.value, ...ANCHOR_SYMBOL }
  }

  if (head.type !== 'OPERATOR') return null
  const sigil = head.kind ?? head.value
  const shape = SIGIL_SYMBOL[sigil]
  if (!shape) return null

  // `# words` is a prose comment; `#word` is a set. The space is the whole
  // difference, so require the name to sit flush against a bare `#`.
  const next = line[1]
  if (sigil === '#' && next && next.span.start.offset !== head.span.end.offset) return null

  const modifier = next?.type === 'MODIFIER' ? next.value : ''
  const label = readLabel(line, 1)
  // An unnamed operator is structural noise in an outline, not a landmark.
  if (!label) return null

  return { name: `${sigil}${modifier}${modifier ? ' ' : ''}${label}`, ...shape }
}

/**
 * Build the outline for one surface.
 *
 * Exported for reuse: the CLI and tests read the same structure the editor
 * shows, so "what the outline says" has exactly one implementation.
 */
export function outlineFromSource(text: string): LspDocumentSymbol[] {
  const lines = text.split('\n')
  const { tokens } = parse(text)

  const roots: LspDocumentSymbol[] = []
  const stack: Array<{ symbol: LspDocumentSymbol; bodyDepth: number }> = []

  /** Tokens of the current line, significant only. */
  let lineTokens: Token[] = []
  let currentLine = -1
  /** Symbol declared on this line, awaiting a `{` to become a container. */
  let pending: { name: string; kind: number; detail: string; at: Token } | null = null
  let depth = 0

  const lineRange = (index: number): LspRange => ({
    start: { line: index, character: 0 },
    end: { line: index, character: lines[index]?.length ?? 0 },
  })

  const attach = (symbol: LspDocumentSymbol): void => {
    const parent = stack[stack.length - 1]?.symbol
    if (parent) {
      parent.children ??= []
      parent.children.push(symbol)
    } else {
      roots.push(symbol)
    }
  }

  /** A declared mark that never opened a body: a single-line landmark. */
  const flushLeaf = (): void => {
    if (!pending) return
    const index = pending.at.span.start.line - 1
    attach({
      name: pending.name,
      detail: pending.detail,
      kind: pending.kind,
      range: lineRange(index),
      selectionRange: lineRange(index),
    })
    pending = null
  }

  const significant = tokens.filter(isSignificant)

  for (const token of significant) {
    const line = token.span.start.line

    if (line !== currentLine) {
      // A new line starts: anything declared on the previous one and still
      // waiting for a `{` was a leaf, not a container.
      flushLeaf()
      currentLine = line
      lineTokens = significant.filter((t) => t.span.start.line === line)
      const declared = declaredSymbol(lineTokens)
      pending = declared ? { ...declared, at: token } : null
    }

    if (token.type === 'CONTAINER_OPEN' && token.kind === '{') {
      depth += 1
      if (pending) {
        const index = pending.at.span.start.line - 1
        const symbol: LspDocumentSymbol = {
          name: pending.name,
          detail: pending.detail,
          kind: pending.kind,
          range: lineRange(index),
          selectionRange: lineRange(index),
        }
        attach(symbol)
        stack.push({ symbol, bodyDepth: depth })
        pending = null
      }
      continue
    }

    if (token.type === 'CONTAINER_CLOSE' && token.kind === '}') {
      const top = stack[stack.length - 1]
      if (top && top.bodyDepth === depth) {
        // The frame ends here — extend its range over everything it held.
        top.symbol.range.end = { line: line - 1, character: lines[line - 1]?.length ?? 0 }
        stack.pop()
      }
      depth = Math.max(0, depth - 1)
      continue
    }
  }

  flushLeaf()

  // An unterminated frame still owns the rest of the file.
  const lastLine = Math.max(0, lines.length - 1)
  for (const open of stack) {
    open.symbol.range.end = { line: lastLine, character: lines[lastLine]?.length ?? 0 }
  }

  return roots
}
