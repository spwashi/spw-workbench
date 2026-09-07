import { describe, expect, it, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { scanMalformedAxes } from '@spwashi/spw-seed'
import { runSpwLintCli } from './lint'

describe('spw lint', () => {
  it('uses the seed scanner for dropped mood sigils', () => {
    expect(scanMalformedAxes('#:layer semantics\n')[0]?.expected).toBe('#!semantics')
  })

  it('fails a surface that drops #! on an axis', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-lint-'))
    const file = path.join(root, 'axis.spw')
    await fs.writeFile(file, '#:operation contract\n^["ok"]{}\n', 'utf8')
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const previous = process.exitCode
    try {
      await runSpwLintCli(['lint', file])
      expect(process.exitCode).toBe(1)
      const text = log.mock.calls.map(call => String(call[0])).join('\n')
      expect(text).toMatch(/malformed-axis/)
    } finally {
      process.exitCode = previous
      log.mockRestore()
      err.mockRestore()
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})
