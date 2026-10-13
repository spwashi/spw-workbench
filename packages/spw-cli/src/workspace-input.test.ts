import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mountedConsumerRoot, resolveCliInput } from './workspace'

describe('resolveCliInput', () => {
  let consumer: string
  let mount: string

  beforeEach(async () => {
    consumer = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'spw-cli-input-')))
    mount = path.join(consumer, '.spw', '_workbench')
    await fs.mkdir(path.join(mount, 'packages', 'spw-cli'), { recursive: true })
    await fs.writeFile(path.join(consumer, '.spw', 'mount.spw'), '#>mount\n')
  })

  afterEach(async () => {
    await fs.rm(consumer, { recursive: true, force: true })
  })

  it('reads a relative path from the consumer root in a mounted run', async () => {
    expect(await mountedConsumerRoot(mount)).toBe(consumer)
    expect(await resolveCliInput('.spw/quest/forks.spw', mount)).toBe(path.join(consumer, '.spw/quest/forks.spw'))
  })

  it('leaves a relative path unchanged outside a mounted run', async () => {
    expect(await mountedConsumerRoot(consumer)).toBeNull()
    expect(await resolveCliInput('.spw/quest/forks.spw', consumer)).toBe('.spw/quest/forks.spw')
  })

  it('leaves an absolute path unchanged', async () => {
    expect(await resolveCliInput('/tmp/x.spw', mount)).toBe('/tmp/x.spw')
  })
})
