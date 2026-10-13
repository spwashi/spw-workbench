/**
 * Plan stream completion — `>>[` completes with the current stamp on the
 * workspace clock, and `>>[stamp] ` with the schema's entry types.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  STREAM_TYPES,
  declaredClockZone,
  planStreamCompletion,
  resolveStreamClock,
  streamStamp,
} from '../handlers/plan-stream'
import { completion } from '../handlers/editing'
import type { HandlerDeps } from '../types'

/** 2026-10-12 19:20 UTC. */
const NOW = new Date('2026-10-12T19:20:00Z')

let root: string

function writeSurface(relative: string, text: string): void {
  const file = path.join(root, relative)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, text)
}

function planFile(): string {
  return path.join(root, '.agents', 'plans', 'demo', 'wip.spw')
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'spw-plan-stream-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('the stamp', () => {
  it('reads the wall clock of a zone', () => {
    expect(streamStamp(NOW, 'America/Chicago')).toBe('2026-10-12 14:20')
    expect(streamStamp(NOW, 'Asia/Tokyo')).toBe('2026-10-13 04:20')
    expect(streamStamp(new Date('2026-10-12T00:05:00Z'), 'UTC')).toBe('2026-10-12 00:05')
  })

  it('finds a clock frame in either head form, and never a quoted one', () => {
    expect(declaredClockZone('^"clock"{\n zone = "America/Chicago"\n}')).toBe('America/Chicago')
    expect(declaredClockZone('^["clock"]{ zone: "Europe/Paris" }')).toBe('Europe/Paris')
    expect(declaredClockZone('^"clock"{ .{ zone = "Asia/Tokyo" } }')).toBe('Asia/Tokyo')
    expect(declaredClockZone('note: "^\\"clock\\"{ zone = \\"Asia/Tokyo\\" }"')).toBeNull()
    expect(declaredClockZone('^"other"{ zone = "Asia/Tokyo" }')).toBeNull()
  })
})

describe('which clock', () => {
  it('prefers the workspace clock, site before workspace', async () => {
    writeSurface('.spw/workspace.spw', '^"clock"{ zone = "Europe/Paris" }')
    expect(await resolveStreamClock(root, { SPW_TZ: 'Asia/Tokyo' }))
      .toEqual({ zone: 'Europe/Paris', source: 'workspace', declaredIn: '.spw/workspace.spw' })

    writeSurface('.spw/site.spw', '^["clock"]{ zone = "America/Chicago" }')
    expect(await resolveStreamClock(root, { SPW_TZ: 'Asia/Tokyo' }))
      .toEqual({ zone: 'America/Chicago', source: 'workspace', declaredIn: '.spw/site.spw' })
  })

  it('falls back to SPW_TZ, then local time, passing over unknown zones', async () => {
    writeSurface('.spw/workspace.spw', '^"clock"{ zone = "Nowhere/Atlantis" }')
    expect(await resolveStreamClock(root, { SPW_TZ: 'Asia/Tokyo' })).toEqual({ zone: 'Asia/Tokyo', source: 'env' })
    expect(await resolveStreamClock(root, { SPW_TZ: 'Not/AZone' })).toEqual({ source: 'local' })
    expect(await resolveStreamClock(root, {})).toEqual({ source: 'local' })
  })
})

describe('completion in a plan file', () => {
  it('offers the stamp after >>[, closing the bracket when nothing closes it', async () => {
    writeSurface('.spw/site.spw', '^"clock"{ zone = "America/Chicago" }')
    const items = await planStreamCompletion({
      filePath: planFile(),
      prefix: ' >>[',
      suffix: '',
      position: { line: 4, character: 4 },
      workspaceRoot: root,
      now: NOW,
      env: {},
    })
    expect(items).toHaveLength(1)
    expect(items![0]).toMatchObject({
      label: '2026-10-12 14:20',
      filterText: '2026-10-12 14:20',
      textEdit: {
        range: { start: { line: 4, character: 4 }, end: { line: 4, character: 4 } },
        newText: '2026-10-12 14:20] ',
      },
    })
    expect(items![0].detail).toContain('America/Chicago')
  })

  it('replaces a partly typed stamp and leaves an existing ] alone', async () => {
    const items = await planStreamCompletion({
      filePath: planFile(),
      prefix: ' >>[2026-',
      suffix: ']',
      position: { line: 0, character: 9 },
      workspaceRoot: root,
      now: NOW,
      env: { SPW_TZ: 'UTC' },
    })
    expect(items![0].textEdit).toEqual({
      range: { start: { line: 0, character: 4 }, end: { line: 0, character: 9 } },
      newText: '2026-10-12 19:20',
    })
    expect(items![0].detail).toContain('SPW_TZ')
  })

  it('restamps an existing entry in place', async () => {
    const items = await planStreamCompletion({
      filePath: planFile(),
      prefix: ' >>[',
      suffix: '2025-01-01 00:00] observe — x',
      position: { line: 0, character: 4 },
      workspaceRoot: root,
      now: NOW,
      env: { SPW_TZ: 'UTC' },
    })
    expect(items![0].textEdit).toEqual({
      range: { start: { line: 0, character: 4 }, end: { line: 0, character: 20 } },
      newText: '2026-10-12 19:20',
    })
  })

  it('offers the schema stream types after the stamp', async () => {
    const prefix = ' >>[2026-10-12 19:20] ob'
    const items = await planStreamCompletion({
      filePath: planFile(),
      prefix,
      suffix: '',
      position: { line: 2, character: prefix.length },
      workspaceRoot: root,
    })
    expect(items!.map((item) => item.label)).toEqual([...STREAM_TYPES])
    expect(STREAM_TYPES).toEqual([
      'observe', 'decide', 'surprise', 'revise', 'blocked', 'taste',
      'rebase', 'hygiene', 'implement', 'verify', 'note',
    ])
    expect(items![0].textEdit).toEqual({
      range: { start: { line: 2, character: prefix.length - 2 }, end: { line: 2, character: prefix.length } },
      newText: 'observe — ',
    })
  })

  it('stays out of every other file and every other position', async () => {
    const base = { suffix: '', position: { line: 0, character: 4 }, workspaceRoot: root }
    expect(await planStreamCompletion({ ...base, filePath: path.join(root, 'docs', 'notes.spw'), prefix: ' >>[' })).toBeNull()
    expect(await planStreamCompletion({ ...base, filePath: planFile(), prefix: ' ^["' })).toBeNull()
    expect(await planStreamCompletion({ ...base, filePath: planFile(), prefix: ' >>[2026-10-12 19:20] observe — x' })).toBeNull()
  })

  it('answers through the completion handler', async () => {
    const uri = `file://${planFile()}`
    const text = '^["stream"]{\n >>[\n}\n'
    const deps = {
      workspaceRoot: root,
      pathFromUri: (value: string) => value.replace('file://', ''),
      getDocumentText: async () => text,
    } as unknown as HandlerDeps
    const items = await completion({ textDocument: { uri }, position: { line: 1, character: 4 } }, deps)
    expect(items).toHaveLength(1)
    expect(items[0].label).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })
})
