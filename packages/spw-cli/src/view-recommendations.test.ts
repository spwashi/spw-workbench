import { describe, expect, it } from 'vitest'
import { formatRecommendations, shellArg } from './view'

describe('CLI recommendations', () => {
  it('keeps the command, purpose, and disclosed cost together', () => {
    const card = formatRecommendations([{
      command: 'spw inspect source example.spw --through tokens',
      purpose: 'read the lexical receipt',
      cost: 'token stage only',
    }])

    expect(card).toContain('^["next"]')
    expect(card).toContain('^["step-1"]')
    expect(card).toContain('~#command: "spw inspect source example.spw --through tokens"')
    expect(card).toContain('~#purpose: "read the lexical receipt"')
    expect(card).toContain('~#cost: "token stage only"')
  })

  it('quotes paths so suggested commands remain copyable', () => {
    expect(shellArg('docs/example.spw')).toBe('docs/example.spw')
    expect(shellArg('docs/my example.spw')).toBe("'docs/my example.spw'")
    expect(shellArg("docs/editor's note.spw")).toBe("'docs/editor'\"'\"'s note.spw'")
  })
})
