import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fingerprintSource, parse, SYNTAX_CATALOG } from '@spwashi/spw-seed'
import { resolveInitRuntimeContext, seedConsumerScaffold } from './init'
import { runSpwMassCli } from './mass'

const QUEST_FILES = ['asks.spw', 'experiments.spw', 'forks.spw', 'index.spw', 'shelves.spw', 'wonders.spw']

/** Backtick phrase bodies as written in a template, with escaped backticks restored. */
const phrase = (raw: string) => raw.replace(/\\`/g, '`')

describe('spw init --preset quest', () => {
  let root: string
  let quest: string

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-quest-preset-'))
    await seedConsumerScaffold(root, await resolveInitRuntimeContext(), { preset: 'quest' })
    quest = path.join(root, '.spw', 'quest')
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  it('writes the playground and routes to it from the index', async () => {
    expect((await fs.readdir(quest)).sort()).toEqual(QUEST_FILES)
    const index = await fs.readFile(path.join(root, '.spw', 'index.spw'), 'utf8')
    expect(index).toContain('@quest: ~"./quest/index.spw"')
    const base = await fs.readFile(path.join((await resolveInitRuntimeContext()).templateRoot, 'base', '.spw', 'index.spw'), 'utf8')
    for (const line of base.split('\n')) expect(index, 'the preset index keeps every base line').toContain(line)
  })

  it('parses every quest file with no errors', async () => {
    for (const name of QUEST_FILES) {
      const output = parse(await fs.readFile(path.join(quest, name), 'utf8'), { path: `.spw/quest/${name}` })
      expect(output.errors, name).toEqual([])
    }
  })

  it('holds every recorded projection to what the parser prints today', async () => {
    const forks = await fs.readFile(path.join(quest, 'forks.spw'), 'utf8')
    const pairs = [...forks.matchAll(/form = `((?:[^`\\]|\\`)*)`\n\s*projection = "([^"]*)"/g)]
    expect(pairs.length).toBeGreaterThanOrEqual(10)
    for (const [, form, projection] of pairs) {
      expect(fingerprintSource(phrase(form!), { expression: true }).signature, form).toBe(projection)
    }

    const experiments = await fs.readFile(path.join(quest, 'experiments.spw'), 'utf8')
    const trials = [...experiments.matchAll(/try = `((?:[^`\\]|\\`)*)`\n\s*today = "([A-Z][\w= ]*?): /g)]
    expect(trials.length).toBeGreaterThanOrEqual(3)
    for (const [, form, today] of trials) {
      expect(fingerprintSource(phrase(form!), { expression: true }).signature, form).toBe(today)
    }
  })

  it('cites experiments by catalog id with the catalog status', async () => {
    const experiments = await fs.readFile(path.join(quest, 'experiments.spw'), 'utf8')
    const cited = [...experiments.matchAll(/cite = `=exp\[id: ([\w.]+)\]`\n\s*status = "(\w+)"/g)]
    expect(cited.length).toBe(4)
    for (const [, id, status] of cited) {
      expect(SYNTAX_CATALOG.find(entry => entry.id === id)?.status, id).toBe(status)
    }
  })

  it('declares the size of forks.spw that spw measure reconciles', async () => {
    const shelves = await fs.readFile(path.join(quest, 'shelves.spw'), 'utf8')
    const declared = shelves.match(/@self: ~"\.\/forks\.spw"\n\s*%mass\{ lines: (\d+), bytes: (\d+) \}/)
    expect(declared).not.toBeNull()
    const forks = await fs.readFile(path.join(quest, 'forks.spw'))
    expect(Number(declared![1])).toBe(forks.toString('utf8').split('\n').length - 1)
    expect(Number(declared![2])).toBe(forks.byteLength)
  })

  it('measures the consumer quest when run from inside the mounted workbench', async () => {
    // npm --prefix .spw/_workbench starts the CLI inside the mount; targets still read from the consumer root.
    const mount = path.join(root, '.spw', '_workbench')
    await fs.mkdir(mount, { recursive: true })
    const lines: string[] = []
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(mount)
    const log = vi.spyOn(console, 'log').mockImplementation((...args) => { lines.push(args.join(' ')) })
    const err = vi.spyOn(console, 'error').mockImplementation((...args) => { lines.push(args.join(' ')) })
    try {
      await runSpwMassCli(['node', 'spw', 'measure', '.spw/quest'])
    } finally {
      cwd.mockRestore(); log.mockRestore(); err.mockRestore()
    }
    expect(lines.join('\n')).toMatch(/1 subject\(s\), 0 drifted/)
  })

  it('cites only files that exist beside it', async () => {
    const index = await fs.readFile(path.join(quest, 'index.spw'), 'utf8')
    for (const [, target] of index.matchAll(/~"(\.\.?\/[^"]+)"/g)) {
      await expect(fs.access(path.resolve(quest, target!)), target).resolves.toBeUndefined()
    }
  })
})
