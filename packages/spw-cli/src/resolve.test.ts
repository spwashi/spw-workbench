import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { classifyCitation } from '@spwashi/spw-seed'
import { resolveOne } from './resolve'

describe('spw resolve classification', () => {
  it('does not treat a prose colon as a path', () => {
    // Parser-extracted targets only. The regex `~"..."` used to report this.
    expect(classifyCitation(': ').kind).toBe('malformed')
  })

  it('keeps fragment identity on a relative surface', () => {
    const cited = classifyCitation('../language/v04/index.spw#claim')
    expect(cited.kind).toBe('file')
    expect(cited.fragment).toBe('claim')
  })
})

describe('spw resolve bases', () => {
  async function workspace(): Promise<string> {
    const root = await mkdtemp(path.join(tmpdir(), 'spw-resolve-'))
    await mkdir(path.join(root, 'plans/a'), { recursive: true })
    await mkdir(path.join(root, 'packages/lib'), { recursive: true })
    await writeFile(path.join(root, 'plans/a/wip.spw'), '#>plan_a\n')
    await writeFile(path.join(root, 'plans/a/PLAN.md'), '# a\n')
    await writeFile(path.join(root, 'packages/lib/index.ts'), '')
    return root
  }

  it('prefers the citing file, then falls back to the consumer root like the LSP', async () => {
    const root = await workspace()
    const local = await resolveOne('plans/a/wip.spw', './PLAN.md', 1, root)
    expect([local.verdict, local.basis]).toEqual(['ok', 'file'])
    const rooted = await resolveOne('plans/a/wip.spw', 'packages/lib/index.ts', 2, root)
    expect([rooted.verdict, rooted.basis]).toEqual(['ok', 'root'])
  })

  it('keeps missing targets missing and checks anchors on the resolved base', async () => {
    const root = await workspace()
    const missing = await resolveOne('plans/a/wip.spw', 'packages/gone.ts', 3, root)
    expect([missing.verdict, missing.basis]).toEqual(['missing-file', null])
    const anchored = await resolveOne('plans/a/wip.spw', 'plans/a/wip.spw#plan_a', 4, root)
    expect([anchored.verdict, anchored.basis]).toEqual(['ok', 'root'])
    const unanchored = await resolveOne('plans/a/wip.spw', 'plans/a/wip.spw#plan_b', 5, root)
    expect(unanchored.verdict).toBe('missing-anchor')
  })
})
