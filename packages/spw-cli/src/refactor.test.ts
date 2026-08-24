import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { REFACTOR_PLAN_SURFACE } from '@spwashi/spw-seed'
import { runSpwRefactorCli } from './refactor'

describe('spw refactor plan card', () => {
  const cwd = process.cwd()

  afterEach(() => {
    process.chdir(cwd)
    vi.restoreAllMocks()
  })

  it('emits spw.refactor.plan/1 inside the CLI envelope without writing', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'spw-refactor-'))
    await mkdir(path.join(root, '.spw'))
    await writeFile(path.join(root, '.spw', 'index.spw'), '~#status: "open"\n', 'utf8')
    process.chdir(root)

    const chunks: string[] = []
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      chunks.push(String(chunk))
      return true
    })
    vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      chunks.push(String(value ?? ''))
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await runSpwRefactorCli([
      'node', 'spw', 'refactor', '.spw/index.spw', '--rename', 'mark:status=phase', '--json',
    ])

    const raw = chunks.join('')
    const start = raw.indexOf('{')
    const envelope = JSON.parse(raw.slice(start))
    expect(envelope.ok).toBe(true)
    expect(envelope.command).toBe('refactor')
    expect(envelope.data.surface).toBe(REFACTOR_PLAN_SURFACE)
    expect(envelope.data.mode).toBe('plan')
    expect(envelope.data.effect).toBe('effect.l0.measure')
    expect(envelope.data.write).toBe(false)
    expect(envelope.data.omitted).toEqual([
      'selection_hashes',
      'parent_plan',
      'worktree_apply',
      'rebase',
    ])
    expect(envelope.data.totalEdits).toBeGreaterThan(0)
    expect(envelope.data.report[0].wrote).toBe(false)
  })
})
