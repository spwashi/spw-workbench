import { describe, expect, it } from 'vitest'
import { parse } from '../parser'
import {
  formatCompositionSpw,
  recognizeCompositionSource,
  compositionToProduct,
  hostLabel,
} from './composition-forms'

describe('composition forms', () => {
  it('does not treat ~<consequence> as PathRef', () => {
    const ast = JSON.stringify(parse('~<consequence>').ast)
    expect(ast).not.toContain('"type":"PathRef"')
    expect(ast).toContain('"type":"Operation"')
    expect(ast).toContain('"type":"Capsule"')
  })

  it('keeps path-shaped ~<../a.spw> as PathRef', () => {
    const ast = JSON.stringify(parse('~<../a.spw>').ast)
    expect(ast).toContain('"type":"PathRef"')
  })

  it('keeps ~"quoted/path.spw" as PathRef', () => {
    const ast = JSON.stringify(parse('~"quoted/path.spw"').ast)
    expect(ast).toContain('"type":"PathRef"')
  })

  it('recognizes act → consequence membrane', () => {
    const form = recognizeCompositionSource('!{ do } ~<consequence>')
    expect(form?.kind).toBe('act_consequence')
    if (form?.kind === 'act_consequence') {
      expect(form.consequenceName).toBe('consequence')
      expect(form.scoped).toBe(false)
    }
  })

  it('recognizes scoped act → consequence', () => {
    const form = recognizeCompositionSource('(!{ prep })~<out>')
    expect(form?.kind).toBe('act_consequence')
    if (form?.kind === 'act_consequence') {
      expect(form.scoped).toBe(true)
      expect(form.consequenceName).toBe('out')
      expect(form.head).toBe('!')
    }
  })

  it('recognizes probe → consequence membrane ?{…} ~<…>', () => {
    const form = recognizeCompositionSource('?{ ask } ~<answer>')
    expect(form?.kind).toBe('act_consequence')
    if (form?.kind === 'act_consequence') {
      expect(form.head).toBe('?')
      expect(form.consequenceName).toBe('answer')
      expect(form.scoped).toBe(false)
    }
  })

  it('recognizes scoped probe → consequence', () => {
    const form = recognizeCompositionSource('(?{ ask })~<answer>')
    expect(form?.kind).toBe('act_consequence')
    if (form?.kind === 'act_consequence') {
      expect(form.head).toBe('?')
      expect(form.scoped).toBe(true)
      expect(form.consequenceName).toBe('answer')
    }
  })

  it('recognizes conceptual probe <file>@"appendix.spw"?', () => {
    const form = recognizeCompositionSource('<file>@"appendix.spw"?')
    expect(form?.kind).toBe('conceptual_probe')
    if (form?.kind === 'conceptual_probe') {
      expect(form.lens).toBe('appendix.spw')
      expect(form.probe).toBe(true)
      expect(form.host).toBeDefined()
    }
  })

  it('extracts path-shaped host membrane for conceptual probe', () => {
    const form = recognizeCompositionSource(
      '<docs/runtime/index.spw>@"spw/agent-loop.spw"?',
    )
    expect(form?.kind).toBe('conceptual_probe')
    if (form?.kind === 'conceptual_probe') {
      expect(hostLabel(form.host)).toBe('docs/runtime/index.spw')
      expect(form.lens).toBe('spw/agent-loop.spw')
    }
  })

  it('emits geometric dual-read cards', () => {
    const form = recognizeCompositionSource('!{ a } ~<b>')
    expect(form).not.toBeNull()
    const spw = formatCompositionSpw(form!)
    expect(spw).toContain('^["act_consequence"]')
    expect(spw).toContain('~#consequence')
    expect(spw).not.toContain('memoPlane')
  })

  it('builds intermediate product frames', () => {
    const form = recognizeCompositionSource('<host>@"lens.spw"?')
    const product = compositionToProduct(form!)
    expect(product.kind).toBe('conceptual_probe')
    expect(product.frames.lens).toBe('lens.spw')
    expect(product.frames.eval).toBe('within_host_conceptual_space')
  })
})
