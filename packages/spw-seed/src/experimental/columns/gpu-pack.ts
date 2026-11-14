/**
 * Spw for the GPU: a settings line packed as a uniform buffer, and parse columns
 * packed as rows a shader can read.
 *
 * A settings line (settings-line.ts) already gives typed, range-checked values:
 *
 *   ^shader{ %zoom[1.5] %hue[0.2] =palette[dusk] }
 *
 * uniformLayout lays a vocabulary out as a WGSL struct of scalars, a number as
 * f32 and a choice as the u32 index of the chosen word, each four bytes and
 * four-aligned, the struct's size rounded to sixteen as a uniform buffer needs;
 * packUniforms writes a line's values into that layout, a word the line leaves
 * out taking its default. wgslStruct writes the struct's WGSL declaration, so
 * the shader and the buffer are made from one table.
 *
 * columnsToGpu widens the columns a shader needs into one u32 array of fixed
 * rows (kind, glyph, parent, depth, size, start, end, word: eight u32, thirty-two
 * bytes), the form a WGSL storage buffer of array<Row> reads; kind and glyph are
 * stored narrower on the CPU (u8, u16) and WGSL storage has no such types.
 * Bands stay their own array: a band is one dispatch, deepest first.
 *
 * A value inside a settings line's brackets is read from its text, not from
 * the lexer's tokens, so %offset[-0.5] keeps its sign here even though the
 * lexer drops a minus before a number elsewhere (the open minus-sign question
 * in syntax-hardware-alignment).
 *
 * Experimental (spw.gpu-pack/1).
 */

import type { ParseColumns } from './parse-columns'
import type { SettingsLine, SettingsVocabulary } from '../settings-line'

export const GPU_PACK_SCHEMA = 'spw.gpu-pack/1' as const

export interface UniformField {
  word: string
  type: 'f32' | 'u32'
  /** Byte offset in the struct. */
  offset: number
  /** The value used when a line leaves the word out. */
  fallback: number
}

export interface UniformLayout {
  fields: UniformField[]
  /** Bytes, rounded up to a multiple of sixteen. */
  size: number
}

/** WGSL identifiers: a word made safe to name a struct member. */
const memberName = (word: string): string => {
  const safe = word.replace(/[^A-Za-z0-9_]/g, '_')
  return /^[A-Za-z_]/.test(safe) ? safe : `w_${safe}`
}

/**
 * Lay a vocabulary out as uniform scalars, in the vocabulary's order. Text words
 * are left out, since a shader has nowhere to put them. defaults gives a word's
 * value when a line leaves it out: a number, or a choice's word; otherwise a
 * number takes the low end of its range and a choice its first word.
 */
export function uniformLayout(vocabulary: SettingsVocabulary, defaults: Readonly<Record<string, number | string>> = {}): UniformLayout {
  const fields: UniformField[] = []
  let offset = 0
  for (const [word, spec] of Object.entries(vocabulary)) {
    if (spec.kind === 'number' || spec.kind === 'quantity') {
      // A quantity packs as its base unit (px, ms, deg, hz, st), which a shader can rely on; a relative unit has none.
      const given = defaults[word]
      fields.push({ word, type: 'f32', offset, fallback: typeof given === 'number' ? given : spec.range?.[0] ?? 0 })
    } else if (spec.kind === 'choice') {
      const given = defaults[word]
      const index = typeof given === 'string' ? spec.choices.indexOf(given) : -1
      fields.push({ word, type: 'u32', offset, fallback: Math.max(0, index) })
    } else continue
    offset += 4
  }
  return { fields, size: Math.max(16, Math.ceil(offset / 16) * 16) }
}

/** The struct's WGSL declaration, members in buffer order. */
export function wgslStruct(name: string, layout: UniformLayout): string {
  const members = layout.fields.map((f) => `  ${memberName(f.word)}: ${f.type},`)
  const used = layout.fields.length * 4
  for (let pad = used; pad < layout.size; pad += 4) members.push(`  _pad${pad / 4}: u32,`)
  return `struct ${name} {\n${members.join('\n')}\n}`
}

/** A line's values written into the layout; a word the line leaves out, or could not use, takes its fallback. */
export function packUniforms(line: Pick<SettingsLine, 'values'>, layout: UniformLayout, vocabulary: SettingsVocabulary): ArrayBuffer {
  const buffer = new ArrayBuffer(layout.size)
  const view = new DataView(buffer)
  for (const field of layout.fields) {
    const spec = vocabulary[field.word]!
    const value = line.values[field.word]
    if (field.type === 'f32') view.setFloat32(field.offset, typeof value === 'number' ? value : field.fallback, true)
    else {
      const index = spec.kind === 'choice' && typeof value === 'string' ? spec.choices.indexOf(value) : -1
      view.setUint32(field.offset, index >= 0 ? index : field.fallback, true)
    }
  }
  return buffer
}

/** The u32 words of one row, in order. */
export const GPU_ROW_FIELDS = ['kind', 'glyph', 'parent', 'depth', 'size', 'start', 'end', 'word'] as const
export const GPU_ROW_WORDS = GPU_ROW_FIELDS.length

/** WGSL for one row; parent is i32 so the root's -1 survives. */
export const WGSL_ROW = `struct Row {
  kind: u32,
  glyph: u32,
  parent: i32,
  depth: u32,
  size: u32,
  start: u32,
  end: u32,
  word: u32,
}`

export interface GpuColumns {
  schema: typeof GPU_PACK_SCHEMA
  /** nodes × GPU_ROW_WORDS u32, row-major; parent is stored as its i32 bits. */
  rows: Uint32Array
  nodes: number
  maxDepth: number
  /** The deepest-first band schedule: order[offsets[k] … offsets[k + 1]) is band k. */
  bandOrder: Uint32Array
  bandOffsets: Uint32Array
  /** Source length, for a shader that places rows by offset. */
  length: number
  kinds: readonly string[]
  glyphs: readonly string[]
}

/** Parse columns widened into fixed u32 rows for a storage buffer. */
export function columnsToGpu(tree: ParseColumns, length: number): GpuColumns {
  const rows = new Uint32Array(tree.nodes * GPU_ROW_WORDS)
  const parent = new Int32Array(rows.buffer)
  for (let i = 0; i < tree.nodes; i++) {
    const at = i * GPU_ROW_WORDS
    rows[at] = tree.kind[i]!
    rows[at + 1] = tree.glyph[i]!
    parent[at + 2] = tree.parent[i]!
    rows[at + 3] = tree.depth[i]!
    rows[at + 4] = tree.size[i]!
    rows[at + 5] = tree.start[i]!
    rows[at + 6] = tree.end[i]!
    rows[at + 7] = tree.word[i]!
  }
  return {
    schema: GPU_PACK_SCHEMA,
    rows,
    nodes: tree.nodes,
    maxDepth: tree.maxDepth,
    bandOrder: tree.bands.order.slice(),
    bandOffsets: tree.bands.offsets.slice(),
    length,
    kinds: [...tree.kinds],
    glyphs: [...tree.glyphs],
  }
}
