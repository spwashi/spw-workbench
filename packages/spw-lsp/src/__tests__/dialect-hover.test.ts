import { describe, it, expect } from 'vitest'
import { hover } from '../handlers/display'
import type { HandlerDeps } from '../types'

function depsWithText(text: string, file = '/ws/doc.spw'): HandlerDeps {
  return {
    workspaceRoot: '/ws',
    pathFromUri: (uri: string) => (uri.startsWith('file://') ? uri.slice(7) : file),
    getDocumentText: async () => text,
    serverIndex: {
      getDocument: () => ({ text }),
      lookupAnnotation: () => [],
      topCoOccurrences: () => [],
      annotationsForFile: () => [],
      getContextAtPosition: () => null,
    },
  } as unknown as HandlerDeps
}

describe('dialect / exp hover', () => {
  it('hovers =exp catalog id', async () => {
    const text = '=exp[ id: flow.sigma_chain , status: proposed ]\n'
    const idStart = text.indexOf('flow.sigma_chain')
    const result = await hover(
      {
        textDocument: { uri: 'file:///ws/doc.spw' },
        position: { line: 0, character: idStart + 2 },
      },
      depsWithText(text),
    )
    expect(result?.contents).toBeTruthy()
    const md = typeof result!.contents === 'object' && 'value' in result!.contents
      ? result!.contents.value
      : String(result!.contents)
    expect(md).toContain('flow.sigma_chain')
    expect(md).toContain('proposed')
  })

  it('hovers @dialect stack', async () => {
    const text = '@dialect:Spw.f\n^["x"]{}\n'
    const result = await hover(
      {
        textDocument: { uri: 'file:///ws/doc.spw' },
        position: { line: 0, character: 4 },
      },
      depsWithText(text),
    )
    const md = typeof result!.contents === 'object' && 'value' in result!.contents
      ? result!.contents.value
      : String(result!.contents)
    expect(md).toContain('Spw.f')
    expect(md).toMatch(/dialect/i)
  })

  it('hovers ^seed stack chip', async () => {
    const text = '^seed[Demo v:1 @profile:Spw.b]\n^["x"]{}\n'
    const result = await hover(
      {
        textDocument: { uri: 'file:///ws/doc.spw' },
        position: { line: 0, character: 3 },
      },
      depsWithText(text),
    )
    const md = typeof result!.contents === 'object' && 'value' in result!.contents
      ? result!.contents.value
      : String(result!.contents)
    expect(md).toContain('Surface profile stack')
    expect(md).toContain('Spw.b')
  })
})
