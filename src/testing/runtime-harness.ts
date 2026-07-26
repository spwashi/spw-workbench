/**
 * Headless helpers around `@spwashi/spw-runtime` pipeline entry points.
 * Keeps runtime tests free of repeated success/failure boilerplate.
 */

import {
  runSpw,
  type RunSpwFailure,
  type RunSpwOptions,
  type RunSpwResult,
  type RunSpwSuccess,
} from '@spwashi/spw-runtime'

export interface RuntimeHarnessAssert {
  /**
   * Run source and require success. Returns the success result for further
   * assertions. Throws a vitest-friendly Error on failure with issue detail.
   */
  success(source: string, options?: RunSpwOptions): RunSpwSuccess
  /** Run source and require failure (parse / pipeline issues). */
  failure(source: string, options?: RunSpwOptions): RunSpwFailure
  /** Run without asserting outcome. */
  run(source: string, options?: RunSpwOptions): RunSpwResult
}

function formatIssues(result: RunSpwFailure): string {
  return result.issues
    .map((issue) => `[${issue.stage}] ${issue.message}`)
    .join('; ')
}

/**
 * Create a runtime harness. Pass vitest `expect` only if you want soft
 * assertions; by default this throws plain Errors with structured messages.
 */
export function createRuntimeHarness(): RuntimeHarnessAssert {
  return {
    run(source, options) {
      return runSpw(source, options)
    },
    success(source, options) {
      const result = runSpw(source, options)
      if (!result.success) {
        throw new Error(
          `expected successful runSpw for ${JSON.stringify(source)}; issues: ${formatIssues(result)}`,
        )
      }
      return result
    },
    failure(source, options) {
      const result = runSpw(source, options)
      if (result.success) {
        throw new Error(
          `expected runSpw failure for ${JSON.stringify(source)}; got success with ${result.runtime.traces.length} traces`,
        )
      }
      return result
    },
  }
}

/** Module-level default harness for concise imports in tests. */
export const runtime = createRuntimeHarness()
