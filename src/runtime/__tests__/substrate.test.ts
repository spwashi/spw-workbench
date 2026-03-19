import { describe, it, expect } from 'vitest'
import { Substrate } from '../pipeline/substrate'
import { detectResonances } from '../pipeline/resonance'
import { RegisterBank } from '../state/register-bank'
import type { RegisterEvent, Resonance } from '../pipeline/substrate'
import { castToBrand, $register } from '../../seed/types'

describe('Substrate', () => {
    it('emits and accumulates events', () => {
        const sub = new Substrate('test')
        sub.emit({ kind: 'write', key: $register`a`, value: 'hello', at: new Date().toISOString() })
        sub.emit({ kind: 'write', key: $register`b`, value: 'world', at: new Date().toISOString() })
        expect(sub.eventCount).toBe(2)
    })

    it('drains events (consume + clear)', () => {
        const sub = new Substrate('test')
        sub.emit({ kind: 'write', key: $register`a`, value: 1, at: new Date().toISOString() })
        const drained = sub.drain()
        expect(drained).toHaveLength(1)
        expect(sub.eventCount).toBe(0)
    })

    it('snapshot clones event metadata immutably', () => {
        const sub = new Substrate('test')
        sub.emit({
            kind: 'write',
            key: $register`a`,
            value: 'hello',
            operator: '*',
            valence: ['boon'],
            registerRole: 'collapse',
            semanticFrames: { label: 'seed' },
            at: new Date().toISOString(),
        })

        const snapshot = sub.snapshot()
        snapshot[0].valence?.push('bone')
        ; (snapshot[0].semanticFrames as Record<string, unknown>).label = 'mutated'

        expect(sub.peek()[0].valence).toEqual(['boon'])
        expect(sub.peek()[0].semanticFrames).toMatchObject({ label: 'seed' })
    })

    it('dispatches to exact key bindings', () => {
        const sub = new Substrate('test')
        const received: RegisterEvent[] = []
        const x = $register`x`
        const y = $register`y`
        sub.bind('x', e => received.push(e))
        sub.emit({ kind: 'write', key: x, value: 1, at: new Date().toISOString() })
        sub.emit({ kind: 'write', key: y, value: 2, at: new Date().toISOString() })
        expect(received).toHaveLength(1)
        expect(received[0].key).toBe('x')
    })

    it('dispatches to wildcard bindings', () => {
        const sub = new Substrate('test')
        const received: RegisterEvent[] = []
        sub.bind('*', e => received.push(e))
        sub.emit({ kind: 'write', key: $register`a`, value: 1, at: new Date().toISOString() })
        sub.emit({ kind: 'couple', key: $register`b`, value: 2, at: new Date().toISOString() })
        expect(received).toHaveLength(2)
    })

    it('dispatches to kind-based bindings', () => {
        const sub = new Substrate('test')
        const received: RegisterEvent[] = []
        const a = $register`a`
        const b = $register`b`
        sub.bind('couple:*', e => received.push(e))
        sub.emit({ kind: 'write', key: a, value: 1, at: new Date().toISOString() })
        sub.emit({ kind: 'couple', key: b, value: 2, coupledWith: a, at: new Date().toISOString() })
        expect(received).toHaveLength(1)
        expect(received[0].kind).toBe('couple')
    })

    it('unbind removes handlers', () => {
        const sub = new Substrate('test')
        const received: RegisterEvent[] = []
        const x = $register`x`
        sub.bind('x', e => received.push(e))
        sub.unbind('x')
        sub.emit({ kind: 'write', key: x, value: 1, at: new Date().toISOString() })
        expect(received).toHaveLength(0)
    })
})

describe('RegisterBank + Substrate', () => {
    it('emits write events when substrate attached', () => {
        const sub = new Substrate('test')
        const bank = new RegisterBank({}, sub)
        const foo = $register`foo`
        bank.set(foo, 'bar', { source: 'test' })
        expect(sub.eventCount).toBeGreaterThanOrEqual(1)
        const writes = sub.peek().filter(e => e.kind === 'write' && e.key === foo)
        expect(writes.length).toBeGreaterThanOrEqual(1)
    })

    it('emits phase and write telemetry with current-write semantics', () => {
        const sub = new Substrate('test')
        const bank = new RegisterBank({}, sub)
        const foo = $register`foo`

        bank.set(foo, 'bar', {
            source: 'interpret:collapse',
            operator: '*',
            valence: ['boon'],
            registerRole: 'collapse',
            semanticFrames: { label: 'seed' },
            phase: 'pragmatic',
        })

        const events = sub.peek().filter(e => e.key === foo)
        expect(events.map(event => event.kind)).toEqual(['phase-advance', 'write'])
        for (const event of events) {
            expect(event).toMatchObject({
                key: foo,
                phase: 'pragmatic',
                operator: '*',
                valence: ['boon'],
                registerRole: 'collapse',
                semanticFrames: { label: 'seed' },
            })
        }
    })

    it('emits couple events', () => {
        const sub = new Substrate('test')
        const bank = new RegisterBank({}, sub)
        const a = $register`a`
        const b = $register`b`
        bank.set(a, 1)
        bank.set(b, 2)
        bank.couple(a, b)
        const couples = sub.peek().filter(e => e.kind === 'couple')
        expect(couples).toHaveLength(1)
        expect(couples[0].coupledWith).toBe('b')
    })

    it('emits mark events', () => {
        const sub = new Substrate('test')
        const bank = new RegisterBank({}, sub)
        bank.markPosition('cursor', 'line:42')
        const marks = sub.peek().filter(e => e.kind === 'mark')
        expect(marks).toHaveLength(1)
        expect(marks[0].key).toBe($register`mark:cursor`)
    })

    it('no events when no substrate', () => {
        const bank = new RegisterBank()
        bank.set($register`x`, 1)
        // No substrate → no crash, no events
        expect(true).toBe(true)
    })

    it('attachSubstrate/detachSubstrate lifecycle', () => {
        const sub = new Substrate('test')
        const bank = new RegisterBank()
        const x = $register`x`
        const y = $register`y`
        bank.set(x, 1) // no substrate
        bank.attachSubstrate(sub)
        bank.set(y, 2) // substrate attached
        expect(sub.peek().filter(e => e.key === y)).toHaveLength(1)
        expect(sub.peek().filter(e => e.key === x)).toHaveLength(0)
        const detached = bank.detachSubstrate()
        expect(detached).toBe(sub)
    })
})

describe('Resonance Detection', () => {
    it('detects value-echo', () => {
        const sub = new Substrate('test')
        const at = new Date().toISOString()
        const a = $register`a`
        const b = $register`b`
        sub.emit({ kind: 'write', key: a, value: 'same', at })
        sub.emit({ kind: 'write', key: b, value: 'same', at })
        const resonances = detectResonances(sub)
        const echoes = resonances.filter(r => r.type === 'value-echo')
        expect(echoes.length).toBeGreaterThanOrEqual(1)
        expect(echoes[0].strength).toBe(1.0)
    })

    it('accepts event snapshots directly', () => {
        const sub = new Substrate('test')
        const at = new Date().toISOString()
        const a = $register`a`
        const b = $register`b`
        sub.emit({ kind: 'write', key: a, value: 'same', at })
        sub.emit({ kind: 'write', key: b, value: 'same', at })

        const fromSubstrate = detectResonances(sub)
        const fromSnapshot = detectResonances(sub.snapshot())

        expect(fromSnapshot).toEqual(fromSubstrate)
    })

    it('does not echo null/undefined values', () => {
        const sub = new Substrate('test')
        const at = new Date().toISOString()
        const a = $register`a`
        const b = $register`b`
        sub.emit({ kind: 'write', key: a, value: null, at })
        sub.emit({ kind: 'write', key: b, value: null, at })
        const resonances = detectResonances(sub)
        const echoes = resonances.filter(r => r.type === 'value-echo')
        expect(echoes).toHaveLength(0)
    })

    it('detects phase-sync', () => {
        const sub = new Substrate('test')
        const at = new Date().toISOString()
        const a = $register`a`
        const b = $register`b`
        sub.emit({ kind: 'write', key: a, value: 1, phase: 'semantic', at })
        sub.emit({ kind: 'write', key: b, value: 2, phase: 'semantic', at })
        const resonances = detectResonances(sub)
        const syncs = resonances.filter(r => r.type === 'phase-sync')
        expect(syncs.length).toBeGreaterThanOrEqual(1)
    })

    it('detects frequency-lock', () => {
        const sub = new Substrate('test')
        const at = new Date().toISOString()
        const a = $register`a`
        const b = $register`b`
        // Write to 'a' 3 times, 'b' 3 times → ratio 1.0
        for (let i = 0; i < 3; i++) {
            sub.emit({ kind: 'write', key: a, value: i, at })
            sub.emit({ kind: 'write', key: b, value: i, at })
        }
        const resonances = detectResonances(sub)
        const locks = resonances.filter(r => r.type === 'frequency-lock')
        expect(locks.length).toBeGreaterThanOrEqual(1)
        expect(locks[0].strength).toBeGreaterThan(0.8)
    })

    it('detects implicit-couple', () => {
        const sub = new Substrate('test')
        const at = new Date().toISOString()
        const source = $register`source`
        const target = $register`target`
        sub.emit({ kind: 'write', key: source, value: 'refers to target', at })
        sub.emit({ kind: 'write', key: target, value: 'hello', at })
        const resonances = detectResonances(sub)
        const implicit = resonances.filter(r => r.type === 'implicit-couple')
        expect(implicit.length).toBeGreaterThanOrEqual(1)
    })

    it('returns empty for < 2 events', () => {
        const sub = new Substrate('test')
        sub.emit({ kind: 'write', key: $register`a`, value: 1, at: new Date().toISOString() })
        expect(detectResonances(sub)).toHaveLength(0)
    })
})
