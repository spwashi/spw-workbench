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

  /**
   * Spw has no block comments, so `/*` opens nothing and there is no third
   * delimiter pair to leave hanging. Both forms are ordinary tokens.
   */
  it('treats block-comment delimiters as ordinary tokens, not a lexeme pair', () => {
    expect(snapshotTopography('/* complete */')).toMatchObject({ lexemesClosed: true })
    expect(snapshotTopography('/* open')).toMatchObject({ lexemesClosed: true })
  })
})
