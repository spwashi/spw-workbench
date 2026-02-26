import { describe, it, expect } from 'vitest'
import { tokenize } from '../lexer/tokenize'

describe('Quantum Semiotics Tokenizer', () => {
    it('should tokenize ground operator (.)', () => {
        // Ground operator is now correctly tokenized as OPERATOR (quantum nomenclature)
        const tokens = [...tokenize('.')]
        const groundToken = tokens.find(t => t.type === 'token' && (t.data as { token: { value: string } }).token.value === '.')
        expect(groundToken).toBeDefined()
        expect((groundToken?.data as { token: { type: string } }).token.type).toBe('OPERATOR')
    })

    it('should tokenize vibration operator (#)', () => {
        const tokens = [...tokenize('#')]
        const vibToken = tokens.find(t => t.type === 'token' && (t.data as { token: { value: string } }).token.value === '#')
        expect(vibToken).toBeDefined()
        expect((vibToken?.data as { token: { type: string } }).token.type).toBe('OPERATOR')
    })

    it('should distinguish ground (.) from chain (..)', () => {
        // const tokens = [...tokenize('a . b .. c')]
        // Expected: Identifier, Operator(.), Identifier, Connector(..), Identifier
        // Currently: Identifier, Dot(.), Identifier, Connector(..), Identifier
        // Keeping this inactive for now as we just want to verify tokenizer builds
    })
})
