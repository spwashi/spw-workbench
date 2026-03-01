# SPEC (Spw v0.2.0-alpha)

## Status

Core index contract for v0.2.0-alpha — expanded with determinism contract and worked examples.

## What Is SPEC?

SPEC is the **root contract** for core semantics. It defines what any Spw parser/kernel must expose as stable behavior.

## Core Guarantees

| Guarantee | Description | Verification |
|:--|:--|:--|
| **Determinism** | Identical input + profile = identical output | `parser.determinism.test.ts` |
| **Portability** | Seed kernel has zero workbench dependencies | `src/seed/` import audit |
| **Serializability** | All public kernel outputs can be JSON-serialized | Type constraints |
| **Diagnostics** | Invalid input produces actionable error with position | Error surface tests |

## Worked Examples

### 1. Determinism — parse output is stable

```typescript
// Given the same input and profile:
const input = '^seed[hello v:0.1]'
const profile = 'Spw.b'

const result1 = parse(input, { profile })
const result2 = parse(input, { profile })

// GUARANTEE: result1 deep-equals result2
assert.deepStrictEqual(result1, result2)
```

### 2. Portability — seed kernel imports nothing external

```typescript
// src/seed/index.ts exports:
export { lex } from './lexer'
export { parse } from './parser'
export { canonicalize } from './canonical'
export { query } from './query'

// GUARANTEE: none of these import from extensions/, scripts/, .spw/, or node_modules
```

### 3. Diagnostics — errors are actionable

```spw
# Input with unclosed container:
^seed[hello v:0.1
```

```
Error: Unexpected EOF at line 1, col 18
  Expected: ']' to close frame opened at line 1, col 6
  Context: ^seed[hello v:0.1
                 ^^^^^^^^^^^^
```

## Counter-Examples

### ❌ Non-deterministic output

```typescript
// BAD: parse output depends on system time
const result = parse(input, { timestamp: Date.now() })  // ❌ Non-deterministic!
```

### ❌ Unhelpful error

```
Error: Parse failed  // ❌ No position, no context, no repair hint
```

## Invariants

- Core behavior is deterministic for identical input and profile.
- Public kernel outputs are serializable and testable.
- Core contracts in this folder are normative for v0.2.0-alpha prep.
- The seed kernel (`src/seed/`) has zero external dependencies.

## Implementation Hooks

- Kernel parser and lexer surface: `src/seed/`
- Canon examples for contract checks: `docs/examples/spw/`
- Conformance targets: [CONFORMANCE.md](./CONFORMANCE.md)
- Golden snapshots: `src/seed/__tests__/snapshots/`

## Open Questions

- Which contracts graduate from alpha to hard guarantees in v0.2.0 stable?
- Which profile-level deviations are allowed without violating core determinism?
