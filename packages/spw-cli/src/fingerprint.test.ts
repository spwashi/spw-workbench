import { describe, expect, it, vi } from 'vitest'
import { fingerprintSource } from '@spwashi/spw-seed'
import { runSpwFingerprintCli } from './fingerprint'

describe('spw fingerprint', () => {
  it('prints a Type=count signature for --expr', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      await runSpwFingerprintCli(['fingerprint', '--expr', 'cauldron[garden]{sow ~> tend}'])
      const text = log.mock.calls.map(call => String(call[0])).join('\n')
      expect(text).toMatch(/Frame=\d/)
      expect(text).toMatch(/Body=\d/)
    } finally {
      log.mockRestore()
      err.mockRestore()
    }
  })

  it('agrees with the seed contour helper', () => {
    const fp = fingerprintSource('a[b]{c}', { expression: true })
    expect(fp.signature.split(' ').every(part => /^\w+=\d+$/.test(part))).toBe(true)
  })
})
