import { describe, it, expect, beforeEach } from 'vitest'
import { tokenize } from '../../../src/lang/lex'
import { parse } from '../../../src/lang/parse'
import { Interpreter } from '../../../src/runtime/interpreter'
import { RegisterBank } from '../../../src/runtime/state'
import { registerBuiltins } from '../../../src/runtime/interpreter/builtins'

describe('Wonder Calculus Axioms: $ and %', () => {
    let interpreter: Interpreter

    beforeEach(() => {
        registerBuiltins()
        const registers = new RegisterBank()
        interpreter = new Interpreter({ registers })
    })

    function evaluateCode(code: string) {
        const tokens = tokenize(code)
        const ast = parse(tokens)
        const iterator = interpreter.evaluate(ast)
        let result = null
        for (const step of iterator) {
            result = step.value
        }
        return result
    }

    describe('$ (Reflexivity / Substrate)', () => {
        it('should examine X — the substrate operator is self-referential', () => {
            // Test 1: Introspect empty state
            const stateMeta = evaluateCode('$')
            expect(stateMeta).toMatchObject({
                topology: '$',
                accessMode: 'material'
            })

            // Test 2: Introspect raw value
            const valueMeta = evaluateCode('$("hello")')
            expect(valueMeta).toMatchObject({
                topology: 'value',
                type: 'string',
                size: 5
            })

            // Test 3: Introspect referenced register
            evaluateCode('=a 42')
            const refMeta = evaluateCode('$(a)')
            expect(refMeta).toMatchObject({
                name: 'a',
                topology: '=',
                accessMode: 'property'
            })

            // Test 4: Introspect grounded register
            evaluateCode('#[crystal, "bcc"]')
            const groundMeta = evaluateCode('$(crystal)')
            expect(groundMeta).toMatchObject({
                name: 'crystal',
                topology: '#',
                grounded: true
            })
        })
    })

    describe('% (Measure)', () => {
        it('should return a scalar ∈ [0,1] — every structure has a magnitude', () => {
            // Booleans
            expect(evaluateCode('%(true)')).toBe(1)
            expect(evaluateCode('%(false)')).toBe(0)

            // Numbers (default scale 10)
            expect(evaluateCode('%(5)')).toBe(0.5)
            expect(evaluateCode('%(10)')).toBe(1)
            expect(evaluateCode('%(15)')).toBe(1) // Clamp

            // Arrays
            expect(evaluateCode('%(#[1, 2, 3])')).toBe(0.3)

            // Object keys (simulated via facets)
            expect(evaluateCode('%(.{ a = 1, b = 2 }[reg=facet])')).toBe(0.2)
        })
    })
})
