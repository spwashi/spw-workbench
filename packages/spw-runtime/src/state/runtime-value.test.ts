import { describe, expect, it } from 'vitest'
import { $register } from '@spwashi/spw-seed'
import { RegisterBank } from './register-bank'
import { cloneRuntimeValue, isRuntimePacket, isRuntimeRecord, isScopeFrame, mergeRuntimeValues, runtimeMagnitude } from './runtime-value'
import type { RuntimeValue } from './types'

describe('runtime value guards', () => {
  it('tells a packet by its kind, a closed set', () => {
    expect(isRuntimePacket({ kind: 'node', payload: 1 })).toBe(true)
    expect(isRuntimePacket({ kind: 'runtime' })).toBe(true)
    expect(isRuntimePacket({ kind: 'note', body: 'x' })).toBe(false)
    expect(isRuntimePacket(['node'])).toBe(false)
  })

  it('tells a scope frame by its observer and capture time', () => {
    expect(isScopeFrame({ observer: 'a', capturedAt: 't', value: 1 })).toBe(true)
    expect(isScopeFrame({ observer: 'a' })).toBe(false)
  })

  it('reads a record as neither an array, a packet nor a frame', () => {
    expect(isRuntimeRecord({ a: 1 })).toBe(true)
    expect(isRuntimeRecord({ kind: 'note' })).toBe(true)
    expect(isRuntimeRecord({ kind: 'node' })).toBe(false)
    expect(isRuntimeRecord({ observer: 'a', capturedAt: 't', value: 1 })).toBe(false)
    expect(isRuntimeRecord([1])).toBe(false)
    expect(isRuntimeRecord(null as unknown as RuntimeValue)).toBe(false)
  })
})

describe('cloneRuntimeValue', () => {
  it('returns scalars and nothing as they are', () => {
    for (const value of [undefined, null, 0, 'a', true] as RuntimeValue[]) expect(cloneRuntimeValue(value)).toBe(value)
  })

  it('copies records, arrays, frames and packets all the way down', () => {
    const original: RuntimeValue = {
      list: [{ a: 1 }],
      frame: { observer: 'o', capturedAt: 't', value: { b: 2 } },
      packet: { kind: 'node', payload: { c: 3 }, tags: ['x'] },
    }
    const copy = cloneRuntimeValue(original) as any
    expect(copy).toEqual(original)
    copy.list[0].a = 9
    copy.frame.value.b = 9
    copy.packet.payload.c = 9
    copy.packet.tags.push('y')
    expect(original).toEqual({
      list: [{ a: 1 }],
      frame: { observer: 'o', capturedAt: 't', value: { b: 2 } },
      packet: { kind: 'node', payload: { c: 3 }, tags: ['x'] },
    })
  })

  it('copies a record that carries a kind of its own whole, with only its keys', () => {
    const note = { kind: 'note', body: { text: 'hi' } }
    const copy = cloneRuntimeValue(note) as any
    expect(Object.keys(copy)).toEqual(['kind', 'body'])
    copy.body.text = 'changed'
    expect(note.body.text).toBe('hi')
  })

  it('leaves a packet without payload or tags without them', () => {
    expect(Object.keys(cloneRuntimeValue({ kind: 'landmark', concept: 'gate' }) as object)).toEqual(['kind', 'concept'])
  })
})

describe('the register bank hands out copies', () => {
  it('keeps a stored record apart from what a reader does with it', () => {
    const bank = new RegisterBank()
    bank.set($register`note`, { kind: 'note', body: { text: 'hi' } })
    const read = bank.get($register`note`) as any
    read.body.text = 'changed'
    expect((bank.get($register`note`) as any).body.text).toBe('hi')
  })
})

describe('mergeRuntimeValues', () => {
  it('concatenates arrays, lets the right record win, and otherwise takes the right', () => {
    expect(mergeRuntimeValues([1], [2])).toEqual([1, 2])
    expect(mergeRuntimeValues({ a: 1, b: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
    expect(mergeRuntimeValues({ a: 1 }, 'x')).toBe('x')
    expect(mergeRuntimeValues(undefined, { a: 1 })).toEqual({ a: 1 })
  })

  it('shares nothing with either side', () => {
    const left = { kept: { n: 1 } }
    const merged = mergeRuntimeValues(left, { other: 1 }) as any
    merged.kept.n = 9
    expect(left.kept.n).toBe(1)
  })
})

describe('runtimeMagnitude', () => {
  it('says how much a value says, uncapped, through frames and packets', () => {
    expect(runtimeMagnitude(-3)).toBe(3)
    expect(runtimeMagnitude('abcd')).toBe(4)
    expect(runtimeMagnitude([1, 2])).toBe(2)
    expect(runtimeMagnitude({ a: 1, b: 2, c: 3 })).toBe(3)
    expect(runtimeMagnitude({ observer: 'o', capturedAt: 't', value: 'ab' })).toBe(2)
    expect(runtimeMagnitude({ kind: 'node', payload: [1, 2, 3] })).toBe(3)
    expect(runtimeMagnitude({ kind: 'note', body: 'x' })).toBe(2)
    expect(runtimeMagnitude(500)).toBe(500)
  })
})
