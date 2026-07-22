/**
 * Semantic Tokens Handler — Tests
 *
 * Verifies token classification, delta encoding, and edge cases
 * for the regex-based semantic token scanner.
 */

import { describe, it, expect } from 'vitest'
import { semanticTokens, SEMANTIC_TOKENS_LEGEND } from '../handlers/semantic-tokens'
import type { HandlerDeps } from '../types'

// ── Token type / modifier indices (mirror handler constants) ──

const TT = {
  operator: 0, type: 1, variable: 2, property: 3,
  function: 4, string: 5, keyword: 6, comment: 7, number: 8,
} as const

const TM = {
  declaration:  1 << 0,
  definition:   1 << 1,
  readonly:     1 << 2,
  modification: 1 << 4,
  async:        1 << 5,
} as const

// ── Helpers ────────────────────────────────────────────────────

/** Build minimal HandlerDeps with a document returning `text`. */
function depsWithText(text: string): HandlerDeps {
  return {
    serverIndex: {
      getDocument: (uri: string) => ({ text }),
    },
  } as unknown as HandlerDeps
}

/** Parse the flat data array into readable token records. */
function decodeTokens(data: number[]) {
  const tokens: Array<{
    line: number; char: number; length: number;
    type: number; modifiers: number
  }> = []
  let line = 0, char = 0
  for (let i = 0; i < data.length; i += 5) {
    const deltaLine = data[i]
    const deltaChar = data[i + 1]
    line += deltaLine
    char = deltaLine === 0 ? char + deltaChar : deltaChar
    tokens.push({
      line, char, length: data[i + 2],
      type: data[i + 3], modifiers: data[i + 4],
    })
  }
  return tokens
}

function tokenize(text: string) {
  const result = semanticTokens(
    { textDocument: { uri: 'file:///test.spw' } },
    depsWithText(text),
  )
  return decodeTokens(result.data)
}

// ── Legend ──────────────────────────────────────────────────────

describe('SEMANTIC_TOKENS_LEGEND', () => {
  it('declares 9 token types (includes number for path-fit coloring)', () => {
    expect(SEMANTIC_TOKENS_LEGEND.tokenTypes).toHaveLength(9)
    expect(SEMANTIC_TOKENS_LEGEND.tokenTypes).toContain('number')
  })

  it('declares 6 token modifiers', () => {
    expect(SEMANTIC_TOKENS_LEGEND.tokenModifiers).toHaveLength(6)
  })
})

// ── Empty / missing input ──────────────────────────────────────

describe('empty and missing input', () => {
  it('returns empty data for missing uri', () => {
    const result = semanticTokens(
      { textDocument: { uri: '' } } as any,
      { serverIndex: { getDocument: () => null } } as unknown as HandlerDeps,
    )
    expect(result.data).toEqual([])
  })

  it('returns empty data for empty document', () => {
    const tokens = tokenize('')
    expect(tokens).toEqual([])
  })

  it('returns empty data for whitespace-only document', () => {
    const tokens = tokenize('   \n  \n')
    expect(tokens).toEqual([])
  })
})

// ── Comments ───────────────────────────────────────────────────

describe('comments', () => {
  it('classifies // as comment consuming rest of line', () => {
    const tokens = tokenize('// hello world')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({
      line: 0, char: 0, length: 14,
      type: TT.comment, modifiers: 0,
    })
  })

  it('classifies inline comment after operator', () => {
    const tokens = tokenize('^// note')
    expect(tokens).toHaveLength(2)
    expect(tokens[0].type).toBe(TT.keyword) // ^
    expect(tokens[1].type).toBe(TT.comment)
  })
})

// ── Operators ──────────────────────────────────────────────────

describe('single-character operators', () => {
  it('^ → keyword + declaration', () => {
    const tokens = tokenize('^')
    expect(tokens[0]).toMatchObject({ type: TT.keyword, modifiers: TM.declaration })
  })

  it('! → function + modification', () => {
    const tokens = tokenize('!')
    expect(tokens[0]).toMatchObject({ type: TT.function, modifiers: TM.modification })
  })

  it('? → function + async', () => {
    const tokens = tokenize('?')
    expect(tokens[0]).toMatchObject({ type: TT.function, modifiers: TM.async })
  })

  it('~ → variable', () => {
    const tokens = tokenize('~')
    expect(tokens[0]).toMatchObject({ type: TT.variable, modifiers: 0 })
  })

  it('= → property + readonly', () => {
    const tokens = tokenize('=')
    expect(tokens[0]).toMatchObject({ type: TT.property, modifiers: TM.readonly })
  })

  it('% → keyword', () => {
    const tokens = tokenize('%')
    expect(tokens[0]).toMatchObject({ type: TT.keyword, modifiers: 0 })
  })

  it('$ → operator', () => {
    const tokens = tokenize('$')
    expect(tokens[0]).toMatchObject({ type: TT.operator, modifiers: 0 })
  })

  it('+ → operator', () => {
    const tokens = tokenize('+')
    expect(tokens[0]).toMatchObject({ type: TT.operator, modifiers: 0 })
  })
})

// ── Compound patterns ──────────────────────────────────────────

describe('compound patterns', () => {
  it('##>anchor → keyword + declaration (full match)', () => {
    const tokens = tokenize('##>my_anchor')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({
      length: 12, type: TT.keyword, modifiers: TM.declaration,
    })
  })

  it('~#trait → property + declaration (full match)', () => {
    const tokens = tokenize('~#my_trait')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({
      length: 10, type: TT.property, modifiers: TM.declaration,
    })
  })

  it('#annotation → type', () => {
    const tokens = tokenize('#layer')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: TT.type, modifiers: 0 })
  })

  it('#!intent → function + modification (action orientation)', () => {
    const tokens = tokenize('#!pragmatics')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: TT.function, modifiers: TM.modification })
  })

  it('#:lens → type + definition (conceptual axis)', () => {
    const tokens = tokenize('#:depth')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: TT.type, modifiers: TM.definition })
  })

  it('#>anchor → keyword + declaration (navigation landmark)', () => {
    const tokens = tokenize('#>section')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: TT.keyword, modifiers: TM.declaration })
  })

  it('@root_name → variable (full name)', () => {
    const tokens = tokenize('@workspace')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({
      length: 10, type: TT.variable, modifiers: 0,
    })
  })

  it('&[ → operator (2-char match)', () => {
    const tokens = tokenize('&[scope]')
    expect(tokens).toHaveLength(2) // &[ pair + ] bracket; "scope" is plain text (falls through)
    expect(tokens[0]).toMatchObject({ length: 2, type: TT.operator })
    expect(tokens[1]).toMatchObject({ type: TT.operator, modifiers: TM.definition }) // ]
  })

  it('[*] → keyword + definition', () => {
    const tokens = tokenize('[*]')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({
      length: 3, type: TT.keyword, modifiers: TM.definition,
    })
  })

  it('*variant (sigil before identifier) → keyword', () => {
    const tokens = tokenize('*foo')
    expect(tokens).toHaveLength(1) // * is keyword, foo is plain
    expect(tokens[0]).toMatchObject({ type: TT.keyword, modifiers: 0 })
  })

  it('* alone (no following ident) → operator', () => {
    const tokens = tokenize('* ')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: TT.operator })
  })
})

// ── Containers ─────────────────────────────────────────────────

describe('containers', () => {
  it('classifies all container brackets as operator + definition', () => {
    const tokens = tokenize('[]{}()<>')
    expect(tokens).toHaveLength(8)
    for (const t of tokens) {
      expect(t.type).toBe(TT.operator)
      expect(t.modifiers).toBe(TM.definition)
    }
  })
})

// ── Strings ────────────────────────────────────────────────────

describe('strings', () => {
  it('double-quoted string → string', () => {
    const tokens = tokenize('"hello world"')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({
      length: 13, type: TT.string, modifiers: 0,
    })
  })

  it('single-quoted string → string', () => {
    const tokens = tokenize("'hello'")
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: TT.string })
  })

  it('backtick string → string', () => {
    const tokens = tokenize('`code`')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: TT.string })
  })

  it('escaped quotes inside string', () => {
    const tokens = tokenize('"say \\"hi\\""')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: TT.string, length: 12 })
  })

  it('numbers → number', () => {
    const tokens = tokenize('42')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: TT.number })
  })

  it('time literal (3:30) → number', () => {
    const tokens = tokenize('3:30')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: TT.number, length: 4 })
  })

  it('fraction (1/2) → number', () => {
    const tokens = tokenize('1/2')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: TT.number, length: 3 })
  })
})

// ── Path navigation ergonomics ────────────────────────────────

describe('navigable path units', () => {
  it('~"path" is one variable+definition span', () => {
    const tokens = tokenize('~"plans/index.spw"')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({
      length: '~"plans/index.spw"'.length,
      type: TT.variable,
      modifiers: TM.definition,
    })
  })

  it('~<label>"path" is one navigable span', () => {
    const raw = '~<core>"../core/index.spw"'
    const tokens = tokenize(raw)
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({
      length: raw.length,
      type: TT.variable,
      modifiers: TM.definition,
    })
  })

  it('~<.spw/foo.spw> angle path is one navigable span', () => {
    const raw = '~<.spw/agents.spw>'
    const tokens = tokenize(raw)
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({
      length: raw.length,
      type: TT.variable,
      modifiers: TM.definition,
    })
  })

  it('non-path ~<label> is not collapsed into a path unit', () => {
    // ~ then < then label then > — bare ~ should win, not full path unit
    const tokens = tokenize('~<core>')
    expect(tokens[0].type).toBe(TT.variable)
    expect(tokens[0].length).toBe(1) // just ~
  })

  it('@root/path is one navigable span', () => {
    const raw = '@spw/harness/memory-surface.spw'
    const tokens = tokenize(raw)
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({
      length: raw.length,
      type: TT.variable,
      modifiers: TM.definition,
    })
  })

  it('root binding keeps @name and ~"path" as separate navigable pieces', () => {
    const tokens = tokenize('@cluster: ~"path/to/file.spw"')
    expect(tokens[0]).toMatchObject({ type: TT.variable, length: 8 }) // @cluster
    const pathTok = tokens.find((t) => t.modifiers === TM.definition)
    expect(pathTok).toMatchObject({ type: TT.variable, modifiers: TM.definition })
  })
})

// ── Delta encoding ─────────────────────────────────────────────

describe('delta encoding', () => {
  it('tokens on the same line use delta char', () => {
    const tokens = tokenize('^ !')
    expect(tokens).toHaveLength(2)
    // First token at (0, 0), second at (0, 2)
    expect(tokens[0]).toMatchObject({ line: 0, char: 0 })
    expect(tokens[1]).toMatchObject({ line: 0, char: 2 })
  })

  it('tokens on different lines reset char offset', () => {
    const tokens = tokenize('^\n  !')
    expect(tokens).toHaveLength(2)
    expect(tokens[0]).toMatchObject({ line: 0, char: 0 })
    expect(tokens[1]).toMatchObject({ line: 1, char: 2 })
  })

  it('raw data matches LSP delta encoding spec', () => {
    // Two tokens: ^ at (0,0) and ! at (1,4)
    const result = semanticTokens(
      { textDocument: { uri: 'file:///test.spw' } },
      depsWithText('^\n    !'),
    )
    const d = result.data
    // Token 1: deltaLine=0, deltaChar=0, len=1, type=keyword, mod=declaration
    expect(d.slice(0, 5)).toEqual([0, 0, 1, TT.keyword, TM.declaration])
    // Token 2: deltaLine=1, deltaChar=4, len=1, type=function, mod=modification
    expect(d.slice(5, 10)).toEqual([1, 4, 1, TT.function, TM.modification])
  })
})

// ── Realistic .spw fragments ───────────────────────────────────

describe('realistic spw fragments', () => {
  it('frame declaration: ^["name"]{}', () => {
    const tokens = tokenize('^["roots"]{}')
    const types = tokens.map(t => t.type)
    // ^  [  "roots"  ]  {  }
    expect(types).toEqual([
      TT.keyword,   // ^
      TT.operator,  // [
      TT.string,    // "roots"
      TT.operator,  // ]
      TT.operator,  // {
      TT.operator,  // }
    ])
  })

  it('root binding: @name: ~"path"', () => {
    const tokens = tokenize('@cluster: ~"path/to/file.spw"')
    // @cluster  :  ~"path/to/file.spw" (path is one unit)
    expect(tokens[0]).toMatchObject({ type: TT.variable, length: 8 })
    const pathTok = tokens.find((t) => t.length === '~"path/to/file.spw"'.length)
    expect(pathTok).toMatchObject({ type: TT.variable, modifiers: TM.definition })
  })

  it('trait line: ~#goal: "description"', () => {
    const tokens = tokenize('~#goal: "Integrate the LSP"')
    expect(tokens[0]).toMatchObject({ type: TT.property, modifiers: TM.declaration })  // ~#goal
    expect(tokens[1]).toMatchObject({ type: TT.string })  // "Integrate the LSP"
  })

  it('stream entry: >>[date] type — content', () => {
    const tokens = tokenize('>>[2026-03-27 00:45] observe')
    // > > [ 2026 - 03 - 27 00 : 45 ] ...
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('probe block: ?["question"]{}', () => {
    const tokens = tokenize('?["What?"]{}')
    expect(tokens[0]).toMatchObject({ type: TT.function, modifiers: TM.async }) // ?
    expect(tokens[1]).toMatchObject({ type: TT.operator, modifiers: TM.definition }) // [
    expect(tokens[2]).toMatchObject({ type: TT.string }) // "What?"
  })

  it('multiline document preserves correct line offsets', () => {
    const doc = [
      '#:layer #!pragmatics',
      '',
      '^["roots"]{',
      ' @cluster: ~"path.spw"',
      '}',
    ].join('\n')
    const tokens = tokenize(doc)
    const lastToken = tokens[tokens.length - 1]
    expect(lastToken.line).toBe(4) // } on line 4
  })
})
