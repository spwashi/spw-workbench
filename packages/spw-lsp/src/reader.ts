/**
 * The reader: what the editor reads from one file, as pure functions a web
 * page can call — the role stream, the outline, the anchors, and highlighted
 * HTML. Text in, products out; no index, no workspace, no git.
 *
 * The parser release bundles this file as reader.min.js, with
 * `@spwashi/spw-seed` pointed at packages/spw-seed/src/reader.ts, so anything
 * imported here must come from that browser-safe slice. The language server
 * calls the same functions, so a page and the editor read a file alike.
 *
 * @see packages/spw-seed/src/reader.ts — the slice of seed this may use
 * @see scripts/release/build-parser-release.ts — the reader variant
 */

import { deixisTable, parse } from '@spwashi/spw-seed'
import { SEMANTIC_TOKENS_LEGEND, roleTokens } from './handlers/semantic-tokens'
import { outlineFromSource } from './handlers/outline'
import type { LspDocumentSymbol } from './types'

export { parse, parseExpression } from '@spwashi/spw-seed'

/** One token of the role stream, with its role and modifiers by name. */
export interface RoleSpan {
  /** 0-based line. */
  line: number
  /** 0-based character within the line. */
  char: number
  length: number
  /** A semantic token type from the legend: operator, string, commitRef, … */
  role: string
  modifiers: string[]
}

export interface ReadOptions {
  /** The file's workspace-relative path; plan streams read landed commit refs from it. */
  path?: string
}

/** The role stream the editor paints, token by token. */
export function roles(text: string, options: ReadOptions = {}): RoleSpan[] {
  const { tokenTypes, tokenModifiers } = SEMANTIC_TOKENS_LEGEND
  return roleTokens(text, options.path).map((token) => ({
    line: token.line,
    char: token.char,
    length: token.length,
    role: tokenTypes[token.type] ?? 'unknown',
    modifiers: tokenModifiers.filter((_, bit) => (token.modifiers & (1 << bit)) !== 0),
  }))
}

/** The outline the editor shows: frames, anchors, and wonders as nested symbols. */
export function outline(text: string): LspDocumentSymbol[] {
  return outlineFromSource(text)
}

/** A `#>name` anchor and where it sits, 0-based like the role stream. */
export interface AnchorSpan {
  name: string
  line: number
  char: number
}

/** Every anchor a file declares, in the order the parser binds them. */
export function anchors(text: string): AnchorSpan[] {
  const ast = parse(text).ast
  if (!ast) return []
  return [...deixisTable(ast)].map(([name, binding]) => ({
    name,
    // Seed spans are 1-based; the reader is 0-based throughout.
    line: Math.max(0, binding.particle.span.start.line - 1),
    char: Math.max(0, binding.particle.span.start.column - 1),
  }))
}

const HTML_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (ch) => HTML_ESCAPES[ch]!)
}

/**
 * The file as HTML, each role a span: `<span class="spw-operator spw-declaration">{</span>`.
 * Text outside every role stays plain, escaped. A page styles the classes; the
 * editor's colours are not baked in, so a site keeps its own theme.
 */
export function highlightHtml(text: string, options: ReadOptions & { classPrefix?: string } = {}): string {
  const prefix = options.classPrefix ?? 'spw-'
  const byLine = new Map<number, RoleSpan[]>()
  for (const span of roles(text, options)) {
    const line = byLine.get(span.line)
    if (line) line.push(span)
    else byLine.set(span.line, [span])
  }
  return text.split('\n').map((lineText, index) => {
    let out = ''
    let col = 0
    for (const span of byLine.get(index) ?? []) {
      if (span.char < col) continue
      out += escapeHtml(lineText.slice(col, span.char))
      const classes = [span.role, ...span.modifiers].map((name) => `${prefix}${name}`).join(' ')
      out += `<span class="${classes}">${escapeHtml(lineText.slice(span.char, span.char + span.length))}</span>`
      col = span.char + span.length
    }
    return out + escapeHtml(lineText.slice(col))
  }).join('\n')
}
