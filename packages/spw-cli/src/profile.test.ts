import { describe, it, expect, vi, afterEach } from 'vitest'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { runSpwProfileCli } from './profile'
import { runSpwExpCli } from './exp'

describe('spw profile / exp', () => {
  const logs: string[] = []
  const errs: string[] = []

  afterEach(() => {
    logs.length = 0
    errs.length = 0
    vi.restoreAllMocks()
  })

  function capture() {
    vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
      logs.push(a.map(String).join(' '))
    })
    vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
      errs.push(a.map(String).join(' '))
    })
  }

  it('profile shows dialect stack for a file', async () => {
    capture()
    const dir = await mkdir(path.join(os.tmpdir(), `spw-prof-${Date.now()}`), { recursive: true })
    const file = path.join(dir!, 'demo.spw')
    await writeFile(file, '@dialect:Spw.f\n=exp[ id: flow.sigma_chain ]\n^["x"]{}\n', 'utf8')
    await runSpwProfileCli(['node', 'spw', 'profile', file])
    const out = logs.join('\n')
    expect(out).toContain('Spw.f')
    expect(out).toContain('flow.sigma_chain')
  })

  it('exp list includes catalog ids', async () => {
    capture()
    await runSpwExpCli(['node', 'spw', 'exp', 'list'])
    const out = logs.join('\n')
    expect(out).toContain('flow.sigma_chain')
    expect(out).toContain('dialect.detect')
  })

  it('exp show returns markdown for known id', async () => {
    capture()
    await runSpwExpCli(['node', 'spw', 'exp', 'show', 'flow.phi'])
    const out = logs.join('\n')
    expect(out).toContain('flow.phi')
    expect(out).toMatch(/proposed|partial|implemented/)
  })

  it('exp show fails on unknown id', async () => {
    capture()
    await runSpwExpCli(['node', 'spw', 'exp', 'show', 'no.such.id'])
    expect(process.exitCode).toBe(1)
    process.exitCode = 0
    expect(errs.join(' ')).toMatch(/unknown/)
  })
})
