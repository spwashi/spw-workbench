import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { runSpwCli } from './run'
import { formatWalkStats, WALK_STATS_HELP, WalkStats, walkStatsHelpLine } from './walk-stats'

const STATS_KEYS = ['files_walked', 'files_parsed', 'bytes_read', 'cache_hits', 'parse_ms', 'total_ms']
const queryFixture = fileURLToPath(new URL('./fixtures/query-profile.spw', import.meta.url))

interface Run {
  stdout: string
  stderr: string[]
}

/**
 * Run the real dispatcher in-process; console.log is stdout, console.error is
 * stderr. Date is pinned so an envelope timestamp cannot differ between runs;
 * performance.now (the stats clock) stays real.
 */
async function spw(...args: string[]): Promise<Run> {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-25T00:00:00Z'))
  const stdout: string[] = []
  const stderr: string[] = []
  const log = vi.spyOn(console, 'log').mockImplementation((...parts) => { stdout.push(parts.map(String).join(' ')) })
  const error = vi.spyOn(console, 'error').mockImplementation((...parts) => { stderr.push(parts.map(String).join(' ')) })
  const previous = process.exitCode
  try {
    await runSpwCli(['node', 'spw', ...args])
    return { stdout: stdout.join('\n'), stderr }
  } finally {
    process.exitCode = previous
    log.mockRestore()
    error.mockRestore()
    vi.useRealTimers()
  }
}

function statsLines(command: string, stderr: string[]): Array<Record<string, number>> {
  const prefix = `spw ${command} stats `
  return stderr.filter(line => line.startsWith(prefix)).map(line => JSON.parse(line.slice(prefix.length)))
}

describe('walk stats receipt', () => {
  it('formats one prefixed JSON line with the query field names', () => {
    const line = new WalkStats().line()
    expect(Object.keys(line)).toEqual(STATS_KEYS)
    expect(formatWalkStats('lint', line)).toBe(`spw lint stats ${JSON.stringify(line)}`)
    expect(walkStatsHelpLine(10)).toBe(`--stats   ${WALK_STATS_HELP}`)
  })

  it('counts parsed sources apart from bytes read without a parse', () => {
    const stats = new WalkStats()
    stats.walked(2)
    stats.parsedSource(10)
    stats.readBytes(5)
    expect(stats.timeParse(() => 'ast')).toBe('ast')
    expect(stats.line()).toMatchObject({ files_walked: 2, files_parsed: 1, bytes_read: 15, cache_hits: 0 })
  })
})

describe('--stats on query, doctor and lint', () => {
  let corpus: string
  let consumer: string
  let mountBytes: number
  let corpusBytes: number

  beforeAll(async () => {
    corpus = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-walk-lint-'))
    await fs.writeFile(path.join(corpus, 'a.spw'), '#>alpha\n^"a"{ note: "café" }\n', 'utf8')
    await fs.writeFile(path.join(corpus, 'b.spw'), '#:operation #!cache\n^"b"{}\n', 'utf8')
    corpusBytes = (await fs.readFile(path.join(corpus, 'a.spw'))).length
      + (await fs.readFile(path.join(corpus, 'b.spw'))).length

    consumer = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-walk-doctor-'))
    await fs.mkdir(path.join(consumer, '.spw'), { recursive: true })
    const mount = '^[workbench]{\n @root: ~"./_workbench"\n}\n'
    await fs.writeFile(path.join(consumer, '.spw', 'mount.spw'), mount, 'utf8')
    mountBytes = Buffer.byteLength(mount)
  })

  afterAll(async () => {
    await fs.rm(corpus, { recursive: true, force: true })
    await fs.rm(consumer, { recursive: true, force: true })
  })

  const cases: Array<[string, () => string[]]> = [
    ['query', () => ['query', '--from', queryFixture, '--selector', 'pathRefs', '--count', '--json']],
    ['query', () => ['query', '--from', queryFixture, '--selector', 'pathRefs', '--skim']],
    ['doctor', () => ['doctor', consumer, '--json']],
    ['doctor', () => ['doctor', consumer, '--spw']],
    ['doctor', () => ['doctor', consumer]],
    ['lint', () => ['lint', corpus, '--json']],
    ['lint', () => ['lint', corpus]],
  ]

  it.each(cases)('%s writes one stats line to stderr and leaves stdout byte-identical', async (command, argv) => {
    const plain = await spw(...argv())
    const withStats = await spw(...argv(), '--stats')
    expect(withStats.stdout).toBe(plain.stdout)
    expect(withStats.stdout).not.toContain(' stats {')
    expect(statsLines(command, plain.stderr)).toHaveLength(0)
    const lines = statsLines(command, withStats.stderr)
    expect(lines).toHaveLength(1)
    expect(Object.keys(lines[0]!)).toEqual(STATS_KEYS)
    // Everything else on stderr is unchanged too.
    expect(withStats.stderr.filter(line => !line.startsWith(`spw ${command} stats `))).toEqual(plain.stderr)
  })

  it('reports what each command actually walked', async () => {
    const query = statsLines('query', (await spw('query', '--from', queryFixture, '--count', '--stats')).stderr)[0]
    expect(query).toMatchObject({ files_walked: 1, files_parsed: 1, cache_hits: 0 })
    expect(query!.bytes_read).toBe((await fs.readFile(queryFixture)).length)

    const lint = statsLines('lint', (await spw('lint', corpus, '--stats')).stderr)[0]
    expect(lint).toMatchObject({ files_walked: 2, files_parsed: 2, bytes_read: corpusBytes, cache_hits: 0 })
    expect(lint!.parse_ms).toBeGreaterThanOrEqual(0)
    expect(lint!.total_ms).toBeGreaterThanOrEqual(lint!.parse_ms)

    // Doctor walks no corpus and parses nothing; it reads mount.spw for the pin regex.
    const doctor = statsLines('doctor', (await spw('doctor', consumer, '--stats')).stderr)[0]
    expect(doctor).toMatchObject({ files_walked: 0, files_parsed: 0, bytes_read: mountBytes, cache_hits: 0, parse_ms: 0 })
  })

  it.each(['query', 'doctor', 'lint'])('%s --help lists --stats with the shared wording', async (command) => {
    const help = await spw(command, '--help')
    const line = help.stdout.split('\n').find(row => row.trim().startsWith('--stats'))
    expect(line).toBeDefined()
    expect(line!.trim()).toMatch(new RegExp(`^--stats\\s+${WALK_STATS_HELP.replace(/[()]/g, '\\$&')}$`))
  })

  it('still rejects near-miss flags', async () => {
    const lint = await spw('lint', corpus, '--statz')
    expect(lint.stderr.join('\n')).toContain('spw lint: unknown flag --statz')
    await expect(runSpwCli(['node', 'spw', 'doctor', consumer, '--statz'])).rejects.toThrow('unknown option --statz')
  })
})
