import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fingerprintSource, PARSE_COLUMNS_SCHEMA } from '@spwashi/spw-seed'
import { runSpwGeometryCli } from './geometry'

const form = (...args: string[]) => runSpwGeometryCli(['node', 'spw', 'form', ...args])

describe('spw form --columns and --rhymes', () => {
  const home = process.cwd()
  let dir: string
  let log: ReturnType<typeof vi.spyOn>
  let err: ReturnType<typeof vi.spyOn>
  const printed = () => log.mock.calls.map((call: unknown[]) => String(call[0])).join('\n')

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'spw-form-columns-'))
    // Outside a workspace, form reads paths as given.
    process.chdir(dir)
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    process.exitCode = undefined
  })

  afterEach(() => {
    process.chdir(home)
    log.mockRestore()
    err.mockRestore()
    rmSync(dir, { recursive: true, force: true })
    process.exitCode = undefined
  })

  it('emits one surface as spw.parse-columns/1 columns', async () => {
    const source = 'cauldron[garden]{sow ~> tend ~> harvest}\n'
    const file = path.join(dir, 'one.spw')
    writeFileSync(file, source)
    await form(file, '--columns', '--json')
    const envelope = JSON.parse(printed())
    expect(envelope.data.schema).toBe(PARSE_COLUMNS_SCHEMA)
    expect(envelope.data.nodes).toBe(fingerprintSource(source).total)
    expect(envelope.data.columns.size[0]).toBe(envelope.data.nodes)
  })

  it('prints a template for a rhyme across files', async () => {
    writeFileSync(path.join(dir, 'a.spw'), '^["pipe"]{ feature: "a bar" means: _ }\n')
    writeFileSync(path.join(dir, 'b.spw'), '^["stages"]{ feature: "a gradient" means: _ }\n')
    await form(dir, '--rhymes')
    const text = printed()
    expect(text).toMatch(/^rhyme +×2 .*2 files +\^\[_\]\{ feature: _ means: _ \}/m)
    expect(text).toContain('"pipe" | "stages"')
  })

  it('reads one surface at a time for --columns', async () => {
    writeFileSync(path.join(dir, 'a.spw'), 'a{ b }\n')
    writeFileSync(path.join(dir, 'b.spw'), 'c{ d }\n')
    await form(dir, '--columns')
    expect(process.exitCode).toBe(2)
  })
})
