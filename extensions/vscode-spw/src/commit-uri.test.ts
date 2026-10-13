import { describe, expect, it } from 'vitest'
import { COMMIT_SCHEME, changeSides, commitTitle, parseCommitTarget } from './commit-uri'

describe('commit links', () => {
  it('reads the hash from the path and the repository from the decoded query', () => {
    expect(COMMIT_SCHEME).toBe('spw-commit')
    expect(parseCommitTarget('/e6c5697812ab', 'root=/Users/me/repo with space')).toEqual({
      hash: 'e6c5697812ab',
      root: '/Users/me/repo with space',
    })
  })

  it('names no commit for a malformed path or a missing root', () => {
    expect(parseCommitTarget('/not-a-hash', 'root=/repo')).toBeNull()
    expect(parseCommitTarget('/e6c5697', '')).toBeNull()
    expect(parseCommitTarget('/e6c5697', 'root=')).toBeNull()
  })

  it('titles a changes view with the short hash and the subject', () => {
    expect(commitTitle('e6c5697812abcdef', '&[lsp] — subject line\n\nbody')).toBe('e6c56978 &[lsp] — subject line')
    expect(commitTitle('e6c5697812abcdef', '')).toBe('e6c56978')
  })

  it('shows no original side for an added file and no modified side for a deleted one', () => {
    expect(changeSides(5)).toEqual({ original: true, modified: true })
    expect(changeSides(1)).toEqual({ original: false, modified: true })
    expect(changeSides(6)).toEqual({ original: true, modified: false })
  })
})
