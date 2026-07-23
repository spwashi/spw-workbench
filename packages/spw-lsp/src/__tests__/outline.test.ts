import { describe, it, expect } from 'vitest'
import { outlineFromSource } from '../handlers/outline'
import type { LspDocumentSymbol } from '../types'

/** Flatten to `name@startLine-endLine` for compact structural assertions. */
function flat(symbols: LspDocumentSymbol[], depth = 0): string[] {
  return symbols.flatMap((s) => [
    `${'  '.repeat(depth)}${s.name}@${s.range.start.line}-${s.range.end.line}`,
    ...flat(s.children ?? [], depth + 1),
  ])
}

function names(symbols: LspDocumentSymbol[]): string[] {
  return symbols.map((s) => s.name)
}

describe('outlineFromSource — every frame form is a landmark', () => {
  it('recognizes each way a frame can be written', () => {
    const source = [
      '~<rationale>{',
      '}',
      '^meta{',
      '}',
      '&"reading_compass"{',
      '}',
      '^["roots"]{',
      '}',
      '!boon["do"]{',
      '}',
      '?["ask"]{',
      '}',
    ].join('\n')

    expect(names(outlineFromSource(source))).toEqual([
      '~rationale',
      '^meta',
      '&reading_compass',
      '^roots',
      '!boon do',
      '?ask',
    ])
  })

  it('nests by brace depth and closes ranges at the matching brace', () => {
    const source = [
      '^["outer"]{', //   0
      '  ^["inner"]{', // 1
      '    @leaf: 1', //  2
      '  }', //           3
      '}', //             4
      '^["after"]{', //   5
      '}', //             6
    ].join('\n')

    expect(flat(outlineFromSource(source))).toEqual([
      '^outer@0-4',
      '  ^inner@1-3',
      '    @leaf@2-2',
      '^after@5-6',
    ])
  })
})

describe('outlineFromSource — marks are landmarks, never containers', () => {
  it('keeps a header particle to its own line so breadcrumbs stay honest', () => {
    // The regression this replaced: `#:surface` claimed every following line,
    // so the breadcrumb reported it while the cursor sat inside the frame.
    const source = [
      '#>anchor_name', //  0
      '#:surface', //      1
      '', //               2
      '^["body"]{', //     3
      '  x: 1', //         4
      '}', //              5
    ].join('\n')

    const symbols = outlineFromSource(source)
    expect(flat(symbols)).toEqual([
      '#>anchor_name@0-0',
      '#:surface@1-1',
      '^body@3-5',
    ])
  })

  it('reads all three particle aims with their lattice names', () => {
    const symbols = outlineFromSource('#>anchor\n#:layer\n#!pragmatics\n')
    expect(symbols.map((s) => s.detail)).toEqual(['anchor', 'case', 'mood'])
  })

  it('names a mood particle even when it shares a line with a case', () => {
    // Only the line-leading mark becomes the landmark; the rest are its company.
    expect(names(outlineFromSource('#:layer #!pragmatics\n'))).toEqual(['#:layer'])
  })
})

describe('outlineFromSource — prose is not structure', () => {
  it('ignores `# comment` lines while keeping `#set` operators', () => {
    const source = ['# Lore.Land Plate Canon', '# a second comment line', '#[tagged]{', '}'].join('\n')
    expect(names(outlineFromSource(source))).toEqual(['#tagged'])
  })

  it('does not miscount braces that live inside strings', () => {
    const source = ['^["frame"]{', '  note: "a brace } in prose"', '}', '^["sibling"]{', '}'].join('\n')
    expect(flat(outlineFromSource(source))).toEqual(['^frame@0-2', '^sibling@3-4'])
  })

  it('truncates a prose-length label to one outline row', () => {
    const question = 'What invariant holds across every single frame in this surface?'
    const [symbol] = outlineFromSource(`?["${question}"]{\n}\n`)
    expect(symbol!.name.length).toBeLessThanOrEqual(48)
    expect(symbol!.name.endsWith('…')).toBe(true)
  })

  it('gives an unterminated frame the rest of the file', () => {
    const symbols = outlineFromSource('^["open"]{\n  x: 1\n  y: 2\n')
    expect(symbols[0]!.range.end.line).toBe(3)
  })
})
