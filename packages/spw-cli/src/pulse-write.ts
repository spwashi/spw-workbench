/**
 * Pulse write gate — pure collate decisions before atomic file replace.
 *
 * Extracted from pulse.ts so write policy stays testable without the full CLI.
 *
 * @see packages/spw-cli/src/pulse.ts
 * @see packages/spw-seed/src/canonical/topography-probe.ts
 */

import type {
  MutationMatrix,
  MutationRunResult,
  ParseHealth,
  TopographyDelta,
} from '@spwashi/spw-seed'

export type PulseWriteStatus =
  | 'not_requested'
  | 'unchanged'
  | 'ready'
  | 'written'
  | 'blocked_plan'
  | 'blocked_unhealthy_source'
  | 'blocked_non_layout_evidence'
  | 'blocked_health_regression'
  | 'blocked_structure_regression'
  | 'blocked_conflict'
  | 'blocked_stale_source'
  | 'blocked_batch'
  | 'blocked_io'

export function isAcceptedPulseTerminalState(stopReason: string): boolean {
  return stopReason === 'fixed_point'
}

export function decidePulseWriteStatus(input: {
  requested: boolean
  changed: boolean
  planComplete: boolean
  parseHealthy: boolean
  layoutOnlyEvidence: boolean
  healthRegressed: boolean
  structureMoved: boolean
  conflicts: number
  sourceUnchanged: boolean
}): PulseWriteStatus {
  if (!input.requested) return 'not_requested'
  if (!input.planComplete) return 'blocked_plan'
  if (input.healthRegressed) return 'blocked_health_regression'
  if (!input.parseHealthy) return 'blocked_unhealthy_source'
  if (input.structureMoved) return 'blocked_structure_regression'
  if (input.changed && !input.layoutOnlyEvidence) return 'blocked_non_layout_evidence'
  if (input.conflicts > 0) return 'blocked_conflict'
  if (!input.sourceUnchanged) return 'blocked_stale_source'
  if (!input.changed) return 'unchanged'
  return 'ready'
}

export function hasLayoutOnlyEvidence(
  vector: MutationRunResult['vector'],
  plannedDelta: TopographyDelta,
  changed: boolean,
): boolean {
  return (
    changed &&
    plannedDelta.layoutOnlyCandidate &&
    vector.layout_delta > 0 &&
    vector.token_delta === 0 &&
    vector.structure_delta === 0 &&
    vector.label_delta === 0 &&
    vector.reference_delta === 0 &&
    vector.script_delta === 0
  )
}

export interface PulseFileReport {
  file: string
  /** @deprecated Transport compatibility alias for wouldChange. */
  changed: boolean
  wouldChange: boolean
  workspaceApplied: boolean
  stopReason: string
  planComplete: boolean
  profile: string
  sequence: string | null
  findings: string[]
  vector: MutationRunResult['vector']
  plannedDelta: TopographyDelta
  layoutOnlyEvidence: boolean
  beforeHealth: ParseHealth
  afterHealth: ParseHealth
  plannedHash: string
  inputHash: string
  matrix?: MutationMatrix
  sequenceConflicts?: number
  writeStatus: PulseWriteStatus
  /** Session bank id when --cut cut a stencil for mutate --from. */
  stencilId?: string
}
