/**
 * Parse columns as bytes: one buffer a cache can write and read without the
 * parser, and a worker or a GPU buffer can take whole.
 *
 * The JSON form (columnsToJson) turns every typed array into a list of numbers
 * and back. This form keeps each column as the bytes it already is: a short
 * JSON header (schema, counts, the kind and glyph tables, the receipt), then
 * each column in COLUMN_NAMES order and the two band arrays, every one starting
 * on a four-byte boundary so it can be viewed in place. Reading a file back is
 * copying its columns out, not parsing its text.
 *
 * Layout (spw.parse-columns-bytes/1), little-endian:
 *   0  'SPWC'            magic
 *   4  u32 1             layout version
 *   8  u32 header bytes  then the header as UTF-8 JSON, padded to four bytes
 *   …  columns           each padded to four bytes
 *
 * A reader refuses a buffer whose magic, version, schema or byte order it does
 * not know, and one whose length does not match its header.
 */

import { COLUMN_NAMES, PARSE_COLUMNS_SCHEMA, type ColumnName, type ColumnsReceipt, type ParseColumns } from './parse-columns'

export const COLUMNS_BYTES_SCHEMA = 'spw.parse-columns-bytes/1' as const
const MAGIC = 0x43575053 // 'SPWC' read as a little-endian u32
const LAYOUT = 1

type Typed = Uint8Array | Uint16Array | Uint32Array | Int32Array
const MAKERS: Record<ColumnName, { new (buffer: ArrayBufferLike, offset: number, length: number): Typed; BYTES_PER_ELEMENT: number }> = {
  kind: Uint8Array,
  glyph: Uint16Array,
  parent: Int32Array,
  depth: Uint16Array,
  size: Uint32Array,
  start: Uint32Array,
  end: Uint32Array,
  word: Uint32Array,
  wordStart: Uint32Array,
  wordEnd: Uint32Array,
}

interface Header {
  schema: typeof COLUMNS_BYTES_SCHEMA
  columns: typeof PARSE_COLUMNS_SCHEMA
  littleEndian: true
  nodes: number
  maxDepth: number
  kinds: string[]
  glyphs: string[]
  bands: number
  receipt: ColumnsReceipt
}

const pad4 = (n: number): number => (n + 3) & ~3

const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1

/** The columns as one buffer. */
export function columnsToBytes(tree: ParseColumns): Uint8Array {
  if (!LITTLE_ENDIAN) throw new Error('parse columns bytes: this layout is little-endian and this machine is not')
  const header: Header = {
    schema: COLUMNS_BYTES_SCHEMA,
    columns: tree.schema,
    littleEndian: true,
    nodes: tree.nodes,
    maxDepth: tree.maxDepth,
    kinds: [...tree.kinds],
    glyphs: [...tree.glyphs],
    bands: tree.bands.offsets.length,
    receipt: { ...tree.receipt },
  }
  const head = new TextEncoder().encode(JSON.stringify(header))
  const arrays: Typed[] = [...COLUMN_NAMES.map((name) => tree[name]), tree.bands.order, tree.bands.offsets]
  let length = 12 + pad4(head.length)
  for (const a of arrays) length += pad4(a.byteLength)
  const out = new Uint8Array(length)
  const view = new DataView(out.buffer)
  view.setUint32(0, MAGIC, true)
  view.setUint32(4, LAYOUT, true)
  view.setUint32(8, head.length, true)
  out.set(head, 12)
  let at = 12 + pad4(head.length)
  for (const a of arrays) {
    out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), at)
    at += pad4(a.byteLength)
  }
  return out
}

/** Columns read back from a buffer written by columnsToBytes. Every column is copied out, so the buffer may be reused. */
export function columnsFromBytes(bytes: Uint8Array): ParseColumns {
  if (!LITTLE_ENDIAN) throw new Error('parse columns bytes: this layout is little-endian and this machine is not')
  if (bytes.byteLength < 12) throw new Error('parse columns bytes: too short')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) !== MAGIC) throw new Error('parse columns bytes: not a columns buffer')
  if (view.getUint32(4, true) !== LAYOUT) throw new Error(`parse columns bytes: unknown layout ${view.getUint32(4, true)}`)
  const headLength = view.getUint32(8, true)
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(12, 12 + headLength))) as Header
  if (header.schema !== COLUMNS_BYTES_SCHEMA || header.columns !== PARSE_COLUMNS_SCHEMA) throw new Error(`parse columns bytes: unknown schema ${header.schema} / ${header.columns}`)
  if (header.littleEndian !== true) throw new Error('parse columns bytes: not little-endian')
  // Copy into an aligned buffer once, then view each column in place.
  const aligned = bytes.byteOffset % 4 === 0 ? bytes : bytes.slice()
  let at = aligned.byteOffset + 12 + pad4(headLength)
  const take = <T extends Typed>(Maker: { new (buffer: ArrayBufferLike, offset: number, length: number): T; BYTES_PER_ELEMENT: number }, count: number): T => {
    const bytesNeeded = count * Maker.BYTES_PER_ELEMENT
    if (at - aligned.byteOffset + bytesNeeded > aligned.byteLength) throw new Error('parse columns bytes: shorter than its header says')
    const view = new Maker(aligned.buffer, at, count)
    at += pad4(bytesNeeded)
    return view.slice() as T
  }
  const columns = {} as Record<ColumnName, Typed>
  for (const name of COLUMN_NAMES) columns[name] = take(MAKERS[name], header.nodes)
  const order = take(Uint32Array, header.nodes)
  const offsets = take(Uint32Array, header.bands)
  if (at - aligned.byteOffset !== aligned.byteLength) throw new Error('parse columns bytes: longer than its header says')
  return {
    schema: PARSE_COLUMNS_SCHEMA,
    nodes: header.nodes,
    maxDepth: header.maxDepth,
    kinds: header.kinds,
    glyphs: header.glyphs,
    kind: columns.kind as Uint8Array,
    glyph: columns.glyph as Uint16Array,
    parent: columns.parent as Int32Array,
    depth: columns.depth as Uint16Array,
    size: columns.size as Uint32Array,
    start: columns.start as Uint32Array,
    end: columns.end as Uint32Array,
    word: columns.word as Uint32Array,
    wordStart: columns.wordStart as Uint32Array,
    wordEnd: columns.wordEnd as Uint32Array,
    bands: { order, offsets },
    receipt: header.receipt,
  }
}
