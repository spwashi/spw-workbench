import { describe, expect, it } from 'vitest'
import {
  analyzeWorkspaceRootManifest,
  parseWorkspaceRootDeclarations,
} from '@spwashi/spw-seed'

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

  it('distinguishes a valid manifest from an unusable present manifest', () => {
    expect(analyzeWorkspaceRootManifest('^"roots"{ @spw: ~"." }')).toEqual({
      status: 'valid',
      declarations: [{ sigil: 'spw', relativePath: '.' }],
      diagnostics: [],
    })

    expect(analyzeWorkspaceRootManifest('^"settings"{ @spw: ~"." }')).toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'missing_roots_frame' }],
    })
    expect(analyzeWorkspaceRootManifest('^"roots"{}')).toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'empty_roots_frame' }],
    })
  })

  it('rejects duplicate sigils and malformed root declarations', () => {
    expect(analyzeWorkspaceRootManifest(`
      ^["roots"]{
        @docs: ~"../docs"
        @docs: ~"../other-docs"
      }
    `)).toMatchObject({
      status: 'invalid',
      diagnostics: [expect.objectContaining({
        code: 'duplicate_root_sigil',
        sigil: 'docs',
      })],
    })

    expect(analyzeWorkspaceRootManifest('^"roots"{ @docs: "../docs" }')).toMatchObject({
      status: 'invalid',
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_root_declaration' }),
        expect.objectContaining({ code: 'empty_roots_frame' }),
      ]),
    })
  })
})
