/**
 * Shared CLI exit codes for headless hosts, tests, and agent consumers.
 *
 * Aligns with docs/design/spw-q-candidate-spec.md §2.1:
 *   0 completed (including zero matches)
 *   1 assertion failed (--require-match / --check)
 *   2 syntax or option error
 *   3 unreadable / strictly invalid source
 *   4 refactor apply refused (stale plan, conflict, unauthorized)
 */

export const SpwExit = {
  ok: 0,
  assertion: 1,
  usage: 2,
  source: 3,
  apply: 4,
} as const

export type SpwExitCode = (typeof SpwExit)[keyof typeof SpwExit]

export type SpwExitReason =
  | 'ok'
  | 'assertion'
  | 'usage'
  | 'source'
  | 'apply'

const REASON_TO_CODE: Record<SpwExitReason, SpwExitCode> = {
  ok: SpwExit.ok,
  assertion: SpwExit.assertion,
  usage: SpwExit.usage,
  source: SpwExit.source,
  apply: SpwExit.apply,
}

/** Map a semantic failure class to a process exit code. */
export function exitCodeFor(reason: SpwExitReason): SpwExitCode {
  return REASON_TO_CODE[reason]
}

/**
 * Set `process.exitCode` without calling `process.exit`.
 * Prefer this in CLI handlers so in-process headless runners can observe the code.
 */
export function setExitCode(reason: SpwExitReason | SpwExitCode): SpwExitCode {
  const code = typeof reason === 'number' ? reason : exitCodeFor(reason)
  process.exitCode = code
  return code
}

/** Read the current process exit code as a number (default 0). */
export function currentExitCode(): number {
  return typeof process.exitCode === 'number' ? process.exitCode : 0
}

/** Reset exit code to success — used by headless harnesses between runs. */
export function resetExitCode(): void {
  process.exitCode = 0
}
