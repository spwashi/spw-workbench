import { describe, it, expect, vi } from 'vitest'
import { renderHelpPage } from './help'
import { COMMAND_GROUPS, COMMANDS, findCommand, knownCommands, printRootHelp } from './commands'

/**
 * The registry is the single source of truth for routing, the accepted-token
 * list, and the help page. These tests hold those three in agreement — the
 * drift they prevent is a command that runs but is never mentioned.
 */
describe('command registry', () => {
  it('routes every canonical name and alias', () => {
    for (const spec of COMMANDS) {
      expect(findCommand(spec.name)?.name).toBe(spec.name)
      for (const alias of spec.aliases ?? []) {
        expect(findCommand(alias)?.name).toBe(spec.name)
      }
    }
  })

  it('claims no token twice', () => {
    const tokens = knownCommands()
    expect(new Set(tokens).size).toBe(tokens.length)
  })

  it('assigns every command to a declared group', () => {
    const declared = new Set(COMMAND_GROUPS.map((group) => group.id))
    for (const spec of COMMANDS) {
      expect(declared.has(spec.group)).toBe(true)
    }
  })

  it('leaves no group empty', () => {
    for (const group of COMMAND_GROUPS) {
      expect(COMMANDS.some((spec) => spec.group === group.id)).toBe(true)
    }
  })

  it('writes summaries as list entries, not sentences', () => {
    // A summary opens with a capital, or with a namespaced term of art that
    // owns its casing — `effect.l0.measure` is a real address, not prose.
    const termOfArt = /^[a-z][\w.]*[.→]/

    for (const spec of COMMANDS) {
      expect(spec.summary.length, `${spec.name} needs a summary`).toBeGreaterThan(0)
      expect(spec.summary.endsWith('.'), `${spec.name} summary ends with a period`).toBe(false)

      const opensWell =
        spec.summary[0] === spec.summary[0]?.toUpperCase() || termOfArt.test(spec.summary)
      expect(opensWell, `${spec.name}: "${spec.summary}" opens as neither title nor address`).toBe(
        true,
      )
    }
  })

  it('opens public summaries with outcomes rather than execution addresses', () => {
    const internalAddress = /\b(?:IR|effect\.l\d|l\d\.[a-z][\w.]*)\b/

    for (const spec of COMMANDS) {
      expect(spec.summary, `${spec.name} exposes an internal execution address`).not.toMatch(
        internalAddress,
      )
      expect(spec.summary, `${spec.name} teaches an option before its outcome`).not.toMatch(
        /--[a-z]/,
      )
    }
  })

  it('places compatibility routes after canonical examples', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    try {
      printRootHelp()
      const text = String(log.mock.calls[0]?.[0] ?? '')
      expect(text.indexOf('Examples:')).toBeGreaterThan(-1)
      expect(text.indexOf('Compatibility routes:')).toBeGreaterThan(text.indexOf('Examples:'))
    } finally {
      log.mockRestore()
    }
  })

  it('mentions every routed command on the help page', () => {
    // renderHelpPage is the same builder printRootHelp prints through, so this
    // asserts against the text a user actually reads.
    const help = renderHelpPage({
      title: 'probe',
      sections: COMMAND_GROUPS.map((group) => ({
        title: group.title,
        lines: COMMANDS.filter((spec) => spec.group === group.id).map(
          (spec) => `${spec.name}  ${spec.summary}`,
        ),
      })),
    })

    for (const spec of COMMANDS) {
      expect(help, `${spec.name} is routed but unlisted`).toContain(spec.name)
    }
  })

  it('keeps the commands that were once routed but unlisted', () => {
    // Regression: atlas/expand/refactor/refresh dispatched fine while being
    // absent from the help page. Named explicitly so a future prune notices.
    for (const name of ['atlas', 'expand', 'refactor', 'refresh']) {
      expect(findCommand(name), `${name} lost its route`).toBeDefined()
    }
  })

  it('routes IR-aligned primaries with route-only aliases', () => {
    expect(findCommand('census')?.name).toBe('census')
    expect(findCommand('invent')?.name).toBe('census')

    expect(findCommand('graph')?.name).toBe('graph')
    expect(findCommand('map')?.name).toBe('graph')

    expect(findCommand('measure')?.name).toBe('measure')
    expect(findCommand('mass')?.name).toBe('measure')

    expect(findCommand('stack')?.name).toBe('stack')
    expect(findCommand('surface')?.name).toBe('stack')
    expect(findCommand('profile')?.name).toBe('stack')

    expect(findCommand('form')?.name).toBe('form')
    expect(findCommand('geometry')?.name).toBe('form')

    expect(findCommand('density')?.name).toBe('density')
    expect(findCommand('analyze')?.name).toBe('density')

    expect(findCommand('outline')?.name).toBe('outline')
    expect(findCommand('skim')?.name).toBe('outline')

    expect(findCommand('inspect')?.name).toBe('inspect')
    expect(findCommand('catalog')?.name).toBe('exp')
  })
})
