import { describe, expect, it } from 'vitest'
import { fingerprintSource, formatFingerprintSignature } from './fingerprint'

describe('fingerprintSource', () => {
  it('counts the taught noun form as one structured contour', () => {
    const fp = fingerprintSource('cauldron[garden]{sow ~> tend ~> harvest}', { expression: true })
    expect(fp.success).toBe(true)
    expect(fp.proseFallback).toBe(false)
    expect(fp.byType.Frame).toBeGreaterThanOrEqual(1)
    expect(fp.byType.Body).toBeGreaterThanOrEqual(1)
    expect(fp.signature).toContain('Body=')
    expect(fp.total).toBeGreaterThan(3)
  })

  it('formats a stable signature', () => {
    expect(formatFingerprintSignature({ Body: 1, Capsule: 1, Frame: 0 })).toBe(
      'Body=1 Capsule=1 Frame=0',
    )
  })

  it('discloses prose fallback instead of inventing a contour', () => {
    const fp = fingerprintSource('{unterminated', { expression: true })
    expect(fp.success === false || fp.proseFallback || fp.errorCount > 0).toBe(true)
  })
})
