import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parse, walkAST, type OperationNode } from '@spwashi/spw-seed'
import { printInitUsage, resolveInitRuntimeContext, seedConsumerScaffold, suggestedNextSteps } from './init'

const QUEST_STEP = 'npm --prefix .spw/_workbench run spw -- quest'

/** Names of the `^["name"]` / `^"name"` frames in a parse tree. */
function frameNames(source: string): string[] {
  const names: string[] = []
  walkAST(parse(source).ast!, node => {
    if (node.type !== 'Operation') return
    const op = node as OperationNode
    const first = op.frame?.content[0]
    if (op.operator.value === '^' && first?.type === 'Parameter' && first.value.type === 'Literal') {
      names.push(first.value.token.value.slice(1, -1))
    }
  })
  return names
}

describe('init scaffold', () => {
  let root: string

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-init-test-'))
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  it('parses every scaffold .spw file with no errors', async () => {
    await seedConsumerScaffold(root, await resolveInitRuntimeContext())
    const files = (await fs.readdir(path.join(root, '.spw'))).filter(name => name.endsWith('.spw'))
    expect(files.sort()).toEqual(['index.spw', 'mount.spw', 'workspace.spw'])
    for (const name of files) {
      const output = parse(await fs.readFile(path.join(root, '.spw', name), 'utf8'))
      expect(output.success, name).toBe(true)
      expect(output.errors, name).toEqual([])
    }
  })

  it('gives index.spw a grow frame and a first question with a probe', async () => {
    await seedConsumerScaffold(root, await resolveInitRuntimeContext())
    const index = await fs.readFile(path.join(root, '.spw', 'index.spw'), 'utf8')
    expect(frameNames(index)).toContain('grow')
    expect(index).toMatch(/#>notes/)

    let probe = false
    walkAST(parse(index).ast!, node => {
      if (node.type !== 'Operation' || (node as OperationNode).operator.value !== '?') return
      walkAST(node, inner => {
        const op = inner as OperationNode
        if (inner.type === 'Operation' && op.operator.value === '!' && op.operatorLabel?.value === 'probe') probe = true
      })
    })
    expect(probe).toBe(true)
  })

  it('ends the README grow section with the mounted verify commands and a stop', async () => {
    await seedConsumerScaffold(root, await resolveInitRuntimeContext())
    const readme = await fs.readFile(path.join(root, '.spw', 'README.md'), 'utf8')
    const grow = readme.slice(readme.indexOf('## Grow'), readme.indexOf('## Model Prompt'))
    expect(grow).toContain('npm --prefix .spw/_workbench run spw -- lint .spw')
    expect(grow).toContain('npm --prefix .spw/_workbench run spw -- resolve --from .spw')
    expect(grow.trim().endsWith('Stop before any commit, read the diff.')).toBe(true)
  })

  it('keeps files that already exist and leaves no empty directories', async () => {
    await fs.mkdir(path.join(root, '.spw'), { recursive: true })
    await fs.writeFile(path.join(root, '.spw', 'index.spw'), '#>mine\n', 'utf8')
    await seedConsumerScaffold(root, await resolveInitRuntimeContext())
    expect(await fs.readFile(path.join(root, '.spw', 'index.spw'), 'utf8')).toBe('#>mine\n')

    const dirs: string[] = []
    async function walk(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      if (entries.length === 0) dirs.push(dir)
      for (const entry of entries) if (entry.isDirectory()) await walk(path.join(dir, entry.name))
    }
    await walk(root)
    expect(dirs).toEqual([])
  })
})

describe('init guidance', () => {
  it('ends every next-step list at the quest', () => {
    for (const ready of [true, false]) {
      for (const hasWorkbench of [true, false]) {
        for (const hasWorkbenchDependencies of [true, false]) {
          const steps = suggestedNextSteps({ ready, hasWorkbench, hasWorkbenchDependencies })
          expect(steps.at(-1)).toBe(QUEST_STEP)
        }
      }
    }
  })

  it('lists only base files under Scaffolds in help', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    try {
      printInitUsage()
      const text = String(log.mock.calls[0]?.[0] ?? '')
      const scaffolds = text.slice(text.indexOf('Scaffolds:'), text.indexOf('Preset show adds:'))
      expect(scaffolds).toContain('.spw/index.spw')
      for (const presetFile of ['origin.spw', 'containers.spw', 'anchors.spw']) {
        expect(scaffolds).not.toContain(presetFile)
        expect(text).toContain(presetFile)
      }
    } finally {
      log.mockRestore()
    }
  })
})
