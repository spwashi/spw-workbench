import { describe, expect, it } from 'vitest'
import { classifyCitation } from '@spwashi/spw-seed'

describe('spw resolve classification', () => {
  it('does not treat a prose colon as a path', () => {
    // Parser-extracted targets only. The regex `~"..."` used to report this.
    expect(classifyCitation(': ').kind).toBe('malformed')
  })

  it('keeps fragment identity on a relative surface', () => {
    const cited = classifyCitation('../language/v04/index.spw#claim')
    expect(cited.kind).toBe('file')
    expect(cited.fragment).toBe('claim')
  })
})
