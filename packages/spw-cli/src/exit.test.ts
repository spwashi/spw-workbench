import { afterEach, describe, expect, it } from 'vitest'
import {
  SpwExit,
  currentExitCode,
  exitCodeFor,
  resetExitCode,
  setExitCode,
} from './exit'

afterEach(() => {
  resetExitCode()
})

describe('SpwExit', () => {
  it('maps semantic reasons to stable codes', () => {
    expect(exitCodeFor('ok')).toBe(0)
    expect(exitCodeFor('assertion')).toBe(1)
    expect(exitCodeFor('usage')).toBe(2)
    expect(exitCodeFor('source')).toBe(3)
    expect(exitCodeFor('apply')).toBe(4)
    expect(SpwExit.usage).toBe(2)
  })

  it('sets and reads process.exitCode without exiting', () => {
    expect(setExitCode('usage')).toBe(2)
    expect(currentExitCode()).toBe(2)
    expect(setExitCode(SpwExit.source)).toBe(3)
    expect(currentExitCode()).toBe(3)
    resetExitCode()
    expect(currentExitCode()).toBe(0)
  })
})
