import type { RunSpwOptions, RunSpwResult } from './types'
import { collectPrecipitants } from './stages'

/**
 * Run the full Spw pipeline in one shot.
 * Internally uses the stage-stepping generator for consistency.
 */
export function runSpw(source: string, options: RunSpwOptions = {}): RunSpwResult {
  const { precipitants, result } = collectPrecipitants(source, options)

  // Attach precipitants to successful results for observability
  if (result.success) {
    result.precipitants = precipitants
  }

  return result
}
