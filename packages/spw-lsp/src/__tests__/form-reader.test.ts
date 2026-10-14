/**
 * Caret form context from text alone reads what the server's form hover reads.
 */

import { parse } from '@spwashi/spw-seed'
import { describe, expect, it } from 'vitest'
import { formAt, formHover } from '../form-reader'
import { formContextHover } from '../handlers/form-context'
import type { DocumentState } from '../server-index'

const TEXT = '^["door"]{ hinge: oak }\n?[probe]{ x }'

/** The document the server would hold for the same text. */
function serverDoc(text: string): DocumentState {
  return { uri: 'file:///door.spw', text, version: 3, parseResult: parse(text) } as unknown as DocumentState
}

describe('caret form context', () => {
  it('reads a frame label, its coupling, and the rewrites that apply', () => {
    const ctx = formAt(TEXT, { line: 0, character: 2 })
    expect(ctx?.label).toBe('door')
    expect(ctx?.coupling).toMatchObject({ kind: 'frame', form: 'boundary', surface: '[…]' })
    expect(ctx?.mobility.length).toBeGreaterThan(0)
  })

  it('reads a body label inside braces', () => {
    const ctx = formAt(TEXT, { line: 0, character: 12 })
    expect(ctx?.label).toBe('hinge')
    expect(ctx?.coupling).toMatchObject({ kind: 'body', surface: '{…}' })
  })

  it('gives the server hover markdown, character for character', () => {
    for (const caret of [{ line: 0, character: 2 }, { line: 0, character: 12 }, { line: 1, character: 3 }]) {
      const served = formContextHover(serverDoc(TEXT), caret)
      expect(formHover(TEXT, caret), JSON.stringify(caret)).toBe(served?.contents.value ?? null)
    }
  })

  it('shows nothing on a bare operator', () => {
    expect(formAt(TEXT, { line: 0, character: 0 })?.label).toBeNull()
    expect(formHover(TEXT, { line: 0, character: 0 })).toBeNull()
  })
})
