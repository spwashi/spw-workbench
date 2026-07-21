import { describe, expect, it } from 'vitest'
import { parseWorkspaceRootDeclarations } from '@spwashi/spw-seed'

describe('workspace root declarations', () => {
  it('reads roots from quoted and bracketed root frames', () => {
    expect(parseWorkspaceRootDeclarations(`
      ^["roots"]{
        @index: ~"./index.spw"
        @docs: ~"../docs"
      }
    `)).toEqual([
      { sigil: 'index', relativePath: './index.spw' },
      { sigil: 'docs', relativePath: '../docs' },
    ])

    expect(parseWorkspaceRootDeclarations(`^"roots"{ @spw: ~"." }`)).toEqual([
      { sigil: 'spw', relativePath: '.' },
    ])
  })

  it('ignores root-like references outside the roots frame', () => {
    expect(parseWorkspaceRootDeclarations(`
      @outside: ~"../outside"
      ^["settings"]{ @docs: ~"../docs" }
    `)).toEqual([])
  })
})
