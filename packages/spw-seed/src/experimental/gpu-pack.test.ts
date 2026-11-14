import { describe, expect, it } from 'vitest'
import { parseColumns } from './parse-columns'
import { readSettingsLine, type SettingsVocabulary } from './settings-line'
import { GPU_ROW_WORDS, WGSL_ROW, columnsToGpu, packUniforms, uniformLayout, wgslStruct } from './gpu-pack'

const SHADER: SettingsVocabulary = {
  zoom: { kind: 'number', range: [0.25, 8] },
  hue: { kind: 'number', range: [0, 1] },
  offset: { kind: 'number', range: [-1, 1] },
  palette: { kind: 'choice', choices: ['ink', 'dusk', 'meadow'] },
  title: { kind: 'text' },
}

describe('uniforms from a settings line', () => {
  const layout = uniformLayout(SHADER, { zoom: 1, palette: 'dusk' })

  it('lays numbers out as f32 and choices as u32, four bytes each, the struct a multiple of sixteen', () => {
    expect(layout.fields.map((f) => [f.word, f.type, f.offset])).toEqual([['zoom', 'f32', 0], ['hue', 'f32', 4], ['offset', 'f32', 8], ['palette', 'u32', 12]])
    expect(layout.size).toBe(16)
    expect(uniformLayout({ a: { kind: 'number', range: [0, 1] } }).size).toBe(16)
    expect(uniformLayout(Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`w${i}`, { kind: 'number', range: [0, 1] }])) as SettingsVocabulary).size).toBe(32)
  })

  it('writes the WGSL struct from the same table, padded to its size', () => {
    expect(wgslStruct('Tune', layout)).toBe('struct Tune {\n  zoom: f32,\n  hue: f32,\n  offset: f32,\n  palette: u32,\n}')
    expect(wgslStruct('T', uniformLayout({ a: { kind: 'number', range: [0, 1] } }))).toBe('struct T {\n  a: f32,\n  _pad1: u32,\n  _pad2: u32,\n  _pad3: u32,\n}')
  })

  it('packs a line\'s values, a negative included, and gives a word left out its default', () => {
    const line = readSettingsLine('^shader{ %zoom[1.5] %offset[-0.5] =palette[meadow] }', SHADER)
    const view = new DataView(packUniforms(line, layout, SHADER))
    expect(view.getFloat32(0, true)).toBe(1.5)
    expect(view.getFloat32(4, true)).toBe(0)
    expect(view.getFloat32(8, true)).toBe(-0.5)
    expect(view.getUint32(12, true)).toBe(2)
    const empty = new DataView(packUniforms(readSettingsLine('^shader{}', SHADER), layout, SHADER))
    expect([empty.getFloat32(0, true), empty.getUint32(12, true)]).toEqual([1, 1])
  })
})

describe('parse columns as GPU rows', () => {
  it('widens every row into eight u32 in the order WGSL_ROW declares, the root\'s parent kept as -1', () => {
    const text = '~garden[care]{seed, water}'
    const tree = parseColumns(text)!
    const gpu = columnsToGpu(tree, text.length)
    expect(gpu.rows.length).toBe(tree.nodes * GPU_ROW_WORDS)
    expect(new Int32Array(gpu.rows.buffer)[2]).toBe(-1)
    for (let i = 0; i < tree.nodes; i++) {
      const at = i * GPU_ROW_WORDS
      expect([gpu.rows[at], gpu.rows[at + 1], new Int32Array(gpu.rows.buffer)[at + 2], gpu.rows[at + 3], gpu.rows[at + 4], gpu.rows[at + 5], gpu.rows[at + 6], gpu.rows[at + 7]]).toEqual([
        tree.kind[i], tree.glyph[i], tree.parent[i], tree.depth[i], tree.size[i], tree.start[i], tree.end[i], tree.word[i],
      ])
    }
    expect(WGSL_ROW.match(/: [iu]32/g)).toHaveLength(GPU_ROW_WORDS)
    expect(gpu.bandOffsets.length).toBe(tree.bands.offsets.length)
  })
})
