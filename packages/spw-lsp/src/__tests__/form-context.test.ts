import { describe, expect, it } from 'vitest'
import { hover } from '../handlers/display'
import { codeAction } from '../handlers/editing'
import {
  assembleFormContext,
  formContextCodeActions,
} from '../handlers/form-context'
import { handleSpwProbe } from '../handlers/spw-probes'
import { ServerIndex } from '../server-index'
import { DEFAULT_CONFIG, type HandlerDeps } from '../types'

const TEST_URI = 'file:///workspace/test.spw'
const TEST_PATH = '/workspace/test.spw'

function makeDeps(text: string): HandlerDeps {
  const serverIndex = new ServerIndex('/workspace')
  serverIndex.openDocument(TEST_URI, TEST_PATH, text, 1)
  serverIndex.saveDocument(TEST_URI)

  return {
    serverIndex,
    config: {
      ...DEFAULT_CONFIG,
      inlayHints: { ...DEFAULT_CONFIG.inlayHints },
    },
    workspaceRoot: '/workspace',
    pathFromUri: (uri: string) => uri.replace('file://', ''),
    uriFromPath: (filePath: string) => `file://${filePath}`,
    resolveReferencePath: async () => null,
    suggestNearbyReference: async () => null,
    defaultRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    mergeRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    getDocumentText: async () => text,
    getWorkspaceSpwFiles: async () => [],
    mapWithConcurrency: async (items: any[], _concurrency: number, mapper: any) => Promise.all(items.map(mapper)),
    sendNotification: () => {},
    log: () => {},
    trialRunSpw: () => null,
    loadObservableState: async () => ({}),
    observableState: null,
    observableStateLoadedAt: 0,
  } as unknown as HandlerDeps
}

function docOf(text: string) {
  const deps = makeDeps(text)
  const doc = deps.serverIndex.getDocument(TEST_URI)
  if (!doc) throw new Error('missing doc')
  return { deps, doc }
}

describe('form context coupling hover', () => {
  it('distinguishes empty [] from inhabited [x] occupancy/payload', async () => {
    const empty = docOf('[]')
    const inhabited = docOf('[x]')

    const emptyCtx = assembleFormContext(empty.doc, { line: 0, character: 1 })
    const inhabitedCtx = assembleFormContext(inhabited.doc, { line: 0, character: 1 })

    expect(emptyCtx?.coupling).toMatchObject({
      kind: 'frame',
      form: 'boundary',
      occupancy: 'empty',
      payload: 'void',
      empty: true,
    })
    expect(inhabitedCtx?.coupling).toMatchObject({
      kind: 'frame',
      form: 'boundary',
      occupancy: 'inhabited',
      payload: 'term',
      empty: false,
    })

    const emptyHover = await hover({
      textDocument: { uri: TEST_URI },
      position: { line: 0, character: 1 },
    }, empty.deps)
    const inhabitedHover = await hover({
      textDocument: { uri: TEST_URI },
      position: { line: 0, character: 1 },
    }, inhabited.deps)

    expect(emptyHover?.contents.value).toContain('occupancy: `empty`')
    expect(emptyHover?.contents.value).toContain('payload: `void`')
    expect(inhabitedHover?.contents.value).toContain('occupancy: `inhabited`')
    expect(inhabitedHover?.contents.value).toContain('payload: `term`')
  })

  it('names digraph <> as couple operator, not capsule', async () => {
    const { deps, doc } = docOf('<>')
    const ctx = assembleFormContext(doc, { line: 0, character: 0 })
    expect(ctx?.coupling).toMatchObject({
      kind: 'couple',
      form: 'operator',
      coupleVsCapsule: 'couple-operator',
    })

    const result = await hover({
      textDocument: { uri: TEST_URI },
      position: { line: 0, character: 0 },
    }, deps)
    expect(result?.contents.value).toMatch(/couple operator/i)
    expect(result?.contents.value).toMatch(/not capsule|≠ capsule/i)
    expect(ctx?.coupling?.form).toBe('operator')
  })
})

describe('form context label mobility', () => {
  it('resolves free label site and offers gated ingress.ref_handle', () => {
    const { doc } = docOf('topic')
    const ctx = assembleFormContext(doc, { line: 0, character: 2 })
    expect(ctx?.label).toBe('topic')
    expect(ctx?.labelPosition?.site).toBe('free')

    const pass = ctx?.mobility.filter(m => m.gated === 'pass') ?? []
    expect(pass.some(m => m.ruleId === 'ingress.ref_handle' && m.preview === '@(topic)')).toBe(true)

    const actions = formContextCodeActions(doc, { line: 0, character: 2 })
    const refAction = actions.find(a => a.title.includes('ingress.ref_handle'))
    expect(refAction?.edit?.changes?.[TEST_URI]?.[0]?.newText).toBe('@(topic)')
  })

  it('chains topic → @(topic) → $(topic) and rejects direct free → register', () => {
    const free = docOf('topic')
    const freeCtx = assembleFormContext(free.doc, { line: 0, character: 1 })
    const freePass = freeCtx?.mobility.filter(m => m.gated === 'pass').map(m => m.ruleId) ?? []
    expect(freePass).toContain('ingress.ref_handle')
    expect(freePass).not.toContain('promote.register_bridge')

    const ref = docOf('@(topic)')
    const refCtx = assembleFormContext(ref.doc, { line: 0, character: 3 })
    expect(refCtx?.labelPosition?.site).toBe('ref_handle')
    const refPass = refCtx?.mobility.filter(m => m.gated === 'pass') ?? []
    expect(refPass.some(m => m.ruleId === 'promote.register_bridge' && m.preview === '$(topic)')).toBe(true)

    // Direct free → $(topic) is not a single implemented rule.
    expect(freePass.some(id => id.includes('register') && freeCtx?.mobility.find(m => m.ruleId === id)?.preview === '$(topic)')).toBe(false)
  })

  it('exposes mobility actions through codeAction handler', async () => {
    const { deps } = docOf('topic')
    const actions = await codeAction({
      textDocument: { uri: TEST_URI },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 5 },
      },
      context: { diagnostics: [] },
    }, deps)

    expect(actions.some(a => a.title.includes('ingress.ref_handle'))).toBe(true)
    expect(actions.some(a => a.title.includes('ingress.frame_select'))).toBe(true)
  })

  it('serves revision-addressed spw/formContext probe', async () => {
    const { deps, doc } = docOf('[x]')
    const result = await handleSpwProbe('spw/formContext', {
      uri: TEST_URI,
      position: { line: 0, character: 1 },
    }, deps) as any

    expect(result.ok).toBe(true)
    expect(result.revision).toBe(doc.version)
    expect(result.coupling).toMatchObject({
      occupancy: 'inhabited',
      payload: 'term',
    })
  })
})
