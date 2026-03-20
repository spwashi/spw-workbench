import type { RunSpwOptions, RunSpwResult } from './types'
import { collectPrecipitates } from './stages'

/**
 * Run the full Spw pipeline in one shot.
 * Internally uses the stage-stepping generator for consistency.
 */
export function runSpw(source: string, options: RunSpwOptions = {}): RunSpwResult {
  const { precipitates, result } = collectPrecipitates(source, options)

  // Attach precipitates to successful results for observability
  if (result.success) {
    result.precipitates = precipitates
  }

  return result
}
