import { describe, expect, it } from 'vitest'
import { fingerprintInvocation, memoryInvocations } from './cli-invocation'
import {
  commandLine,
  fenced,
  inlineCode,
  parseQueryStats,
  presentQueryPerformance,
  renderInstrumentReport,
  renderQueryStats,
  type InstrumentRun,
} from './instrument-report'

const STATS_LINE = 'spw query stats {"files_walked":151,"files_parsed":151,"bytes_read":833065,"cache_hits":0,"parse_ms":19743.7,"total_ms":20068.9}'

function queryRun(stderr: string): InstrumentRun {
  return {
    invocation: { title: 'q', arguments: ['query', '--from', 'docs', '--count', '--stats'], output: 'text' },
    stdout: 'total=755  files=100  scanned=151\n',
    stderr,
    exitCode: 0,
    durationMs: 21_000,
  }
}

describe('instrument reports', () => {
  it('names each run by its command, keeps a non-zero exit, and shows stderr before stdout', () => {
    const run: InstrumentRun = {
      invocation: fingerprintInvocation('^{ broken'),
      stdout: '# spw fingerprint  complete=false\n',
      stderr: 'incomplete\n',
      exitCode: 1,
      durationMs: 840,
    }
    const text = renderInstrumentReport({
      heading: 'Spw fingerprint',
      receipt: ['source: CLI · effect: read-only'],
      notes: ['reading: line 3'],
      runs: [run],
    }).join('\n')

    expect(text).toContain('# Spw fingerprint\n\nsource: CLI · effect: read-only\n\n- reading: line 3')
    expect(text).toContain('## `spw fingerprint --expr <1 line, 9 chars>`')
    expect(text).toContain(
      '840 ms · exit 1\n\nstderr:\n\n```text\nincomplete\n```\n\nstdout:\n\n```text\n# spw fingerprint  complete=false\n```',
    )
  })

  it('says so when a run printed nothing', () => {
    const text = renderInstrumentReport({
      heading: 'h',
      receipt: [],
      runs: [{ invocation: memoryInvocations()[1]!, stdout: '', stderr: '', exitCode: 0, durationMs: 5 }],
    }).join('\n')
    expect(text).not.toContain('stderr:')
    expect(text).toContain('stdout:\n\n```text\n(no output)\n```')
  })

  it('quotes arguments that a shell would split', () => {
    expect(commandLine(memoryInvocations()[0]!)).toBe('spw inspect memory')
    expect(commandLine({ title: 't', arguments: ['query', '--where', "file~it's here"], output: 'text' }))
      .toBe(`spw query --where 'file~it'\\''s here'`)
  })

  it('fences output that itself holds fences', () => {
    expect(fenced('a ``` b', 'text')).toEqual(['````text', 'a ``` b', '````'])
    expect(inlineCode('plain')).toBe('`plain`')
    expect(inlineCode('a `b`')).toBe('`` a `b` ``')
  })
})

describe('query performance', () => {
  it('lifts the stats line off stderr and keeps everything else', () => {
    const { stats, remainder } = parseQueryStats(`warn: slow disk\n${STATS_LINE}\n`)
    expect(stats).toEqual({
      files_walked: 151,
      files_parsed: 151,
      bytes_read: 833065,
      cache_hits: 0,
      parse_ms: 19743.7,
      total_ms: 20068.9,
    })
    expect(remainder).toBe('warn: slow disk\n')
  })

  it('leaves a malformed stats line visible', () => {
    const { stats, remainder } = parseQueryStats('spw query stats {broken')
    expect(stats).toBeUndefined()
    expect(remainder).toBe('spw query stats {broken')
  })

  it('renders walk and parse timings with derived rows', () => {
    const table = renderQueryStats(parseQueryStats(STATS_LINE).stats!, 21_000).join('\n')
    expect(table).toContain('| files parsed | 151 |')
    expect(table).toContain('| bytes read | 833065 (813.5 KiB) |')
    expect(table).toContain('| parse per file | 130.8 ms |')
    expect(table).toContain('| walk, select, and count (total − parse) | 325.2 ms |')
    expect(table).toContain('| process wall time (adds npm and CLI startup) | 21000.0 ms |')
  })

  it('moves stats into a section and drops them from the raw run', () => {
    const presented = presentQueryPerformance([queryRun(`${STATS_LINE}\n`)])
    expect(presented.sections[0]).toBe('## Walk and parse')
    expect(presented.runs[0]!.stderr.trim()).toBe('')

    const missing = presentQueryPerformance([queryRun('')])
    expect(missing.sections.join('\n')).toContain('no stats line')
  })
})
