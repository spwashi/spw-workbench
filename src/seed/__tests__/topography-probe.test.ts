import { describe, expect, it } from 'vitest'
import { snapshotTopography } from '@spwashi/spw-seed'

describe('topography lexeme closure', () => {
  it('uses backslash parity for quoted closing delimiters', () => {
    const closed = '"abc\\\\' + '"'
    const escapedClosingQuote = '"abc\\' + '"'

    expect(snapshotTopography(closed)).toMatchObject({ lexemesClosed: true })
    expect(snapshotTopography(escapedClosingQuote)).toMatchObject({
      lexemesClosed: false,
      reasons: expect.arrayContaining(['unterminated_lexeme']),
    })
  })

  it('uses the same parity rule for phrase delimiters', () => {
    const closed = '`abc\\\\' + '`'
    const escapedClosingTick = '`abc\\' + '`'

    expect(snapshotTopography(closed)).toMatchObject({ lexemesClosed: true })
    expect(snapshotTopography(escapedClosingTick)).toMatchObject({
      lexemesClosed: false,
      reasons: expect.arrayContaining(['unterminated_lexeme']),
    })
  })

  it('reports block-comment closure in the same evidence surface', () => {
    expect(snapshotTopography('/* complete */')).toMatchObject({ lexemesClosed: true })
    expect(snapshotTopography('/* open')).toMatchObject({
      lexemesClosed: false,
      reasons: expect.arrayContaining(['unterminated_lexeme']),
    })
  })
})
