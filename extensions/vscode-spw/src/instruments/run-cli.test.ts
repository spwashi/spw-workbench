import { describe, expect, it } from 'vitest'
import { CliCancelledError, firstLine, runCli, type CancellationSignal } from './run-cli'

const node = (script: string) => ({
  command: process.execPath,
  arguments: ['-e', script],
  cwd: process.cwd(),
})

describe('CLI runner', () => {
  it('resolves a non-zero exit with its output, so the reading still shows', async () => {
    const output = await runCli(node('process.stdout.write("out"); process.stderr.write("why"); process.exit(1)'))
    expect(output).toMatchObject({ stdout: 'out', stderr: 'why', exitCode: 1 })
    expect(output.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('rejects when the command cannot run at all', async () => {
    await expect(runCli({ command: 'spw-no-such-binary', arguments: [], cwd: process.cwd() }))
      .rejects.toThrow()
  })

  it('rejects with a cancellation the caller can recognize', async () => {
    const token: CancellationSignal = {
      onCancellationRequested(listener) {
        const timer = setTimeout(listener, 20)
        return { dispose: () => clearTimeout(timer) }
      },
    }
    await expect(runCli(node('setTimeout(() => {}, 5000)'), token))
      .rejects.toBeInstanceOf(CliCancelledError)
  })

  it('rejects a run that outlives its timeout', async () => {
    await expect(runCli(node('setTimeout(() => {}, 5000)'), undefined, 50))
      .rejects.toThrow('without finishing')
  })

  it('reads the first meaningful stderr line', () => {
    expect(firstLine('\n  spw: ENOENT\nstack…')).toBe('spw: ENOENT')
    expect(firstLine('')).toBe('')
  })
})
