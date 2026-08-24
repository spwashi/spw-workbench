/**
 * Pulse Spw cards — ChangeReport disclosure without growing pulse.ts.
 *
 * Collate-only disclosure: original → plannedSource as Spw delta card
 * (same spine as `spw delta`, via formatSpwCard).
 *
 * @see packages/spw-seed/src/canonical/change-report.ts
 * @see packages/spw-cli/src/delta.ts
 */

import { buildChangeReport, formatChangeReportSpw } from '@spwashi/spw-seed'

/** Build a Spw ChangeReport card for a pulse plan revision pair. */
export function pulseDeltaCard(
  before: string,
  after: string,
  options: { uri?: string } = {},
): string {
  const report = buildChangeReport(before, after, {
    uri: options.uri,
  })
  return formatChangeReportSpw(report)
}

/** Print a Spw card when the planned rewrite differs from the source. */
export function emitPulseDelta(
  before: string,
  after: string,
  options: { uri?: string } = {},
): void {
  if (before === after) return
  console.log(pulseDeltaCard(before, after, options))
}
