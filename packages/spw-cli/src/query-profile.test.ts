import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const fixture = path.join(root, 'packages/spw-cli/src/fixtures/query-profile.spw')
function query(from: string, flags: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'packages/spw-cli/src/main.ts',
    'query', '--from', from, '--selector', 'pathRefs', ...flags],
  { cwd: root, encoding: 'utf8', timeout: 10000 })
}
function receipts(stderr: string) {
  return stderr.trim().split('\n').filter(line => line.startsWith('spw query profile '))
    .map(line => JSON.parse(line.slice('spw query profile '.length)))
}

describe('query --profile', () => {
  it.each([['--count', '--json'], ['--json'], ['--table'], ['--skim', '--context', '1']])(
    'preserves output and exit status: %s', (...flags) => {
      const plain = query(fixture, flags)
      const profiled = query(fixture, [...flags, '--profile'])
      expect(plain.status).toBe(0)
      expect(profiled.status).toBe(plain.status)
      expect(profiled.stdout).toBe(plain.stdout)
      expect(plain.stderr).not.toContain('spw query profile')
      expect(profiled.stdout).not.toContain('spw query profile')
      const events = receipts(profiled.stderr)
      const report = events.at(-1)
      expect(report).toMatchObject({ event: 'report', discovered: 1, processed: 1,
        bytes: Buffer.byteLength(readFileSync(fixture)) })
      expect(report.slowest).toHaveLength(1)
      expect(report.slowest[0]).toMatchObject({ file: 'packages/spw-cli/src/fixtures/query-profile.spw',
        bytes: report.bytes, parseOutcome: 'ast' })
      expect(Object.keys(report.stagesMs)).toEqual(['discovery', 'read', 'parse', 'evaluate', 'format'])
      for (const [stage, ms] of Object.entries(report.stagesMs)) {
        expect(ms).toBeGreaterThanOrEqual(0)
        expect(ms).toBeCloseTo(events.filter(e => e.event === 'stage' && e.stage === stage)
          .reduce((sum, e) => sum + e.elapsedMs, 0), 8)
      }
      const entered = events.findIndex(e => e.event === 'enter' && e.stage === 'parse')
      expect(entered).toBeGreaterThan(0)
      expect(events[entered].file).toContain('query-profile.spw')
      expect(events[entered + 1]).toMatchObject({ event: 'stage', stage: 'parse' })
      expect(profiled.stderr).not.toContain('café')
      if (flags.includes('--count')) expect(JSON.parse(profiled.stdout).total).toBe(2)
    }, 20000,
  )

  it('accounts for all sources but retains only five slowest, including empty scans', () => {
    const dir = mkdtempSync(path.join(root, 'spw-profile-test-'))
    try {
      let result = query(dir, ['--count', '--profile'])
      expect(receipts(result.stderr).at(-1)).toMatchObject({ discovered: 0, processed: 0, bytes: 0, slowest: [] })
      const source = readFileSync(fixture)
      for (let i = 0; i < 7; i++) writeFileSync(path.join(dir, `${i}.spw`), source)
      result = query(dir, ['--count', '--profile'])
      expect(result.status).toBe(0)
      const report = receipts(result.stderr).at(-1)
      expect(report).toMatchObject({ discovered: 7, processed: 7, bytes: source.length * 7 })
      expect(report.slowest).toHaveLength(5)
      expect(report.slowest.map((s: { elapsedMs: number }) => s.elapsedMs))
        .toEqual(report.slowest.map((s: { elapsedMs: number }) => s.elapsedMs).sort((a: number, b: number) => b - a))
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }, 20000)
})
