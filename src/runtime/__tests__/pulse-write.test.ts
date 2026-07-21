import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { promises as fsPromises } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  decidePulseWriteStatus,
  isAcceptedPulseTerminalState,
  runSpwPulseCli,
  SPW_PULSE_SCHEMA_VERSION,
} from '../../../packages/spw-cli/src/pulse'
import { runSpwCli } from '../../../packages/spw-cli/src/run'

const safe = {
  requested: true,
  changed: true,
  planComplete: true,
  parseHealthy: true,
  layoutOnlyEvidence: true,
  healthRegressed: false,
  structureMoved: false,
  conflicts: 0,
  sourceUnchanged: true,
}

const WRITE_FLAGS = ['--write', '--accept-semantic-risk']

const cleanupRoots: string[] = []
const originalCwd = process.cwd()
let previousExitCode: number | undefined

beforeEach(() => {
  previousExitCode = process.exitCode
  process.exitCode = undefined
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(async () => {
  process.chdir(originalCwd)
  process.exitCode = previousExitCode
  vi.restoreAllMocks()
  await Promise.all(cleanupRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function makeWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'spw-pulse-'))
  cleanupRoots.push(root)
  await initializeWorkspace(root)
  return root
}

async function initializeWorkspace(root: string): Promise<void> {
  await mkdir(path.join(root, '.spw'), { recursive: true })
  await writeFile(path.join(root, '.spw', 'mount.spw'), '^mount{}\n', 'utf8')
}

async function runPulse(cwd: string, args: string[]): Promise<void> {
  await runSpwPulseCli(['node', 'spw-pulse', ...args], { cwd })
}

function loggedJson(): Record<string, unknown> {
  const log = vi.mocked(console.log)
  expect(log).toHaveBeenCalledTimes(1)
  return JSON.parse(String(log.mock.calls[0][0])) as Record<string, unknown>
}

async function pulseTempDirectories(parent: string): Promise<string[]> {
  return (await fsPromises.readdir(parent))
    .filter(name => name.startsWith('.spw-pulse-'))
}

describe('pulse write preconditions', () => {
  it('permits an exact, structure-stable planned write', () => {
    expect(decidePulseWriteStatus(safe)).toBe('ready')
  })

  it('fails closed on plan, health, structure, transform, and revision hazards', () => {
    expect(decidePulseWriteStatus({ ...safe, planComplete: false })).toBe('blocked_plan')
    expect(decidePulseWriteStatus({ ...safe, parseHealthy: false })).toBe('blocked_unhealthy_source')
    expect(decidePulseWriteStatus({
      ...safe,
      parseHealthy: false,
      healthRegressed: true,
    })).toBe('blocked_health_regression')
    expect(decidePulseWriteStatus({ ...safe, structureMoved: true })).toBe('blocked_structure_regression')
    expect(decidePulseWriteStatus({ ...safe, layoutOnlyEvidence: false })).toBe('blocked_non_layout_evidence')
    expect(decidePulseWriteStatus({ ...safe, conflicts: 1 })).toBe('blocked_conflict')
    expect(decidePulseWriteStatus({ ...safe, sourceUnchanged: false })).toBe('blocked_stale_source')
  })

  it.each([
    'authority_failure',
    'budget_exhausted',
    'idempotence_failure',
    'rule_error',
  ])('withholds workspace mutation from the %s terminal state', stopReason => {
    expect(isAcceptedPulseTerminalState(stopReason)).toBe(false)
    expect(decidePulseWriteStatus({
      ...safe,
      planComplete: isAcceptedPulseTerminalState(stopReason),
    })).toBe('blocked_plan')
  })

  it('requires semantic-risk acknowledgement before any write plan', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{}   '
    await writeFile(target, source, 'utf8')

    await runPulse(root, ['--write', '--json', 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
    expect(loggedJson()).toMatchObject({
      mode: 'error',
      ok: false,
      errors: [expect.stringContaining('--accept-semantic-risk')],
    })
  })

  it.each([
    ['layout-full profile', ['--profile', 'layout_full']],
    ['equiv-script profile', ['--profile', 'equiv_scripts']],
    ['operational sequence', ['--sequence', 'layout_then_script']],
    ['rule-restricted profile', ['--rule', 'layout_bundle']],
  ])('refuses a write-capability expansion through %s', async (_name, flags) => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{}   '
    await writeFile(target, source, 'utf8')

    await runPulse(root, [...WRITE_FLAGS, '--json', ...flags, 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
    expect(loggedJson()).toMatchObject({ mode: 'error', ok: false })
  })

  it('does not expose the context-free equiv rewrite to workspace mutation', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{ @note: "literal .* and .? npm run spw:seq --" }   '
    await writeFile(target, source, 'utf8')

    await runPulse(root, [
      ...WRITE_FLAGS,
      '--profile',
      'equiv_scripts',
      '--json',
      'sample.spw',
    ])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
    expect(loggedJson()).toMatchObject({ mode: 'error', ok: false })
  })

  it('withholds workspace mutation from a recovered parse even when layout would change', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{   '
    await writeFile(target, source, 'utf8')

    await runPulse(root, [...WRITE_FLAGS, '--json', 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
    expect(loggedJson()).toMatchObject({
      mode: 'mutation',
      ok: false,
      wrote: 0,
      blockedWrites: 1,
      reports: [{
        beforeHealth: 'recovered',
        writeStatus: 'blocked_unhealthy_source',
      }],
    })
  })

  it('preserves file mode during a guarded atomic replacement', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    await writeFile(target, '^sample{}   ', 'utf8')
    await fsPromises.chmod(target, 0o640)
    const expectedMode = (await fsPromises.stat(target)).mode & 0o7777

    await runPulse(root, [...WRITE_FLAGS, '--json', 'sample.spw'])

    expect(process.exitCode).toBeUndefined()
    expect(await readFile(target, 'utf8')).toBe('^sample{}\n')
    expect((await fsPromises.stat(target)).mode & 0o7777).toBe(expectedMode)
    expect(await pulseTempDirectories(root)).toEqual([])
    expect(loggedJson()).toMatchObject({
      mode: 'mutation',
      ok: true,
      wrote: 1,
      reports: [{ writeStatus: 'written', workspaceApplied: true }],
    })
  })

  it('refuses a multiply linked file before staging', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const alias = path.join(root, 'alias.spw')
    const source = '^sample{}   '
    await writeFile(target, source, 'utf8')
    await fsPromises.link(target, alias)

    await runPulse(root, [...WRITE_FLAGS, '--json', 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
    expect(await readFile(alias, 'utf8')).toBe(source)
    expect(await pulseTempDirectories(root)).toEqual([])
    expect(loggedJson()).toMatchObject({
      mode: 'error',
      ok: false,
      errors: [expect.stringContaining('multiple hard links')],
    })
  })

  it('rejects source bytes that do not round-trip as UTF-8', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = Buffer.concat([
      Buffer.from('^sample{ @note: "', 'utf8'),
      Buffer.from([0xff]),
      Buffer.from('" }   ', 'utf8'),
    ])
    await fsPromises.writeFile(target, source)

    await runPulse(root, [...WRITE_FLAGS, '--json', 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await fsPromises.readFile(target)).toEqual(source)
    expect(await pulseTempDirectories(root)).toEqual([])
    expect(loggedJson()).toMatchObject({
      mode: 'error',
      ok: false,
      errors: [expect.stringContaining('valid UTF-8')],
    })
  })

  it('refuses a same-byte symlink swap without touching its outside target', async () => {
    const container = await mkdtemp(path.join(tmpdir(), 'spw-pulse-symlink-'))
    cleanupRoots.push(container)
    const root = path.join(container, 'consumer')
    await initializeWorkspace(root)
    const target = path.join(root, 'sample.spw')
    const outside = path.join(container, 'outside.spw')
    const source = '^sample{}   '
    await writeFile(target, source, 'utf8')
    await writeFile(outside, source, 'utf8')
    vi.spyOn(fsPromises, 'mkdtemp').mockImplementationOnce(async prefix => {
      const temporary = await mkdtemp(prefix)
      await fsPromises.unlink(target)
      await fsPromises.symlink(outside, target)
      return temporary
    })

    await runPulse(root, [...WRITE_FLAGS, '--json', 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(outside, 'utf8')).toBe(source)
    expect((await fsPromises.lstat(target)).isSymbolicLink()).toBe(true)
    expect(await fsPromises.realpath(target)).toBe(await fsPromises.realpath(outside))
    expect(await pulseTempDirectories(root)).toEqual([])
    expect(loggedJson()).toMatchObject({
      mode: 'mutation',
      ok: false,
      wrote: 0,
      reports: [{ writeStatus: 'blocked_io' }],
    })
  })

  it('surfaces exact-cleanup residue without undoing a successful replacement', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    await writeFile(target, '^sample{}   ', 'utf8')
    let stagingDirectory = ''
    vi.spyOn(fsPromises, 'mkdtemp').mockImplementationOnce(async prefix => {
      stagingDirectory = await mkdtemp(prefix)
      await writeFile(path.join(stagingDirectory, 'sentinel'), 'keep', 'utf8')
      return stagingDirectory
    })

    await runPulse(root, [...WRITE_FLAGS, '--json', 'sample.spw'])

    expect(process.exitCode).toBeUndefined()
    expect(await readFile(target, 'utf8')).toBe('^sample{}\n')
    expect(await readFile(path.join(stagingDirectory, 'sentinel'), 'utf8')).toBe('keep')
    expect(await pulseTempDirectories(root)).toEqual([path.basename(stagingDirectory)])
    expect(loggedJson()).toMatchObject({
      mode: 'mutation',
      ok: true,
      wrote: 1,
      warnings: [expect.stringContaining('remove staging directory')],
      reports: [{ writeStatus: 'written', workspaceApplied: true }],
    })
  })

  it.each([
    ['check plus write', ['--check', ...WRITE_FLAGS]],
    ['measure-only write', ['--profile', 'measure_only', ...WRITE_FLAGS]],
  ])('leaves bytes unchanged for incompatible authority: %s', async (_name, flags) => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{}   '
    await writeFile(target, source, 'utf8')

    await runPulse(root, [...flags, 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
  })

  it.each([
    ['unknown option', ['--profle', 'measure_only', '--write']],
    ['geometry write', ['--geometry', 'hof', '--write']],
    ['ladder check', ['--ladder', 'all', '--check']],
    ['mixed observation modes', ['--geometry', 'hof', '--ladder', 'all']],
    ['sequence profile', ['--sequence', 'layout_then_script', '--profile', 'layout_full']],
    ['sequence rule', ['--sequence', 'layout_then_script', '--rule', 'layout_bundle']],
  ])('rejects misleading option composition: %s', async (_name, flags) => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{}   '
    await writeFile(target, source, 'utf8')

    await runPulse(root, [...flags, 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
  })

  it('preserves a following flag when an observation mode omits its optional value', async () => {
    await runSpwPulseCli(['node', 'spw-pulse', '--geometry', '--json'])

    expect(process.exitCode).toBeUndefined()
    expect(loggedJson()).toMatchObject({
      schemaVersion: SPW_PULSE_SCHEMA_VERSION,
      surface: 'spw.pulse',
      mode: 'hof',
      ok: true,
    })
  })

  it.each([
    ['profile', ['--profile', 'unknown_profile']],
    ['rule', ['--rule', 'unknown_rule']],
    ['sequence', ['--sequence', 'unknown_sequence']],
  ])('rejects an unknown %s without falling back or writing', async (_kind, flags) => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{}   '
    await writeFile(target, source, 'utf8')

    await runPulse(root, [...WRITE_FLAGS, ...flags, 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
  })

  it('rejects a known rule that empties the selected profile pipeline', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{}   '
    await writeFile(target, source, 'utf8')

    await runPulse(root, ['--rule', 'equiv_seq_alias', ...WRITE_FLAGS, 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
  })

  it('rejects a target outside consumer authority before reading or writing it', async () => {
    const container = await mkdtemp(path.join(tmpdir(), 'spw-pulse-authority-'))
    cleanupRoots.push(container)
    const root = path.join(container, 'consumer')
    await initializeWorkspace(root)
    const outside = path.join(container, 'outside.spw')
    const source = '^outside{}   '
    await writeFile(outside, source, 'utf8')

    await runPulse(root, [...WRITE_FLAGS, '../outside.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(outside, 'utf8')).toBe(source)
  })

  it('refuses external-root writes while retaining explicit plan authority', async () => {
    const container = await mkdtemp(path.join(tmpdir(), 'spw-pulse-external-'))
    cleanupRoots.push(container)
    const root = path.join(container, 'consumer')
    const external = path.join(container, 'shared')
    await initializeWorkspace(root)
    await mkdir(external)
    const target = path.join(external, 'shared.spw')
    const source = '^shared{}   '
    await writeFile(target, source, 'utf8')
    await writeFile(
      path.join(root, '.spw', 'workspace.spw'),
      `^["roots"]{ @spw: ~"." @shared: ~${JSON.stringify(path.relative(path.join(root, '.spw'), external))} }\n`,
      'utf8',
    )

    await runPulse(root, [...WRITE_FLAGS, '@shared/shared.spw'])
    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)

    process.exitCode = undefined
    await runPulse(root, ['@shared/shared.spw'])
    expect(process.exitCode).toBeUndefined()
    expect(await readFile(target, 'utf8')).toBe(source)
  })

  it('refuses direct and aliased mounted-infrastructure writes', async () => {
    const root = await makeWorkspace()
    const workbench = path.join(root, '.spw', '_workbench')
    const target = path.join(workbench, 'internal.spw')
    const source = '^infrastructure{}   '
    await mkdir(path.join(workbench, '.spw'), { recursive: true })
    await writeFile(path.join(workbench, '.spw', 'mount.spw'), '^workbench{}\n', 'utf8')
    await writeFile(target, source, 'utf8')
    await fsPromises.symlink(workbench, path.join(root, '.spw', 'workbench-alias'), 'junction')

    await runPulse(root, [...WRITE_FLAGS, '@workbench/internal.spw'])
    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)

    process.exitCode = undefined
    await runPulse(root, [...WRITE_FLAGS, '.spw/workbench-alias/internal.spw'])
    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)

    process.exitCode = undefined
    await runPulse(root, ['--include-workbench', '@workbench/internal.spw'])
    expect(process.exitCode).toBeUndefined()
    expect(await readFile(target, 'utf8')).toBe(source)
  })

  it('blocks a valid requested member when another explicit target is missing', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{}   '
    await writeFile(target, source, 'utf8')

    await runPulse(root, [...WRITE_FLAGS, 'sample.spw', 'missing.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
  })

  it('refuses a multi-file write even when every plan is individually ready', async () => {
    const root = await makeWorkspace()
    const samples = path.join(root, 'samples')
    await mkdir(samples)
    const first = path.join(samples, 'a.spw')
    const second = path.join(samples, 'b.spw')
    const firstSource = '^first{}   '
    const secondSource = '^second{}   '
    await writeFile(first, firstSource, 'utf8')
    await writeFile(second, secondSource, 'utf8')

    await runPulse(root, [...WRITE_FLAGS, 'samples'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(first, 'utf8')).toBe(firstSource)
    expect(await readFile(second, 'utf8')).toBe(secondSource)
  })

  it('preserves a late external edit detected after atomic staging', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{}   '
    const externalEdit = '^sample{ @external }\n'
    await writeFile(target, source, 'utf8')
    vi.spyOn(fsPromises, 'mkdtemp').mockImplementationOnce(async prefix => {
      const temporary = await mkdtemp(prefix)
      await writeFile(target, externalEdit, 'utf8')
      return temporary
    })

    await runPulse(root, [...WRITE_FLAGS, 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(externalEdit)
    expect(await pulseTempDirectories(root)).toEqual([])
  })

  it('rechecks the target after staged-byte verification', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{}   '
    const externalEdit = '^sample{ @external }\n'
    await writeFile(target, source, 'utf8')
    const originalReadFile = fsPromises.readFile.bind(fsPromises)
    vi.spyOn(fsPromises, 'readFile').mockImplementation(async (file, options) => {
      const contents = await originalReadFile(file, options)
      if (String(file).endsWith('.staged')) {
        await writeFile(target, externalEdit, 'utf8')
      }
      return contents
    })

    await runPulse(root, [...WRITE_FLAGS, 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(externalEdit)
    expect(await pulseTempDirectories(root)).toEqual([])
  })

  it('compares staged bytes without replacement-character decoding', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{ @note: "�" }   '
    await writeFile(target, source, 'utf8')
    const replacementBytes = Buffer.from('�', 'utf8')
    const originalReadFile = fsPromises.readFile.bind(fsPromises)
    vi.spyOn(fsPromises, 'readFile').mockImplementation(async (file, options) => {
      if (String(file).endsWith('.staged')) {
        const staged = await originalReadFile(file)
        const replacementIndex = staged.indexOf(replacementBytes)
        expect(replacementIndex).toBeGreaterThanOrEqual(0)
        const corrupted = Buffer.concat([
          staged.subarray(0, replacementIndex),
          Buffer.from([0xff]),
          staged.subarray(replacementIndex + replacementBytes.length),
        ])
        await fsPromises.writeFile(file, corrupted)
      }
      return originalReadFile(file, options)
    })

    await runPulse(root, [...WRITE_FLAGS, '--json', 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
    expect(await pulseTempDirectories(root)).toEqual([])
    expect(loggedJson()).toMatchObject({
      mode: 'mutation',
      ok: false,
      wrote: 0,
      reports: [{ writeStatus: 'blocked_io', workspaceApplied: false }],
    })
  })

  it('leaves the target intact when the atomic rename fails', async () => {
    const root = await makeWorkspace()
    const target = path.join(root, 'sample.spw')
    const source = '^sample{}   '
    await writeFile(target, source, 'utf8')
    vi.spyOn(fsPromises, 'rename').mockRejectedValueOnce(
      Object.assign(new Error('injected rename failure'), { code: 'EIO' }),
    )

    await runPulse(root, [...WRITE_FLAGS, 'sample.spw'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(target, 'utf8')).toBe(source)
    expect(await pulseTempDirectories(root)).toEqual([])
  })

  it('does not mutate a healthy file when another requested file fails preflight', async () => {
    const root = await makeWorkspace()
    const samples = path.join(root, 'samples')
    await mkdir(samples)
    const safeFile = path.join(samples, 'a-safe.spw')
    const blockedFile = path.join(samples, 'z-blocked.spw')
    const safeSource = '^safe{}   '
    const blockedSource = '^broken{\n'
    await writeFile(safeFile, safeSource, 'utf8')
    await writeFile(blockedFile, blockedSource, 'utf8')

    await runPulse(root, [...WRITE_FLAGS, '--json', 'samples'])

    expect(process.exitCode).toBe(1)
    expect(await readFile(safeFile, 'utf8')).toBe(safeSource)
    expect(await readFile(blockedFile, 'utf8')).toBe(blockedSource)
    expect(loggedJson()).toMatchObject({
      mode: 'mutation',
      ok: false,
      wrote: 0,
      blockedWrites: 2,
      reports: [
        { file: 'samples/a-safe.spw', writeStatus: 'blocked_batch' },
        { file: 'samples/z-blocked.spw', writeStatus: 'blocked_unhealthy_source' },
      ],
    })
  })

  it('anchors a mounted-workbench default target at the enclosing consumer', async () => {
    const root = await makeWorkspace()
    const consumerFile = path.join(root, '.spw', 'consumer.spw')
    const workbench = path.join(root, '.spw', '_workbench')
    const workbenchSpw = path.join(workbench, '.spw')
    const invocationPath = path.join(workbench, 'packages', 'probe')
    const infrastructureFile = path.join(workbenchSpw, 'infrastructure.spw')
    const consumerSource = '^consumer{}   '
    const infrastructureSource = '^infrastructure{}   '
    await mkdir(workbenchSpw, { recursive: true })
    await mkdir(invocationPath, { recursive: true })
    await writeFile(path.join(workbenchSpw, 'mount.spw'), '^workbench{}\n', 'utf8')
    await writeFile(consumerFile, consumerSource, 'utf8')
    await writeFile(infrastructureFile, infrastructureSource, 'utf8')

    await runPulse(invocationPath, WRITE_FLAGS)

    expect(process.exitCode).toBeUndefined()
    expect(await readFile(consumerFile, 'utf8')).toBe('^consumer{}\n')
    expect(await readFile(infrastructureFile, 'utf8')).toBe(infrastructureSource)
    expect(await pulseTempDirectories(path.dirname(consumerFile))).toEqual([])
  })
})

describe('pulse geometry JSON transport', () => {
  it.each([
    ['label', ['--geometry', 'walk', '--label=']],
    ['form', ['--geometry', 'walk', '--form=']],
  ])('rejects an empty --%s= value', async (_name, args) => {
    await runSpwPulseCli(['node', 'spw-pulse', ...args, '--json'])

    expect(process.exitCode).toBe(1)
    expect(loggedJson()).toMatchObject({
      mode: 'error',
      ok: false,
      errors: [expect.stringContaining('requires an id')],
    })
  })

  it.each([
    ['rules', 'rules'],
    ['hof', 'hof'],
    ['graph', 'graph'],
    ['progressions', 'progressions'],
    ['walk', 'walk'],
  ])('emits structured JSON for %s mode', async (geometry, expectedMode) => {
    const log = vi.mocked(console.log)

    await runSpwPulseCli([
      'node',
      'spw-pulse',
      '--geometry',
      geometry,
      '--json',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(log).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(String(log.mock.calls[0][0]))
    expect(payload).toMatchObject({
      schemaVersion: SPW_PULSE_SCHEMA_VERSION,
      surface: 'spw.pulse',
      mode: expectedMode,
      ok: true,
      interpretationProfile: { id: 'Spw.Form.Geometry' },
    })
    if (geometry === 'walk') {
      expect(payload.applicationProfile).toMatchObject({
        id: 'Spw.Form.Geometry.Application',
      })
      expect(
        payload.walk.steps.some(
          (step: { receipt?: { profile?: { id?: string } } }) =>
            step.receipt?.profile?.id === 'Spw.Form.Geometry.Application',
        ),
      ).toBe(true)
    }
  })
})

describe('pulse versioned transport', () => {
  it('emits one structured mutation report with a structured matrix', async () => {
    const root = await makeWorkspace()
    await writeFile(path.join(root, 'sample.spw'), '^sample{}   ', 'utf8')

    await runPulse(root, ['--json', '--matrix', 'sample.spw'])

    expect(loggedJson()).toMatchObject({
      schemaVersion: SPW_PULSE_SCHEMA_VERSION,
      surface: 'spw.pulse',
      mode: 'mutation',
      ok: true,
      execution: {
        planEffectCeiling: 'effect.l1.memory',
        workspaceEffectCeiling: null,
        crossAuthorityBoundary: 'effect.l3.external',
        writeProtocol: 'single_file_atomic_replace',
        writeCapability: 'layout_canonical_only',
        semanticEquivalence: 'not_claimed',
        semanticRiskAcknowledged: false,
        multiFileWrite: 'refused_without_transaction',
      },
      reports: [{
        file: 'sample.spw',
        changed: true,
        wouldChange: true,
        workspaceApplied: false,
        planComplete: true,
        layoutOnlyEvidence: true,
        writeStatus: 'not_requested',
        findings: expect.arrayContaining([
          expect.stringContaining('plan.workspaceApplied=false wouldChange=true'),
        ]),
        matrix: {
          rows: ['layout_canonical'],
          cols: expect.any(Array),
          data: expect.any(Array),
        },
      }],
    })
  })

  it('describes measure-only execution without requiring effect-grade vocabulary', async () => {
    const root = await makeWorkspace()
    await writeFile(path.join(root, 'sample.spw'), '^sample{}   ', 'utf8')

    await runPulse(root, ['--profile', 'measure_only', '--json', 'sample.spw'])

    expect(process.exitCode).toBeUndefined()
    expect(loggedJson()).toMatchObject({
      mode: 'mutation',
      ok: true,
      execution: { planEffectCeiling: 'effect.l0.measure' },
      profile: 'measure_only',
      wouldChange: 1,
      reports: [{
        changed: true,
        wouldChange: true,
        writeStatus: 'not_requested',
      }],
    })
  })

  it('rejects diff output mixed with JSON transport', async () => {
    await runSpwPulseCli(['node', 'spw-pulse', '--diff', '--json'])

    expect(process.exitCode).toBe(1)
    expect(loggedJson()).toMatchObject({
      mode: 'error',
      ok: false,
      errors: [expect.stringContaining('--diff and --json')],
    })
  })

  it.each([
    ['all', 'all'],
    ['boundaries', 'boundaries'],
    ['ops', 'operators'],
    ['frame', 'probe'],
  ])('emits a discriminated ladder envelope for %s', async (ladder, kind) => {
    await runSpwPulseCli([
      'node',
      'spw-pulse',
      '--ladder',
      ladder,
      '--matrix',
      '--json',
    ])

    expect(loggedJson()).toMatchObject({
      schemaVersion: SPW_PULSE_SCHEMA_VERSION,
      surface: 'spw.pulse',
      mode: 'ladder',
      kind,
      ok: true,
    })
  })

  it('emits parse and validation failures as one JSON error envelope', async () => {
    await runSpwPulseCli(['node', 'spw-pulse', '--unknown-option', '--json'])

    expect(process.exitCode).toBe(1)
    expect(loggedJson()).toMatchObject({
      schemaVersion: SPW_PULSE_SCHEMA_VERSION,
      surface: 'spw.pulse',
      mode: 'error',
      ok: false,
      errors: [expect.stringContaining('unknown option')],
    })
  })

  it.each(['pulse', 'mutate', 'beat'])('routes %s through the public CLI', async command => {
    await runSpwCli(['node', 'spw', command, '--geometry', 'hof', '--json'])

    expect(loggedJson()).toMatchObject({
      schemaVersion: SPW_PULSE_SCHEMA_VERSION,
      surface: 'spw.pulse',
      mode: 'hof',
      ok: true,
    })
  })
})
