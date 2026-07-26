/**
 * Headless stdio capture for in-process CLI / runtime tests.
 * Mocks console.log / console.error / console.warn without spawning a subprocess.
 */

export interface CapturedStdio {
  stdout: string[]
  stderr: string[]
  warnings: string[]
  /** Joined stdout lines (single trailing newline stripped per line join). */
  outText: string
  /** Joined stderr lines. */
  errText: string
}

export interface StdioCaptureHandle extends CapturedStdio {
  /** Restore original console methods. Safe to call more than once. */
  restore(): void
}

type ConsoleMethod = (...args: unknown[]) => void

function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg
      if (arg instanceof Error) return arg.stack ?? arg.message
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
}

/**
 * Begin capturing console output. Call `restore()` in `afterEach` or `finally`.
 *
 * @example
 * const cap = beginStdioCapture()
 * try {
 *   console.log('hello')
 *   expect(cap.outText).toContain('hello')
 * } finally {
 *   cap.restore()
 * }
 */
export function beginStdioCapture(): StdioCaptureHandle {
  const stdout: string[] = []
  const stderr: string[] = []
  const warnings: string[] = []

  // Keep the original function references (do not .bind) so restore is identity-stable.
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn

  let restored = false

  console.log = ((...args: unknown[]) => {
    stdout.push(formatArgs(args))
  }) as ConsoleMethod
  console.error = ((...args: unknown[]) => {
    stderr.push(formatArgs(args))
  }) as ConsoleMethod
  console.warn = ((...args: unknown[]) => {
    warnings.push(formatArgs(args))
  }) as ConsoleMethod

  const handle: StdioCaptureHandle = {
    stdout,
    stderr,
    warnings,
    get outText() {
      return stdout.join('\n')
    },
    get errText() {
      return stderr.join('\n')
    },
    restore() {
      if (restored) return
      restored = true
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
    },
  }

  return handle
}

/**
 * Run an async function with stdio captured; always restores console.
 */
export async function withStdioCapture<T>(
  fn: (cap: CapturedStdio) => Promise<T> | T,
): Promise<{ result: T; stdio: CapturedStdio }> {
  const cap = beginStdioCapture()
  try {
    const result = await fn(cap)
    return {
      result,
      stdio: {
        stdout: [...cap.stdout],
        stderr: [...cap.stderr],
        warnings: [...cap.warnings],
        outText: cap.outText,
        errText: cap.errText,
      },
    }
  } finally {
    cap.restore()
  }
}
