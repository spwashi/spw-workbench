/**
 * Capture mode, as data: which `[spw]` editor settings it turns off, what it
 * remembers so the prior values come back exactly, and how it reads in the
 * status bar. Semantic colors are not on the list, so they stay.
 */

/** Language-scoped values from `WorkspaceConfiguration.inspect` for `[spw]`. */
export interface LanguageSettingInspection {
  globalLanguageValue?: unknown
  workspaceLanguageValue?: unknown
  workspaceFolderLanguageValue?: unknown
}

/** Keys under the `editor` section, written under `[spw]` in user settings. */
export const CAPTURE_SETTINGS: ReadonlyArray<{ key: string; captureValue: unknown }> = [
  { key: 'codeLens', captureValue: false },
  { key: 'inlayHints.enabled', captureValue: 'off' },
]

/** What a key held in user `[spw]` settings before capture; JSON-safe for globalState. */
export interface CaptureSaved {
  key: string
  hadPrior: boolean
  prior?: unknown
}

export interface CaptureWrite {
  key: string
  /** `undefined` removes the key, which is how an absent prior is restored. */
  value: unknown
}

export interface CaptureOnPlan {
  writes: CaptureWrite[]
  saved: CaptureSaved[]
  /** Keys a workspace `[spw]` value outranks, so the user-level write cannot hide them. */
  shadowed: string[]
}

export function planCaptureOn(
  inspect: (key: string) => LanguageSettingInspection | undefined,
): CaptureOnPlan {
  const plan: CaptureOnPlan = { writes: [], saved: [], shadowed: [] }
  for (const { key, captureValue } of CAPTURE_SETTINGS) {
    const inspection = inspect(key) ?? {}
    const prior = inspection.globalLanguageValue
    plan.saved.push(prior === undefined ? { key, hadPrior: false } : { key, hadPrior: true, prior })
    plan.writes.push({ key, value: captureValue })
    const outranking = inspection.workspaceFolderLanguageValue ?? inspection.workspaceLanguageValue
    if (outranking !== undefined && outranking !== captureValue) plan.shadowed.push(key)
  }
  return plan
}

export function planCaptureOff(saved: readonly CaptureSaved[]): CaptureWrite[] {
  return saved.map(entry => ({ key: entry.key, value: entry.hadPrior ? entry.prior : undefined }))
}

/** Narrows a globalState value back into saved priors; anything else reads as none. */
export function readSavedPriors(value: unknown): CaptureSaved[] | undefined {
  if (!Array.isArray(value)) return undefined
  const saved: CaptureSaved[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) return undefined
    const { key, hadPrior, prior } = entry as Record<string, unknown>
    if (typeof key !== 'string' || typeof hadPrior !== 'boolean') return undefined
    saved.push(hadPrior ? { key, hadPrior, prior } : { key, hadPrior })
  }
  return saved
}

export function captureStatus(on: boolean): { text: string; tooltip: string } {
  return on
    ? {
      text: '$(device-camera) Capture',
      tooltip: 'Spw capture mode is on: code lenses and inlay hints are off for Spw files; semantic colors stay. Click to restore your settings.',
    }
    : {
      text: '$(device-camera) Capture off',
      tooltip: 'Spw capture mode is off. Click to hide code lenses and inlay hints for Spw files while keeping semantic colors.',
    }
}
