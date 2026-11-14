import { describe, expect, it } from 'vitest'
import { LINE_FIXTURES } from '../../line/fixtures'
import { columnsToJson, parseColumns } from './parse-columns'
import { COLUMNS_BYTES_SCHEMA, columnsFromBytes, columnsToBytes } from './columns-bytes'

const SURFACE = `#>card\n?["first"]{\n #:depth #!semantics ~#lens(comparison)\n ~#readings: ["a", "b"]\n}\n^kept[thursday]{_thursday *kept_place{ ~warm[4] } yadsruht_}\n`

describe('parse columns as bytes', () => {
  it('reads back exactly the columns it was written from', () => {
    for (const text of [SURFACE, ...LINE_FIXTURES.map((f) => f.line), '']) {
      const tree = parseColumns(text)
      if (!tree) continue
      expect(columnsToJson(columnsFromBytes(columnsToBytes(tree))), text).toEqual(columnsToJson(tree))
    }
  })

  it('starts every column on a four-byte boundary and names its schema in its header', () => {
    const tree = parseColumns(SURFACE)!
    const bytes = columnsToBytes(tree)
    expect(bytes.byteLength % 4).toBe(0)
    expect(new TextDecoder().decode(bytes.subarray(12, 12 + new DataView(bytes.buffer).getUint32(8, true)))).toContain(COLUMNS_BYTES_SCHEMA)
  })

  it('reads a buffer that sits at an odd offset inside a larger one', () => {
    const bytes = columnsToBytes(parseColumns(SURFACE)!)
    const larger = new Uint8Array(bytes.byteLength + 3)
    larger.set(bytes, 3)
    expect(columnsToJson(columnsFromBytes(larger.subarray(3)))).toEqual(columnsToJson(parseColumns(SURFACE)!))
  })

  it('refuses a buffer that is not one, is cut short, or runs on past its columns', () => {
    const bytes = columnsToBytes(parseColumns(SURFACE)!)
    expect(() => columnsFromBytes(new Uint8Array(16))).toThrow('not a columns buffer')
    expect(() => columnsFromBytes(bytes.subarray(0, bytes.byteLength - 8))).toThrow('shorter')
    const longer = new Uint8Array(bytes.byteLength + 4)
    longer.set(bytes)
    expect(() => columnsFromBytes(longer)).toThrow('longer')
  })
})
