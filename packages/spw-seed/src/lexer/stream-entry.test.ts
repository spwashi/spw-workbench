import { describe, expect, it } from 'vitest'
import { lex } from './index'

/** The figures in an entry body: each run of tokens between its TEXT segments. */
function figuresOf(body: string): string[] {
  const tokens = lex(`>>[2026-10-12 22:30] note — ${body}`).tokens.filter(t => t.type !== 'EOF')
  const figures: string[] = []
  let run = ''
  for (const token of tokens.slice(1)) {
    if (token.type === 'TEXT') {
      if (run) figures.push(run)
      run = ''
    } else {
      run += token.value
    }
  }
  if (run) figures.push(run)
  return figures
}

describe('stream entry bodies are prose-first', () => {
  it.each([
    ['see ~"./a.spw" now', ['~"./a.spw"']],
    ['landed .[release_names](749899ee) today', ['.[release_names](749899ee)']],
    ['cite =exp[id: phrase.line_item] here', ['=exp[id: phrase.line_item]']],
    ['see #>target below', ['#>target']],
    ['fill $slot and ${host=mj}', ['$slot', '${host=mj}']],
    ['next ~[first_release], open ?[label]', ['~[first_release]', '?[label]']],
    ['subject &[cli] and ^seed[lexer]', ['&[cli]', '^seed[lexer]']],
    ['measure %style_hold, then !boon.', ['%style_hold', '!boon']],
  ])('lexes the figures in %j', (body, figures) => {
    expect(figuresOf(body)).toEqual(figures)
  })

  it('keeps postfix marks, mid-word sigils, paths, versions, scopes and stray quotes as prose', () => {
    const prose = "what exist? door~ e.g. 2026.10.13-pre.1 ~/air ^9.39.4 @typescript-eslint/parser 50% # heading it's \"unbalanced"
    expect(figuresOf(prose)).toEqual([])
  })

  it('leaves a half-formed figure as prose', () => {
    expect(figuresOf('still read ~#lens( by regex.')).toEqual([])
    expect(figuresOf("ask ~[what's this] later")).toEqual([])
  })

  it('reproduces the line from its tokens', () => {
    const source = '>>[0] observe — baseline .[a](1234567) and ~"x.spw", done'
    expect(lex(source).tokens.map(t => t.value).join('')).toBe(source)
  })
})
