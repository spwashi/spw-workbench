import { execFile } from 'node:child_process'

export interface CliProcessLike {
  command: string
  arguments: string[]
  cwd: string
}

/** The slice of a VS Code CancellationToken the runner needs. */
export interface CancellationSignal {
  onCancellationRequested(listener: () => void): { dispose(): void }
}

export interface CliRunOutput {
  stdout: string
  stderr: string
  /** A non-zero exit still carries output: an incomplete fingerprint exits 1 and says why. */
  exitCode: number
  durationMs: number
}

export class CliCancelledError extends Error {}

const MAX_BUFFER_BYTES = 10 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 120_000

/**
 * Runs one CLI process. Resolves for any exit code; rejects only when the
 * process could not run, timed out, overflowed its buffer, or was cancelled.
 */
export function runCli(
  process: CliProcessLike,
  token?: CancellationSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<CliRunOutput> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    let cancelled = false
    let cancellation: { dispose(): void } | undefined
    const child = execFile(
      process.command,
      process.arguments,
      { cwd: process.cwd, encoding: 'utf8', maxBuffer: MAX_BUFFER_BYTES, timeout: timeoutMs },
      (error, stdout, stderr) => {
        cancellation?.dispose()
        const durationMs = Date.now() - startedAt
        if (cancelled) {
          reject(new CliCancelledError('Spw CLI run cancelled.'))
          return
        }
        if (!error) {
          resolve({ stdout, stderr, exitCode: 0, durationMs })
          return
        }
        const code: unknown = (error as { code?: unknown }).code
        if (typeof code === 'number' && !error.killed) {
          resolve({ stdout, stderr, exitCode: code, durationMs })
          return
        }
        if (error.killed) {
          reject(new Error(`Spw CLI run stopped after ${Math.round(timeoutMs / 1000)}s without finishing.`))
          return
        }
        reject(new Error(firstLine(stderr) || error.message))
      },
    )
    cancellation = token?.onCancellationRequested(() => {
      cancelled = true
      child.kill()
    })
  })
}

/** The first meaningful stderr line, for one-line failure messages. */
export function firstLine(text: string): string {
  return text.trim().split('\n')[0]?.trim() ?? ''
}
