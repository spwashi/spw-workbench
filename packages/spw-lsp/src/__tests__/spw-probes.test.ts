import { describe, it, expect, vi } from 'vitest'
import {
  computeOperatorFrequency,
  formSequenceProbe,
  phaseContext,
  operatorFrequency,
  registerSnapshot,
  resonance,
} from '../handlers/spw-probes'
import { ServerIndex } from '../server-index'
import type { HandlerDeps } from '../types'

function makeDeps(text = '', overrides: Partial<HandlerDeps> = {}): HandlerDeps {
  return {
    serverIndex: {
      lookupAnnotation: () => [{ file: '/workspace/other.spw', line: 1, name: 'intent' }],
      allAnnotations: () => [],
      allAnnotationNames: () => [],
      getDocument: () => ({ text, filePath: '/workspace/test.spw' }),
    },
    workspaceRoot: '/workspace',
    pathFromUri: (uri: string) => uri.replace('file://', ''),
    uriFromPath: (p: string) => `file://${p}`,
    getDocumentText: async () => text,
    getWorkspaceSpwFiles: async () => [],
    mergeRoots: () => ({}),
    config: {},
    observableState: null,
    ...overrides,
  } as unknown as HandlerDeps
}

describe('spw probes', () => {
  it('computes operator frequency', () => {
    const r = computeOperatorFrequency('^["a"]{ & ~"x" #tag }', 't')
    expect(r.entries.length).toBeGreaterThan(0)
    expect(r.dominantOperator).toBeTruthy()
  })

  it('phaseContext finds sigil under cursor', async () => {
    const text = '  & merge here'
    const r = await phaseContext(
      { uri: 'file:///workspace/a.spw', position: { line: 0, character: 2 } },
      makeDeps(text),
    )
    expect(r.sigil).toBe('&')
    expect(r.phase).toBe(4)
    expect(r.role).toMatch(/confluence/i)
  })

  it('formSequenceProbe parses wrap chain', () => {
    const r = formSequenceProbe({
      notation: '& => {&} => {&[#claim]}',
      catalog: true,
    })
    expect(r.steps[0]!.op).toBe('seed')
    expect(r.steps[1]!.op).toBe('wrap')
    expect(r.steps[2]!.op).toBe('annotate')
    expect(r.catalog?.length).toBe(4)
  })

  it('registerSnapshot finds $%[] and ~# traits', async () => {
    const text = '~#goal: "x"\n$%[register.bank]\n'
    const r = await registerSnapshot({ uri: 'file:///w.spw' }, makeDeps(text))
    expect(r.registers.some(x => x.name === 'goal')).toBe(true)
    expect(r.registers.some(x => x.name === 'register.bank')).toBe(true)
  })

  it('resonance links annotation names to other files', async () => {
    const text = '#!intent somewhere'
    const r = await resonance({ uri: 'file:///workspace/a.spw' }, makeDeps(text))
    expect(r.some(e => e.channel === 'intent')).toBe(true)
  })

  it('resonance draws no #lens channel from readings that only share the word', async () => {
    const serverIndex = new ServerIndex('/workspace')
    const files: Record<string, string> = {
      '/workspace/readings.spw': '~#lens(bandwidth symmetry)\n~#lens(ecological zone)',
      '/workspace/particle.spw': '#:lens #!computational',
    }
    for (const [file, text] of Object.entries(files)) {
      serverIndex.openDocument(`file://${file}`, file, text, 1)
      serverIndex.saveDocument(`file://${file}`)
    }
    const text = '#:depth ~#lens(living system)'
    const edges = await resonance({ uri: 'file:///workspace/a.spw' }, makeDeps(text, { serverIndex } as Partial<HandlerDeps>))
    const lens = edges.filter((edge) => edge.channel === 'lens')
    // The `#:lens` particle file resonates; the file that only holds readings does not.
    expect(lens.map((edge) => edge.targetUri)).toEqual(['file:///workspace/particle.spw'])
    expect(lens[0]!.strength).toBeCloseTo(0.45)
  })

  it('operatorFrequency uses document text', async () => {
    const r = await operatorFrequency(
      { uri: 'file:///workspace/a.spw' },
      makeDeps('^^^ && ##'),
    )
    expect(r.target).toContain('a.spw')
    expect(r.entries.length).toBeGreaterThan(0)
  })
})
