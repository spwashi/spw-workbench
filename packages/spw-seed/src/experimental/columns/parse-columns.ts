/**
 * Parse columns — the parse tree laid out as columns of plain data, one row per node.
 *
 * Not a new product: the same tree the parser returns, in a layout a second
 * renderer (a canvas, a worker, a shader) can read without the parser. Every
 * column is a typed array, so the columns move to a worker or into a GPU buffer
 * whole, and the kind and glyph tables ride with them, so a reader can name
 * what it holds. Which columns to carry is on trial (interpretation-trials,
 * wonder_trial_columns, asking what a second renderer needs from a frame of
 * plain data); the schema is versioned so a reader can refuse one it does not
 * know. Products that count the tree (the fingerprint's kinds, geometry
 * bytecode's operators) are histograms of these columns.
 *
 * Rows are in preorder by source position. size[i] counts row i and every row
 * under it, so a subtree is the contiguous range [i, i + size[i]) and the
 * children of i are found by stepping c = i + 1, then c += size[c]. The band
 * schedule lists rows deepest first, one band per depth: a bottom-up pass runs
 * one band at a time, and every row in a band reads only rows already done, so
 * a band is one parallel dispatch (reduceUp).
 *
 * A row's word is what it names (an identifier, a literal, a label, a particle's
 * name, a prose chunk) and its glyph is the structure it writes (an operator
 * sigil, a connector, a separator, a particle's aim), as nest-path names a
 * container's punctuation its glyph; mark stays the name of a # mark. The word
 * column holds the first 32 bits of the word's SHA-256 (content-hash.ts, the
 * one hash home), the same unit slot-hash maps to a position and a hue. Offsets
 * index the source as JavaScript strings do, in UTF-16 code units.
 *
 * The columns see what the tree keeps: an expression's connectors, the
 * separators between a sequence's steps or a [ ] frame's items, and a trailing
 * separator, so #[a ; b], #[a, b], #[a b] and #[a, b,] are told apart.
 *
 * @see packages/spw-seed/src/canonical/fingerprint.ts — the node count the rows must equal
 * @see packages/spw-seed/src/canonical/slot-hash.ts — the per-line unit the word column shares
 * @see packages/spw-seed/src/experimental/columns/likeness.ts — identities of a subtree at each rung
 */

import { getNodeChildren } from '../../instrumentation/audit'
import { parse } from '../../parser'
import type { ASTNode } from '../../types'
import { textHash } from '../../canonical/content-hash'

export const PARSE_COLUMNS_SCHEMA = 'spw.parse-columns/1' as const

/** Fixed kind codes; 0 is a node kind this table does not know. */
export const COLUMN_KINDS = Object.freeze([
  '',
  'Seed', 'Expression', 'Binding', 'Bullet', 'PathRef', 'Operation', 'Capsule',
  'Stream', 'NRange', 'Scope', 'Frame', 'Body', 'Sequence', 'ModifierChain',
  'Reference', 'Literal', 'Identifier', 'Annotation', 'Particle', 'Condition',
  'Parameter', 'Comment', 'Prose', 'ProseChunk', 'Match', 'MatchArm', 'Wildcard',
  'Spread',
] as const)

const KIND_CODE = new Map<string, number>(COLUMN_KINDS.map((kind, code) => [kind, code]))

/** Rows deepest first; band k is order[offsets[k] .. offsets[k + 1]), all at depth maxDepth - k. */
export interface ColumnBands {
  order: Uint32Array
  offsets: Uint32Array
}

export interface ColumnsReceipt {
  success: boolean
  complete: boolean
  proseFallback: boolean
  /** Rows whose kind is not in COLUMN_KINDS. */
  unknownKinds: number
  /** Nodes reached from more than one parent, given a row once per parent as the walk reaches them. */
  repeatedNodes: number
}

export interface ParseColumns {
  schema: typeof PARSE_COLUMNS_SCHEMA
  /** How many nodes, so how many rows; a row is a table row here, not a line on screen. */
  nodes: number
  maxDepth: number
  kinds: readonly string[]
  /** Written structure, interned per surface; 0 is none. */
  glyphs: string[]
  kind: Uint8Array
  glyph: Uint16Array
  parent: Int32Array
  depth: Uint16Array
  size: Uint32Array
  start: Uint32Array
  end: Uint32Array
  /** First 32 bits of the SHA-256 of the row's own word; 0 is no word. */
  word: Uint32Array
  /** Where the row's own word is written; equal to each other when it has none. */
  wordStart: Uint32Array
  wordEnd: Uint32Array
  bands: ColumnBands
  receipt: ColumnsReceipt
}

interface TokenLike {
  value: string
  type?: string
  span: { start: { offset: number }; end: { offset: number } }
}

interface Written {
  glyph: string
  words: TokenLike[]
  /** Text named directly when it is not a token (a prose chunk, an apposition). */
  text?: string
  /** The words that place the word span, when not all of them: a close label sits past the body. */
  placedBy?: TokenLike[]
}

function isToken(value: unknown): value is TokenLike {
  return !!value && typeof value === 'object'
    && typeof (value as TokenLike).value === 'string'
    && !!(value as TokenLike).span
}

function tokens(...values: unknown[]): TokenLike[] {
  return values.filter(isToken)
}

/**
 * A mark's name token spans its two-character sigil (#>name, ~#name) and, on
 * an annotation, the apposition after the name (~#lens(reading)). The word
 * span starts after the sigil and runs to the token's end, so a hole over an
 * annotation's name takes its apposition with it, as its word does.
 */
function markName(value: unknown): TokenLike[] {
  if (!isToken(value) || !value.value) return []
  const from = value.span.start.offset
  const extra = value.span.end.offset - from - value.value.length
  const start = from + Math.max(0, Math.min(2, extra))
  return [{ value: value.value, span: { start: { offset: start }, end: { offset: value.span.end.offset } } }]
}

/** Labels a container writes: all of them name it, and the opening ones place it. */
function labelled(opening: unknown[], close: unknown): Pick<Written, 'words' | 'placedBy'> {
  const open = tokens(...opening)
  const words = [...open, ...tokens(close)]
  return { words, placedBy: open.length ? open : words }
}

/** The separators between a sequence's steps or a [ ] frame's items (· where juxtaposed), and a trailing one. */
function gaps(n: Record<string, any>): string {
  const between = (n.separators ?? []).map((s: TokenLike | undefined) => s?.value ?? '·').join(' ')
  return n.trailing ? `${between} trailing ${n.trailing.value}`.trim() : between
}

/** What a node writes itself, apart from its child nodes. */
function writtenBy(node: ASTNode): Written {
  const n = node as unknown as Record<string, any>
  switch (node.type) {
    case 'Expression':
      return { glyph: (n.connectors ?? []).map((c: TokenLike) => c.value).join(' '), words: [] }
    case 'Sequence':
      return { glyph: gaps(n), words: [] }
    case 'Operation':
      return {
        glyph: n.position === 'postfix' ? `${n.operator?.value ?? ''} post` : (n.operator?.value ?? ''),
        words: tokens(n.operatorLabel),
      }
    case 'PathRef':
      return { glyph: n.operator?.value ?? '', words: tokens(n.tag) }
    case 'Bullet':
      return { glyph: n.marker?.value ?? '', words: [] }
    case 'Particle':
      return { glyph: `#${n.aim ?? ''}`, words: markName(n.name) }
    case 'Annotation':
      return {
        glyph: n.apposition ? '~#()' : '~#',
        words: markName(n.name),
        text: n.apposition?.body,
      }
    case 'Capsule':
      return { glyph: n.placement ?? 'shell', words: n.channel ? [] : tokens(n.tag) }
    case 'Stream':
      return { glyph: `${n.open?.value ?? ''}${n.close?.value ?? ''}`, words: [] }
    case 'Condition':
      return { glyph: n.operator?.value ?? '', words: [] }
    case 'ModifierChain':
      return { glyph: '', words: tokens(...(n.modifiers ?? [])) }
    case 'Scope':
      return { glyph: '', ...labelled([n.name, n.openLabel], n.closeLabel) }
    case 'Frame':
      return { glyph: gaps(n), ...labelled([n.openLabel], n.closeLabel) }
    case 'Body':
      return { glyph: '', ...labelled([n.openLabel], n.closeLabel) }
    case 'Reference':
      return { glyph: '', words: tokens(...(n.path ?? [])) }
    case 'Literal':
      return { glyph: n.token?.type ?? '', words: tokens(n.token) }
    case 'Identifier':
      return { glyph: '', words: tokens(n.token) }
    case 'Parameter':
      return { glyph: '', words: tokens(n.name) }
    case 'ProseChunk':
      return { glyph: '', words: [], text: n.text }
    default:
      return { glyph: '', words: [], text: typeof n.text === 'string' ? n.text : undefined }
  }
}

const UNIT_HEX = 8

/** The first 32 bits of a text's SHA-256, as an unsigned integer; 0 for no text. */
export function wordUnit(text: string): number {
  if (!text) return 0
  return parseInt(textHash(text, UNIT_HEX), 16) >>> 0
}

function childrenInSourceOrder(node: ASTNode): ASTNode[] {
  const children = getNodeChildren(node)
  return children
    .map((child, index) => ({ child, index }))
    .sort((a, b) => (a.child.span.start.offset - b.child.span.start.offset) || (a.index - b.index))
    .map(entry => entry.child)
}

/** Lay a parsed tree out in columns. */
export function columnsOfAst(ast: ASTNode, receipt: Omit<ColumnsReceipt, 'unknownKinds' | 'repeatedNodes'>): ParseColumns {
  const rows: { node: ASTNode; parent: number; depth: number }[] = []
  const seen = new Set<ASTNode>()
  let repeatedNodes = 0
  const visit = (node: ASTNode, parent: number, depth: number): number => {
    if (seen.has(node)) repeatedNodes++
    seen.add(node)
    const row = rows.length
    rows.push({ node, parent, depth })
    for (const child of childrenInSourceOrder(node)) visit(child, row, depth + 1)
    return row
  }
  visit(ast, -1, 0)

  const count = rows.length
  const kind = new Uint8Array(count)
  const glyph = new Uint16Array(count)
  const parent = new Int32Array(count)
  const depth = new Uint16Array(count)
  const size = new Uint32Array(count)
  const start = new Uint32Array(count)
  const end = new Uint32Array(count)
  const word = new Uint32Array(count)
  const wordStart = new Uint32Array(count)
  const wordEnd = new Uint32Array(count)
  const glyphs: string[] = ['']
  const glyphCode = new Map<string, number>([['', 0]])
  let unknownKinds = 0
  let maxDepth = 0

  for (let i = 0; i < count; i++) {
    const { node, parent: up, depth: d } = rows[i]!
    const code = KIND_CODE.get(node.type) ?? 0
    if (code === 0) unknownKinds++
    kind[i] = code
    parent[i] = up
    depth[i] = d
    if (d > maxDepth) maxDepth = d
    start[i] = node.span.start.offset
    end[i] = node.span.end.offset

    const written = writtenBy(node)
    let glyphIndex = glyphCode.get(written.glyph)
    if (glyphIndex === undefined) {
      glyphIndex = glyphs.length
      glyphs.push(written.glyph)
      glyphCode.set(written.glyph, glyphIndex)
    }
    glyph[i] = glyphIndex

    const text = [...written.words.map(token => token.value), written.text ?? '']
      .filter(Boolean)
      .join(' ')
    word[i] = wordUnit(text)
    const placed = written.placedBy ?? written.words
    if (placed.length) {
      wordStart[i] = Math.min(...placed.map(token => token.span.start.offset))
      wordEnd[i] = Math.max(...placed.map(token => token.span.end.offset))
    } else if (text) {
      wordStart[i] = start[i]!
      wordEnd[i] = end[i]!
    } else {
      wordStart[i] = wordEnd[i] = start[i]!
    }
  }

  // Sizes from the leaves up: preorder puts every descendant after its row.
  size.fill(1)
  for (let i = count - 1; i > 0; i--) size[parent[i]!]! += size[i]!

  return {
    schema: PARSE_COLUMNS_SCHEMA,
    nodes: count,
    maxDepth,
    kinds: COLUMN_KINDS,
    glyphs,
    kind,
    glyph,
    parent,
    depth,
    size,
    start,
    end,
    word,
    wordStart,
    wordEnd,
    bands: bandsOf(depth, maxDepth),
    receipt: { ...receipt, unknownKinds, repeatedNodes },
  }
}

function bandsOf(depth: Uint16Array, maxDepth: number): ColumnBands {
  const perDepth = new Uint32Array(maxDepth + 1)
  for (const d of depth) perDepth[d]!++
  const offsets = new Uint32Array(maxDepth + 2)
  for (let k = 0; k <= maxDepth; k++) offsets[k + 1] = offsets[k]! + perDepth[maxDepth - k]!
  const cursor = offsets.slice(0, maxDepth + 1)
  const order = new Uint32Array(depth.length)
  for (let row = 0; row < depth.length; row++) order[cursor[maxDepth - depth[row]!]!++] = row
  return { order, offsets }
}

/** Parse a surface into columns, or null when the parser returns no tree. A path lets the parser pick the surface's profile, as the CLI's reads do. */
export function parseColumns(source: string, options: { path?: string } = {}): ParseColumns | null {
  const output = options.path ? parse(source, { path: options.path }) : parse(source)
  const ast = output.ast as ASTNode | undefined
  if (!ast) return null
  return columnsOfAst(ast, {
    success: output.success,
    complete: output.completeness.complete,
    proseFallback: output.completeness.proseFallback,
  })
}

/** The rows directly under a row, in source order. */
export function childRows(tree: ParseColumns, row: number): number[] {
  const out: number[] = []
  const stop = row + tree.size[row]!
  for (let c = row + 1; c < stop; c += tree.size[c]!) out.push(c)
  return out
}

/**
 * A bottom-up pass in band order: `visit` sees a row and its children's values,
 * already computed. Rows within a band never read each other, so `bandOrder`
 * may visit a band's rows in any order and the result is the same; a test holds
 * the reducer to that.
 */
export function reduceUp(
  tree: ParseColumns,
  visit: (row: number, children: number[]) => number,
  bandOrder: (band: Uint32Array) => Iterable<number> = band => band,
): Uint32Array {
  const out = new Uint32Array(tree.nodes)
  const { order, offsets } = tree.bands
  for (let k = 0; k + 1 < offsets.length; k++) {
    const band = order.subarray(offsets[k]!, offsets[k + 1]!)
    for (const row of bandOrder(band)) {
      out[row] = visit(row, childRows(tree, row).map(c => out[c]!)) >>> 0
    }
  }
  return out
}

/** The columns as plain JSON arrays, for a reader in another host. */
export interface ParseColumnsJson {
  schema: typeof PARSE_COLUMNS_SCHEMA
  nodes: number
  maxDepth: number
  kinds: string[]
  glyphs: string[]
  columns: Record<ColumnName, number[]>
  bands: { order: number[]; offsets: number[] }
  receipt: ColumnsReceipt
}

export const COLUMN_NAMES = ['kind', 'glyph', 'parent', 'depth', 'size', 'start', 'end', 'word', 'wordStart', 'wordEnd'] as const
export type ColumnName = typeof COLUMN_NAMES[number]

export function columnsToJson(tree: ParseColumns): ParseColumnsJson {
  const columns = {} as Record<ColumnName, number[]>
  for (const name of COLUMN_NAMES) columns[name] = Array.from(tree[name])
  return {
    schema: tree.schema,
    nodes: tree.nodes,
    maxDepth: tree.maxDepth,
    kinds: [...tree.kinds],
    glyphs: [...tree.glyphs],
    columns,
    bands: { order: Array.from(tree.bands.order), offsets: Array.from(tree.bands.offsets) },
    receipt: { ...tree.receipt },
  }
}

export function columnsFromJson(json: ParseColumnsJson): ParseColumns {
  if (json.schema !== PARSE_COLUMNS_SCHEMA) throw new Error(`parse columns: unknown schema ${String(json.schema)}`)
  const c = json.columns
  return {
    schema: PARSE_COLUMNS_SCHEMA,
    nodes: json.nodes,
    maxDepth: json.maxDepth,
    kinds: json.kinds,
    glyphs: json.glyphs,
    kind: Uint8Array.from(c.kind),
    glyph: Uint16Array.from(c.glyph),
    parent: Int32Array.from(c.parent),
    depth: Uint16Array.from(c.depth),
    size: Uint32Array.from(c.size),
    start: Uint32Array.from(c.start),
    end: Uint32Array.from(c.end),
    word: Uint32Array.from(c.word),
    wordStart: Uint32Array.from(c.wordStart),
    wordEnd: Uint32Array.from(c.wordEnd),
    bands: { order: Uint32Array.from(json.bands.order), offsets: Uint32Array.from(json.bands.offsets) },
    receipt: { ...json.receipt },
  }
}
