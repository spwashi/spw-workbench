import { describe, expect, it } from 'vitest'
import { applySemanticPlan, planSemanticEdits } from './semantic-edit'
import { mayCitePathMoves, normalizePath, relativePath, renamePaths, type PathMove } from './path-rename'

const ROOT = '/repo'

/** An existence oracle over a fixed tree: listed files plus every ancestor directory. */
function tree(files: string[]): (abs: string) => boolean {
  const present = new Set<string>()
  for (const file of files) {
    let cursor = `${ROOT}/${file}`
    while (cursor.length > ROOT.length) {
      present.add(cursor)
      cursor = cursor.slice(0, cursor.lastIndexOf('/'))
    }
  }
  present.add(ROOT)
  return abs => present.has(abs)
}

function plan(source: string, citing: string, moves: PathMove[], exists: (abs: string) => boolean) {
  const rule = renamePaths(moves, { consumerRoot: ROOT, citingFile: `${ROOT}/${citing}`, exists })
  return planSemanticEdits(source, [rule])
}

function rewrite(source: string, citing: string, moves: PathMove[], exists: (abs: string) => boolean): string {
  return applySemanticPlan(source, plan(source, citing, moves, exists))
}

const move = (from: string, to: string): PathMove => ({ from: `${ROOT}/${from}`, to: `${ROOT}/${to}` })

describe('path arithmetic', () => {
  it('normalizes and relativizes without a host', () => {
    expect(normalizePath('/a/b/../c/./d/')).toBe('/a/c/d')
    expect(relativePath('/a/b', '/a/c/d.spw')).toBe('../c/d.spw')
    expect(relativePath('/a', '/a/b.spw')).toBe('b.spw')
  })
})

describe('renamePaths', () => {
  const files = ['index.spw', 'docs/old.spw', 'docs/other.spw', 'notes/a.spw', 'notes/b.spw']
  const exists = tree(files)

  it('re-aims a ./ citation to a moved file and keeps its fragment and quotes', () => {
    const source = `see: ~'./old.spw#start'\n`
    expect(rewrite(source, 'docs/other.spw', [move('docs/old.spw', 'docs/guide/new.spw')], exists))
      .toBe(`see: ~'./guide/new.spw#start'\n`)
  })

  it('keeps the ../ form, climbing as far as the new place needs', () => {
    const source = 'up: ~"../docs/old.spw"\n'
    expect(rewrite(source, 'notes/a.spw', [move('docs/old.spw', 'archive/2026/old.spw')], exists))
      .toBe('up: ~"../archive/2026/old.spw"\n')
  })

  it('keeps a bare root-relative citation root-relative, and a /route a route', () => {
    const source = 'a: ~"docs/old.spw"\nb: ~"/docs/old.spw#x"\n'
    expect(rewrite(source, 'notes/a.spw', [move('docs/old.spw', 'guide/old.spw')], exists))
      .toBe('a: ~"guide/old.spw"\nb: ~"/guide/old.spw#x"\n')
  })

  it('rewrites ~<…> bounded paths in place, without adding quotes', () => {
    const source = 'x: ~<../docs/old.spw>\n'
    expect(rewrite(source, 'notes/a.spw', [move('docs/old.spw', 'docs/new.spw')], exists))
      .toBe('x: ~<../docs/new.spw>\n')
  })

  it('moves a directory: citations into it follow, and its own outward links rebase', () => {
    const moves = [move('notes', 'archive/notes')]
    expect(rewrite('n: ~"notes/b.spw"\nd: ~"notes/"\n', 'index.spw', moves, exists))
      .toBe('n: ~"archive/notes/b.spw"\nd: ~"archive/notes/"\n')
    // a sibling link inside the moving directory owes nothing; the climb out does
    expect(rewrite('s: ~"./b.spw"\nup: ~"../index.spw"\n', 'notes/a.spw', moves, exists))
      .toBe('s: ~"./b.spw"\nup: ~"../../index.spw"\n')
  })

  it('leaves prose, external links, and unrelated citations byte-identical', () => {
    const source = '.. docs/old.spw is mentioned in prose\nx: ~"https://example.com/docs/old.spw"\ny: ~"docs/other.spw"\n'
    expect(plan(source, 'index.spw', [move('docs/old.spw', 'docs/new.spw')], exists).edits).toEqual([])
  })

  it('converges: a second run over written text finds nothing, before and after the move', () => {
    const moves = [move('notes', 'archive/notes')]
    const once = rewrite('up: ~"../index.spw"\n', 'notes/a.spw', moves, exists)
    expect(plan(once, 'notes/a.spw', moves, exists).edits).toEqual([])
    const moved = tree(['index.spw', 'archive/notes/a.spw', 'archive/notes/b.spw'])
    expect(plan(once, 'archive/notes/a.spw', moves, moved).edits).toEqual([])
  })

  it('still re-aims citations naming the old place when the move already happened', () => {
    const moved = tree(['index.spw', 'docs/new.spw'])
    expect(rewrite('x: ~"docs/old.spw#a"\n', 'index.spw', [move('docs/old.spw', 'docs/new.spw')], moved))
      .toBe('x: ~"docs/new.spw#a"\n')
  })

  it('gates the parse on the moved segment or on the surface itself moving', () => {
    const moves = [move('docs/old.spw', 'docs/new.spw')]
    expect(mayCitePathMoves('x: ~"docs/old.spw"', `${ROOT}/index.spw`, moves)).toBe(true)
    expect(mayCitePathMoves('x: ~"docs/other.spw"', `${ROOT}/index.spw`, moves)).toBe(false)
    expect(mayCitePathMoves('', `${ROOT}/notes/a.spw`, [move('notes', 'n2')])).toBe(true)
  })
})
