/**
 * In-process headless CLI runner.
 *
 * Invokes `runSpwCli` without spawning a Node subprocess so tests stay fast,
 * deterministic, and free of shell quoting hazards. Captures stdout/stderr and
 * `process.exitCode` (handlers must set exit codes rather than `process.exit`).
 */

import process from 'node:process'
import {
  currentExitCode,
  resetExitCode,
  runSpwCli,
} from '@spwashi/spw-cli'
import { beginStdioCapture, type CapturedStdio } from './capture-stdio'

export interface HeadlessCliOptions {
  /** Working directory for the run (restored afterward). */
  cwd?: string
  /**
   * Full argv including the node/binary placeholders.
   * When omitted, `args` is wrapped as `['node', 'spw', ...args]`.
   */
  argv?: string[]
  /**
   * Command tokens after the binary name, e.g. `['query', '--help']`.
   * Ignored when `argv` is provided.
   */
  args?: string[]
  /**
   * When true, do not reset `process.exitCode` to 0 before the run
   * (default false — each run starts clean).
   */
  preserveExitCode?: boolean
}

export interface HeadlessCliResult extends CapturedStdio {
  /** Numeric process exit code after the run (0 when unset). */
  exitCode: number
  /** Wall-clock duration of the run in milliseconds. */
  durationMs: number
}

function buildArgv(options: HeadlessCliOptions): string[] {
  if (options.argv) return options.argv
  return ['node', 'spw', ...(options.args ?? [])]
}

/**
 * Run the Spw CLI headlessly in-process.
 *
 * @example
 * const result = await runHeadlessCli({ args: ['help'] })
 * expect(result.exitCode).toBe(0)
 * expect(result.outText).toMatch(/spw/)
 */
export async function runHeadlessCli(
  options: HeadlessCliOptions = {},
): Promise<HeadlessCliResult> {
  const previousCwd = process.cwd()
  const previousExit = process.exitCode
  const cap = beginStdioCapture()
  const started = performance.now()

  if (!options.preserveExitCode) resetExitCode()
  if (options.cwd) process.chdir(options.cwd)

  try {
    await runSpwCli(buildArgv(options))
  } finally {
    if (options.cwd) process.chdir(previousCwd)
    cap.restore()
  }

  const exitCode = currentExitCode()
  // Restore prior exit so other tests in the same worker stay isolated when
  // the harness itself is used outside afterEach hooks.
  process.exitCode = previousExit

  return {
    exitCode,
    durationMs: performance.now() - started,
    stdout: [...cap.stdout],
    stderr: [...cap.stderr],
    warnings: [...cap.warnings],
    outText: cap.outText,
    errText: cap.errText,
  }
}

/**
 * Convenience: run with a temp cwd (caller supplies an absolute path that
 * already exists). Same as `runHeadlessCli({ cwd, args })`.
 */
export async function runHeadlessCliIn(
  cwd: string,
  args: string[],
): Promise<HeadlessCliResult> {
  return runHeadlessCli({ cwd, args })
}
