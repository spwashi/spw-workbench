import { describe, it, expect } from 'vitest'
import { extractAuthority } from './authority-extract'

function names(source: string, kind: string): string[] {
  return extractAuthority(source, 'subject.js')
    .filter(o => o.kind === kind)
    .map(o => o.name)
}

describe('writes', () => {
  it.each([
    ['el.dataset.state = "x"', 'dataset'],
    ['el.style.opacity = "1"', 'style'],
    ['el.textContent = "x"', 'textContent'],
    ['el.innerHTML = "<b/>"', 'innerHTML'],
    ['el.className = "a"', 'className'],
    ['input.value = "x"', 'value'],
  ])('sees %s as a write to %s', (code, expected) => {
    expect(names(code, 'writes')).toContain(expected)
  })

  it('reports the container property, not the leaf', () => {
    // `el.dataset.state` is authority over `dataset`; `state` is one of many.
    expect(names('el.dataset.state = "x"', 'writes')).toEqual(['dataset'])
  })

  it('sees mutating method calls', () => {
    expect(names('el.setAttribute("a", "b")', 'writes')).toContain('setAttribute')
    expect(names('el.append(node)', 'writes')).toContain('append')
  })

  it('sees classList through any method', () => {
    expect(names('el.classList.toggle("on")', 'writes')).toContain('classList')
  })

  it('does not treat a read as a write', () => {
    expect(names('const x = el.dataset.state', 'writes')).toEqual([])
    expect(names('if (el.textContent) {}', 'writes')).toEqual([])
  })
})

describe('joins', () => {
  it('names the event rather than the method', () => {
    expect(names('el.addEventListener("pointerdown", f)', 'joins')).toEqual(['pointerdown'])
  })

  it('falls back to the method when the event is not a literal', () => {
    expect(names('el.addEventListener(name, f)', 'joins')).toEqual(['addEventListener'])
  })

  it.each([
    ['new MutationObserver(f)', 'MutationObserver'],
    ['new ResizeObserver(f)', 'ResizeObserver'],
    ['new WebSocket(url)', 'WebSocket'],
  ])('sees %s', (code, expected) => {
    expect(names(code, 'joins')).toContain(expected)
  })

  it('sees fetch', () => {
    expect(names('fetch("/api")', 'joins')).toContain('fetch')
  })

  it('does not treat an unrelated constructor as a join', () => {
    expect(names('new Map()', 'joins')).toEqual([])
  })
})

describe('reads', () => {
  it('sees static imports', () => {
    expect(names('import { a } from "./shared.js"', 'reads')).toEqual(['./shared.js'])
  })

  it('sees dynamic imports', () => {
    expect(names('const m = await import("./late.js")', 'reads')).toEqual(['./late.js'])
  })
})

describe('reporting', () => {
  it('records every site of a repeated use', () => {
    const [observed] = extractAuthority('el.dataset.a = 1\nel.dataset.b = 2\n', 'subject.js')
    expect(observed!.sites).toEqual(['subject.js:1', 'subject.js:2'])
  })

  it('deduplicates a name across sites', () => {
    const observed = extractAuthority('el.dataset.a = 1\nel.dataset.b = 2\n', 'subject.js')
    expect(observed).toHaveLength(1)
  })

  it('sorts by kind then name so reports are stable', () => {
    const observed = extractAuthority(
      'import "./z.js"\nel.style.a = 1\nel.addEventListener("click", f)\n',
      'subject.js',
    )
    expect(observed.map(o => `${o.kind}:${o.name}`)).toEqual([
      'joins:click',
      'reads:./z.js',
      'writes:style',
    ])
  })

  it('parses TypeScript when the subject is .ts', () => {
    const observed = extractAuthority(
      'const el = document.body as HTMLElement\nel.dataset.x = "1"\n',
      'subject.ts',
    )
    expect(observed.map(o => o.name)).toEqual(['dataset'])
  })

  it('does not throw on a syntactically broken subject', () => {
    expect(() => extractAuthority('function ( { unclosed', 'subject.js')).not.toThrow()
  })
})
