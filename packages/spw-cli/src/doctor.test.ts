import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DOCTOR_SCAN_EXCLUSIONS,
  formatDoctorSpw,
  inspectDoctorTarget,
  readDoctorWorkbenchPin,
  runSpwDoctorCli,
} from './doctor'

const execFileAsync = promisify(execFile)

describe('doctor portability receipts', () => {
  let root: string
  let workbench: string
  let head: string

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-doctor-test-'))
    workbench = path.join(root, '.spw', '_workbench')
    await fs.mkdir(path.join(root, '.git'), { recursive: true })
    await fs.mkdir(path.join(workbench, 'node_modules'), { recursive: true })
    await fs.writeFile(path.join(root, '.spw', 'README.md'), '# Orientation\n', 'utf8')
    await fs.writeFile(path.join(root, '.spw', 'index.spw'), '^"index"{}\n', 'utf8')
    await fs.writeFile(path.join(root, '.spw', 'workspace.spw'), '^"workspace"{}\n', 'utf8')
    await fs.writeFile(path.join(workbench, 'package.json'), '{"private":true}\n', 'utf8')

    await execFileAsync('git', ['init', '-q'], { cwd: workbench })
    await execFileAsync('git', ['add', 'package.json'], { cwd: workbench })
    await execFileAsync(
      'git',
      ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture'],
      { cwd: workbench },
    )
    const revision = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: workbench,
      encoding: 'utf8',
    })
    head = revision.stdout.trim()
    await writeMount(head)
  })

  afterEach(async () => {
    process.exitCode = 0
    await fs.rm(root, { recursive: true, force: true })
  })

  async function writeMount(pin: string): Promise<void> {
    await fs.writeFile(
      path.join(root, '.spw', 'mount.spw'),
      `^[workbench]{\n @root: ~"./_workbench"\n revision: "${pin}"\n}\n`,
      'utf8',
    )
  }

  it('defaults every serialized path to the consumer-relative projection', async () => {
    const report = await inspectDoctorTarget(root)

    expect(report.root).toBe('.')
    expect(report.paths).toEqual({
      mode: 'relative',
      consumerRoot: '.',
      spwRoot: '.spw',
      workbenchRoot: '.spw/_workbench',
    })
    expect(JSON.stringify(report)).not.toContain(root)
    expect(report.workbench).toMatchObject({
      head: head.slice(0, 12),
      checkout: 'clean',
      declaredPin: head,
      pin: 'match',
    })
    expect(report.scan.defaultExclusions).toEqual([...DEFAULT_DOCTOR_SCAN_EXCLUSIONS])
    expect(report.status).toBe('ok')
  })

  it('allows absolute path disclosure only through an explicit path projection', async () => {
    const report = await inspectDoctorTarget(root, { paths: 'absolute' })

    expect(report.paths.mode).toBe('absolute')
    expect(report.root).toBe(root)
    expect(report.paths.spwRoot).toBe(path.join(root, '.spw'))
    expect(report.paths.workbenchRoot).toBe(workbench)
  })

  it('warns on dirty checkout and stale pin without failing mount readiness', async () => {
    await fs.writeFile(path.join(workbench, 'local-note.txt'), 'local\n', 'utf8')
    await writeMount('deadbeef')
    const report = await inspectDoctorTarget(root)

    expect(report.workbench.checkout).toBe('dirty')
    expect(report.workbench.pin).toBe('drift')
    expect(report.status).toBe('warn')
    expect(report.checks.find(check => check.id === 'workbench-pin')?.status).toBe('warn')
    expect(report.checks.some(check => check.status === 'fail')).toBe(false)
  })

  it('recognizes explicit pin fields without mistaking a package version for a commit', () => {
    expect(readDoctorWorkbenchPin('version: "0.3.0"')).toBeNull()
    expect(readDoctorWorkbenchPin('workbench_revision: "abcdef123456"')).toBe('abcdef123456')
  })

  it('projects the same relative report as JSON or a Spw card', async () => {
    const report = await inspectDoctorTarget(root)
    const card = formatDoctorSpw(report)
    expect(card).toContain('~#consumer: ~"."')
    expect(card).toContain('~#workbench: ~".spw/_workbench"')
    expect(card).not.toContain(root)

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await runSpwDoctorCli(['node', 'spw', 'doctor', root, '--json'])
    const json = log.mock.calls.map(call => String(call[0])).join('\n')
    expect(JSON.parse(json).paths.mode).toBe('relative')
    expect(json).not.toContain(root)

    log.mockClear()
    await runSpwDoctorCli([
      'node', 'spw', 'doctor', root, '--json', '--paths', 'absolute',
    ])
    const disclosed = log.mock.calls.map(call => String(call[0])).join('\n')
    expect(JSON.parse(disclosed).paths).toMatchObject({
      mode: 'absolute',
      consumerRoot: root,
    })
  })
})
