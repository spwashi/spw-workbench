import { afterEach, describe, expect, it } from 'vitest'
import {
  beginStdioCapture,
  createRuntimeHarness,
  createTempWorkspace,
  runHeadlessCli,
  runtime,
  withStdioCapture,
  withTempWorkspace,
} from '../index'
import { SpwExit, resetExitCode } from '@spwashi/spw-cli'

afterEach(() => {
  resetExitCode()
})

describe('capture-stdio', () => {
  it('captures log and error streams and restores console', async () => {
    const originalLog = console.log
    const { stdio } = await withStdioCapture(async () => {
      console.log('out-line')
      console.error('err-line')
    })
    expect(stdio.outText).toBe('out-line')
    expect(stdio.errText).toBe('err-line')
    expect(console.log).toBe(originalLog)
  })

  it('allows nested restore to be idempotent', () => {
    const cap = beginStdioCapture()
    console.log('once')
    cap.restore()
    cap.restore()
    expect(cap.stdout).toEqual(['once'])
  })
})

describe('temp-workspace', () => {
  it('writes files and cleans up', async () => {
    let root = ''
    await withTempWorkspace({ files: { 'a.spw': '@a\n' } }, async (ws) => {
      root = ws.root
      expect(await ws.readFile('a.spw')).toBe('@a\n')
      await ws.writeFile('nested/b.spw', '@b\n')
      expect(await ws.readFile('nested/b.spw')).toBe('@b\n')
    })
    await expect(
      import('node:fs/promises').then((fs) => fs.access(root)),
    ).rejects.toThrow()
  })

  it('supports manual create + cleanup', async () => {
    const ws = await createTempWorkspace({ prefix: 'spw-manual-' })
    await ws.writeFile('x.spw', '!\n')
    await ws.cleanup()
    await ws.cleanup()
  })
})

describe('runtime-harness', () => {
  it('asserts successful pipeline runs', () => {
    const result = runtime.success('!["hello"]')
    expect(result.parse.success).toBe(true)
    expect(result.runtime.registers.focusKey).toBe('"')
    expect(result.runtime.traces.length).toBeGreaterThan(0)
  })

  it('asserts pipeline failures with issue detail', () => {
    const failure = runtime.failure('\u0000')
    expect(failure.issues[0]?.stage).toBe('parse')
  })

  it('throws when success is required but parse fails', () => {
    const harness = createRuntimeHarness()
    expect(() => harness.success('\u0000')).toThrow(/expected successful runSpw/)
  })
})

describe('cli-harness', () => {
  it('runs help headlessly and reports exit 0', async () => {
    const result = await runHeadlessCli({ args: ['help'] })
    expect(result.exitCode).toBe(SpwExit.ok)
    expect(result.outText.length + result.errText.length).toBeGreaterThan(0)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('reports usage failure for unknown commands', async () => {
    const result = await runHeadlessCli({ args: ['definitely-not-a-command'] })
    expect(result.exitCode).toBe(SpwExit.usage)
    expect(result.errText).toMatch(/unknown command/i)
  })

  it('runs relative to a temp workspace cwd', async () => {
    await withTempWorkspace(
      { files: { 'probe.spw': '@probe\n' } },
      async (ws) => {
        const result = await runHeadlessCli({
          cwd: ws.root,
          args: ['help'],
        })
        expect(result.exitCode).toBe(SpwExit.ok)
      },
    )
  })
})
