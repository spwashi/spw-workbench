import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadQuest } from '@spwashi/spw-seed'
import { findCommand } from './commands'
import { resolveInitRuntimeContext, seedConsumerScaffold } from './init'
import { locateQuestFile, runSpwQuestCli } from './quest'
import { formatGrowCommand, parseGrowLine, type GrowDispatch } from './quest-grow'

const dispatch: GrowDispatch = async (name, args) => {
  const spec = findCommand(name)
  if (!spec) throw new Error(`unknown command ${name}`)
  await spec.run(name, args)
}

async function quest(...args: string[]): Promise<{ exitCode: number; out: string }> {
  process.exitCode = 0
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  try {
    await runSpwQuestCli(['node', 'quest', ...args], { dispatch })
    const exitCode = typeof process.exitCode === 'number' ? process.exitCode : 0
    return { exitCode, out: log.mock.calls.map(call => String(call[0])).join('\n') }
  } finally {
    log.mockRestore()
    error.mockRestore()
    process.exitCode = 0
  }
}

const steps = loadQuest(await fs.readFile(await locateQuestFile(), 'utf8')).steps

describe('spw quest', () => {
  it('walks the steps in quest.spw order', async () => {
    expect(steps.map(step => step.id)).toEqual(['write', 'act', 'hold', 'name', 'point', 'ask', 'grow'])
    const { out } = await quest('--list')
    const order = steps.map(step => out.indexOf(`. ${step.id}`))
    expect(order.every(index => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('passes every try and then line on its own check', async () => {
    for (const step of steps.filter(s => s.check !== 'commands_pass')) {
      for (const line of [step.try, ...step.then]) {
        const { exitCode, out } = await quest('--check', step.id, line)
        expect(exitCode, `${step.id}: ${line}\n${out}`).toBe(0)
        expect(out).toContain('pass')
      }
    }
  })

  it('takes the try line when --check names only a step', async () => {
    expect((await quest('--check', 'ask')).exitCode).toBe(0)
  })

  it.each([
    ['act', 'door'],
    ['hold', 'door[closed]{hinge.frame.key}'],
    ['name', 'my_notes'],
    ['point', '~"./yesterday.spw"'],
    ['ask', '?door'],
  ])('fails %s on %j with exit 1', async (step, line) => {
    const { exitCode, out } = await quest('--check', step, line)
    expect(exitCode).toBe(1)
    expect(out).toContain('fail')
    expect(out).toContain('looks for:')
  })

  it('emits steps, checks, and a passing result per try and then line as JSON', async () => {
    const { out } = await quest('--json')
    const json = JSON.parse(out)
    expect(json.quest).toBe('learn_quest')
    expect(json.steps.map((step: { id: string }) => step.id)).toEqual(steps.map(step => step.id))
    expect(Object.keys(json.checks)).toContain('commands_pass')
    const shaped = json.results.filter((result: { host?: string }) => !result.host)
    expect(shaped.length).toBeGreaterThan(steps.length)
    for (const result of shaped) {
      expect(result, result.line).toMatchObject({ pass: true, parsed: true })
      expect(result.reading).toHaveProperty('operators')
      expect(result.reading).toHaveProperty('containers')
    }
    const grow = json.results.find((result: { step: string }) => result.step === 'grow')
    expect(grow).toMatchObject({ host: 'commands', pass: false })
  })

  it('emits one check result as JSON', async () => {
    const { exitCode, out } = await quest('--check', 'point', '@yesterday: ~"./yesterday.spw"', '--json')
    expect(exitCode).toBe(0)
    const result = JSON.parse(out)
    expect(result).toMatchObject({ step: 'point', check: 'path_ref', pass: true })
    expect(result.reading.operators).toEqual([
      { mark: '@', name: 'perspective' },
      { mark: '~', name: 'potential' },
    ])
  })

  it('refuses an unknown step', async () => {
    await expect(quest('--check', 'nowhere', 'x')).rejects.toThrow(/no step "nowhere"/)
  })
})

describe('spw quest grow', () => {
  let root: string
  let cwd: string

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-quest-test-'))
    await seedConsumerScaffold(root, await resolveInitRuntimeContext())
    // The directories the scaffold's mount.spw cites inside a mounted workbench.
    for (const dir of ['lib/spw-v0.3.0', 'packages/spw-cli', 'packages/spw-lsp']) {
      await fs.mkdir(path.join(root, '.spw', '_workbench', dir), { recursive: true })
    }
    cwd = process.cwd()
    process.chdir(root)
  })

  afterEach(async () => {
    process.chdir(cwd)
    await fs.rm(root, { recursive: true, force: true })
  })

  it('passes lint and resolve on a fresh init scaffold', async () => {
    const { exitCode, out } = await quest('--check', 'grow', '--json')
    const result = JSON.parse(out)
    expect(result.runs.map((run: { command: string }) => run.command)).toEqual([
      'spw lint .spw',
      'spw resolve --from .spw',
    ])
    const output = result.runs.flatMap((run: { output: string[] }) => run.output).join('\n')
    expect(result.runs.every((run: { exitCode: number }) => run.exitCode === 0), output).toBe(true)
    expect(result.pass).toBe(true)
    expect(exitCode).toBe(0)
  })

  it('fails when a citation breaks', async () => {
    const index = path.join(root, '.spw', 'index.spw')
    const source = await fs.readFile(index, 'utf8')
    await fs.writeFile(index, source.replace('^"roots"{', '^"roots"{\n  @notes: ~"./notes.spw"'))
    const { exitCode, out } = await quest('--check', 'grow', '--json')
    expect(JSON.parse(out).pass).toBe(false)
    expect(exitCode).toBe(1)
  })

  it('prints the commands in mounted form with --dry-run', async () => {
    const { exitCode, out } = await quest('--check', 'grow', '--dry-run')
    expect(out.split('\n')).toEqual([
      'npm --prefix .spw/_workbench run spw -- lint .spw',
      'npm --prefix .spw/_workbench run spw -- resolve --from .spw',
    ])
    expect(exitCode).toBe(0)
  })
})

describe('grow lines', () => {
  it('accepts read-only spw commands joined by &&', () => {
    expect(parseGrowLine('spw lint .spw && spw resolve --from .spw')).toEqual([
      { args: ['lint', '.spw'] },
      { args: ['resolve', '--from', '.spw'] },
    ])
  })

  it.each(['rm -rf .spw', 'spw lint .spw; rm x', 'spw mutate .spw --write', 'spw lint "$HOME"', 'spw lint .spw &&'])(
    'refuses %j',
    line => {
      expect(() => parseGrowLine(line)).toThrow()
    },
  )

  it('formats each command for the way the reader runs the CLI', () => {
    const [lint] = parseGrowLine('spw lint .spw')
    expect(formatGrowCommand(lint!, 'mounted')).toBe('npm --prefix .spw/_workbench run spw -- lint .spw')
    expect(formatGrowCommand(lint!, 'workbench')).toBe('npm run spw -- lint .spw')
    expect(formatGrowCommand(lint!, 'bare')).toBe('spw lint .spw')
  })
})
