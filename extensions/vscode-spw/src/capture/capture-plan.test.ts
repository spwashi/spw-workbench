import { describe, expect, it } from 'vitest'
import {
  CAPTURE_SETTINGS,
  captureStatus,
  planCaptureOff,
  planCaptureOn,
  readSavedPriors,
  type LanguageSettingInspection,
} from './capture-plan'

describe('capture mode plan', () => {
  it('turns off code lenses and inlay hints and leaves semantic colors alone', () => {
    const plan = planCaptureOn(() => undefined)
    expect(plan.writes).toEqual([
      { key: 'codeLens', value: false },
      { key: 'inlayHints.enabled', value: 'off' },
    ])
    expect(CAPTURE_SETTINGS.map(setting => setting.key).some(key => key.includes('semantic'))).toBe(false)
  })

  it('restores each prior exactly: a set value comes back, an absent one is removed', () => {
    const user: Record<string, LanguageSettingInspection> = {
      codeLens: { globalLanguageValue: true },
      'inlayHints.enabled': {},
    }
    const on = planCaptureOn(key => user[key])
    const restored = planCaptureOff(readSavedPriors(JSON.parse(JSON.stringify(on.saved)))!)
    expect(restored).toEqual([
      { key: 'codeLens', value: true },
      { key: 'inlayHints.enabled', value: undefined },
    ])
  })

  it('keeps a falsy prior distinct from no prior', () => {
    const on = planCaptureOn(key => key === 'inlayHints.enabled'
      ? { globalLanguageValue: 'offUnlessPressed' }
      : { globalLanguageValue: false })
    expect(planCaptureOff(on.saved)).toEqual([
      { key: 'codeLens', value: false },
      { key: 'inlayHints.enabled', value: 'offUnlessPressed' },
    ])
  })

  it('names keys a workspace [spw] value outranks', () => {
    const plan = planCaptureOn(key => key === 'codeLens'
      ? { workspaceLanguageValue: true }
      : { workspaceFolderLanguageValue: 'off' })
    expect(plan.shadowed).toEqual(['codeLens'])
  })

  it('reads unrecognized saved state as capture off', () => {
    expect(readSavedPriors(undefined)).toBeUndefined()
    expect(readSavedPriors([{ key: 'codeLens' }])).toBeUndefined()
    expect(readSavedPriors([])).toEqual([])
  })

  it('says in the status bar which way a click goes', () => {
    expect(captureStatus(true).tooltip).toContain('Click to restore')
    expect(captureStatus(false).text).toContain('off')
  })
})
