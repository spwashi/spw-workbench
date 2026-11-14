import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { lex } from '../lexer'
import { revisionIdForm } from '../lexer/commit-ref'
import { landCommit, landedLineText, quoteSubject, readCommitLines } from './commit-lines'

const commitRefs = (source: string, forms?: Parameters<typeof lex>[1] extends infer O ? O extends { commitRefForms?: infer F } ? F : never : never) =>
  lex(source, { planStream: true, commitRefForms: forms }).tokens.filter((t) => t.kind === 'commit_ref').map((t) => t.value)

describe('revision id forms', () => {
  it('reads git SHA-1 ids by default, exactly as before', () => {
    expect(commitRefs('.[a](551bb419): "x"')).toEqual(['551bb419'])
    expect(commitRefs('.[a](kkmpptxz): "x"')).toEqual([])
    expect(commitRefs(`.[a](${'a1'.repeat(32)}): "x"`)).toEqual([])
  })

  it('reads a jj change id or a SHA-256 id only when the workspace says it uses one', () => {
    expect(commitRefs('.[a](kkmpptxz): "x"', ['git_sha1', 'jj_change'])).toEqual(['kkmpptxz'])
    expect(commitRefs(`.[a](${'a1'.repeat(32)}): "x"`, ['git_sha256'])).toEqual(['a1'.repeat(32)])
    // A jj id is letters k to z only: hex is not one, and neither is a word with other letters.
    expect(commitRefs('.[a](551bb419): "x"', ['jj_change'])).toEqual([])
    expect(commitRefs('.[a](goodbyes): "x"', ['jj_change'])).toEqual([])
    // Some words are spelled in k to z alone; in the landed position the line claims an id, so one reads as an id,
    // which is why jj ids are never read from prose.
    expect(commitRefs('.[a](tomorrows): "x"', ['jj_change'])).toEqual(['tomorrows'])
    expect(revisionIdForm('zzzzzzzz', ['git_sha1', 'jj_change'])).toBe('jj_change')
    expect(revisionIdForm('f53aaa1c', ['git_sha1', 'jj_change'])).toBe('git_sha1')
  })
})

const PLAN = [
  '^["intent"]{',
  ' ~[not_a_commit]: "a planned line outside the block is read but not landed"',
  '}',
  '',
  '^["commits"]{',
  ' .[first](551bb419): "^seed[a] — the first"',
  ' ~[second]: "#[b] — planned \\"quoted\\" words"',
  ' ~[third]: "&[c] — planned"',
  '}',
].join('\n')

describe('commit lines', () => {
  it('reads planned and landed lines, unquoting subjects, and knows which sit in the commits block', () => {
    expect(readCommitLines(PLAN).map((c) => [c.state, c.label, c.id, c.subject, c.inCommitsBlock])).toEqual([
      ['planned', 'not_a_commit', null, 'a planned line outside the block is read but not landed', false],
      ['landed', 'first', '551bb419', '^seed[a] — the first', true],
      ['planned', 'second', null, '#[b] — planned "quoted" words', true],
      ['planned', 'third', null, '&[c] — planned', true],
    ])
  })

  it('lands a planned line with the subject as committed, quotes escaped, and leaves every other line alone', () => {
    const landed = landCommit(PLAN, 'second', 'f53aaa1c', 'vocab[b] — the "real" subject\n\nbody text')
    expect(landed.line).toBe(6)
    expect(landed.text.split('\n')[6]).toBe(' .[second](f53aaa1c): "vocab[b] — the \\"real\\" subject"')
    expect(landed.text.split('\n').filter((_, i) => i !== 6)).toEqual(PLAN.split('\n').filter((_, i) => i !== 6))
    const again = readCommitLines(landed.text).find((c) => c.label === 'second')!
    expect([again.state, again.id, again.subject]).toEqual(['landed', 'f53aaa1c', 'vocab[b] — the "real" subject'])
    // The lexer reads the new line's id as a commit ref.
    expect(commitRefs(landed.text)).toEqual(['551bb419', 'f53aaa1c'])
  })

  it('does not land a line outside the commits block, refuses an id in no form, and reports a label it cannot find', () => {
    expect(landCommit(PLAN, 'not_a_commit', 'f53aaa1c', 's')).toMatchObject({ line: null, text: PLAN })
    expect(landCommit(PLAN, 'missing', 'f53aaa1c', 's')).toMatchObject({ line: null, text: PLAN })
    expect(() => landedLineText({ indent: ' ', label: 'x' }, 'not-an-id', 's')).toThrow('is not an id')
    expect(landedLineText({ indent: ' ', label: 'x' }, 'kkmpptxz', 's', ['jj_change'])).toBe(' .[x](kkmpptxz): "s"')
  })

  it('agrees with the lexer on every landed line in this repository\'s plans', () => {
    const plans = path.resolve(__dirname, '../../../../.agents/plans')
    let checked = 0
    for (const slug of readdirSync(plans)) {
      let text: string
      try {
        text = readFileSync(path.join(plans, slug, 'wip.spw'), 'utf8')
      } catch {
        continue
      }
      const landed = readCommitLines(text).filter((c) => c.state === 'landed' && /^[0-9a-f]{7,40}$/.test(c.id!))
      const lexed = new Set(commitRefs(text))
      for (const c of landed) expect(lexed.has(c.id!), `${slug}: ${c.label}`).toBe(true)
      // Quoting a subject read from a line writes the same string back.
      for (const c of readCommitLines(text)) expect(quoteSubject(c.subject)).toBe(text.split('\n')[c.line]!.match(/:\s*(".*")\s*$/)![1])
      checked += landed.length
    }
    expect(checked).toBeGreaterThan(200)
  })
})
